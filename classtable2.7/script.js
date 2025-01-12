document.addEventListener('DOMContentLoaded', function() {
    let teachers = [];
    let classes = [];
    let headers = [];  // 用於儲存表格標題行
    
    

    // 將教師和班級資料存入 localStorage
    function saveDataToLocalStorage() {
        localStorage.setItem('teachers', JSON.stringify(teachers));
        localStorage.setItem('classes', JSON.stringify(classes));
        localStorage.setItem('headers', JSON.stringify(headers));  // 儲存表格標題行
    }

    // 解析 CSV 資料
    function parseCSV(content) {
        return content.split('\n').map(line => line.trim()).filter(line => line).map(line => line.split(','));
    }

    // 從 CSV 載入教師資料並存入 localStorage
    function loadTeacherData() {
        const file = document.getElementById('teacherFile').files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                const parsed = parseCSV(content);
                // 假設 CSV 格式為 [教師編號, 教師姓名, 應受節數, 已配節數, 剩餘節數]
                teachers = parsed.map(row => ({
                    id: row[0],
                    name: row[1],
                    required_hours: parseInt(row[2]),
                    assigned_hours: parseInt(row[3]),
                    remaining_hours: parseInt(row[4]),
                    overtime_hours: 0  // 初始化超鐘點節數
                }));
                updateTeacherTable();
                saveDataToLocalStorage();
            };
            reader.readAsText(file);
        } else {
            alert("請選擇一個 CSV 檔案來載入教師資料");
        }
    }

    // 更新教師表格，並設定背景色依據節數變化
    function updateTeacherTable() {
        const tbody = document.querySelector('#teacherTable tbody');
        tbody.innerHTML = teachers.map(teacher => `
            <tr>
                <td>${teacher.id} ${teacher.assigned_hours === 0 ? `<button class="delete-btn" onclick="showDeleteTeacherModal('${teacher.id}')">刪除</button>` : ''}</td>
                <td class="teacher-name" draggable="true" data-name="${teacher.name}" ondblclick="showTeacherDetails('${teacher.name}')">${teacher.name}</td>
                <td>${teacher.required_hours}</td>
                <td>${teacher.assigned_hours}</td>
                <td style="background-color: ${teacher.remaining_hours > 0 ? 'lightgreen' : 'white'};">${teacher.remaining_hours}</td>
                <td style="background-color: ${teacher.overtime_hours > 0 ? 'lightcoral' : 'white'};">${teacher.overtime_hours}</td>  <!-- 新增超鐘點節數欄位 -->
            </tr>
        `).join('');
        setupDragAndDrop();
    }

    // 拖曳及放下配課的設定
    function setupDragAndDrop() {
        const teacherTable = document.getElementById('teacherTable');
        const classTable = document.getElementById('classTable');

        teacherTable.addEventListener('dragstart', dragStart);
        classTable.addEventListener('dragover', dragOver);
        classTable.addEventListener('drop', drop);
    }

    function dragStart(e) {
        if (e.target.classList.contains('teacher-name')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.name);
        }
    }

    function dragOver(e) {
        e.preventDefault();
    }

    // 當教師名稱被拖入右邊框架後，填入教師名稱並增減授課節數
    function drop(e) {
        e.preventDefault();
        const teacherName = e.dataTransfer.getData('text');
        const teacher = teachers.find(t => t.name === teacherName);

        if (e.target.tagName === 'TD' && !e.target.dataset.teacher) {
            const classId = e.target.parentElement.querySelector('td').textContent;
            const subject = e.target.dataset.subject; // 確保這裡可以正確獲取到 subject
            console.log('subject=', subject); // 追蹤
            console.log('teacherName=', teacherName); // 追蹤

            // 確保 subject 不為 undefined
            if (subject) {
                const subjectHours = parseInt(subject.match(/\d+/)[0]);

                // 更新 classes 中的 subjects 的 teacher
                const classIndex = classes.findIndex(cls => cls.class_name === classId);
                console.log('classIndex=', classIndex); // 追蹤
                console.log('cls => cls.class_name=', classId); // 追蹤

                if (classIndex !== -1) {
                    const subjectIndex = classes[classIndex].subjects.findIndex(sub => sub.name === subject);
                    if (subjectIndex !== -1) {
                        classes[classIndex].subjects[subjectIndex].teacher = teacherName;
                    }
                }

                saveDataToLocalStorage();  // 更新 localStorage

                // Update teacher assigned hours
                updateTeacherHours(teacherName, subjectHours);
                updateClassTable();
                updateClassTableHeader();

                // Display teacher name in the cell
                e.target.dataset.teacher = teacherName;
                e.target.innerHTML = `${teacherName} <button class="delete-btn" onclick="removeTeacher(this)">刪除</button>`;
            }
        }
    }

    // 更新左邊教師節數並根據節數變更背景色
    function updateTeacherHours(teacherName, change) {
        const teacher = teachers.find(t => t.name === teacherName);
        if (teacher) {
            teacher.assigned_hours += change;
            if (teacher.remaining_hours >= change) {
                teacher.remaining_hours -= change;
            } else {
                const remainingChange = change - teacher.remaining_hours;
                teacher.remaining_hours = 0;
                teacher.overtime_hours += remainingChange;
            }
            updateTeacherTable();
            saveDataToLocalStorage();
        } else {
            console.error(`Teacher ${teacherName} not found in teachers array.`);
        }
    }

    // 修改刪除按鈕的功能
    window.removeTeacher = function(button) {
        const td = button.parentElement;
        const teacherName = td.dataset.teacher;
        const classId = td.parentElement.querySelector('td').textContent;
        const subject = td.dataset.subject; // 確保這裡可以正確獲取到 subject

        console.log('Removing teacher:', teacherName); // 調試信息
        console.log('Class ID:', classId); // 調試信息
        console.log('Subject:', subject); // 調試信息

        // 更新 classes 中的 subjects 的 teacher
        const classIndex = classes.findIndex(cls => cls.class_name === classId);
        if (classIndex !== -1) {
            const subjectIndex = classes[classIndex].subjects.findIndex(sub => sub.name === subject);
            if (subjectIndex !== -1) {
                const teacher = teachers.find(t => t.name === classes[classIndex].subjects[subjectIndex].teacher);
                if (teacher) {
                    const subjectHours = parseInt(subject.match(/\d+/)[0]);
                    updateTeacherHoursOnRemove(teacher.name, subjectHours);
                }
                classes[classIndex].subjects[subjectIndex].teacher = ''; // 清空教師名稱
            }
        }
        saveDataToLocalStorage();
        updateClassTable();
        updateClassTableHeader();

        // 清除單元格內容
        td.dataset.teacher = '';
        td.innerHTML = '';
    };

    // 更新教師節數（刪除配課時）
    function updateTeacherHoursOnRemove(teacherName, change) {
        const teacher = teachers.find(t => t.name === teacherName);
        if (teacher) {
            teacher.assigned_hours -= change;
            if (teacher.overtime_hours >= change) {
                teacher.overtime_hours -= change;
            } else {
                const remainingChange = change - teacher.overtime_hours;
                teacher.overtime_hours = 0;
                teacher.remaining_hours += remainingChange;
            }
            updateTeacherTable();
            saveDataToLocalStorage();
        } else {
            console.error(`Teacher ${teacherName} not found in teachers array.`);
        }
    }

    // 備份資料，將 localStorage 的資料匯出為 JSON 檔案
    function backupData() {
        const data = {
            teachers: JSON.stringify(teachers),
            classes: JSON.stringify(classes),
            headers: JSON.stringify(headers)  // 儲存表格標題行
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'backup.json';
        link.click();
    }

    // 匯入資料，從 JSON 檔案中載入並存入 localStorage
    function importData() {
        if (confirm("確定要匯入備份配課資料嗎？")) {
            const file = document.getElementById('backupFile').files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const data = JSON.parse(e.target.result);
                    teachers = JSON.parse(data.teachers);
                    classes = JSON.parse(data.classes);
                    headers = JSON.parse(data.headers);  // 恢復表格標題行
                    saveDataToLocalStorage();
                    updateTeacherTable();
                    updateClassTable();
                };
                reader.readAsText(file);
            } else {
                alert("請選擇一個 JSON 檔案來匯入備份資料");
            }
        }
    }

    // 從 CSV 載入班級資料並存入 localStorage
    function loadClassData() {
        const file = document.getElementById('classFile').files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                const parsed = parseCSV(content);
                // 假設 CSV 格式為 [導師, 班級, 科目1, 科目2, ...]
                headers = parsed[0];
                const classData = parsed.slice(1);

                // 動態生成表格標題行
                const classTableHeader = document.getElementById('classTableHeader');
                classTableHeader.innerHTML = headers.map(header => `<th>${header}</th>`).join('');

                // 解析班級資料
                classes = classData.map(row => ({
                    mentor: row[1],  // 導師姓名
                    class_name: row[0],
                    subjects: headers.slice(2).map((subject, index) => ({
                        name: subject,
                        hours: parseInt(subject.match(/\d+/)[0]),
                        teacher: row[index + 2]
                    }))
                }));
                updateClassTable();
                saveDataToLocalStorage();
            };
            reader.readAsText(file);
        } else {
            alert("請選擇一個 CSV 檔案來載入班級資料");
        }
    }

    // 更新班級表格，並顯示刪除按鈕
    function updateClassTable() {
        const tbody = document.querySelector('#classTable tbody');
        tbody.innerHTML = classes.map(cls => `
            <tr>
                <td>${cls.class_name}</td>
                <td>${cls.mentor} ${canDeleteClass(cls) ? `<button class="delete-btn" onclick="showDeleteClassModal('${cls.mentor}')">刪除</button>` : ''}</td>  <!-- 顯示導師姓名 -->
                ${cls.subjects.map(subject => `
                    <td data-subject="${subject.name}">${subject.teacher ? `${subject.teacher} <button class="delete-btn" onclick="removeTeacher(this)">刪除</button>` : ''}</td>
                `).join('')}
            </tr>
        `).join('');
    }

    // 檢查是否可以刪除班級
    function canDeleteClass(cls) {
        return cls.subjects.every(subject => subject.teacher === '');
    }

    // 顯示刪除班級確認視窗
    window.showDeleteClassModal = function(classId) {
        const modal = document.getElementById('deleteClassModal');
        const modalContent = modal.querySelector('.modal-content');
        modalContent.innerHTML = `<h2>確認刪除班級</h2><p>您確定要刪除 班級：<font color=red> ${classId} </font>嗎？</p><button onclick="deleteClass('${classId}')">確認刪除</button><button onclick="closeDeleteClassModal()">取消</button>`;
        modal.style.display = "block";
        modal.style.zIndex = 1000; // 確保模態視窗在最上層
    }

    // 關閉刪除班級確認視窗
    window.closeDeleteClassModal = function() {
        const modal = document.getElementById('deleteClassModal');
        modal.style.display = "none";
    }

    // 刪除班級
    window.deleteClass = function(classId) {
        classes = classes.filter(cls => cls.mentor !== classId);
        saveDataToLocalStorage();
        updateClassTable();
        closeDeleteClassModal();
    }

    // 匯出配課資料為 CSV
    function exportAssignmentData() {
        // CSV header
        let csvContent = '';
        const headers = document.querySelectorAll('#classTableHeader th');
        headers.forEach(header => {
            csvContent += header.textContent + ',';
        });
        csvContent += '\n';

        classes.forEach(cls => {
            const classRow = [cls.mentor, cls.class_name];  // 包含導師姓名和班級名稱
            cls.subjects.forEach(subject => {
                classRow.push(subject.teacher);
            });
            csvContent += classRow.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "配課表.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // 匯出配課資料為 Excel
    function exportToExcel() {
        const wb = XLSX.utils.book_new();

        // 創建教師配課節數工作表
        const teacherTable = document.getElementById('teacherTable').cloneNode(true);
        const teacherRows = teacherTable.querySelectorAll('tr');
        teacherRows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            cells.forEach(cell => {
                const button = cell.querySelector('button');
                if (button) {
                    cell.removeChild(button);
                }
                cell.innerHTML = cell.innerHTML.replace('刪除', '');
            });
        });
        const teacherSheet = XLSX.utils.table_to_sheet(teacherTable);
        addBordersToSheet(teacherSheet);
        XLSX.utils.book_append_sheet(wb, teacherSheet, '教師配課節數');

        // 創建班級配課表工作表
        const classTable = document.getElementById('classTable').cloneNode(true);
        const classRows = classTable.querySelectorAll('tr');
        classRows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            cells.forEach(cell => {
                const button = cell.querySelector('button');
                if (button) {
                    cell.removeChild(button);
                }
                cell.innerHTML = cell.innerHTML.replace('刪除', '');
            });
        });
        const classSheet = XLSX.utils.table_to_sheet(classTable);
        addBordersToSheet(classSheet);
        XLSX.utils.book_append_sheet(wb, classSheet, '班級配課表');

        // 創建教師配課情形工作表
        const teacherAssignmentSheet = XLSX.utils.aoa_to_sheet([
            ["教師代號", "教師姓名", "配課情形"]
        ]);
        teachers.forEach(teacher => {
            const assignedClasses = classes.filter(cls =>
                cls.subjects.some(subject => subject.teacher === teacher.name)
            );
            const assignmentDetails = assignedClasses.flatMap(cls =>
                cls.subjects.filter(subject => subject.teacher === teacher.name).map(subject => `${cls.mentor} ${subject.name}`)
            );
            const row = [teacher.id, teacher.name, ...assignmentDetails];
            XLSX.utils.sheet_add_aoa(teacherAssignmentSheet, [row], { origin: -1 });
        });
        addBordersToSheet(teacherAssignmentSheet);
        XLSX.utils.book_append_sheet(wb, teacherAssignmentSheet, '教師配課情形');

        // 創建 "開課及教師配課" 工作表
        const courseAssignmentSheet = XLSX.utils.aoa_to_sheet([
            ["班級代碼", "科目代碼", "教師代碼", "教師姓名"]
        ]);
        classes.forEach(cls => {
            cls.subjects.forEach(subject => {
                if (subject.teacher) {
                    const teacher = teachers.find(t => t.name === subject.teacher);
                    if (teacher) {
                        const row = [cls.mentor, subject.name, teacher.id, teacher.name];
                        XLSX.utils.sheet_add_aoa(courseAssignmentSheet, [row], { origin: -1 });
                    }
                }
            });
        });
        addBordersToSheet(courseAssignmentSheet);
        XLSX.utils.book_append_sheet(wb, courseAssignmentSheet, '開課及教師配課');

        XLSX.writeFile(wb, '配課表內容.xlsx');
    }

    // 為工作表添加邊框
    function addBordersToSheet(sheet) {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        for (let c = range.s.c; c <= range.e.c; ++c) {
            for (let r = range.s.r; r <= range.e.r; ++r) {
                const cell = sheet[XLSX.utils.encode_cell({ c: c, r: r })];
                if (cell) {
                    cell.s = {
                        border: {
                            top: { style: 'thin' },
                            right: { style: 'thin' },
                            bottom: { style: 'thin' },
                            left: { style: 'thin' }
                        }
                    };
                }
            }
        }
    }

    // 清除配課資料
    function clearAssignments() {
        if (confirm("您確定要清除配課資料嗎？")) {
            classes.forEach(cls => {
                cls.subjects.forEach(subject => {
                    subject.teacher = '';
                });
            });
            saveDataToLocalStorage();
            updateClassTable();
            alert("配課資料已清除");

            // 將所有教師的節數歸零
            teachers.forEach(teacher => {
                teacher.assigned_hours = 0;
                teacher.remaining_hours = teacher.required_hours;
                teacher.overtime_hours = 0;
            });
            saveDataToLocalStorage(); // 確保保存到 localStorage
            updateTeacherTable(); // 更新教師表格以顯示節數為0
        }
    }

    // 顯示匯入資料說明
    function showImportInstructions() {
        const modal = document.getElementById('instructionsModal');
        modal.style.display = "block";
    }

    // 關閉匯入資料說明
    function closeImportInstructions() {
        const modal = document.getElementById('instructionsModal');
        modal.style.display = "none";
    }


   

   document.getElementById('demoDataButton').addEventListener('click', function() {
    if (confirm("這將會刪除原先已配課資料，以 demo 資料覆蓋練習使用，是否確認？")) {
        // 執行載入 demo 資料的功能
        loadDemoData();
        
    }
});

