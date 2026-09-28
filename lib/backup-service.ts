import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as TaskManager from "expo-task-manager";
import * as XLSX from "xlsx";
import {
  FARM_DOCUMENT_ID,
  FARM_SCHEMA_VERSION,
  getFarmEnvelope,
  applySyncedEnvelope,
  formatDate,
  type FarmRecord,
  type Period,
  filterByPeriod,
  normalizeLocalEnvelope,
  STORAGE_KEY_V2,
} from "./farm-store";

export const DAILY_BACKUP_TASK = "quan-ly-chan-nuoi-ga-daily-backup";
const BACKUP_DIRECTORY = `${FileSystem.documentDirectory ?? ""}backups/`;
const LAST_BACKUP_KEY = "quan-ly-chan-nuoi-ga.last-backup-date.v1";

type BackupPayload = {
  app: typeof FARM_DOCUMENT_ID;
  schemaVersion: number;
  exportedAt: string;
  backupType: "manual" | "daily";
  envelope: ReturnType<typeof getFarmEnvelope>;
};

function dateStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: undefined, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function timeStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function backupPayload(backupType: BackupPayload["backupType"]): BackupPayload {
  return {
    app: FARM_DOCUMENT_ID,
    schemaVersion: FARM_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    backupType,
    envelope: getFarmEnvelope(),
  };
}

async function ensureBackupDirectory() {
  const info = await FileSystem.getInfoAsync(BACKUP_DIRECTORY);
  if (!info.exists) await FileSystem.makeDirectoryAsync(BACKUP_DIRECTORY, { intermediates: true });
}

export async function createBackupFile(backupType: BackupPayload["backupType"] = "manual") {
  await ensureBackupDirectory();
  const payload = backupPayload(backupType);
  const uri = `${BACKUP_DIRECTORY}${FARM_DOCUMENT_ID}-${backupType}-${timeStamp()}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
  await AsyncStorage.setItem(LAST_BACKUP_KEY, dateStamp());
  return uri;
}

export async function shareLocalFile(uri: string, mimeType: string, dialogTitle: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Thiết bị không hỗ trợ chia sẻ file.");
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
}

export async function backupNowAndShare() {
  const uri = await createBackupFile("manual");
  await shareLocalFile(uri, "application/json", "Sao lưu dữ liệu chăn nuôi gà");
  return uri;
}

function recordRows(records: FarmRecord[]) {
  return records.map((record) => ({
    "Ngày": formatDate(record.date),
    "Ngày chuẩn ISO": record.date,
    "Loại": record.kind === "income" ? "Doanh thu" : record.kind === "expense" ? "Chi phí" : "Đàn gà",
    "Danh mục": record.category,
    "Số tiền (VNĐ)": record.amount ?? 0,
    "Số lượng": record.quantity ?? 0,
    "Đơn vị": record.unit ?? "",
    "Ghi chú": record.note ?? "",
    "Mã bản ghi": record.id,
    "Cập nhật lúc": record.updatedAt,
  }));
}

export async function exportReportToExcel(period: Period) {
  const envelope = getFarmEnvelope();
  const records = filterByPeriod(envelope.records, period);
  const summary = records.reduce((result, record) => {
    if (record.kind === "income") result.income += record.amount ?? 0;
    if (record.kind === "expense") result.expense += record.amount ?? 0;
    if (record.kind === "flock") result.flock += record.quantity ?? 0;
    return result;
  }, { income: 0, expense: 0, flock: 0 });
  const rows = [
    { "Báo cáo": "Quản lý chăn nuôi gà", "Kỳ": period === "month" ? "Tháng hiện tại" : period === "quarter" ? "Quý hiện tại" : "Năm hiện tại", "Xuất lúc": new Date().toLocaleString("vi-VN") },
    { "Báo cáo": "Tổng doanh thu", "Kỳ": summary.income, "Xuất lúc": "VNĐ" },
    { "Báo cáo": "Tổng chi phí", "Kỳ": summary.expense, "Xuất lúc": "VNĐ" },
    { "Báo cáo": "Lãi / lỗ", "Kỳ": summary.income - summary.expense, "Xuất lúc": "VNĐ" },
    { "Báo cáo": "Tổng số lượng gà", "Kỳ": summary.flock, "Xuất lúc": "con" },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Tổng kết");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(recordRows(records)), "Giao dịch");
  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
  await ensureBackupDirectory();
  const uri = `${BACKUP_DIRECTORY}${FARM_DOCUMENT_ID}-bao-cao-${period}-${timeStamp()}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await shareLocalFile(uri, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Xuất báo cáo Excel");
  return uri;
}

function extractEnvelope(value: unknown) {
  const candidate = value && typeof value === "object" && "envelope" in value ? (value as { envelope: unknown }).envelope : value;
  return normalizeLocalEnvelope(candidate, { now: new Date().toISOString(), deviceId: getFarmEnvelope().deviceId });
}

export async function restoreFromBackupFile() {
  const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/json", "text/plain"], copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return false;
  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
  const envelope = extractEnvelope(JSON.parse(raw));
  applySyncedEnvelope(envelope);
  return true;
}

export async function getLastBackupDate() {
  return AsyncStorage.getItem(LAST_BACKUP_KEY);
}

export async function performDailyBackupIfNeeded() {
  const today = dateStamp();
  const last = await AsyncStorage.getItem(LAST_BACKUP_KEY);
  const now = new Date();
  if (last === today || now.getHours() < 20) return null;
  return createBackupFile("daily");
}

TaskManager.defineTask(DAILY_BACKUP_TASK, async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_V2);
    if (!raw) return BackgroundTask.BackgroundTaskResult.Success;
    const backup = await performDailyBackupIfNeeded();
    return backup ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerDailyBackupTask() {
  const registered = await TaskManager.isTaskRegisteredAsync(DAILY_BACKUP_TASK);
  if (!registered) await BackgroundTask.registerTaskAsync(DAILY_BACKUP_TASK);
}
