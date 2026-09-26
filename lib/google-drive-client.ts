import type { FarmSyncDocument } from "../shared/farm-schema";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
export const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export type GoogleDriveConfig = {
  clientId: string;
  redirectUri: string;
  scope?: string;
};

export type OAuthToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
};

export type DriveFile = {
  id: string;
  name: string;
  modifiedTime?: string;
  version?: string;
  md5Checksum?: string;
};

function assertResponse(response: Response, operation: string) {
  if (response.ok) return;
  throw new Error(`Google Drive ${operation} thất bại (${response.status})`);
}

export function buildGoogleAuthUrl(config: GoogleDriveConfig, params: { state: string; codeChallenge: string }) {
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: config.scope ?? GOOGLE_DRIVE_SCOPE,
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${query.toString()}`;
}

export async function exchangeAuthorizationCode(config: GoogleDriveConfig, code: string, codeVerifier: string): Promise<OAuthToken> {
  const body = new URLSearchParams({ client_id: config.clientId, code, code_verifier: codeVerifier, grant_type: "authorization_code", redirect_uri: config.redirectUri });
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
  await assertResponse(response, "đổi authorization code");
  const data = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number; token_type?: string };
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined, tokenType: data.token_type };
}

export async function refreshAccessToken(config: GoogleDriveConfig, refreshToken: string): Promise<OAuthToken> {
  const body = new URLSearchParams({ client_id: config.clientId, refresh_token: refreshToken, grant_type: "refresh_token" });
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
  await assertResponse(response, "làm mới access token");
  const data = await response.json() as { access_token: string; expires_in?: number; token_type?: string };
  return { accessToken: data.access_token, refreshToken, expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined, tokenType: data.token_type };
}

async function driveRequest<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DRIVE_API}${path}`, { ...init, headers: { Authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) } });
  await assertResponse(response, "API request");
  return response.json() as Promise<T>;
}

export async function findDataFile(accessToken: string, fileName: string): Promise<DriveFile | null> {
  const q = encodeURIComponent(`name = '${fileName.replace(/'/g, "\\'")}' and 'appDataFolder' in parents and trashed = false`);
  const data = await driveRequest<{ files: DriveFile[] }>(accessToken, `/files?q=${q}&spaces=appDataFolder&fields=files(id,name,modifiedTime,version,md5Checksum)`);
  return data.files[0] ?? null;
}

export async function downloadSyncDocument(accessToken: string, fileId: string): Promise<FarmSyncDocument> {
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
  await assertResponse(response, "tải dữ liệu");
  return response.json() as Promise<FarmSyncDocument>;
}

export async function uploadSyncDocument(accessToken: string, file: DriveFile | null, document: FarmSyncDocument): Promise<DriveFile> {
  const metadata = file ? { name: file.name } : { name: "quan-ly-chan-nuoi-ga-data-v2.json", parents: ["appDataFolder"] };
  const boundary = `farm_boundary_${Date.now()}`;
  const body = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(document)}\r\n`,
    `--${boundary}--`,
  ].join("");
  const method = file ? "PATCH" : "POST";
  const path = file ? `/files/${encodeURIComponent(file.id)}?uploadType=multipart&fields=id,name,modifiedTime,version,md5Checksum` : `/files?uploadType=multipart&fields=id,name,modifiedTime,version,md5Checksum`;
  const response = await fetch(`${DRIVE_UPLOAD_API}${path}`, { method, headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body });
  await assertResponse(response, "tải dữ liệu lên");
  return response.json() as Promise<DriveFile>;
}
