import test from "node:test";
import assert from "node:assert/strict";
import { addRecord, formatCurrency, makeEnvelope, normalizeEnvelope, summarize, toSyncDocument } from "./farm-store.js";

test("summarize calculates income, expense, and flock count", () => {
  const summary = summarize([
    { kind: "income", amount: 1200000 },
    { kind: "expense", amount: 450000 },
    { kind: "flock", quantity: 80 },
  ]);
  assert.deepEqual(summary, { income: 1200000, expense: 450000, flockCount: 80 });
});

test("addRecord creates a schema-v2 compatible record without mutation", () => {
  const records = [];
  const next = addRecord(records, { kind: "expense", category: "Thức ăn", amount: 100000, date: "2026-09-26" }, "windows-test");
  assert.equal(records.length, 0);
  assert.equal(next.length, 1);
  assert.equal(next[0].category, "Thức ăn");
  assert.equal(next[0].deviceId, "windows-test");
  assert.equal(next[0].updatedAt.endsWith("Z"), true);
});

test("normalizeEnvelope migrates legacy array into schema v2", () => {
  const envelope = normalizeEnvelope([{ id: "old-1", kind: "income", category: "Gà thịt", amount: 900000, date: "2026-09-26" }], { deviceId: "windows-1", now: "2026-09-26T00:00:00.000Z" });
  assert.equal(envelope.schemaVersion, 2);
  assert.equal(envelope.farmId, "quan-ly-chan-nuoi-ga");
  assert.equal(envelope.records[0].deviceId, "windows-1");
  assert.equal(envelope.sync.pendingChanges, 1);
});

test("toSyncDocument produces Drive-compatible document", () => {
  const envelope = makeEnvelope([{ id: "r1", kind: "expense", category: "Thuốc thú y", amount: 100000, date: "2026-09-26" }], "windows-1");
  const document = toSyncDocument(envelope, "2026-09-26T00:00:00.000Z", 4);
  assert.deepEqual({ schemaVersion: document.schemaVersion, documentId: document.documentId, revision: document.revision, updatedBy: document.updatedBy }, { schemaVersion: 2, documentId: "quan-ly-chan-nuoi-ga", revision: 4, updatedBy: "windows-1" });
});

test("formatCurrency uses Vietnamese dong format", () => {
  assert.equal(formatCurrency(1250000), "1.250.000 đ");
});
