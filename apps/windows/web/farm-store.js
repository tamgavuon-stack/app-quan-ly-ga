export const FARM_SCHEMA_VERSION = 2;
export const FARM_DOCUMENT_ID = "quan-ly-chan-nuoi-ga";
export const STORAGE_KEY = "quan-ly-chan-nuoi-ga.windows.local.v2";
export const DEVICE_KEY = "quan-ly-chan-nuoi-ga.windows.device.v1";

function safeDate(value, fallback) { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback; }
function safeIso(value, fallback) { const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN; return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString(); }
function safeNumber(value) { return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0; }

export function normalizeRecord(input, { now = new Date().toISOString(), deviceId = "windows-device", fallbackDate = now.slice(0, 10) } = {}) {
  const updatedAt = safeIso(input?.updatedAt || input?.createdAt, now);
  return {
    id: typeof input?.id === "string" && input.id.trim() ? input.id : `${deviceId}-${Date.now()}`,
    kind: input?.kind === "income" || input?.kind === "flock" ? input.kind : "expense",
    category: typeof input?.category === "string" && input.category.trim() ? input.category.trim() : "Khác",
    amount: safeNumber(input?.amount),
    ...(input?.quantity === undefined ? {} : { quantity: safeNumber(input.quantity) }),
    ...(input?.unit ? { unit: String(input.unit) } : {}),
    ...(input?.note ? { note: String(input.note).trim() } : {}),
    date: safeDate(input?.date, fallbackDate),
    createdAt: safeIso(input?.createdAt, updatedAt),
    updatedAt,
    deviceId: typeof input?.deviceId === "string" && input.deviceId.trim() ? input.deviceId : deviceId,
    ...(input?.deletedAt ? { deletedAt: safeIso(input.deletedAt, now) } : {}),
  };
}

export function normalizeEnvelope(value, { now = new Date().toISOString(), deviceId = "windows-device", farmId = FARM_DOCUMENT_ID } = {}) {
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value : { records: value };
  const records = Array.isArray(candidate.records) ? candidate.records.map((record) => normalizeRecord(record, { now, deviceId })) : [];
  const sync = candidate.sync && typeof candidate.sync === "object" ? candidate.sync : {};
  return {
    schemaVersion: FARM_SCHEMA_VERSION,
    deviceId: typeof candidate.deviceId === "string" ? candidate.deviceId : deviceId,
    farmId: typeof candidate.farmId === "string" ? candidate.farmId : farmId,
    records,
    sync: {
      ...(sync.lastSyncedAt ? { lastSyncedAt: sync.lastSyncedAt } : {}),
      ...(sync.remoteFileId ? { remoteFileId: sync.remoteFileId } : {}),
      ...(Number.isFinite(sync.remoteRevision) ? { remoteRevision: sync.remoteRevision } : {}),
      pendingChanges: Number.isFinite(sync.pendingChanges) ? Math.max(0, sync.pendingChanges) : records.length,
    },
  };
}

export function makeEnvelope(records, deviceId, sync = {}) {
  return normalizeEnvelope({ schemaVersion: FARM_SCHEMA_VERSION, deviceId, farmId: FARM_DOCUMENT_ID, records, sync }, { deviceId });
}

export function toSyncDocument(envelope, now = new Date().toISOString(), revision = 0) {
  return { schemaVersion: FARM_SCHEMA_VERSION, documentId: FARM_DOCUMENT_ID, farmId: envelope.farmId, updatedAt: now, updatedBy: envelope.deviceId, revision, records: envelope.records };
}

export function summarize(records) {
  return records.filter((record) => !record.deletedAt).reduce((summary, record) => {
    if (record.kind === "income") summary.income += safeNumber(record.amount);
    if (record.kind === "expense") summary.expense += safeNumber(record.amount);
    if (record.kind === "flock") summary.flockCount += safeNumber(record.quantity);
    return summary;
  }, { income: 0, expense: 0, flockCount: 0 });
}

export function addRecord(records, input, deviceId = "windows-device", now = new Date().toISOString()) {
  const record = normalizeRecord({ ...input, id: `${deviceId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: now, updatedAt: now, deviceId }, { now, deviceId });
  return [record, ...records];
}

export function formatCurrency(value) { return `${Math.round(value).toLocaleString("vi-VN")} đ`; }
