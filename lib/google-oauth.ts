import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { buildGoogleAuthUrl, exchangeAuthorizationCode, type GoogleDriveConfig, type OAuthToken } from "./google-drive-client";

export type PkcePair = { verifier: string; challenge: string; state: string };

function base64UrlFromBytes(bytes: Uint8Array) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const triplet = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    result += alphabet[(triplet >> 18) & 63] + alphabet[(triplet >> 12) & 63] + (second === undefined ? "=" : alphabet[(triplet >> 6) & 63]) + (third === undefined ? "=" : alphabet[triplet & 63]);
  }
  return result.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesFromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

export async function createPkcePair(): Promise<PkcePair> {
  const verifier = base64UrlFromBytes(await Crypto.getRandomBytesAsync(32));
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
  return { verifier, challenge: base64UrlFromBytes(bytesFromHex(digest)), state: base64UrlFromBytes(await Crypto.getRandomBytesAsync(24)) };
}

export async function authenticateWithGoogleDrive(clientId: string): Promise<OAuthToken> {
  if (!clientId) throw new Error("Thiếu Google Drive Client ID");
  const redirectUri = Linking.createURL("oauth");
  const config: GoogleDriveConfig = { clientId, redirectUri };
  const pkce = await createPkcePair();
  const authUrl = buildGoogleAuthUrl(config, { state: pkce.state, codeChallenge: pkce.challenge });
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== "success" || !result.url) throw new Error("Đăng nhập Google đã bị hủy hoặc không trả về mã xác thực");
  const parsed = Linking.parse(result.url);
  const query = parsed.queryParams ?? {};
  const returnedState = typeof query.state === "string" ? query.state : "";
  const code = typeof query.code === "string" ? query.code : "";
  const oauthError = typeof query.error === "string" ? query.error : "";
  if (returnedState !== pkce.state) throw new Error("State OAuth không hợp lệ");
  if (oauthError) throw new Error(`Google OAuth: ${oauthError}`);
  if (!code) throw new Error("Google không trả về authorization code");
  return exchangeAuthorizationCode(config, code, pkce.verifier);
}
