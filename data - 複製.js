const linksData = [
  { name: "國中教師配課網頁版V3.2", description: "比3.1版增加了[新增教師]及[新增班級]、[新增科目]，對輸入資料重複的判斷，避免出錯", link: "classtable3.2/index.html" },
  { name: "國中教師配課網頁版V3.1", description: "比3.0版增加了[班級排序]及[教師排序]，依照代號由小至大排序，並修正有些跳出視窗無法關閉的問題，程式更加完整了", link: "classtable3.1/index.html" },
 
  { name: "國中教師配課網頁版V3.0", description: "比2.7版轉出的EXCEL檔更容易將教師配課匯入欣河排課系統中，修正[匯入備份]沒有更新科目標題的問題", link: "classtable3.0/index.html" },
  

  { name: "國中教師配課網頁版V2.7", description: "比2.6版增加[匯出EXCEL檔] 新增開課及教師配課 工作表，可再簡單修改後，匯入欣河排課系統中", link: "classtable2.7/index.html" },
    
 { name: "陽明註冊組專用大頭照自動裁切網頁版", description: "只提供給陽明國中註冊組所用的大頭照照片冊格式，自動裁切大頭照並依班級座號存檔，", link: "photocut.html" },
    { name: "國中教師配課網頁版V2.6", description: "比2.5版增加了清除所有資料功能，將會資料清除危險的按鈕用紅色，其他為綠色，並且修正新增科目的一些BUG，讓功能更完整", link: "classtable2.6/index.html" },

    { name: "國中教師配課網頁版V2.5", description: "利用網頁的拖曳功能來進行教師配課作業，配課資料都存在本地端電腦，比2.4版增加了demo測試及班級的增刪", link: "classtable2.5/index.html" },
     { name: "國中教師配課網頁版V2.4", description: "利用網頁的拖曳功能來進行教師配課作業，配課資料都存在本地端電腦，可以備份已完成部分到其他電腦匯入使用", link: "classtable/index.html" },

    { name: "A4標籤貼紙產生器V1", description: "將原三角桌牌程式修改為標籤貼紙產生器，可以列印有、無邊界的標籤貼紙，改自屏東後庄國小黃老師原三角桌牌，<a href=https://puti001.github.io/teach_tools/Triangle_Table_Card_Generator2.html target=_blank>原網址</a>", link: "A4標籤貼紙產生器V1.html" },
    { name: "A4三角桌牌產生器V3", description: "修改1張A4可以產生2張桌牌，並記錄座標定位，改為直接開啟PDF，改自屏東後庄國小黃老師，<a href=https://puti001.github.io/teach_tools/Triangle_Table_Card_Generator2.html target=_blank>原網址</a>", link: "三角桌牌產生器03.html" },
    { name: "A4三角桌牌產生器V4", description: "修改V3版，增加背景圖像載入，及備註與姓名的顏色字體設定，版面略調，改自屏東後庄國小黃老師，<a href=https://puti001.github.io/teach_tools/Triangle_Table_Card_Generator2.html target=_blank>原網址</a>", link: "三角桌牌產生器04.html" },   
     { name: "A4三角桌牌產生器V5", description: "修改V4版，解決備註與姓名無法讀取上一次顏色的設定問題，改自屏東後庄國小黃老師，<a href=https://puti001.github.io/teach_tools/Triangle_Table_Card_Generator2.html target=_blank>原網址</a>", link: "三角桌牌產生器05.html" },  
    { name: "批次獎狀套印V1", description: "可載入A4獎狀圖像及得獎資料,再網頁上調整位置大小,並轉出PDF列印(150dpi)", link: "批次獎狀套印(150dpi)02.html" },
    { name: "單張獎狀套印V1", description: "可載入A4獎狀圖像及輸入得獎資料,再網頁上調整位置大小,並轉出PDF列印(150dpi)", link: "單張獎狀套印(150dpi)01.html" }, 
    { name: "圖像智慧拼接系統V1", description: "將連續拍攝的照片拼接成一張完整圖像，需要有30%-50%的重疊影像", link: "photo_stitching/index.html" },
    { name: "圖片自動裁切程式V1", description: "將圖像依照橫向縱向數量自動分割，並可微調分割線", link: "photo_auto_cut01.html" },   
    { name: "markdown簡易編輯器V1", description: "markdown簡易web編輯器，使用md語法編輯，即時網頁預覽編輯結果", link: "md_edit01.html" },
    { name: "JSON格式解析網頁", description: "JSON格式解析網頁，載入json檔案會貼上json文件，即時網頁預覽解析結果", link: "json-viewer.html" },
    { name: "圖片文字辨識OCR測試", description: "使用Tesseract.js開源OCR設計，可選擇辨識繁體中文、簡體中文及英文，辨識效果有待改進", link: "OCR.html" },
    { name: "1A2B猜數字遊戲", description: "傳統1A2B猜數字遊戲", link: "1A2B猜數字遊戲.html" },
    { name: "2048遊戲", description: "好玩的二進位遊戲", link: "2048-game.html" },

];
