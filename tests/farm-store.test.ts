import { describe, expect, it } from "vitest";
import { filterByPeriod, formatCurrency, getPeriodBounds, summarize, type FarmRecord } from "../lib/farm-store";

describe("farm store reporting", () => {
  const records: FarmRecord[] = [
    { id: "1", kind: "expense", category: "Thức ăn", amount: 2_000_000, date: "2026-09-05" },
    { id: "2", kind: "expense", category: "Thuốc thú y", amount: 500_000, date: "2026-09-10" },
    { id: "3", kind: "income", category: "Gà thịt", amount: 4_000_000, date: "2026-09-20" },
    { id: "4", kind: "flock", category: "Gà con", amount: 0, quantity: 300, date: "2026-08-28" },
  ];

  it("tổng hợp doanh thu, chi phí và số đàn", () => {
    expect(summarize(records)).toEqual({ income: 4_000_000, expense: 2_500_000, flockCount: 300 });
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

  it("định dạng tiền Việt Nam", () => {
    expect(formatCurrency(2500000)).toBe("2.500.000 đ");
  });
});
