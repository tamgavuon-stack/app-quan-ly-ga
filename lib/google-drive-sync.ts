import * as Linking from "expo-linking";
import { applySyncedEnvelope, getFarmEnvelope } from "./farm-store";
import { downloadSyncDocument, findDataFile, refreshAccessToken, uploadSyncDocument, type OAuthToken } from "./google-drive-client";
import { mergeDocuments } from "../shared/sync-engine";
import { normalizeLocalEnvelope, toSyncDocument } from "../shared/farm-schema";
import { isTokenExpired, loadDriveToken, saveDriveToken } from "./sync-credentials";

export const GOOGLE_DRIVE_DATA_FILE = "quan-ly-chan-nuoi-ga-data-v2.json";

export type DriveSyncResult = {
  uploaded: boolean;
  createdFile: boolean;
  conflicts: number;
  token: OAuthToken;
  remoteRevision: number;
};

async function runWithRefresh<T>(clientId: string, operation: (accessToken: string) => Promise<T>) {
  let token = await loadDriveToken();
  if (!token?.accessToken) throw new Error("Chưa kết nối Google Drive");
  if (isTokenExpired(token)) {
    if (!token.refreshToken) throw new Error("Phiên Google Drive đã hết hạn, hãy kết nối lại");
    token = await refreshAccessToken({ clientId, redirectUri: Linking.createURL("oauth") }, token.refreshToken);
    await saveDriveToken(token);
  }
  try {
    return { value: await operation(token.accessToken), token };
  } catch (error) {
    if (!String(error).includes("(401)") || !token.refreshToken) throw error;
    const refreshed = await refreshAccessToken({ clientId, redirectUri: Linking.createURL("oauth") }, token.refreshToken);
    await saveDriveToken(refreshed);
    return { value: await operation(refreshed.accessToken), token: refreshed };
  }
}

/** Đồng bộ local ↔ Drive; không xóa vật lý và luôn giữ tombstone. */
export async function syncWithGoogleDrive(clientId: string): Promise<DriveSyncResult> {
  if (!clientId) throw new Error("Thiếu Google Drive Client ID");
  const local = getFarmEnvelope();
  const now = new Date().toISOString();
  const result = await runWithRefresh(clientId, async (accessToken) => {
    const file = await findDataFile(accessToken, GOOGLE_DRIVE_DATA_FILE);
    if (!file) {
      const created = await uploadSyncDocument(accessToken, null, toSyncDocument(local, now, 1));
      applySyncedEnvelope({ ...local, sync: { ...local.sync, lastSyncedAt: now, remoteFileId: created.id, remoteRevision: 1, pendingChanges: 0 } });
      return { uploaded: true, createdFile: true, conflicts: 0, remoteRevision: 1 };
    }

    const remoteRaw = await downloadSyncDocument(accessToken, file.id);
    const remoteEnvelope = normalizeLocalEnvelope(remoteRaw, { now, deviceId: local.deviceId, farmId: local.farmId });
    const remoteDocument = toSyncDocument(remoteEnvelope, remoteRaw.updatedAt || now, remoteRaw.revision || 0);
    const merged = mergeDocuments(local, remoteDocument, now);
    let remoteRevision = remoteDocument.revision;
    let uploaded = false;

    if (merged.shouldUpload) {
      remoteRevision += 1;
      await uploadSyncDocument(accessToken, file, toSyncDocument({ ...merged.envelope, sync: { ...merged.envelope.sync, pendingChanges: 0 } }, now, remoteRevision));
      uploaded = true;
    }

    applySyncedEnvelope({ ...merged.envelope, sync: { ...merged.envelope.sync, lastSyncedAt: now, remoteFileId: file.id, remoteRevision, pendingChanges: 0 } });
    return { uploaded, createdFile: false, conflicts: merged.conflicts.length, remoteRevision };
  });

  return { ...result.value, token: result.token };
}
