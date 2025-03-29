// 資料儲存類
class DataStorage {
    static save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    static load(key) {
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    static backup() {
        try {
            const allData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const rawData = localStorage.getItem(key);
                try {
                    allData[key] = JSON.parse(rawData);
                } catch (parseError) {
                    console.warn(`無法解析 ${key} 的資料: ${rawData}，將保留原始字串`, parseError);
                    allData[key] = rawData; // 保留原始字串
                }
            }
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // e.g., 20250329
            const filename = `配課資料${date}.json`;
            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
        } catch (error) {
            console.error('備份失敗:', error);
            alert('備份資料失敗，請檢查控制台錯誤訊息');
        }
    }

    static restore(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                localStorage.clear();
                Object.keys(data).forEach(key => {
                    localStorage.setItem(key, JSON.stringify(data[key]));
                });
                callback(true);
            } catch (error) {
                callback(false, '檔案格式錯誤或讀取失敗');
            }
        };
        reader.onerror = () => callback(false, '檔案讀取失敗');
        reader.readAsText(file);
    }
}

// 科目管理模組
class SubjectManager {
    constructor() {
        this.subjects = DataStorage.load('subjects');
    }

    addSubject(code, name) {
        if (!code || !name) throw new Error('科目代號和名稱為必填項');
        if (this.subjects.some(s => s.code === code)) throw new Error('科目代號已存在');
        const subject = { code, name };
        this.subjects.push(subject);
        DataStorage.save('subjects', this.subjects);
        return subject;
    }

    deleteSubject(code) {
        const index = this.subjects.findIndex(s => s.code === code);
        if (index === -1) throw new Error('科目不存在');
        this.subjects.splice(index, 1);
        DataStorage.save('subjects', this.subjects);
    }

    isSubjectInUse(code, teachers, classes) {
        return teachers.some(t => t.subject === code) || classes.some(c => c.subject === code);
    }

    uploadSubjects(file) {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = (e) => {
                const text = e.target.result;
                const rows = text.split('\n').map(row => row.split(','));
                const headers = rows[0].map(h => h.trim());
                if (headers[0] !== '科目代號' || headers[1] !== '科目名稱') {
                    reject(new Error('檔案格式錯誤，需包含 "科目代號,科目名稱"'));
                    return;
                }
                const newSubjects = [];
                for (let i = 1; i < rows.length; i++) {
                    const [code, name] = rows[i].map(val => val.trim());
                    if (code && name && !this.subjects.some(s => s.code === code)) {
                        const subject = { code, name };
                        this.subjects.push(subject);
                        newSubjects.push(subject);
                    }
                }
                DataStorage.save('subjects', this.subjects);
                resolve(newSubjects);
            };
            reader.onerror = () => reject(new Error('檔案讀取失敗'));
            reader.readAsText(file);
        });
    }
}

// 教師管理模組
class TeacherManager {
    constructor(subjectMgr) {
        this.subjectMgr = subjectMgr;
        this.teachers = DataStorage.load('teachers');
    }

    addTeacher(code, name, subject, officeLocation, maxLessons) {
        if (!code || !name || !subject || !maxLessons) throw new Error('所有欄位為必填項');
        if (!/^[a-zA-Z0-9]+$/.test(code)) throw new Error('教師代號格式錯誤');
        if (!/^[a-zA-Z\u4e00-\u9fa5]+$/.test(name)) throw new Error('姓名格式錯誤');
        if (!this.subjectMgr.subjects.some(s => s.code === subject)) throw new Error('無效的科目代號');
        if (maxLessons < 1) throw new Error('應授課節數必須大於0');
        const teacher = {
            id: Date.now(),
            code,
            name,
            subject,
            officeLocation,
            maxLessons,
            assignedLessons: 0
        };
        this.teachers.push(teacher);
        DataStorage.save('teachers', this.teachers);
        return teacher;
    }

    deleteTeacher(id) {
        const index = this.teachers.findIndex(t => t.id === id);
        if (index === -1) throw new Error('教師不存在');
        this.teachers.splice(index, 1);
        DataStorage.save('teachers', this.teachers);
    }

