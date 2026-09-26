# Cấu hình Google Cloud OAuth

## 1. Tạo project và bật API

Trong Google Cloud Console, tạo hoặc chọn một project riêng cho app, sau đó bật **Google Drive API**.

## 2. Cấu hình OAuth consent screen

Chọn loại **External** nếu tài khoản Google sử dụng không thuộc Google Workspace của tổ chức. Khai báo tên app, email hỗ trợ và thêm scope:

`https://www.googleapis.com/auth/drive.appdata`

Trong giai đoạn kiểm thử, thêm tài khoản Google dùng để thử vào danh sách **Test users**.

## 3. Tạo Client ID Android

Tạo OAuth Client ID loại **Android**, nhập package Android chính xác trong `app.config.ts` và SHA-1 certificate của development/release build tương ứng.

Đặt Client ID vào biến:

`EXPO_PUBLIC_GOOGLE_DRIVE_CLIENT_ID`

Không đưa client secret vào app Android.

## 4. Tạo Client ID Desktop

Tạo OAuth Client ID loại **Desktop app** cho app Tauri Windows. Desktop OAuth dùng PKCE và loopback redirect; không cần nhúng client secret vào file `.exe`.

Đặt Client ID vào:

`apps/windows/.env` dựa trên `.env.example`, hoặc `apps/windows/web/config.local.js` khi chạy frontend local.

## 5. Kiểm tra trước khi build

- Android: redirect phải dùng scheme được khai báo trong `app.config.ts`; cần development/production build để test deep link ổn định.
- Windows: redirect loopback phải là `http://127.0.0.1:<port>/oauth/callback` do native shell mở tạm.
- Scope app chỉ là `drive.appdata`, nên file dữ liệu không xuất hiện trong thư mục Drive thông thường.
- Nếu OAuth báo `redirect_uri_mismatch`, kiểm tra đúng loại Client ID, package/certificate Android hoặc loopback redirect desktop.

## Thông tin cần cung cấp để nối OAuth thật

Sau khi tạo xong, chỉ cần cung cấp **Android Client ID** và **Desktop Client ID**. Không gửi client secret; app native không được phép phụ thuộc vào secret đó.
