use serde::Serialize;
use std::{
    io::{Read, Write},
    net::TcpListener,
    thread,
};
use tauri::Emitter;
use url::Url;

const KEYRING_SERVICE: &str = "com.quanlychannuoiga.desktop";
const KEYRING_USER: &str = "google-drive-refresh-token";

fn refresh_token_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|error| format!("Không khởi tạo được Credential Manager: {error}"))
}

#[tauri::command]
fn store_refresh_token(refresh_token: String) -> Result<(), String> {
    if refresh_token.trim().is_empty() {
        return Err("Refresh token trống".to_string());
    }
    refresh_token_entry()?
        .set_password(&refresh_token)
        .map_err(|error| format!("Không lưu được refresh token: {error}"))
}

#[tauri::command]
fn load_refresh_token() -> Result<Option<String>, String> {
    match refresh_token_entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("Không đọc được refresh token: {error}")),
    }
}

#[tauri::command]
fn clear_refresh_token() -> Result<(), String> {
    match refresh_token_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(format!("Không xóa được refresh token: {error}")),
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct OAuthCallback {
    pub code: String,
    pub state: String,
    pub port: u16,
}

#[tauri::command]
fn start_google_oauth(
    auth_url: String,
    expected_state: String,
    app_handle: tauri::AppHandle,
) -> Result<u16, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| format!("Không mở được OAuth loopback: {error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| error.to_string())?
        .port();
    let callback_url = format!("http://127.0.0.1:{port}/oauth/callback");
    let final_auth_url = auth_url.replace("__LOOPBACK_REDIRECT__", &callback_url);

    thread::spawn(move || {
        let _ = open::that(final_auth_url);
        let _ = listener.set_nonblocking(false);
        if let Ok((mut stream, _)) = listener.accept() {
            let mut buffer = [0_u8; 8192];
            let size = stream.read(&mut buffer).unwrap_or(0);
            let request = String::from_utf8_lossy(&buffer[..size]);
            let target = request
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1));
            let result = target
                .and_then(|path| Url::parse(&format!("http://localhost{path}")).ok())
                .and_then(|url| {
                    let query = url
                        .query_pairs()
                        .into_owned()
                        .collect::<std::collections::HashMap<_, _>>();
                    let code = query.get("code")?.to_string();
                    let state = query.get("state")?.to_string();
                    if state != expected_state {
                        return None;
                    }
                    Some(OAuthCallback { code, state, port })
                });
            let body = if result.is_some() {
                "Bạn có thể quay lại ứng dụng Quản lý chăn nuôi gà."
            } else {
                "OAuth thất bại hoặc state không hợp lệ. Bạn có thể đóng cửa sổ này."
            };
            let response = format!("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{}", body.len(), body);
            let _ = stream.write_all(response.as_bytes());
            if let Some(callback) = result {
                let _ = app_handle.emit("google-oauth-callback", callback);
            }
        }
    });
    Ok(port)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_google_oauth,
            store_refresh_token,
            load_refresh_token,
            clear_refresh_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
