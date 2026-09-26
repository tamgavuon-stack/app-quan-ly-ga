# Windows OAuth loopback

Đã thêm native Tauri command `start_google_oauth`:

1. Bind listener tạm trên `127.0.0.1:0`.
2. Thay placeholder `__LOOPBACK_REDIRECT__` bằng callback port thực tế.
3. Mở Google OAuth bằng trình duyệt hệ thống.
4. Nhận callback `/oauth/callback`, kiểm tra `state`.
5. Emit authorization code và port về frontend.
6. Frontend đổi code lấy token bằng PKCE và Desktop Client ID.

Refresh token được lưu qua Tauri `keyring` trong Windows Credential Manager với service `com.quanlychannuoiga.desktop`; frontend chỉ giữ access token trong bộ nhớ phiên. Khi mở lại app, frontend gọi native command để khôi phục trạng thái đã kết nối mà không đọc token từ `localStorage`.

`cargo check` trên sandbox Linux bị chặn bởi thiếu system library `gdk-3.0`; mã Rust đã được `cargo fmt` kiểm tra. Build Windows cần chạy trên Windows CI hoặc máy Windows.
