const syncButton = document.getElementById("sync");
const status = document.getElementById("drive-status");

syncButton.addEventListener("click", () => {
  status.textContent = "Chưa có Google Desktop Client ID. OAuth Windows sẽ được nối với sync engine dùng chung ở bước kế tiếp.";
});
