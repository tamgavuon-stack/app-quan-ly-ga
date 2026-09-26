import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { OAuthToken } from "./google-drive-client";

export type { OAuthToken } from "./google-drive-client";

const KEY = "quan-ly-chan-nuoi-ga.google-drive-token.v1";

export async function loadDriveToken(): Promise<OAuthToken | null> {
  try {
    const raw = Platform.OS === "web" ? await AsyncStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) as OAuthToken : null;
  } catch {
    return null;
  }
}

export async function saveDriveToken(token: OAuthToken) {
  const raw = JSON.stringify(token);
  if (Platform.OS === "web") await AsyncStorage.setItem(KEY, raw);
  else await SecureStore.setItemAsync(KEY, raw, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function clearDriveToken() {
  if (Platform.OS === "web") await AsyncStorage.removeItem(KEY);
  else await SecureStore.deleteItemAsync(KEY);
}

export function isTokenExpired(token: OAuthToken | null, clock = Date.now()) {
  return Boolean(token?.expiresAt && token.expiresAt <= clock + 60_000);
}
