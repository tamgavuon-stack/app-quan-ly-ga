# Android local signing

Project đã tạo keystore local tại `my-release-key.keystore` và cấu hình `credentials.json` để EAS dùng credentials local.

- Package: `com.app.quanlychannuoiga`
- Alias: `quanlychannuoiga`
- Profile APK: `release-apk`
- Build command: `npx eas-cli build --platform android --profile release-apk`

Keystore, credentials và mật khẩu local đã được thêm vào `.gitignore`; không commit các file này lên repository.

SHA-1 được trích xuất trực tiếp bằng `keytool` từ keystore này và dùng để đăng ký Android OAuth Client trong Google Cloud.

Lưu ý: bản build trên EAS cloud cần đăng nhập Expo/EAS. Nếu build trên máy khác, phải chuyển keystore và credentials qua kênh bảo mật; mất keystore sẽ khiến không thể cập nhật cùng ứng dụng Android đã phát hành.
