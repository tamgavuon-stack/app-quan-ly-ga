import { describe, expect, it } from "vitest";
import { filterByPeriod, formatCurrency, getActiveRecords, getPeriodBounds, summarize } from "../lib/farm-store";
import { FARM_SCHEMA_VERSION, migrateLegacyRecords, normalizeLocalEnvelope, type FarmRecord } from "../shared/farm-schema";

describe("farm schema v2 and reporting", () => {
  const records: FarmRecord[] = [
    { id: "1", kind: "expense", category: "Thức ăn", amount: 2_000_000, date: "2026-09-05", createdAt: "2026-09-05T08:00:00.000Z", updatedAt: "2026-09-05T08:00:00.000Z", deviceId: "android-1" },
    { id: "2", kind: "expense", category: "Thuốc thú y", amount: 500_000, date: "2026-09-10", createdAt: "2026-09-10T08:00:00.000Z", updatedAt: "2026-09-10T08:00:00.000Z", deviceId: "android-1" },
    { id: "3", kind: "income", category: "Gà thịt", amount: 4_000_000, date: "2026-09-20", createdAt: "2026-09-20T08:00:00.000Z", updatedAt: "2026-09-20T08:00:00.000Z", deviceId: "windows-1" },
    { id: "4", kind: "flock", category: "Gà con", amount: 0, quantity: 300, date: "2026-08-28", createdAt: "2026-08-28T08:00:00.000Z", updatedAt: "2026-08-28T08:00:00.000Z", deviceId: "android-1" },
    { id: "deleted", kind: "expense", category: "Khác", amount: 999_000, date: "2026-09-12", createdAt: "2026-09-12T08:00:00.000Z", updatedAt: "2026-09-12T08:00:00.000Z", deviceId: "android-1", deletedAt: "2026-09-13T08:00:00.000Z" },
  ];

  it("tổng hợp và bỏ qua tombstone đã xóa mềm", () => {
    expect(summarize(records)).toEqual({ income: 4_000_000, expense: 2_500_000, flockCount: 300 });
    expect(getActiveRecords(records).some((record) => record.id === "deleted")).toBe(false);
  });

  it("lọc đúng tháng, quý và năm", () => {
    const reference = new Date(2026, 8, 26);
    expect(filterByPeriod(records, "month", reference).map((item) => item.id)).toEqual(["1", "2", "3"]);
    expect(filterByPeriod(records, "quarter", reference).map((item) => item.id)).toEqual(["1", "2", "3", "4"]);
    expect(filterByPeriod(records, "year", reference).map((item) => item.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("tạo biên kỳ chính xác", () => {
    const reference = new Date(2026, 8, 26);
    expect(getPeriodBounds("month", reference)).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(getPeriodBounds("quarter", reference)).toEqual({ start: "2026-07-01", end: "2026-09-30" });
    expect(getPeriodBounds("year", reference)).toEqual({ start: "2026-01-01", end: "2026-12-31" });
  });

  it("migration v1 thêm metadata cần cho đồng bộ", () => {
    const migrated = migrateLegacyRecords([{ id: "legacy-1", kind: "expense", category: "Thức ăn", amount: 1000, date: "2026-09-01" }], { now: "2026-09-26T10:00:00.000Z", deviceId: "android-1" });
    expect(migrated.schemaVersion).toBe(FARM_SCHEMA_VERSION);
    expect(migrated.records[0]).toMatchObject({ id: "legacy-1", deviceId: "android-1", createdAt: "2026-09-26T10:00:00.000Z", updatedAt: "2026-09-26T10:00:00.000Z" });
    expect(migrated.sync.pendingChanges).toBe(1);
  });

  it("normalize dữ liệu Drive thiếu field mà không crash", () => {
    const normalized = normalizeLocalEnvelope({ schemaVersion: 2, records: [{ id: "x", kind: "income", amount: 2500, date: "bad" }] }, { now: "2026-09-26T10:00:00.000Z", deviceId: "windows-1" });
    expect(normalized.schemaVersion).toBe(2);
    expect(normalized.records[0]).toMatchObject({ category: "Khác", date: "2026-09-26", deviceId: "windows-1", amount: 2500 });
  });

  it("định dạng tiền Việt Nam", () => {
    expect(formatCurrency(2500000)).toBe("2.500.000 đ");
  });
});
