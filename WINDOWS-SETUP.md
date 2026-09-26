# Hướng dẫn chạy trên Windows

## Yêu cầu

- Windows 10/11 64-bit
- Node.js 22+
- pnpm 9+
- Rust stable và WebView2 Runtime

## Cài dependencies và chạy frontend bundle

Mở PowerShell tại thư mục dự án:

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm build:windows-web
```

## Chạy app Tauri ở chế độ development

```powershell
cd apps/windows/src-tauri
cargo tauri dev
```

## Build bộ cài Windows

```powershell
cd apps/windows/src-tauri
cargo tauri build --bundles nsis,msi
```

File cài đặt sẽ nằm tại:

- `apps/windows/src-tauri/target/release/bundle/nsis/*.exe`
- `apps/windows/src-tauri/target/release/bundle/msi/*.msi`

## Google Drive

Client ID đã được tích hợp. Khi chạy app Windows, nhấn **Kết nối / Đồng bộ**, đăng nhập Google trong trình duyệt, sau đó app sẽ lưu refresh token trong Windows Credential Manager.

## Lưu ý bảo mật

Gói ZIP không bao gồm `credentials.json`, keystore Android, mật khẩu keystore hoặc `node_modules`. Không commit các file signing/secret vào repository.
