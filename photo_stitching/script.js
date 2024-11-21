// 確保 OpenCV.js 已經載入
if (typeof cv === 'undefined') {
    alert('OpenCV.js 未正確載入！');
} else {
    initializeApp();
}

function initializeApp() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const stitchBtn = document.getElementById('stitchBtn');
    const clearBtn = document.getElementById('clearBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const outputCanvas = document.getElementById('outputCanvas');
    const imageCountInput = document.getElementById('imageCount');
    
    let uploadedImages = [];

    // 初始化隱藏下載按鈕
    downloadBtn.style.display = 'none';

    // 拖曳上傳處理
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#2c3e50';
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#ccc';
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#ccc';
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFiles(files);
        }
    });

    // 點擊上傳處理
    dropZone.addEventListener('click', function(e) {
        fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            handleFiles(files);
        }
    });

    function handleFiles(files) {
        const maxImages = parseInt(imageCountInput.value);
        
        if (uploadedImages.length + files.length > maxImages) {
            alert(`最多只能上傳 ${maxImages} 張圖片`);
            return;
        }

        files.forEach(file => {
            if (!file.type.startsWith('image/')) {
                alert('請只上傳圖片檔案');
                return;
            }

            const reader = new FileReader();
            
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    uploadedImages.push(img);
                    displayPreview(img);
                };
                img.src = e.target.result;
            };

            reader.readAsDataURL(file);
        });
    }

    function displayPreview(img) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-item';
        
        const previewImg = document.createElement('img');
        previewImg.src = img.src;
        previewImg.classList.add('preview-image');
        
        previewContainer.appendChild(previewImg);
        imagePreview.appendChild(previewContainer);
    }

    clearBtn.addEventListener('click', function() {
        uploadedImages = [];
        imagePreview.innerHTML = '';
        if (outputCanvas.getContext) {
            const ctx = outputCanvas.getContext('2d');
            ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
        }
        downloadBtn.style.display = 'none';
    });

    stitchBtn.addEventListener('click', async function() {
        if (uploadedImages.length < 2) {
            alert('請至少上傳兩張圖片');
            return;
        }

        try {
            // 將所有圖片轉換為 Mat 對象
            const mats = uploadedImages.map(img => cv.imread(img));
            let result = mats[0].clone(); // 從第一張圖片開始

            // 依序處理每一對相鄰的圖片
            for (let i = 1; i < mats.length; i++) {
                // 將當前結果和下一張圖片進行拼接
                const gray1 = new cv.Mat();
                const gray2 = new cv.Mat();
                cv.cvtColor(result, gray1, cv.COLOR_BGR2GRAY);
                cv.cvtColor(mats[i], gray2, cv.COLOR_BGR2GRAY);

                // 使用簡單方式創建 ORB 檢測器
                const orb = new cv.ORB();
                
                // 檢測關鍵點和計算描述符
                const keypoints1 = new cv.KeyPointVector();
                const keypoints2 = new cv.KeyPointVector();
                const descriptors1 = new cv.Mat();
                const descriptors2 = new cv.Mat();
                
                // 使用默認參數進行特徵檢測
                orb.detectAndCompute(gray1, new cv.Mat(), keypoints1, descriptors1);
                orb.detectAndCompute(gray2, new cv.Mat(), keypoints2, descriptors2);

                // 使用暴力匹配器進行特徵匹配
                const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
                const matches = new cv.DMatchVector();
                matcher.match(descriptors1, descriptors2, matches);

                // 篩選好的匹配點
                const good_matches = [];
                const threshold = 50; // 可以調整這個閾值來改變匹配的嚴格程度
                
                for (let j = 0; j < matches.size(); j++) {
                    const match = matches.get(j);
                    if (match.distance < threshold) {
                        good_matches.push(match);
                    }
                }

                if (good_matches.length < 10) {
                    throw new Error(`在第 ${i} 和 ${i+1} 張圖片之間找不到足夠的匹配點`);
                }

                // 獲取匹配點的坐標
                const points1 = [];
                const points2 = [];
                
                for (let j = 0; j < good_matches.length; j++) {
                    const match = good_matches[j];
                    const kp1 = keypoints1.get(match.queryIdx);
                    const kp2 = keypoints2.get(match.trainIdx);
                    points1.push(new cv.Point(kp1.pt.x, kp1.pt.y));
                    points2.push(new cv.Point(kp2.pt.x, kp2.pt.y));
                }

                // 計算單應性矩陣
                const srcPoints = cv.Mat.zeros(points1.length, 1, cv.CV_32FC2);
                const dstPoints = cv.Mat.zeros(points2.length, 1, cv.CV_32FC2);
                
                for (let j = 0; j < points1.length; j++) {
                    srcPoints.data32F[j * 2] = points1[j].x;
                    srcPoints.data32F[j * 2 + 1] = points1[j].y;
                    dstPoints.data32F[j * 2] = points2[j].x;
                    dstPoints.data32F[j * 2 + 1] = points2[j].y;
                }

                // 使用 RANSAC 方法計算單應性矩陣，增加迭代次數和精度
                const H = cv.findHomography(srcPoints, dstPoints, cv.RANSAC, 5.0, new cv.Mat(), 2000);

                // 計算變換後圖像的大小
                const corners = new cv.Mat(4, 1, cv.CV_32FC2);
                corners.data32F[0] = 0;
                corners.data32F[1] = 0;
                corners.data32F[2] = result.cols;
                corners.data32F[3] = 0;
                corners.data32F[4] = result.cols;
                corners.data32F[5] = result.rows;
                corners.data32F[6] = 0;
                corners.data32F[7] = result.rows;

                const transformedCorners = new cv.Mat(4, 1, cv.CV_32FC2);
                cv.perspectiveTransform(corners, transformedCorners, H);

                // 計算輸出圖像的大小
                let minX = Math.min(0, transformedCorners.data32F[0], transformedCorners.data32F[2], 
                                  transformedCorners.data32F[4], transformedCorners.data32F[6]);
                let maxX = Math.max(mats[i].cols, transformedCorners.data32F[0], transformedCorners.data32F[2], 
                                  transformedCorners.data32F[4], transformedCorners.data32F[6]);
                let minY = Math.min(0, transformedCorners.data32F[1], transformedCorners.data32F[3], 
                                  transformedCorners.data32F[5], transformedCorners.data32F[7]);
                let maxY = Math.max(mats[i].rows, transformedCorners.data32F[1], transformedCorners.data32F[3], 
                                  transformedCorners.data32F[5], transformedCorners.data32F[7]);

                // 在創建輸出圖像時，增加邊界以避免裁剪
                const outputWidth = Math.ceil(maxX - minX) + 100;  // 增加邊界
                const outputHeight = Math.ceil(maxY - minY) + 100; // 增加邊界
                const newResult = new cv.Mat.zeros(outputHeight, outputWidth, cv.CV_8UC3);

                // 調整平移矩陣以考慮邊界
                const translateMatrix = new cv.Mat(3, 3, cv.CV_64F);
                translateMatrix.data64F[0] = 1;
                translateMatrix.data64F[1] = 0;
                translateMatrix.data64F[2] = -minX + 50; // 考慮邊界
                translateMatrix.data64F[3] = 0;
                translateMatrix.data64F[4] = 1;
                translateMatrix.data64F[5] = -minY + 50; // 考慮邊界
                translateMatrix.data64F[6] = 0;
                translateMatrix.data64F[7] = 0;
                translateMatrix.data64F[8] = 1;

                // 將下一張圖片放入結果中
                const warpMatrix2 = translateMatrix.clone();
                cv.warpPerspective(mats[i], newResult, warpMatrix2, new cv.Size(outputWidth, outputHeight));

                // 計算並應用變換矩陣
                const warpMatrix1 = new cv.Mat(3, 3, cv.CV_64F);
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        let sum = 0;
                        for (let k = 0; k < 3; k++) {
                            sum += translateMatrix.data64F[r * 3 + k] * H.data64F[k * 3 + c];
                        }
                        warpMatrix1.data64F[r * 3 + c] = sum;
                    }
                }

                // 使用混合模式進行圖像融合
                cv.warpPerspective(result, newResult, warpMatrix1, new cv.Size(outputWidth, outputHeight), 
                                 cv.INTER_LINEAR, cv.BORDER_TRANSPARENT);
                
                let mask = new cv.Mat.zeros(outputHeight, outputWidth, cv.CV_8UC1);
                cv.warpPerspective(mats[i], newResult, warpMatrix2, new cv.Size(outputWidth, outputHeight),
                                 cv.INTER_LINEAR, cv.BORDER_TRANSPARENT);

                // 清理當前迭代的記憶體
                mask.delete();
                result.delete();
                gray1.delete();
                gray2.delete();
                descriptors1.delete();
                descriptors2.delete();
                srcPoints.delete();
                dstPoints.delete();
                H.delete();
                corners.delete();
                transformedCorners.delete();
                translateMatrix.delete();
                warpMatrix1.delete();
                warpMatrix2.delete();
                keypoints1.delete();
                keypoints2.delete();
                matches.delete();
                orb.delete();

                // 更新結果為新的拼接結果
                result = newResult;
            }

            // 顯示最終結果
            cv.imshow(outputCanvas, result);

            // 清理剩餘的記憶體
            mats.forEach(mat => mat.delete());
            result.delete();

            // 顯示並設定下載連結
            downloadBtn.style.display = 'inline-block';
            downloadBtn.href = outputCanvas.toDataURL('image/jpeg');

        } catch (error) {
            alert('拼接過程發生錯誤: ' + error.message);
            console.error(error);
        }
    });
} 