# Giai đoạn 2 — Google Drive client và sync engine

## Đã triển khai

- `lib/google-drive-client.ts`
  - OAuth Authorization Code + PKCE.
  - Scope mặc định `drive.appdata`.
  - Đổi authorization code lấy access/refresh token.
  - Làm mới access token.
  - Tìm file trong `appDataFolder`.
  - Tải `FarmSyncDocument`.
  - Tạo/cập nhật file JSON dạng multipart.
- `shared/sync-engine.ts`
  - Merge theo `record.id`.
  - Chọn bản ghi theo `updatedAt`, sau đó `deviceId` làm tie-breaker.
  - Giữ tombstone `deletedAt`.
  - Phát hiện `same-time-different-content` và `delete-vs-update`.

## Cấu hình cần bổ sung trước khi chạy OAuth thật

1. Tạo Google Cloud Project cho ứng dụng.
2. Bật Google Drive API.
3. Tạo OAuth client cho Android.
4. Tạo OAuth client cho Desktop/Windows.
5. Khai báo consent screen và tài khoản thử nghiệm.
6. Đưa Android client ID vào cấu hình build an toàn.
7. Dùng redirect scheme của app cho Android và loopback/custom URI cho Tauri Windows.

Client ID không phải secret. Không đưa client secret vào app native; flow dùng PKCE.

## Quy trình đồng bộ dự kiến

1. Lấy token hợp lệ hoặc refresh token.
2. Tìm `quan-ly-chan-nuoi-ga-data-v2.json` trong `appDataFolder`.
3. Nếu chưa có file, tạo tài liệu mới với `revision = 1`.
4. Nếu có file, tải `FarmSyncDocument`.
5. Gọi `mergeDocuments(local, remote, now)`.
6. Nếu local có pending changes, upload tài liệu đã merge.
7. Nếu chỉ remote thay đổi, lưu dữ liệu remote vào local mà không upload lại.
8. Nếu có conflict, lưu danh sách conflict để màn hình cho người dùng xem.

## Chưa bật tự động trong UI

Chưa gọi OAuth thật từ giao diện vì cần client ID của Google Cloud Project. Sau khi có client ID, bước tiếp theo là thêm màn hình `Đồng bộ & Google Drive`, lưu token trong SecureStore và gọi sync khi người dùng bấm `Đồng bộ ngay`.
