import { DEVICE_KEY, FARM_DOCUMENT_ID, FARM_SCHEMA_VERSION, STORAGE_KEY, addRecord, formatCurrency, makeEnvelope, normalizeEnvelope, summarize, toSyncDocument } from "./farm-store.js";
import { mergeEnvelopes } from "./sync-engine.js";
import { GOOGLE_DESKTOP_CLIENT_ID } from "./config.js";

const $ = (id) => document.getElementById(id);
const LEGACY_STORAGE_KEY = "quan-ly-chan-nuoi-ga.windows.records.v1";
const now = () => new Date().toISOString();
const deviceId = localStorage.getItem(DEVICE_KEY) || `windows-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
localStorage.setItem(DEVICE_KEY, deviceId);
let envelope = loadEnvelope();

function loadEnvelope() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return normalizeEnvelope(raw ? JSON.parse(raw) : [], { deviceId });
  } catch {
    return makeEnvelope([], deviceId);
  }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope)); }
function setRecords(records, pendingChanges = envelope.sync.pendingChanges + 1) { envelope = makeEnvelope(records, deviceId, { ...envelope.sync, pendingChanges }); save(); render(); }
function render() {
  const summary = summarize(envelope.records);
  $("income").textContent = formatCurrency(summary.income);
  $("expense").textContent = formatCurrency(summary.expense);
  $("profit").textContent = formatCurrency(summary.income - summary.expense);
  $("flock").textContent = `${summary.flockCount.toLocaleString("vi-VN")} con`;
  $("record-count").textContent = `${envelope.records.length} bản ghi · ${envelope.sync.pendingChanges} chờ đồng bộ`;
  const container = $("records");
  if (!envelope.records.length) { container.innerHTML = '<p class="empty">Chưa có giao dịch. Hãy nhập bản ghi đầu tiên.</p>'; return; }
  container.innerHTML = envelope.records.filter((record) => !record.deletedAt).slice(0, 12).map((record) => {
    const value = record.kind === "flock" ? `${Number(record.quantity || 0).toLocaleString("vi-VN")} con` : formatCurrency(Number(record.amount || 0));
    const label = record.kind === "income" ? "Doanh thu" : record.kind === "expense" ? "Chi phí" : "Đàn gà";
    return `<div class="record"><div><strong>${escapeHtml(record.category || label)}</strong><small>${label} · ${record.date}${record.note ? ` · ${escapeHtml(record.note)}` : ""}</small></div><b class="${record.kind}">${record.kind === "expense" ? "−" : record.kind === "income" ? "+" : ""}${value}</b></div>`;
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
  const records = addRecord(envelope.records, { kind, category, amount, quantity, note: $("note").value.trim(), date: now().slice(0, 10) }, deviceId, now());
  setRecords(records); event.target.reset();
});
$("clear").addEventListener("click", () => { if (confirm("Xóa toàn bộ dữ liệu offline trên máy này?")) setRecords([], 0); });
$("export").addEventListener("click", () => {
  const exportedDocument = toSyncDocument(envelope, now(), envelope.sync.remoteRevision || 0);
  const blob = new Blob([JSON.stringify(exportedDocument, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `${FARM_DOCUMENT_ID}-backup-v${FARM_SCHEMA_VERSION}.json`; link.click(); URL.revokeObjectURL(url);
});
$("import").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    const imported = normalizeEnvelope(JSON.parse(await file.text()), { deviceId });
    const merged = mergeEnvelopes(envelope, imported, now());
    envelope = merged.envelope;
    if (!merged.shouldUpload) envelope.sync.pendingChanges = 0;
    save(); render();
    $("drive-status").textContent = "Đã merge backup schema v2; dữ liệu local không bị ghi đè.";
    $("conflict-status").textContent = merged.conflicts.length ? `Phát hiện ${merged.conflicts.length} xung đột; hệ thống giữ bản ghi theo updatedAt/deviceId.` : "Merge hoàn tất, không có xung đột.";
  }
  catch { alert("File JSON không hợp lệ hoặc không đúng định dạng backup."); }
  event.target.value = "";
});
$("sync").addEventListener("click", () => { $("drive-status").textContent = GOOGLE_DESKTOP_CLIENT_ID ? "Đã cấu hình Desktop Client ID; bước kế tiếp là mở OAuth loopback trong Tauri." : "Chưa có Desktop Client ID; dữ liệu local vẫn hoạt động bình thường."; });
render();