    uploadTeachers(file) {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = (e) => {
                const text = e.target.result;
                const rows = text.split('\n').map(row => row.split(','));
                const headers = rows[0].map(h => h.trim());
                if (headers[0] !== '教師代號' || headers[1] !== '教師姓名' || headers[2] !== '專長科目' || headers[3] !== '辦公室位置' || headers[4] !== '應授課節數') {
                    reject(new Error('檔案格式錯誤，需包含 "教師代號,教師姓名,專長科目,辦公室位置,應授課節數"'));
                    return;
                }
                const newTeachers = [];
                for (let i = 1; i < rows.length; i++) {
                    const [code, name, subject, officeLocation, maxLessons] = rows[i].map(val => val.trim());
                    if (code && name && subject && maxLessons && !this.teachers.some(t => t.code === code)) {
                        if (!this.subjectMgr.subjects.some(s => s.code === subject)) continue;
                        const teacher = {
                            id: Date.now() + i,
                            code,
                            name,
                            subject,
                            officeLocation: officeLocation || '',
                            maxLessons: parseInt(maxLessons),
                            assignedLessons: 0
                        };
                        if (teacher.maxLessons > 0) {
                            this.teachers.push(teacher);
                            newTeachers.push(teacher);
                        }
                    }
                }
                DataStorage.save('teachers', this.teachers);
                resolve(newTeachers);
            };
            reader.onerror = () => reject(new Error('檔案讀取失敗'));
            reader.readAsText(file);
        });
    }
}

// 班級課程管理模組
class ClassManager {
    constructor(subjectMgr) {
        this.subjectMgr = subjectMgr;
        this.classes = DataStorage.load('classes');
    }

    addClass(name, subject, lessons) {
        if (!name || !subject || !lessons) throw new Error('所有欄位為必填項');
        if (lessons < 1) throw new Error('節數必須大於0');
        if (!this.subjectMgr.subjects.some(s => s.code === subject)) throw new Error('無效的科目代號');
        const classObj = {
            id: Date.now(),
            name,
            subject,
            lessons,
            assignedTeacher: null
        };
        this.classes.push(classObj);
        DataStorage.save('classes', this.classes);
        return classObj;
    }

    batchAddClasses(start, end, subject, lessons) {
        if (!start || !end || !subject || !lessons) throw new Error('所有欄位為必填項');
        if (lessons < 1) throw new Error('節數必須大於0');
        if (!this.subjectMgr.subjects.some(s => s.code === subject)) throw new Error('無效的科目代號');
        const startNum = parseInt(start);
        const endNum = parseInt(end);
        if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) throw new Error('請輸入有效的班級範圍');

        const newClasses = [];
        for (let i = startNum; i <= endNum; i++) {
            const className = i.toString();
            const classObj = {
                id: Date.now() + (i - startNum),
                name: className,
                subject,
                lessons,
                assignedTeacher: null
            };
            newClasses.push(classObj);
        }
        this.classes.push(...newClasses);
        DataStorage.save('classes', this.classes);
        return newClasses;
    }

    deleteClass(id) {
        const index = this.classes.findIndex(c => c.id === id);
        if (index === -1) throw new Error('班級課程不存在');
        this.classes.splice(index, 1);
        DataStorage.save('classes', this.classes);
    }
}

// 配課模組
class ScheduleManager {
    constructor(teacherMgr, classMgr) {
        this.teacherMgr = teacherMgr;
        this.classMgr = classMgr;
        this.teachers = this.teacherMgr.teachers;
        this.classes = this.classMgr.classes;
    }

    assignClass(teacherId, classId) {
        const teacher = this.teachers.find(t => t.id === teacherId);
        const classObj = this.classes.find(c => c.id === classId);

        if (!teacher || !classObj) throw new Error('教師或班級不存在');
        if (classObj.assignedTeacher) throw new Error('班級已被分配');
        if (teacher.assignedLessons + classObj.lessons > teacher.maxLessons) throw new Error('超過教師應授課節數');

        classObj.assignedTeacher = teacherId;
        teacher.assignedLessons += classObj.lessons;
        DataStorage.save('classes', this.classes);
        DataStorage.save('teachers', this.teachers);
    }

    deleteAssignment(classId) {
        const classObj = this.classes.find(c => c.id === classId);
        if (!classObj || !classObj.assignedTeacher) throw new Error('該配課不存在');
        const teacher = this.teachers.find(t => t.id === classObj.assignedTeacher);
        teacher.assignedLessons -= classObj.lessons;
        classObj.assignedTeacher = null;
        DataStorage.save('classes', this.classes);
        DataStorage.save('teachers', this.teachers);
    }

    getTeacherLoad(teacherId) {
        return this.classes.filter(c => c.assignedTeacher === teacherId).length;
    }
}

// 報表模組
class ReportManager {
    constructor(teacherMgr, classMgr, subjectMgr) {
        this.teacherMgr = teacherMgr;
        this.classMgr = classMgr;
        this.subjectMgr = subjectMgr;
    }

