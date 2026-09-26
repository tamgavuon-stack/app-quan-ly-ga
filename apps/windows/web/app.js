import { STORAGE_KEY, addRecord, formatCurrency, normalizeRecords, summarize } from "./farm-store.js";

const $ = (id) => document.getElementById(id);
let records = normalizeRecords(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function render() {
  const summary = summarize(records);
  $("income").textContent = formatCurrency(summary.income);
  $("expense").textContent = formatCurrency(summary.expense);
  $("profit").textContent = formatCurrency(summary.income - summary.expense);
  $("flock").textContent = `${summary.flockCount.toLocaleString("vi-VN")} con`;
  $("record-count").textContent = `${records.length} bản ghi offline`;
  const container = $("records");
  if (!records.length) { container.innerHTML = '<p class="empty">Chưa có giao dịch. Hãy nhập bản ghi đầu tiên.</p>'; return; }
  container.innerHTML = records.slice(0, 12).map((record) => {
    const value = record.kind === "flock" ? `${Number(record.quantity || 0).toLocaleString("vi-VN")} con` : formatCurrency(Number(record.amount || 0));
    const label = record.kind === "income" ? "Doanh thu" : record.kind === "expense" ? "Chi phí" : "Đàn gà";
    return `<div class="record"><div><strong>${escapeHtml(record.category || label)}</strong><small>${label}${record.note ? ` · ${escapeHtml(record.note)}` : ""}</small></div><b class="${record.kind}">${record.kind === "expense" ? "−" : record.kind === "income" ? "+" : ""}${value}</b></div>`;
  }).join("");
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]); }

$("record-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const kind = $("kind").value;
  const category = $("category").value.trim();
  const amount = Number($("amount").value || 0);
  const quantity = Number($("quantity").value || 0);
  if (!category || (kind !== "flock" && amount <= 0) || (kind === "flock" && quantity <= 0)) return;
  records = addRecord(records, { kind, category, amount, quantity, note: $("note").value.trim() });
  save(); render(); event.target.reset();
});
$("clear").addEventListener("click", () => { if (confirm("Xóa toàn bộ dữ liệu offline trên máy này?")) { records = []; save(); render(); } });
$("sync").addEventListener("click", () => { $("drive-status").textContent = "Đã sẵn sàng: cần cấu hình Google Desktop Client ID để bắt đầu OAuth và đồng bộ."; });
render();
