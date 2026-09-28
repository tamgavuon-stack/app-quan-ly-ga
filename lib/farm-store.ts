import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import {
  FARM_DOCUMENT_ID,
  FARM_SCHEMA_VERSION,
  expenseCategories,
  flockCategories,
  incomeCategories,
  migrateLegacyRecords,
  normalizeLocalEnvelope,
  type FarmLocalEnvelope,
  type FarmRecord,
  type Period,
  type RecordKind,
} from "../shared/farm-schema";

export { FARM_DOCUMENT_ID, FARM_SCHEMA_VERSION, expenseCategories, flockCategories, incomeCategories } from "../shared/farm-schema";
export { normalizeLocalEnvelope } from "../shared/farm-schema";
export type { FarmLocalEnvelope, FarmRecord, Period, RecordKind } from "../shared/farm-schema";

const STORAGE_KEY_V1 = "quan-ly-chan-nuoi-ga.records.v1";
export const STORAGE_KEY_V2 = "quan-ly-chan-nuoi-ga.local.v2";
const DEVICE_ID_KEY = "quan-ly-chan-nuoi-ga.device-id.v1";

type FarmState = FarmLocalEnvelope & { hydrated: boolean };

let state: FarmState = {
  schemaVersion: FARM_SCHEMA_VERSION,
  deviceId: "unknown-device",
  farmId: FARM_DOCUMENT_ID,
  records: [],
  sync: { pendingChanges: 0 },
  hydrated: false,
};
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => state;

function nowIso() {
  return new Date().toISOString();
}

function createDeviceId() {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getDeviceId() {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const generated = createDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return createDeviceId();
  }
}

async function persist(envelope: FarmLocalEnvelope) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_V2, JSON.stringify(envelope));
  } catch {
    // Dữ liệu trong bộ nhớ vẫn hoạt động nếu thiết bị tạm thời không ghi được.
  }
}

async function hydrate() {
  const deviceId = await getDeviceId();
  const now = nowIso();
  try {
    const current = await AsyncStorage.getItem(STORAGE_KEY_V2);
    if (current) {
      const envelope = normalizeLocalEnvelope(JSON.parse(current), { now, deviceId });
      state = { ...envelope, deviceId, hydrated: true };
      notify();
      return;
    }

    const legacy = await AsyncStorage.getItem(STORAGE_KEY_V1);
    const envelope = migrateLegacyRecords(legacy ? JSON.parse(legacy) : [], { now, deviceId });
    state = { ...envelope, hydrated: true };
    await persist(envelope);
    notify();
  } catch {
    state = { ...state, deviceId, hydrated: true };
    notify();
  }
}

void hydrate();

export function useFarmStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Snapshot không chứa cờ UI hydrated, dùng cho sync engine. */
export function getFarmEnvelope(): FarmLocalEnvelope {
  const { hydrated: _hydrated, ...envelope } = state;
  return envelope;
}

/** Ghi kết quả merge từ Drive về local và thông báo cho toàn bộ màn hình. */
export function applySyncedEnvelope(envelope: FarmLocalEnvelope) {
  state = { ...envelope, hydrated: true };
  notify();
  void persist(envelope);
}

export function addRecord(input: Omit<FarmRecord, "id" | "createdAt" | "updatedAt" | "deviceId">) {
  const timestamp = nowIso();
  const record: FarmRecord = {
    ...input,
    id: `${state.deviceId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    deviceId: state.deviceId,
  };
  state = { ...state, records: [record, ...state.records], sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 } };
  notify();
  void persist(state);
  return record;
}

export function updateRecord(id: string, patch: Partial<Pick<FarmRecord, "category" | "amount" | "quantity" | "unit" | "note" | "date">>) {
  const timestamp = nowIso();
  state = {
    ...state,
    records: state.records.map((record) => record.id === id ? { ...record, ...patch, updatedAt: timestamp, deviceId: state.deviceId } : record),
    sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 },
  };
  notify();
  void persist(state);
}

/** Xóa mềm để thiết bị khác nhận biết thay đổi trong lần đồng bộ tiếp theo. */
export function removeRecord(id: string) {
  const timestamp = nowIso();
  state = {
    ...state,
    records: state.records.map((record) => record.id === id ? { ...record, deletedAt: timestamp, updatedAt: timestamp, deviceId: state.deviceId } : record),
    sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 },
  };
  notify();
  void persist(state);
}

export function getActiveRecords(records: FarmRecord[]) {
  return records.filter((record) => !record.deletedAt);
}

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function currentDateKey() {
  return dateKey(new Date());
}

export function getPeriodBounds(period: Period, reference = new Date()) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  if (period === "year") return { start: `${year}-01-01`, end: `${year}-12-31` };
  if (period === "quarter") {
    const quarterStart = Math.floor(month / 3) * 3;
    return { start: dateKey(new Date(year, quarterStart, 1)), end: dateKey(new Date(year, quarterStart + 3, 0)) };
  }
  return { start: dateKey(new Date(year, month, 1)), end: dateKey(new Date(year, month + 1, 0)) };
}

export function filterByPeriod(records: FarmRecord[], period: Period, reference = new Date()) {
  const { start, end } = getPeriodBounds(period, reference);
  return getActiveRecords(records).filter((record) => record.date >= start && record.date <= end);
}

export function summarize(records: FarmRecord[]) {
  return getActiveRecords(records).reduce(
    (summary, record) => {
      if (record.kind === "expense") summary.expense += record.amount;
      if (record.kind === "income") summary.income += record.amount;
      if (record.kind === "flock") summary.flockCount += record.quantity ?? 0;
      return summary;
    },
    { income: 0, expense: 0, flockCount: 0 },
  );
}

export function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

export function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function periodTitle(period: Period, reference = new Date()) {
  if (period === "year") return `Năm ${reference.getFullYear()}`;
  if (period === "quarter") return `Quý ${Math.floor(reference.getMonth() / 3) + 1}/${reference.getFullYear()}`;
  return `Tháng ${reference.getMonth() + 1}/${reference.getFullYear()}`;
}
