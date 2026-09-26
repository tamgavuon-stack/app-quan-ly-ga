import { GOOGLE_DESKTOP_CLIENT_ID } from "./config.js";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FILE_NAME = "quan-ly-chan-nuoi-ga-data-v2.json";

async function assertOk(response, operation) {
  if (!response.ok) throw new Error(`Google Drive ${operation} thất bại (${response.status})`);
}

export async function refreshDesktopAccessToken(refreshToken) {
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: GOOGLE_DESKTOP_CLIENT_ID, refresh_token: refreshToken, grant_type: "refresh_token" }).toString() });
  await assertOk(response, "làm mới token");
  const data = await response.json();
  return { accessToken: data.access_token, refreshToken, expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined, tokenType: data.token_type };
}

async function driveJson(accessToken, path, init = {}) {
  const response = await fetch(`${DRIVE_API}${path}`, { ...init, headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers || {}) } });
  await assertOk(response, "API request");
  return response.json();
}

export async function findSyncFile(accessToken) {
  const query = encodeURIComponent(`name = '${FILE_NAME}' and 'appDataFolder' in parents and trashed = false`);
  const data = await driveJson(accessToken, `/files?q=${query}&spaces=appDataFolder&fields=files(id,name,modifiedTime,version,md5Checksum)`);
  return data.files?.[0] || null;
}

export async function downloadSyncDocument(accessToken, fileId) {
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
  await assertOk(response, "tải dữ liệu");
  return response.json();
}

export async function uploadSyncDocument(accessToken, file, document) {
  const boundary = `farm_boundary_${Date.now()}`;
  const metadata = file ? { name: FILE_NAME } : { name: FILE_NAME, parents: ["appDataFolder"] };
  const body = [`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`, `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(document)}\r\n`, `--${boundary}--`].join("");
  const method = file ? "PATCH" : "POST";
  const path = file ? `/files/${encodeURIComponent(file.id)}?uploadType=multipart&fields=id,name,modifiedTime,version,md5Checksum` : `/files?uploadType=multipart&fields=id,name,modifiedTime,version,md5Checksum`;
  const response = await fetch(`${DRIVE_UPLOAD_API}${path}`, { method, headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body });
  await assertOk(response, "tải dữ liệu lên");
  return response.json();
}
