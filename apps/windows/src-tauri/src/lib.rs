use serde::Serialize;
use std::{
    io::{Read, Write},
    net::TcpListener,
    thread,
};
use tauri::Emitter;
use url::Url;

#[derive(Debug, Serialize)]
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
        .invoke_handler(tauri::generate_handler![start_google_oauth])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
