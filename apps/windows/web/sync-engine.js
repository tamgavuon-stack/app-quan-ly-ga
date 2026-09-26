function stableRecord(record) {
  const { updatedAt, deviceId, ...value } = record;
  return JSON.stringify(value);
}
function compareRecords(local, remote) {
  if (local.updatedAt !== remote.updatedAt) return local.updatedAt > remote.updatedAt ? "local" : "remote";
  return local.deviceId >= remote.deviceId ? "local" : "remote";
}

export function mergeRecords(localRecords, remoteRecords) {
  const byId = new Map(localRecords.map((record) => [record.id, record]));
  const conflicts = [];
  let changed = false;
  for (const remote of remoteRecords) {
    const local = byId.get(remote.id);
    if (!local) { byId.set(remote.id, remote); changed = true; continue; }
    const winner = compareRecords(local, remote);
    const localDeleted = Boolean(local.deletedAt);
    const remoteDeleted = Boolean(remote.deletedAt);
    if (localDeleted !== remoteDeleted && stableRecord(local) !== stableRecord(remote)) conflicts.push({ recordId: local.id, local, remote, winner, reason: "delete-vs-update" });
    else if (local.updatedAt === remote.updatedAt && stableRecord(local) !== stableRecord(remote)) conflicts.push({ recordId: local.id, local, remote, winner, reason: "same-time-different-content" });
    const selected = winner === "local" ? local : remote;
    if (selected !== local) { byId.set(remote.id, selected); changed = true; }
  }
  return { records: [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), conflicts, changed };
}

export function mergeEnvelopes(local, remote, now = new Date().toISOString()) {
  const merged = mergeRecords(local.records, remote.records);
  const shouldUpload = local.sync.pendingChanges > 0;
  return {
    envelope: {
      ...local,
      records: merged.records,
      sync: { ...local.sync, lastSyncedAt: now, remoteFileId: remote.sync?.remoteFileId || local.sync.remoteFileId, remoteRevision: remote.revision ?? remote.sync?.remoteRevision ?? local.sync.remoteRevision, pendingChanges: shouldUpload ? local.sync.pendingChanges : 0 },
    },
    conflicts: merged.conflicts,
    shouldUpload,
  };
}
