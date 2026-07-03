use std::process::{Child, Command};
use std::sync::{Mutex, OnceLock};

static ACTIVE_SERVER: OnceLock<Mutex<Option<Child>>> = OnceLock::new();

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
  // 1. Terminate previous server if any
  stop_active_server();

  // 2. Resolve relative path to node CLI index.js
  let manifest_dir = env!("CARGO_MANIFEST_DIR");
  let cli_path = std::path::Path::new(manifest_dir)
    .join("../../../packages/cli/dist/index.js");

  if !cli_path.exists() {
        return Err("Playroom CLI dist file not found. Please build the project first using 'pnpm build'.".to_string());
  }

  // 3. Spawn Node server
  let child = Command::new("node")
    .arg(cli_path)
    .arg("editor")
    .current_dir(&project_path)
    .spawn()
    .map_err(|e| format!("Failed to spawn local server: {}", e))?;

  // 4. Save handle
  let mutex = ACTIVE_SERVER.get_or_init(|| Mutex::new(None));
  let mut guard = mutex.lock().unwrap();
  *guard = Some(child);

  Ok(format!("Server started successfully for: {}", project_path))
}

#[tauri::command]
fn stop_server() {
  stop_active_server();
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
      stop_server
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|_app_handle, event| {
    if let tauri::RunEvent::Exit = event {
      stop_active_server();
    }
  });
}