// 自動載入 demo 資料
function loadDemoData() {
    // 假設 demo 資料的 CSV 檔案名稱
    const teacherFile = 'teachers.csv';
    const classFile = 'classes.csv';

    // 先清除現有資料
    //clearAssignments();

    // 載入教師資料
    fetch(teacherFile)
        .then(response => response.text())
        .then(data => {
            const parsedTeachers = parseCSV(data);
            teachers = parsedTeachers.map(row => ({
                id: row[0],
                name: row[1],
                required_hours: parseInt(row[2]),
                assigned_hours: parseInt(row[3]),
                remaining_hours: parseInt(row[4]),
                overtime_hours: 0
            }));
            saveDataToLocalStorage(); // 儲存教師資料到 localStorage
            updateTeacherTable(); // 更新教師表格
        })
        .catch(error => console.error('Error loading teacher data:', error));

    // 載入班級資料
    fetch(classFile)
        .then(response => response.text())
        .then(data => {
            const parsedClasses = parseCSV(data);
            headers = parsedClasses[0]; // 假設第一行是表頭
            const classData = parsedClasses.slice(1);
 
                // 動態生成表格標題行
                const classTableHeader = document.getElementById('classTableHeader');
                classTableHeader.innerHTML = headers.map(header => `<th>${header}</th>`).join('');
            
            classes = classData.map(row => ({
                mentor: row[1],  // 導師姓名
                class_name: row[0],
                subjects: headers.slice(2).map((subject, index) => ({
                    name: subject,
                    hours: parseInt(subject.match(/\d+/)[0]),
                    teacher: row[index + 2]
                }))
            }));
            saveDataToLocalStorage(); // 儲存班級資料到 localStorage
            updateClassTable(); // 更新班級表格
            updateClassTableHeader();
        })
        .catch(error => console.error('Error loading class data:', error));
}



    // 顯示教師詳細資料
    window.showTeacherDetails = function(teacherName) {
        const teacher = teachers.find(t => t.name === teacherName);
        if (teacher) {
            const assignedClasses = classes.filter(cls =>
                cls.subjects.some(subject => subject.teacher === teacherName)
            );
            let detailsContent = `<h2>${teacherName} 教師</h2><h3>已配課情形:</h3>`;
            assignedClasses.forEach(cls => {
                cls.subjects.forEach(subject => {
                    if (subject.teacher === teacherName) {
                        detailsContent += `<p>班級: ${cls.mentor} ${subject.name}</p>`;
                    }
                });
            });
            const modal = document.getElementById('teacherDetailsModal');
            const modalContent = modal.querySelector('.modal-content');
            modalContent.innerHTML = detailsContent;
            modal.style.display = "block";
        }
    };

    // 關閉教師詳細資料
    function closeTeacherDetails() {
        const modal = document.getElementById('teacherDetailsModal');
        modal.style.display = "none";
    }

    // 顯示新增教師模態視窗
    function showAddTeacherModal() {
        const modal = document.getElementById('addTeacherModal');
        modal.style.display = "block";
    }

    // 關閉新增教師模態視窗
    function closeAddTeacherModal() {
        const modal = document.getElementById('addTeacherModal');
        modal.style.display = "none";
    }

    // 新增教師
    function addTeacher() {
        const id = document.getElementById('newTeacherId').value;
        const name = document.getElementById('newTeacherName').value;
        const required_hours = parseInt(document.getElementById('newTeacherRequiredHours').value);
        const assigned_hours = parseInt(document.getElementById('newTeacherAssignedHours').value);
        const remaining_hours = parseInt(document.getElementById('newTeacherRemainingHours').value);

        if (id && name && !isNaN(required_hours) && !isNaN(assigned_hours) && !isNaN(remaining_hours)) {
            const newTeacher = {
                id,
                name,
                required_hours,
                assigned_hours,
                remaining_hours,
                overtime_hours: 0  // 初始化超鐘點節數
            };
            teachers.push(newTeacher);
            saveDataToLocalStorage();
            updateTeacherTable();
            closeAddTeacherModal();
        } else {
            alert("請確保所有欄位都已正確填寫");
        }
    }

    // 顯示刪除教師確認視窗
    window.showDeleteTeacherModal = function(teacherId) {
        const modal = document.getElementById('deleteTeacherModal');
        const modalContent = modal.querySelector('.modal-content');
        modalContent.innerHTML = `<h2>確認刪除教師</h2><p>您確定要刪除教師編號為<font color=red> ${teacherId}</font> 的教師嗎？</p><button onclick="deleteTeacher('${teacherId}')">確認刪除</button><button onclick="closeDeleteTeacherModal()">取消</button>`;
        modal.style.display = "block";
    }

    // 關閉刪除教師確認視窗
    window.closeDeleteTeacherModal = function() {
        const modal = document.getElementById('deleteTeacherModal');
        modal.style.display = "none";
    }

    // 刪除教師
    window.deleteTeacher = function(teacherId) {
        teachers = teachers.filter(teacher => teacher.id !== teacherId);        
        saveDataToLocalStorage();
        updateTeacherTable();
        closeDeleteTeacherModal();
    }

    // 顯示新增科目模態視窗
    function showAddSubjectModal() {
        const modal = document.getElementById('addSubjectModal');
        modal.style.display = "block";
        modal.style.zIndex = 1000; // 確保模態視窗在最上層
    }

    // 關閉新增科目模態視窗
    function closeAddSubjectModal() {
        const modal = document.getElementById('addSubjectModal');
        modal.style.display = "none";
    }

    // 新增科目
    function addSubject() {
        const subjectName = document.getElementById('newSubjectName').value;
        const subjectHours = parseInt(document.getElementById('newSubjectHours').value);

        if (subjectName && !isNaN(subjectHours)) {
            const newSubject = `${subjectName}${subjectHours}`;

            // 檢查 headers 最前面是否已經有 "導師" 和 "班級"
            if (headers.length === 0 || headers[0] !== "導師" || headers[1] !== "班級") {
                headers = ["導師", "班級"].concat(headers);
            }

            // 將新科目添加到 headers 中
            headers.push(newSubject);

            // 將新科目添加到所有班級的 subjects 中
            classes.forEach(cls => {
                cls.subjects.push({
                    name: newSubject,
                    hours: subjectHours,
                    teacher: ''
                });
            });

            saveDataToLocalStorage();
            updateClassTableHeader();
            updateClassTable();
            closeAddSubjectModal();
        } else {
            alert("請確保所有欄位都已正確填寫");
        }
    }

    // 更新班級表格標題行
    function updateClassTableHeader() {
        const classTableHeader = document.getElementById('classTableHeader');
        classTableHeader.innerHTML = headers.map((header, index) => `
            <th>
                ${header}
                ${index >= 2 && canDeleteSubject(index) ? `<button class="delete-btn" onclick="showDeleteSubjectModal(${index})">刪除</button>` : ''}
            </th>
        `).join('');
    }

    // 檢查是否可以刪除科目
    function canDeleteSubject(subjectIndex) {
        const subjectName = headers[subjectIndex];
        return classes.every(cls =>
            cls.subjects.every(subject => subject.name !== subjectName || subject.teacher === '')
        );
    }

    // 顯示刪除科目確認視窗
    window.showDeleteSubjectModal = function(subjectIndex) {
        const modal = document.getElementById('deleteSubjectModal');
        const modalContent = modal.querySelector('.modal-content');
        modalContent.innerHTML = `<h2>確認刪除科目</h2><p>您確定要刪除科目<font color=red> ${headers[subjectIndex]} </font> 嗎？</p><button onclick="deleteSubject(${subjectIndex})">確認刪除</button><button onclick="closeDeleteSubjectModal()">取消</button>`;
        modal.style.display = "block";
        modal.style.zIndex = 1000; // 確保模態視窗在最上層
    }

    // 關閉刪除科目確認視窗
    window.closeDeleteSubjectModal = function() {
        const modal = document.getElementById('deleteSubjectModal');
        modal.style.display = "none";
    }

    // 刪除科目
    window.deleteSubject = function(subjectIndex) {
        const subjectName = headers[subjectIndex];
        headers.splice(subjectIndex, 1);

        // 刪除所有班級中的該科目
        classes.forEach(cls => {
            cls.subjects = cls.subjects.filter(subject => subject.name !== subjectName);
        });

        saveDataToLocalStorage();
        updateClassTableHeader();
        updateClassTable();
        closeDeleteSubjectModal();
    }

    // 顯示新增班級模態視窗
    function showAddClassModal() {
        const modal = document.getElementById('addClassModal');
        modal.style.display = "block";
        modal.style.zIndex = 1000; // 確保模態視窗在最上層
    }

    // 關閉新增班級模態視窗
    function closeAddClassModal() {
        const modal = document.getElementById('addClassModal');
        modal.style.display = "none";
    }

    // 新增班級
    function addClass() {
        const className = document.getElementById('newMentorName').value;
        const mentorName = document.getElementById('newClassName').value;

        if (mentorName && className) {
            const newClass = {
                mentor: mentorName,
                class_name: className,
                subjects: headers.slice(2).map(header => ({
                    name: header,
                    hours: parseInt(header.match(/\d+/)[0]),
                    teacher: ''
                }))
            };
            classes.push(newClass);
            saveDataToLocalStorage();
            updateClassTable();
            closeAddClassModal();
        } else {
            alert("請確保所有欄位都已正確填寫");
        }
    }

    // 當頁面載入時，從 localStorage 中恢復資料
    window.onload = function() {
        const savedTeachers = localStorage.getItem('teachers');
        const savedClasses = localStorage.getItem('classes');
        const savedHeaders = localStorage.getItem('headers');  // 恢復表格標題行

        if (savedTeachers) {
            teachers = JSON.parse(savedTeachers);
            updateTeacherTable();
        }
        if (savedClasses) {
            classes = JSON.parse(savedClasses);
            updateClassTable();
        }
        if (savedHeaders) {
            headers = JSON.parse(savedHeaders);
            const classTableHeader = document.getElementById('classTableHeader');
            classTableHeader.innerHTML = headers.map((header, index) => `
                <th>
                    ${header}
                    ${index >= 2 && canDeleteSubject(index) ? `<button class="delete-btn" onclick="showDeleteSubjectModal(${index})">刪除</button>` : ''}
                </th>
            `).join('');
        }

        // 設置關閉按鈕的事件監聽器
        const closeBtn = document.querySelector('#instructionsModal .close-btn');
        closeBtn.addEventListener('click', closeImportInstructions);

        // 當點擊模態視窗外部時關閉模態視窗
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('instructionsModal');
            if (event.target == modal) {
                closeImportInstructions();
            }
        });

    
        // 設置教師詳細資料模態視窗的關閉按鈕事件監聽器
        const teacherDetailsCloseBtn = document.querySelector('#teacherDetailsModal .close-btn');
        teacherDetailsCloseBtn.addEventListener('click', closeTeacherDetails);

        // 當點擊教師詳細資料模態視窗外部時關閉模態視窗
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('teacherDetailsModal');
            if (event.target == modal) {
                closeTeacherDetails();
            }
        });

        // 設置新增教師模態視窗的關閉按鈕事件監聽器
        const addTeacherCloseBtn = document.querySelector('#addTeacherModal .close-btn');
        addTeacherCloseBtn.addEventListener('click', closeAddTeacherModal);

        // 當點擊新增教師模態視窗外部時關閉模態視窗
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('addTeacherModal');
            if (event.target == modal) {
                closeAddTeacherModal();
            }
        });

        // 設置刪除教師模態視窗的關閉按鈕事件監聽器
        const deleteTeacherCloseBtn = document.querySelector('#deleteTeacherModal .close-btn');
        deleteTeacherCloseBtn.addEventListener('click', closeDeleteTeacherModal);

        // 當點擊刪除教師模態視窗外部時關閉模態視窗
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('deleteTeacherModal');
            if (event.target == modal) {
                closeDeleteTeacherModal();
            }
        });

        // 設置新增科目模態視窗的關閉按鈕事件監聽器
        const addSubjectCloseBtn = document.querySelector('#addSubjectModal .close-btn');
        addSubjectCloseBtn.addEventListener('click', closeAddSubjectModal);

        // 當點擊新增科目模態視窗外部時關閉模態視窗
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('addSubjectModal');
            if (event.target == modal) {
                closeAddSubjectModal();
            }
        });

        // 設置刪除科目模態視窗的關閉按鈕事件監聽器
        const deleteSubjectCloseBtn = document.querySelector('#deleteSubjectModal .close-btn');
        deleteSubjectCloseBtn.addEventListener('click', closeDeleteSubjectModal);

        // 當點擊刪除科目模態視窗外部時關閉模態視窗
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('deleteSubjectModal');
            if (event.target == modal) {
                closeDeleteSubjectModal();
            }
        });

        // 設置新增班級模態視窗的關閉按鈕事件監聽器
        const addClassCloseBtn = document.querySelector('#addClassModal .close-btn');
        addClassCloseBtn.addEventListener('click', closeAddClassModal);

        // 當點擊新增班級模態視窗外部時關閉模態視窗
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('addClassModal');
            if (event.target == modal) {
                closeAddClassModal();
            }
        });

        // 設置刪除班級模態視窗的關閉按鈕事件監聽器
        const deleteClassCloseBtn = document.querySelector('#deleteClassModal .close-btn');
        deleteClassCloseBtn.addEventListener('click', closeDeleteClassModal);

        // 當點擊刪除班級模態視窗外部時關閉模態視窗
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('deleteClassModal');
            if (event.target == modal) {
                closeDeleteClassModal();
            }
        });
    };


     // 清除所有資料
    function clearAllData() {
        if (confirm("確定要清除所有資料嗎？這將會刪除所有已配課資料。")) {
            localStorage.removeItem('teachers');
            localStorage.removeItem('classes');
            localStorage.removeItem('headers');
            teachers = [];
            classes = [];
            headers = [];
            updateTeacherTable();
            updateClassTable();
            updateClassTableHeader();

        }
    }
 

    // 設置事件監聽器
    document.getElementById('loadTeacherButton').addEventListener('click', loadTeacherData);
    document.getElementById('loadClassButton').addEventListener('click', loadClassData);
    document.getElementById('backupButton').addEventListener('click', backupData);
    document.getElementById('importButton').addEventListener('click', importData);
    document.getElementById('clearButton').addEventListener('click', clearAssignments);
    document.getElementById('exportButton').addEventListener('click', exportAssignmentData);
    document.getElementById('exportExcelButton').addEventListener('click', exportToExcel);
    document.getElementById('importInstructionsButton').addEventListener('click', showImportInstructions);
    document.getElementById('addTeacherButton').addEventListener('click', showAddTeacherModal);
    document.getElementById('addTeacherConfirmButton').addEventListener('click', addTeacher);
    document.getElementById('addSubjectButton').addEventListener('click', showAddSubjectModal);
    document.getElementById('addSubjectConfirmButton').addEventListener('click', addSubject);
    document.getElementById('addClassButton').addEventListener('click', showAddClassModal);
    document.getElementById('addClassConfirmButton').addEventListener('click', addClass);
    document.getElementById('clearAllDataButton').addEventListener('click', clearAllData);
    

    // 設置按鈕顏色
    document.getElementById('clearButton').style.backgroundColor = 'lightcoral';
    document.getElementById('importButton').style.backgroundColor = 'lightcoral';  
    document.getElementById('clearAllDataButton').style.backgroundColor = 'lightcoral';
    document.getElementById('demoDataButton').style.backgroundColor = 'lightcoral';
    document.getElementById('loadTeacherButton').style.backgroundColor = 'lightcoral';
    document.getElementById('loadClassButton').style.backgroundColor = 'lightcoral';
});
