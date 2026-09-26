# App Windows — Quản lý chăn nuôi gà

## Trạng thái

Đây là scaffold Tauri 2 cho ứng dụng Windows `.exe/.msi`.

- Native shell: `src-tauri/`
- Frontend tạm: `web/`
- Tauri bundle targets: NSIS và MSI
- Product identifier: `com.quanlychannuoiga.desktop`
- CI workflow: `.github/workflows/build-windows.yml`

## Kiểm tra hiện tại

Rust/Cargo đã được cài trong sandbox. `cargo check` đã tải và phân giải dependency nhưng Linux sandbox thiếu thư viện hệ thống `gdk-3.0`/GTK WebKit nên không compile được native Linux shell. Đây là blocker môi trường Linux, không phải lỗi schema hoặc frontend Windows. Workflow Windows sẽ build native trên `windows-latest`.

## Chạy local trên Windows

Cài Rust, WebView2 và Tauri CLI, sau đó từ `apps/windows/src-tauri`:

```powershell
cargo tauri dev
cargo tauri build --bundles nsis,msi
```

## Lộ trình tiếp theo

1. Chuyển frontend tạm sang React/TypeScript.
2. Dùng chung `shared/farm-schema.ts`, `shared/sync-engine.ts` và `lib/google-drive-client.ts`.
3. Thêm OAuth desktop với loopback redirect của Tauri.
4. Lưu refresh token trong Windows Credential Manager/keyring.
5. Thêm dashboard, sổ giao dịch, báo cáo và màn hình xung đột.
6. Chạy workflow Windows để xuất `.msi` và `.exe`.
