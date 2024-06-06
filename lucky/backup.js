// 建立備份按鈕元素
const backupButton = document.createElement('button');
backupButton.textContent = '備份';
document.body.appendChild(backupButton);

// 建立備份按鈕的點擊事件處理函式
backupButton.addEventListener('click', function() {
  // 取得 localStorage 的資料
  const data = JSON.stringify(localStorage);

  // 建立一個新的 Blob 物件
  const blob = new Blob([data], { type: 'application/json' });

  // 建立一個下載連結
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = 'localStorage_backup.json';

  // 模擬點擊下載連結
  downloadLink.dispatchEvent(new MouseEvent('click'));
});