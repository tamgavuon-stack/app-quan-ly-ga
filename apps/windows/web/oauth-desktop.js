import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { GOOGLE_DESKTOP_CLIENT_ID, GOOGLE_DRIVE_SCOPE } from "./config.js";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function randomString(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}
async function sha256(value) { return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))); }

export async function authenticateDesktopGoogle() {
  if (!GOOGLE_DESKTOP_CLIENT_ID) throw new Error("Thiếu Desktop OAuth Client ID");
  const verifier = randomString(48);
  const state = randomString(24);
  const challenge = base64Url(await sha256(verifier));
  const authUrl = `${AUTH_ENDPOINT}?${new URLSearchParams({ client_id: GOOGLE_DESKTOP_CLIENT_ID, redirect_uri: "__LOOPBACK_REDIRECT__", response_type: "code", access_type: "offline", prompt: "consent", scope: GOOGLE_DRIVE_SCOPE, state, code_challenge: challenge, code_challenge_method: "S256" })}`;
  let stopListening;
  let resolveCallback;
  let rejectCallback;
  const callback = new Promise((resolve, reject) => { resolveCallback = resolve; rejectCallback = reject; });
  stopListening = await listen("google-oauth-callback", (event) => resolveCallback(event.payload));
  const timeout = setTimeout(() => rejectCallback(new Error("Hết thời gian chờ đăng nhập Google")), 180000);
  await invoke("start_google_oauth", { authUrl, expectedState: state });
  const result = await callback;
  clearTimeout(timeout);
  if (stopListening) await stopListening();
  if (result.error) throw new Error(`Google OAuth từ chối: ${result.error}`);
  if (!result.code) throw new Error("Google không trả về authorization code");
  const response = await fetch(TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: GOOGLE_DESKTOP_CLIENT_ID, code: result.code, code_verifier: verifier, grant_type: "authorization_code", redirect_uri: `http://127.0.0.1:${result.port || ""}/oauth/callback` }).toString() });
  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json();
      detail = payload.error_description || payload.error || "";
    } catch { /* response may not be JSON */ }
    throw new Error(`Google đổi authorization code thất bại (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  const token = await response.json();
  return { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined, tokenType: token.token_type };
}

export function isTauriRuntime() { return Boolean(window.__TAURI_INTERNALS__); }
export async function saveRefreshToken(refreshToken) { return invoke("store_refresh_token", { refreshToken }); }
export async function loadRefreshToken() { return invoke("load_refresh_token"); }
export async function clearRefreshToken() { return invoke("clear_refresh_token"); }
