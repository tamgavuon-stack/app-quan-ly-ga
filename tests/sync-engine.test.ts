import { describe, expect, it } from "vitest";
import { buildGoogleAuthUrl } from "../lib/google-drive-client";
import { mergeRecords } from "../shared/sync-engine";
import type { FarmRecord } from "../shared/farm-schema";

const record = (overrides: Partial<FarmRecord> = {}): FarmRecord => ({
  id: "r1",
  kind: "expense",
  category: "Thức ăn",
  amount: 1000,
  date: "2026-09-26",
  createdAt: "2026-09-26T08:00:00.000Z",
  updatedAt: "2026-09-26T08:00:00.000Z",
  deviceId: "android-1",
  ...overrides,
});

describe("sync engine", () => {
  it("gộp bản ghi mới từ thiết bị khác", () => {
    const result = mergeRecords([record()], [record({ id: "r2", amount: 2000, deviceId: "windows-1" })]);
    expect(result.records.map((item) => item.id).sort()).toEqual(["r1", "r2"]);
    expect(result.conflicts).toHaveLength(0);
  });

  it("chọn bản cập nhật mới hơn", () => {
    const result = mergeRecords([record({ amount: 1000 })], [record({ amount: 2500, updatedAt: "2026-09-26T09:00:00.000Z", deviceId: "windows-1" })]);
    expect(result.records[0].amount).toBe(2500);
    expect(result.conflicts).toHaveLength(0);
  });

  it("ghi nhận xung đột khi cùng thời điểm nhưng khác nội dung", () => {
    const result = mergeRecords([record({ amount: 1000 })], [record({ amount: 2500, deviceId: "windows-1" })]);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].reason).toBe("same-time-different-content");
  });

  it("giữ tombstone khi một thiết bị xóa và thiết bị kia cập nhật", () => {
    const result = mergeRecords([record({ deletedAt: "2026-09-26T10:00:00.000Z", updatedAt: "2026-09-26T10:00:00.000Z" })], [record({ amount: 3000, updatedAt: "2026-09-26T09:00:00.000Z", deviceId: "windows-1" })]);
    expect(result.records[0].deletedAt).toBeTruthy();
    expect(result.conflicts[0].reason).toBe("delete-vs-update");
  });

  it("tạo URL OAuth dùng PKCE và scope Drive app data", () => {
    const url = buildGoogleAuthUrl({ clientId: "client.apps.googleusercontent.com", redirectUri: "quanlyga://oauth" }, { state: "state-1", codeChallenge: "challenge-1" });
    expect(url).toContain("code_challenge=challenge-1");
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain("drive.appdata");
  });
});
