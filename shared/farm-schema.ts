export const FARM_SCHEMA_VERSION = 2 as const;
export const FARM_DOCUMENT_ID = "quan-ly-chan-nuoi-ga";

export type RecordKind = "expense" | "income" | "flock";
export type Period = "month" | "quarter" | "year";

/** Dữ liệu một giao dịch/lần cập nhật đàn trong hệ thống. */
export type FarmRecord = {
  id: string;
  kind: RecordKind;
  category: string;
  amount: number;
  quantity?: number;
  unit?: string;
  note?: string;
  /** Ngày nghiệp vụ theo múi giờ trang trại, định dạng YYYY-MM-DD. */
  date: string;
  /** Dấu thời gian ISO dùng cho đồng bộ và xử lý xung đột. */
  createdAt: string;
  updatedAt: string;
  /** Định danh thiết bị tạo/cập nhật bản ghi. */
  deviceId: string;
  /** Không xóa vật lý; dùng tombstone để thiết bị khác nhận biết bản ghi đã xóa. */
  deletedAt?: string;
};

/** Tài liệu chuẩn được lưu cục bộ hoặc trên Google Drive. */
export type FarmSyncDocument = {
  schemaVersion: typeof FARM_SCHEMA_VERSION;
  documentId: string;
  farmId: string;
  updatedAt: string;
  updatedBy: string;
  revision: number;
  records: FarmRecord[];
};

/** Dữ liệu cục bộ bao gồm thông tin thiết bị và trạng thái đồng bộ. */
export type FarmLocalEnvelope = {
  schemaVersion: typeof FARM_SCHEMA_VERSION;
  deviceId: string;
  farmId: string;
  records: FarmRecord[];
  sync: {
    lastSyncedAt?: string;
    remoteFileId?: string;
    remoteRevision?: number;
    pendingChanges: number;
  };
};

/** Kiểu dữ liệu v1 đang được phát hành trong app cũ. */
export type LegacyFarmRecord = {
  id: string;
  kind: RecordKind;
  category: string;
  amount: number;
  quantity?: number;
  unit?: string;
  note?: string;
  date: string;
};

function safeIso(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? fallback : new Date(timestamp).toISOString();
}

function safeDate(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeKind(value: unknown): RecordKind {
  return value === "income" || value === "flock" ? value : "expense";
}

/** Chuyển một bản ghi cũ hoặc không đầy đủ thành bản ghi schema v2. */
export function normalizeRecord(input: Partial<FarmRecord>, context: { now: string; deviceId: string; fallbackDate: string }): FarmRecord {
  const timestamp = safeIso(input.updatedAt ?? input.createdAt, context.now);
  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id : `${context.deviceId}-${context.now}`,
    kind: safeKind(input.kind),
    category: typeof input.category === "string" && input.category.trim() ? input.category : "Khác",
    amount: Math.max(0, safeNumber(input.amount)),
    quantity: input.quantity === undefined ? undefined : Math.max(0, safeNumber(input.quantity)),
    unit: typeof input.unit === "string" && input.unit.trim() ? input.unit : undefined,
    note: typeof input.note === "string" && input.note.trim() ? input.note.trim() : undefined,
    date: safeDate(input.date, context.fallbackDate),
    createdAt: safeIso(input.createdAt, timestamp),
    updatedAt: timestamp,
    deviceId: typeof input.deviceId === "string" && input.deviceId.trim() ? input.deviceId : context.deviceId,
    deletedAt: input.deletedAt ? safeIso(input.deletedAt, context.now) : undefined,
  };
}

/** Migration v1 array -> v2 document. Không làm thay đổi mảng đầu vào. */
export function migrateLegacyRecords(input: unknown, context: { now: string; deviceId: string; farmId?: string }): FarmLocalEnvelope {
  const source = Array.isArray(input) ? input : [];
  const fallbackDate = context.now.slice(0, 10);
  const records = source.map((item) => normalizeRecord(item as Partial<FarmRecord>, { ...context, fallbackDate }));
  return {
    schemaVersion: FARM_SCHEMA_VERSION,
    deviceId: context.deviceId,
    farmId: context.farmId ?? FARM_DOCUMENT_ID,
    records,
    sync: { pendingChanges: records.length },
  };
}

/** Chuẩn hóa envelope mới để import từ Drive không làm crash app khi thiếu field. */
export function normalizeLocalEnvelope(input: unknown, context: { now: string; deviceId: string; farmId?: string }): FarmLocalEnvelope {
  if (!input || typeof input !== "object" || Array.isArray(input)) return migrateLegacyRecords(input, context);
  const candidate = input as Partial<FarmLocalEnvelope>;
  const fallbackDate = context.now.slice(0, 10);
  const rawRecords = Array.isArray(candidate.records) ? candidate.records : [];
  const records = rawRecords.map((item) => normalizeRecord(item as Partial<FarmRecord>, { ...context, fallbackDate }));
  const sync = candidate.sync && typeof candidate.sync === "object" ? candidate.sync as Partial<FarmLocalEnvelope["sync"]> : {};
  return {
    schemaVersion: FARM_SCHEMA_VERSION,
    deviceId: typeof candidate.deviceId === "string" ? candidate.deviceId : context.deviceId,
    farmId: typeof candidate.farmId === "string" ? candidate.farmId : context.farmId ?? FARM_DOCUMENT_ID,
    records,
    sync: {
      lastSyncedAt: typeof sync.lastSyncedAt === "string" ? sync.lastSyncedAt : undefined,
      remoteFileId: typeof sync.remoteFileId === "string" ? sync.remoteFileId : undefined,
      remoteRevision: typeof sync.remoteRevision === "number" ? sync.remoteRevision : undefined,
      pendingChanges: typeof sync.pendingChanges === "number" ? Math.max(0, sync.pendingChanges) : records.length,
    },
  };
}

export function toSyncDocument(envelope: FarmLocalEnvelope, now: string, revision = 0): FarmSyncDocument {
  return {
    schemaVersion: FARM_SCHEMA_VERSION,
    documentId: FARM_DOCUMENT_ID,
    farmId: envelope.farmId,
    updatedAt: now,
    updatedBy: envelope.deviceId,
    revision,
    records: envelope.records,
  };
}

export const expenseCategories = ["Thức ăn", "Thuốc thú y", "Con giống", "Điện nước", "Nhân công", "Khác"];
export const incomeCategories = ["Gà thịt", "Trứng gà", "Gà con", "Gà giống", "Phân gà", "Khác"];
export const flockCategories = ["Gà đẻ", "Gà con", "Gà thịt", "Gà giống"];
