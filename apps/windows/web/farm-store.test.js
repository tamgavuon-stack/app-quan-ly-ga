import test from "node:test";
import assert from "node:assert/strict";
import { addRecord, formatCurrency, summarize } from "./farm-store.js";

test("summarize calculates income, expense, and flock count", () => {
  const summary = summarize([
    { kind: "income", amount: 1200000 },
    { kind: "expense", amount: 450000 },
    { kind: "flock", quantity: 80 },
  ]);
  assert.deepEqual(summary, { income: 1200000, expense: 450000, flockCount: 80 });
});

test("addRecord creates a record without mutating the input array", () => {
  const records = [];
  const next = addRecord(records, { kind: "expense", category: "Thức ăn", amount: 100000 });
  assert.equal(records.length, 0);
  assert.equal(next.length, 1);
  assert.equal(next[0].category, "Thức ăn");
});

test("formatCurrency uses Vietnamese dong format", () => {
  assert.equal(formatCurrency(1250000), "1.250.000 đ");
});
