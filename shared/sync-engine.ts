import type { FarmLocalEnvelope, FarmRecord, FarmSyncDocument } from "./farm-schema";

export type SyncConflict = {
  recordId: string;
  local: FarmRecord;
  remote: FarmRecord;
  winner: "local" | "remote";
  reason: "same-time-different-content" | "delete-vs-update";
};

export type MergeResult = {
  records: FarmRecord[];
  conflicts: SyncConflict[];
  changed: boolean;
};

function stableRecord(record: FarmRecord) {
  const { updatedAt, deviceId, ...value } = record;
  return JSON.stringify(value);
}

function compareRecords(local: FarmRecord, remote: FarmRecord): "local" | "remote" {
  if (local.updatedAt !== remote.updatedAt) return local.updatedAt > remote.updatedAt ? "local" : "remote";
  return local.deviceId >= remote.deviceId ? "local" : "remote";
}

function mergeRecord(local: FarmRecord, remote: FarmRecord, conflicts: SyncConflict[]) {
  const winner = compareRecords(local, remote);
  const localDeleted = Boolean(local.deletedAt);
  const remoteDeleted = Boolean(remote.deletedAt);
  if (localDeleted !== remoteDeleted && stableRecord(local) !== stableRecord(remote)) {
    conflicts.push({ recordId: local.id, local, remote, winner, reason: "delete-vs-update" });
  } else if (local.updatedAt === remote.updatedAt && stableRecord(local) !== stableRecord(remote)) {
    conflicts.push({ recordId: local.id, local, remote, winner, reason: "same-time-different-content" });
  }
  return winner === "local" ? local : remote;
}

/** Merge theo id + updatedAt, luôn giữ tombstone để thiết bị khác nhận biết xóa. */
export function mergeRecords(localRecords: FarmRecord[], remoteRecords: FarmRecord[]): MergeResult {
  const byId = new Map(localRecords.map((record) => [record.id, record]));
  const conflicts: SyncConflict[] = [];
  let changed = false;

  for (const remote of remoteRecords) {
    const local = byId.get(remote.id);
    if (!local) {
      byId.set(remote.id, remote);
      changed = true;
      continue;
    }
    const merged = mergeRecord(local, remote, conflicts);
    if (merged !== local) {
      byId.set(remote.id, merged);
      changed = true;
    }
  }

  return { records: [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), conflicts, changed };
}

export function mergeDocuments(local: FarmLocalEnvelope, remote: FarmSyncDocument, now: string): { envelope: FarmLocalEnvelope; conflicts: SyncConflict[]; shouldUpload: boolean } {
  const merged = mergeRecords(local.records, remote.records);
  const localChanged = local.sync.pendingChanges > 0;
  // Nếu chỉ remote thay đổi thì tải xuống là đủ; chỉ upload khi local còn thay đổi chờ gửi.
  const shouldUpload = localChanged;
  return {
    envelope: {
      ...local,
      records: merged.records,
      sync: {
        ...local.sync,
        lastSyncedAt: now,
        remoteRevision: remote.revision,
        pendingChanges: shouldUpload ? local.sync.pendingChanges : 0,
      },
    },
    conflicts: merged.conflicts,
    shouldUpload,
  };
}

export function countPendingChanges(records: FarmRecord[], lastSyncedAt?: string) {
  if (!lastSyncedAt) return records.length;
  return records.filter((record) => record.updatedAt > lastSyncedAt).length;
}
