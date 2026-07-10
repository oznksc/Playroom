use std::process::{Child, Command};
use std::sync::{Mutex, OnceLock};

use keyring::Entry;

static ACTIVE_SERVER: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
const KEYRING_SERVICE: &str = "playroom-agent";

fn stop_active_server() {
  let mutex = ACTIVE_SERVER.get_or_init(|| Mutex::new(None));
  let mut guard = mutex.lock().unwrap();
  if let Some(mut child) = guard.take() {
    let _ = child.kill();
    let _ = child.wait();
    println!("Playroom Editor Server cleanly terminated.");
  }
}

#[tauri::command]
fn select_directory() -> Option<String> {
  let dir = rfd::FileDialog::new()
    .set_title("Open Playroom Project Folder")
    .pick_folder();
  dir.map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
fn start_server(project_path: String) -> Result<String, String> {
  stop_active_server();

  let manifest_dir = env!("CARGO_MANIFEST_DIR");
  let cli_path = std::path::Path::new(manifest_dir).join("../../../packages/cli/dist/index.js");

  if !cli_path.exists() {
    return Err(
      "Playroom CLI dist file not found. Please build the project first using 'pnpm build'."
        .to_string(),
    );
  }

  let child = Command::new("node")
    .arg(cli_path)
    .arg("editor")
    .current_dir(&project_path)
    .spawn()
    .map_err(|e| format!("Failed to spawn local server: {}", e))?;

  let mutex = ACTIVE_SERVER.get_or_init(|| Mutex::new(None));
  let mut guard = mutex.lock().unwrap();
  *guard = Some(child);

  Ok(format!("Server started successfully for: {}", project_path))
}

#[tauri::command]
fn stop_server() {
  stop_active_server();
}

/// Store a secret in the OS keychain (macOS Keychain / Windows Credential Manager / Linux Secret Service).
#[tauri::command]
fn secret_set(account: String, secret: String) -> Result<(), String> {
  let entry = Entry::new(KEYRING_SERVICE, &account).map_err(|e| e.to_string())?;
  entry.set_password(&secret).map_err(|e| e.to_string())
}

#[tauri::command]
fn secret_get(account: String) -> Result<Option<String>, String> {
  let entry = Entry::new(KEYRING_SERVICE, &account).map_err(|e| e.to_string())?;
  match entry.get_password() {
    Ok(value) => Ok(Some(value)),
    Err(keyring::Error::NoEntry) => Ok(None),
    Err(e) => Err(e.to_string()),
  }
}

#[tauri::command]
fn secret_delete(account: String) -> Result<(), String> {
  let entry = Entry::new(KEYRING_SERVICE, &account).map_err(|e| e.to_string())?;
  match entry.delete_credential() {
    Ok(()) => Ok(()),
    Err(keyring::Error::NoEntry) => Ok(()),
    Err(e) => Err(e.to_string()),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app = tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      select_directory,
      start_server,
      stop_server,
      secret_set,
      secret_get,
      secret_delete
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|_app_handle, event| {
    if let tauri::RunEvent::Exit = event {
      stop_active_server();
    }
  });
}
