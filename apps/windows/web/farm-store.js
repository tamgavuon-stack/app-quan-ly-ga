export const STORAGE_KEY = "quan-ly-chan-nuoi-ga.windows.records.v1";

export function normalizeRecords(value) {
  return Array.isArray(value) ? value.filter((record) => record && typeof record === "object" && typeof record.id === "string") : [];
}

export function summarize(records) {
  return records.reduce((summary, record) => {
    if (record.kind === "expense") summary.expense += Number(record.amount) || 0;
    if (record.kind === "income") summary.income += Number(record.amount) || 0;
    if (record.kind === "flock") summary.flockCount += Number(record.quantity) || 0;
    return summary;
  }, { income: 0, expense: 0, flockCount: 0 });
}

export function addRecord(records, input) {
  const record = { ...input, id: `windows-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() };
  return [record, ...records];
}

export function formatCurrency(value) {
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}