    generateReport() {
        const teachers = this.teacherMgr.teachers;
        const classes = this.classMgr.classes;
        
        return teachers.map(teacher => ({
            teacherCode: teacher.code,
            teacherName: teacher.name,
            assignedClasses: classes.filter(c => c.assignedTeacher === teacher.id),
            assignedLessons: teacher.assignedLessons,
            maxLessons: teacher.maxLessons
        }));
    }

    exportToCSV() {
        const report = this.generateReport();
        let csv = '教師代號,教師姓名,班級名稱,科目代號,科目名稱,節數\n';
        report.forEach(r => {
            r.assignedClasses.forEach(c => {
                const subject = this.subjectMgr.subjects.find(s => s.code === c.subject);
                csv += `${r.teacherCode},${r.teacherName},${c.name},${c.subject},${subject ? subject.name : c.subject},${c.lessons}\n`;
            });
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = '配課報表.csv';
        link.click();
    }

    exportToXLSX() {
        try {
            if (typeof XLSX === 'undefined') {
                throw new Error('SheetJS 庫未載入，請檢查網路或引入本地版本');
            }
            const report = this.generateReport();
            const data = [['教師代號', '教師姓名', '班級名稱', '科目代號', '科目名稱', '節數']];
            report.forEach(r => {
                r.assignedClasses.forEach(c => {
                    const subject = this.subjectMgr.subjects.find(s => s.code === c.subject);
                    data.push([r.teacherCode, r.teacherName, c.name, c.subject, subject ? subject.name : c.subject, c.lessons]);
                });
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, '配課報表');
            XLSX.writeFile(wb, '配課報表.xlsx');
        } catch (error) {
            console.error('生成 XLSX 失敗:', error);
            alert('生成 XLSX 報表失敗，請檢查是否引入 SheetJS 庫');
        }
    }
}

// 身份驗證
class AuthManager {
    static login(username, password) {
        if (username === 'admin' && password === '1234') {
            localStorage.setItem('isLoggedIn', 'true');
            return true;
        }
        return false;
    }

    static isLoggedIn() {
        return localStorage.getItem('isLoggedIn') === 'true';
    }
}

// 模態視窗管理
class ModalManager {
    constructor() {
        this.modal = document.getElementById('modal');
        this.title = document.getElementById('modalTitle');
        this.body = document.getElementById('modalBody');
        this.footer = document.getElementById('modalFooter');
        this.closeBtn = document.getElementById('modalClose');

        if (!this.modal || !this.title || !this.body || !this.footer || !this.closeBtn) {
            console.error('Modal elements not found in DOM');
            return;
        }

        this.closeBtn.addEventListener('click', () => this.hide());
    }

    show(title, bodyContent, footerContent) {
        if (!this.modal || !this.title || !this.body || !this.footer) {
            console.error('Cannot show modal: elements missing');
            return;
        }
        this.title.textContent = title;
        this.body.innerHTML = bodyContent;
        this.footer.innerHTML = footerContent || '<button class="confirm-btn" onclick="modalManager.hide()">確定</button>';
        this.modal.classList.remove('hidden');
    }

    hide() {
        if (!this.modal) {
            console.error('Cannot hide modal: modal element missing');
            return;
        }
        this.modal.classList.add('hidden');
    }

    showLogin(callback) {
        const bodyContent = `
            <input type="text" id="loginUsername" placeholder="用戶名" required>
            <input type="password" id="loginPassword" placeholder="密碼" required>
        `;
        const footerContent = `
            <button class="confirm-btn" id="loginConfirm">登入</button>
            <button class="cancel-btn" onclick="modalManager.hide()">取消</button>
        `;
        this.show('請登入', bodyContent, footerContent);

        const loginConfirm = document.getElementById('loginConfirm');
        if (loginConfirm) {
            loginConfirm.addEventListener('click', () => {
                const username = document.getElementById('loginUsername').value;
                const password = document.getElementById('loginPassword').value;
                if (callback(username, password)) {
                    this.hide();
                } else {
                    this.show('登入失敗', '<p>用戶名或密碼錯誤</p>', '<button class="confirm-btn" onclick="modalManager.hide()">確定</button>');
                }
            });
        }
    }

    showConfirm(title, message, onConfirm) {
        const footerContent = `
            <button class="confirm-btn" id="confirmYes">是</button>
            <button class="cancel-btn" id="confirmNo">否</button>
        `;
        this.show(title, `<p>${message}</p>`, footerContent);

        const confirmYes = document.getElementById('confirmYes');
        const confirmNo = document.getElementById('confirmNo');

        if (confirmYes && confirmNo) {
            const yesHandler = () => {
                onConfirm();
                confirmYes.removeEventListener('click', yesHandler);
                confirmNo.removeEventListener('click', noHandler);
            };
            const noHandler = () => {
                this.hide();
                confirmYes.removeEventListener('click', yesHandler);
                confirmNo.removeEventListener('click', noHandler);
            };
            confirmYes.addEventListener('click', yesHandler);
            confirmNo.addEventListener('click', noHandler);
        }
    }

    showMessage(title, message) {
        this.show(title, `<p>${message}</p>`);
    }
}

let modalManager;

// UI控制器
class UIController {
    constructor() {
        this.subjectMgr = new SubjectManager();
        this.teacherMgr = new TeacherManager(this.subjectMgr);
        this.classMgr = new ClassManager(this.subjectMgr);
        this.scheduleMgr = new ScheduleManager(this.teacherMgr, this.classMgr);
        this.reportMgr = new ReportManager(this.teacherMgr, this.classMgr, this.subjectMgr);
    }

    init() {
        modalManager = new ModalManager();
        document.getElementById('appTitle').textContent = '國中教師配課網頁系統 V1.0';
        if (!AuthManager.isLoggedIn()) {
            modalManager.showLogin((username, password) => {
                if (AuthManager.login(username, password)) {
                    this.setupEventListeners();
                    this.showSection('subject');
                    this.updateSubjectDropdowns();
                    return true;
                }
                return false;
            });
        } else {
            this.setupEventListeners();
            this.showSection('subject');
            this.updateSubjectDropdowns();
        }
    }

    setupEventListeners() {
        const navLinks = document.querySelectorAll('.navbar a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
            });
        });

        document.getElementById('subjectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const code = document.getElementById('subjectCode').value;
                const name = document.getElementById('subjectName').value;
                this.subjectMgr.addSubject(code, name);
                this.renderSubjectList();
                this.updateSubjectDropdowns();
                e.target.reset();
                modalManager.showMessage('成功', '科目新增成功');
            } catch (error) {
                modalManager.showMessage('錯誤', error.message);
            }
        });

        document.getElementById('uploadSubjectBtn').addEventListener('click', () => {
            const fileInput = document.getElementById('subjectUpload');
            const file = fileInput.files[0];
            if (!file) {
                modalManager.showMessage('錯誤', '請選擇檔案');
                return;
            }
            this.subjectMgr.uploadSubjects(file)
                .then(() => {
                    this.renderSubjectList();
                    this.updateSubjectDropdowns();
                    fileInput.value = '';
                    modalManager.showMessage('成功', '科目上傳成功');
                })
                .catch(error => modalManager.showMessage('錯誤', error.message));
        });

        document.getElementById('subjectUploadInfoBtn').addEventListener('click', () => {
            const content = `
                <pre>
上傳科目檔案格式說明：
1. 檔案須為 CSV 格式
2. 第一行為欄位名稱：科目代號,科目名稱
3. 範例：
科目代號,科目名稱
20,數學
11,英文
                </pre>
            `;
            modalManager.show('科目上傳說明', content);
        });

        document.getElementById('teacherForm').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const code = document.getElementById('teacherCode').value;
                const name = document.getElementById('teacherName').value;
                const subject = document.getElementById('teacherSubject').value;
                const officeLocation = document.getElementById('teacherOfficeLocation').value;
                const maxLessons = parseInt(document.getElementById('teacherMaxLessons').value);
                this.teacherMgr.addTeacher(code, name, subject, officeLocation, maxLessons);
                this.renderTeacherList();
                this.updateScheduleDropdowns();
                e.target.reset();
                modalManager.showMessage('成功', '教師新增成功');
            } catch (error) {
                modalManager.showMessage('錯誤', error.message);
            }
        });

        document.getElementById('uploadTeacherBtn').addEventListener('click', () => {
            const fileInput = document.getElementById('teacherUpload');
            const file = fileInput.files[0];
            if (!file) {
                modalManager.showMessage('錯誤', '請選擇檔案');
                return;
            }
            this.teacherMgr.uploadTeachers(file)
                .then(() => {
                    this.renderTeacherList();
                    this.updateScheduleDropdowns();
                    fileInput.value = '';
                    modalManager.showMessage('成功', '教師名單上傳成功');
                })
                .catch(error => modalManager.showMessage('錯誤', error.message));
        });

        document.getElementById('teacherUploadInfoBtn').addEventListener('click', () => {
            const content = `
                <pre>
上傳教師檔案格式說明：
1. 檔案須為 CSV 格式
2. 第一行為欄位名稱：
 教師代號,教師姓名,專長科目,辦公室位置,應授課節數
3. 辦公室位置可留空，應授課節數需為正整數
4. 範例：專長科目請參考科目代號
教師代號,教師姓名,專長科目,辦公室位置,應授課節數
702,張老師,20,教務處,20
952,李老師,11,至善樓,15
                </pre>
            `;
            modalManager.show('教師名單上傳說明', content);
        });

        document.getElementById('classForm').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const name = document.getElementById('className').value;
                const subject = document.getElementById('classSubject').value;
                const lessons = parseInt(document.getElementById('classLessons').value);
                this.classMgr.addClass(name, subject, lessons);
                this.renderClassList();
                this.updateScheduleDropdowns();
                e.target.reset();
                modalManager.showMessage('成功', '班級課程新增成功');
            } catch (error) {
                modalManager.showMessage('錯誤', error.message);
            }
        });

        document.getElementById('batchClassForm').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const start = document.getElementById('batchStart').value;
                const end = document.getElementById('batchEnd').value;
                const subject = document.getElementById('batchSubject').value;
                const lessons = parseInt(document.getElementById('batchLessons').value);
                this.classMgr.batchAddClasses(start, end, subject, lessons);
                this.renderClassList();
                this.updateScheduleDropdowns();
                e.target.reset();
                modalManager.showMessage('成功', '批量開課成功');
            } catch (error) {
                modalManager.showMessage('錯誤', error.message);
            }
        });

        document.getElementById('classFilter').addEventListener('change', (e) => {
            this.renderClassList(e.target.value);
        });

        document.getElementById('scheduleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const teacherId = parseInt(document.getElementById('scheduleTeacher').value);
                const classId = parseInt(document.getElementById('scheduleClass').value);
                if (isNaN(teacherId) || isNaN(classId)) throw new Error('請選擇有效的教師和班級');
                this.scheduleMgr.assignClass(teacherId, classId);
                this.renderScheduleList();
                this.renderTimetable(document.getElementById('timetableTeacher').value);
                this.renderClassSchedule(document.getElementById('classScheduleSelect').value);
                this.renderTeacherList();
                this.updateScheduleDropdowns();
                modalManager.showMessage('成功', '配課成功');
            } catch (error) {
                modalManager.showMessage('錯誤', error.message);
            }
        });

        document.getElementById('generateReportCSV').addEventListener('click', () => {
            this.renderReport();
            this.reportMgr.exportToCSV();
        });

        document.getElementById('generateReportXLSX').addEventListener('click', () => {
            this.renderReport();
            this.reportMgr.exportToXLSX();
        });

        document.getElementById('resetData').addEventListener('click', () => {
            modalManager.showConfirm('確認清除資料', '確定要清除所有資料嗎？此操作無法撤銷。', () => {
                modalManager.showConfirm('再次確認', '請再次確認，確定清除所有資料？', () => {
                    localStorage.clear();
                    this.subjectMgr = new SubjectManager();
                    this.teacherMgr = new TeacherManager(this.subjectMgr);
                    this.classMgr = new ClassManager(this.subjectMgr);
                    this.scheduleMgr = new ScheduleManager(this.teacherMgr, this.classMgr);
                    this.reportMgr = new ReportManager(this.teacherMgr, this.classMgr, this.subjectMgr);
                    this.showSection('subject');
                    this.updateSubjectDropdowns();
                    this.renderSubjectList();
                    modalManager.showMessage('成功', '所有資料已清除並重置');
                });
            });
        });

        document.getElementById('backupData').addEventListener('click', () => {
            DataStorage.backup();
            modalManager.showMessage('成功', '資料已備份完成');
        });

        document.getElementById('restoreData').addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) {
                    modalManager.showMessage('錯誤', '請選擇檔案');
                    return;
                }
                modalManager.showConfirm('確認還原', '還原資料庫將覆蓋目前資料，請確認是否繼續？', () => {
                    DataStorage.restore(file, (success, errorMsg) => {
                        if (success) {
                            this.subjectMgr = new SubjectManager();
                            this.teacherMgr = new TeacherManager(this.subjectMgr);
                            this.classMgr = new ClassManager(this.subjectMgr);
                            this.scheduleMgr = new ScheduleManager(this.teacherMgr, this.classMgr);
                            this.reportMgr = new ReportManager(this.teacherMgr, this.classMgr, this.subjectMgr);
                            this.showSection('subject');
                            this.updateSubjectDropdowns();
                            this.renderSubjectList();
                            modalManager.showMessage('成功', '資料還原完成');
                        } else {
                            modalManager.showMessage('錯誤', errorMsg || '還原失敗');
                        }
                    });
                });
            };
            fileInput.click();
        });

        document.getElementById('timetableTeacher').addEventListener('change', (e) => {
            this.renderTimetable(e.target.value);
        });

        document.getElementById('classScheduleSelect').addEventListener('change', (e) => {
            this.renderClassSchedule(e.target.value);
        });
    }

    showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });

        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.remove('hidden');
        else console.error(`Section with ID ${sectionId} not found`);

        document.querySelectorAll('.navbar a').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`.navbar a[data-section="${sectionId}"]`);
        if (activeLink) activeLink.classList.add('active');

        if (sectionId === 'subject') this.renderSubjectList();
        else if (sectionId === 'teacher') this.renderTeacherList();
        else if (sectionId === 'class') this.renderClassList();
        else if (sectionId === 'schedule') {
            this.renderScheduleList();
            this.updateScheduleDropdowns();
        }
        else if (sectionId === 'report') this.renderReport();
    }

    renderSubjectList() {
        const list = document.getElementById('subjectList');
        if (!list) {
            console.error('subjectList element not found');
            return;
        }
        list.innerHTML = '<h3>科目列表</h3>';
        const table = document.createElement('table');
        table.innerHTML = `<tr><th>操作</th><th>科目代號</th><th>科目名稱</th></tr>`;
        this.subjectMgr.subjects.forEach(s => {
            const isInUse = this.subjectMgr.isSubjectInUse(s.code, this.teacherMgr.teachers, this.classMgr.classes);
            table.innerHTML += `
                <tr>
                    <td><button class="delete-btn" data-subject="${s.code}" ${isInUse ? 'disabled' : ''}>${isInUse ? '禁' : '刪'}</button></td>
                    <td>${s.code}</td>
                    <td>${s.name}</td>
                </tr>
            `;
        });
        list.appendChild(table);

        list.querySelectorAll('.delete-btn:not(:disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-subject');
                modalManager.showConfirm('確認刪除', `確定要刪除科目 ${code} 嗎？此操作無法撤銷。`, () => {
                    try {
                        this.subjectMgr.deleteSubject(code);
                        this.renderSubjectList();
                        this.updateSubjectDropdowns();
                        modalManager.showMessage('成功', '科目已刪除');
                    } catch (error) {
                        modalManager.showMessage('錯誤', error.message);
                    }
                });
            });
        });
    }

    renderTeacherList() {
        const list = document.getElementById('teacherList');
        if (!list) {
            console.error('teacherList element not found');
            return;
        }
        list.innerHTML = '<h3>教師列表</h3>';
        const table = document.createElement('table');
        table.innerHTML = `
            <tr><th>操作</th><th>教師代號</th><th>姓名</th><th>專長科目</th><th>辦公室位置</th><th>應授課節數</th><th>已配授節數</th><th>班級數</th></tr>
        `;
        this.teacherMgr.teachers.forEach(t => {
            const load = this.scheduleMgr.getTeacherLoad(t.id);
            const subjectName = this.subjectMgr.subjects.find(s => s.code === t.subject)?.name || t.subject;
            const hasAssignments = this.classMgr.classes.some(c => c.assignedTeacher === t.id);
            const assignedLessonsStyle = t.assignedLessons < t.maxLessons ? 'style="color: red;"' : 'style="color: green;"';
            table.innerHTML += `
                <tr>
                    <td><button class="delete-btn" data-teacher="${t.id}" ${hasAssignments ? 'disabled' : ''}>${hasAssignments ? '禁' : '刪'}</button></td>
                    <td>${t.code}</td>
                    <td>${t.name}</td>
                    <td>${subjectName}</td>
                    <td>${t.officeLocation || '無'}</td>
                    <td>${t.maxLessons}</td>
                    <td ${assignedLessonsStyle}>${t.assignedLessons}</td>
                    <td>${load}</td>
                </tr>
            `;
        });
        list.appendChild(table);

        list.querySelectorAll('.delete-btn:not(:disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-teacher'));
                const teacherName = this.teacherMgr.teachers.find(t => t.id === id).name;
                modalManager.showConfirm('確認刪除', `確定要刪除教師 ${teacherName} 嗎？此操作無法撤銷。`, () => {
                    try {
                        this.teacherMgr.deleteTeacher(id);
                        this.renderTeacherList();
                        this.updateScheduleDropdowns();
                        modalManager.showMessage('成功', '教師已刪除');
                    } catch (error) {
                        modalManager.showMessage('錯誤', error.message);
                    }
                });
            });
        });
    }

    renderClassList(filter = 'all') {
        const list = document.getElementById('classList');
        if (!list) {
            console.error('classList element not found');
            return;
        }
        list.innerHTML = '<h3>班級課程列表</h3>';
        const table = document.createElement('table');
        table.innerHTML = `
            <tr><th>操作</th><th>名稱</th><th>科目</th><th>節數</th><th>狀態</th></tr>
        `;
        let filteredClasses = this.classMgr.classes;
        if (filter === 'assigned') {
            filteredClasses = filteredClasses.filter(c => c.assignedTeacher);
        } else if (filter === 'unassigned') {
            filteredClasses = filteredClasses.filter(c => !c.assignedTeacher);
        }
        filteredClasses.forEach(c => {
            const subjectName = this.subjectMgr.subjects.find(s => s.code === c.subject)?.name || c.subject;
            table.innerHTML += `
                <tr>
                    <td><button class="delete-btn" data-class="${c.id}" ${c.assignedTeacher ? 'disabled' : ''}>${c.assignedTeacher ? '禁' : '刪'}</button></td>
                    <td>${c.name}</td>
                    <td>${subjectName}</td>
                    <td>${c.lessons}</td>
                    <td class="${!c.assignedTeacher ? 'unassigned' : ''}">${c.assignedTeacher ? '已分配' : '未分配'}</td>
                </tr>
            `;
        });
        list.appendChild(table);

        list.querySelectorAll('.delete-btn:not(:disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-class'));
                const className = this.classMgr.classes.find(c => c.id === id).name;
                modalManager.showConfirm('確認刪除', `確定要刪除班級課程 ${className} 嗎？此操作無法撤銷。`, () => {
                    try {
                        this.classMgr.deleteClass(id);
                        this.renderClassList(filter);
                        this.updateScheduleDropdowns();
                        modalManager.showMessage('成功', '班級課程已刪除');
                    } catch (error) {
                        modalManager.showMessage('錯誤', error.message);
                    }
                });
            });
        });
    }

    renderScheduleList() {
        const list = document.getElementById('scheduleList');
        if (!list) {
            console.error('scheduleList element not found');
            return;
        }
        list.innerHTML = '<h3>配課情況</h3>';
        const table = document.createElement('table');
        table.innerHTML = `
            <tr><th>操作</th><th>教師</th><th>班級</th><th>科目</th><th>節數</th></tr>
        `;
        this.scheduleMgr.classes.filter(c => c.assignedTeacher).forEach(c => {
            const teacher = this.scheduleMgr.teachers.find(t => t.id === c.assignedTeacher);
            const subjectName = this.subjectMgr.subjects.find(s => s.code === c.subject)?.name || c.subject;
            table.innerHTML += `
                <tr>
                    <td><button class="delete-btn" data-class="${c.id}">刪</button></td>
                    <td>${teacher.name}</td>
                    <td>${c.name}</td>
                    <td>${subjectName}</td>
                    <td>${c.lessons}</td>
                </tr>
            `;
        });
        list.appendChild(table);

        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-class'));
                const classObj = this.classMgr.classes.find(c => c.id === id);
                modalManager.showConfirm('確認刪除', `確定要刪除 ${classObj.name} 的配課嗎？此操作無法撤銷。`, () => {
                    try {
                        this.scheduleMgr.deleteAssignment(id);
                        this.renderScheduleList();
                        this.renderTimetable(document.getElementById('timetableTeacher').value);
                        this.renderClassSchedule(document.getElementById('classScheduleSelect').value);
                        this.renderTeacherList();
                        this.updateScheduleDropdowns();
                        modalManager.showMessage('成功', '配課已刪除');
                    } catch (error) {
                        modalManager.showMessage('錯誤', error.message);
                    }
                });
            });
        });
    }

    renderReport() {
        const output = document.getElementById('reportOutput');
        if (!output) {
            console.error('reportOutput element not found');
            return;
        }
        output.innerHTML = '<h3>配課報表</h3>';
        const table = document.createElement('table');
        table.innerHTML = `
            <tr><th>教師代號</th><th>教師</th><th>班級名稱</th><th>科目代號</th><th>科目名稱</th><th>節數</th></tr>
        `;
        const report = this.reportMgr.generateReport();
        report.forEach(r => {
            r.assignedClasses.forEach(c => {
                const subject = this.subjectMgr.subjects.find(s => s.code === c.subject);
                table.innerHTML += `
                    <tr ${r.assignedLessons > r.maxLessons ? 'class="conflict"' : ''}>
                        <td>${r.teacherCode}</td>
                        <td>${r.teacherName}</td>
                        <td>${c.name}</td>
                        <td>${c.subject}</td>
                        <td>${subject ? subject.name : c.subject}</td>
                        <td>${c.lessons}</td>
                    </tr>
                `;
            });
        });
        output.appendChild(table);
    }

    renderTimetable(teacherId) {
        const grid = document.getElementById('timetableGrid');
        if (!grid) {
            console.error('timetableGrid element not found');
            return;
        }
        grid.innerHTML = '';
        if (!teacherId) return;

        const teacher = this.teacherMgr.teachers.find(t => t.id === parseInt(teacherId));
        if (!teacher) return;

        const table = document.createElement('table');
        table.className = 'timetable-table';
        table.innerHTML = `
            <tr>
                <th>教師</th>
                <th>班級</th>
                <th>科目</th>
                <th>節數</th>
            </tr>
        `;
        const assignedClasses = this.scheduleMgr.classes.filter(c => c.assignedTeacher === teacher.id);
        assignedClasses.forEach(c => {
            const subjectName = this.subjectMgr.subjects.find(s => s.code === c.subject)?.name || c.subject;
            table.innerHTML += `
                <tr>
                    <td>${teacher.name}</td>
                    <td>${c.name}</td>
                    <td>${subjectName}</td>
                    <td>${c.lessons}</td>
                </tr>
            `;
        });
        grid.appendChild(table);
    }

    renderClassSchedule(className) {
        const grid = document.getElementById('classScheduleGrid');
        if (!grid) {
            console.error('classScheduleGrid element not found');
            return;
        }
        grid.innerHTML = '';
        if (!className) return;

        const classSchedules = this.classMgr.classes.filter(c => c.name === className);
        if (classSchedules.length === 0) return;

        const table = document.createElement('table');
        table.className = 'timetable-table';
        table.innerHTML = `
            <tr>
                <th>班級</th>
                <th>科目</th>
                <th>教師</th>
                <th>節數</th>
            </tr>
        `;
        classSchedules.forEach(c => {
            const teacher = this.teacherMgr.teachers.find(t => t.id === c.assignedTeacher);
            const subjectName = this.subjectMgr.subjects.find(s => s.code === c.subject)?.name || c.subject;
            table.innerHTML += `
                <tr>
                    <td>${c.name}</td>
                    <td>${subjectName}</td>
                    <td>${teacher ? teacher.name : '未分配'}</td>
                    <td>${c.lessons}</td>
                </tr>
            `;
        });
        grid.appendChild(table);
    }

    updateSubjectDropdowns() {
        const teacherSubject = document.getElementById('teacherSubject');
        const classSubject = document.getElementById('classSubject');
        const batchSubject = document.getElementById('batchSubject');
        
        if (!teacherSubject || !classSubject || !batchSubject) {
            console.error('Subject dropdowns not found');
            return;
        }

        const options = '<option value="">選擇科目</option>' + 
            this.subjectMgr.subjects.map(s => `<option value="${s.code}">${s.name} (${s.code})</option>`).join('');
        
        teacherSubject.innerHTML = options;
        classSubject.innerHTML = options;
        batchSubject.innerHTML = options;
    }

    updateScheduleDropdowns() {
        const teacherSelect = document.getElementById('scheduleTeacher');
        const classSelect = document.getElementById('scheduleClass');
        const timetableSelect = document.getElementById('timetableTeacher');
        const classScheduleSelect = document.getElementById('classScheduleSelect');
        
        if (!teacherSelect || !classSelect || !timetableSelect || !classScheduleSelect) {
            console.error('Schedule dropdowns not found');
            return;
        }

        teacherSelect.innerHTML = '<option value="">選擇教師</option>' + 
            this.teacherMgr.teachers.map(t => {
                const subjectName = this.subjectMgr.subjects.find(s => s.code === t.subject)?.name || t.subject;
                return `<option value="${t.id}">${t.name} (${subjectName})</option>`;
            }).join('');
        
        classSelect.innerHTML = '<option value="">選擇班級</option>' + 
            this.classMgr.classes.filter(c => !c.assignedTeacher).map(c => {
                const subjectName = this.subjectMgr.subjects.find(s => s.code === c.subject)?.name || c.subject;
                return `<option value="${c.id}">${c.name} (${subjectName})</option>`;
            }).join('');
        
        timetableSelect.innerHTML = '<option value="">選擇教師查看班級表</option>' + 
            this.teacherMgr.teachers.map(t => {
                const subjectName = this.subjectMgr.subjects.find(s => s.code === t.subject)?.name || t.subject;
                return `<option value="${t.id}">${t.name} (${subjectName})</option>`;
            }).join('');

        const uniqueClassNames = [...new Set(this.classMgr.classes.map(c => c.name))];
        classScheduleSelect.innerHTML = '<option value="">選擇班級查看配課</option>' + 
            uniqueClassNames.map(name => `<option value="${name}">${name}</option>`).join('');
    }
}

// 初始化應用
const app = new UIController();

// 確保 DOM 加載完成後執行
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing app');
    app.init();
});