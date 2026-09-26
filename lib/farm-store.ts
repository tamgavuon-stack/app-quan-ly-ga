import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

export type RecordKind = "expense" | "income" | "flock";
export type Period = "month" | "quarter" | "year";

export type FarmRecord = {
  id: string;
  kind: RecordKind;
  category: string;
  amount: number;
  quantity?: number;
  unit?: string;
  note?: string;
  date: string;
};

type FarmState = { records: FarmRecord[]; hydrated: boolean };

const STORAGE_KEY = "quan-ly-chan-nuoi-ga.records.v1";
let state: FarmState = { records: [], hydrated: false };
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => state;

async function persist(records: FarmRecord[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Dữ liệu trong bộ nhớ vẫn hoạt động nếu thiết bị tạm thời không ghi được.
  }
}

async function hydrate() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    state = { records: Array.isArray(parsed) ? parsed : [], hydrated: true };
  } catch {
    state = { records: [], hydrated: true };
  }
  notify();
}

void hydrate();

export function useFarmStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function addRecord(input: Omit<FarmRecord, "id">) {
  const record: FarmRecord = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  state = { ...state, records: [record, ...state.records] };
  notify();
  void persist(state.records);
  return record;
}

export function removeRecord(id: string) {
  state = { ...state, records: state.records.filter((record) => record.id !== id) };
  notify();
  void persist(state.records);
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
    return {
      start: dateKey(new Date(year, quarterStart, 1)),
      end: dateKey(new Date(year, quarterStart + 3, 0)),
    };
  }
  return {
    start: dateKey(new Date(year, month, 1)),
    end: dateKey(new Date(year, month + 1, 0)),
  };
}

export function filterByPeriod(records: FarmRecord[], period: Period, reference = new Date()) {
  const { start, end } = getPeriodBounds(period, reference);
  return records.filter((record) => record.date >= start && record.date <= end);
}

export function summarize(records: FarmRecord[]) {
  return records.reduce(
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

export const expenseCategories = ["Thức ăn", "Thuốc thú y", "Con giống", "Điện nước", "Nhân công", "Khác"];
export const incomeCategories = ["Gà thịt", "Trứng gà", "Gà con", "Gà giống", "Phân gà", "Khác"];
export const flockCategories = ["Gà đẻ", "Gà con", "Gà thịt", "Gà giống"];
