use std::io::Read;
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::Duration;

use keyring::Entry;
use serde::Serialize;

static ACTIVE_SERVER: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
const KEYRING_SERVICE: &str = "playroom-agent";
const EDITOR_PORT: u16 = 4177;

fn stop_active_server() {
  let mutex = ACTIVE_SERVER.get_or_init(|| Mutex::new(None));
  let mut guard = mutex.lock().unwrap();
  if let Some(mut child) = guard.take() {
    let _ = child.kill();
    let _ = child.wait();
    println!("Playroom Editor Server cleanly terminated.");
  }
}

/// Best-effort free of the editor port so a previous zombie doesn't block examples.
fn free_editor_port() {
  // Prefer killing only the server we spawned.
  stop_active_server();

  // macOS / Linux: clear anything still bound to 4177 (stale node editor processes).
  #[cfg(unix)]
  {
    let _ = Command::new("sh")
      .arg("-c")
      .arg(format!(
        "pids=$(lsof -tiTCP:{} -sTCP:LISTEN 2>/dev/null); [ -n \"$pids\" ] && kill $pids 2>/dev/null; sleep 0.15; true",
        EDITOR_PORT
      ))
      .status();
  }
}

fn monorepo_root() -> PathBuf {
  Path::new(env!("CARGO_MANIFEST_DIR"))
    .join("../../..")
    .canonicalize()
    .unwrap_or_else(|_| Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.."))
}

fn cli_dist_path() -> PathBuf {
  monorepo_root().join("packages/cli/dist/index.js")
}

/// Accept either a project root (has gamekit/) or the gamekit folder itself.
fn resolve_project_root(path: &str) -> Result<PathBuf, String> {
  let p = PathBuf::from(path);
  if !p.is_dir() {
    return Err(format!("Path is not a directory: {}", path));
  }

  let gamekit_json = p.join("gamekit").join("project.json");
  let direct_json = p.join("project.json");
  let direct_scenes = p.join("scenes");

  if gamekit_json.is_file() {
    return Ok(p);
  }
  if direct_json.is_file() && direct_scenes.is_dir() {
    // Selected the gamekit/ folder — use its parent if it looks like a project, else the folder itself
    if let Some(parent) = p.parent() {
      if parent.join("package.json").is_file() || parent.join("gamekit").is_dir() {
        // Parent has package.json (template) or we're inside gamekit under a project
        if parent.join("gamekit").canonicalize().ok().as_ref() == p.canonicalize().ok().as_ref() {
          return Ok(parent.to_path_buf());
        }
      }
    }
    // Fallback: CLI accepts gamekit folder as root via getGameKitRoot
    return Ok(p);
  }

  Err(format!(
    "Not a Playroom project. Expected `gamekit/project.json` under:\n{}",
    path
  ))
}

fn port_is_open(port: u16) -> bool {
  TcpStream::connect(("127.0.0.1", port)).is_ok()
}

fn wait_for_server(timeout_ms: u64) -> bool {
  let steps = timeout_ms / 100;
  for _ in 0..steps {
    if port_is_open(EDITOR_PORT) {
      // Also require a successful HTTP response if possible
      if http_project_ok() {
        return true;
      }
    }
    thread::sleep(Duration::from_millis(100));
  }
  port_is_open(EDITOR_PORT) && http_project_ok()
}

fn http_project_ok() -> bool {
  // Minimal GET without extra deps: use `curl` if available, else TCP-only.
  let output = Command::new("curl")
    .args([
      "-sf",
      "--max-time",
      "1",
      &format!("http://127.0.0.1:{}/api/project", EDITOR_PORT),
    ])
    .output();
  match output {
    Ok(o) => o.status.success() && !o.stdout.is_empty(),
    Err(_) => port_is_open(EDITOR_PORT),
  }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ExampleProject {
  id: String,
  name: String,
  description: String,
  path: String,
}

#[tauri::command]
fn list_example_projects() -> Vec<ExampleProject> {
  let root = monorepo_root();
  let candidates = [
    (
      "expo-game",
      "Expo Game",
      "Expo + Skia sample with sprites and scenes",
      "templates/expo-game",
    ),
    (
      "web-game",
      "Web Game",
      "Phaser web sample project",
      "templates/web-game",
    ),
    (
      "editor-demo",
      "Editor Demo",
      "Built-in editor scenes (platformer, top-down, puzzle)",
      "apps/editor",
    ),
  ];

  candidates
    .into_iter()
    .filter_map(|(id, name, description, rel)| {
      let path = root.join(rel);
      let project_json = path.join("gamekit").join("project.json");
      if project_json.is_file() {
        Some(ExampleProject {
          id: id.to_string(),
          name: name.to_string(),
          description: description.to_string(),
          path: path.to_string_lossy().to_string(),
        })
      } else {
        None
      }
    })
    .collect()
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
  let resolved = resolve_project_root(&project_path)?;
  let resolved_str = resolved.to_string_lossy().to_string();

  free_editor_port();

  let cli_path = cli_dist_path();
  if !cli_path.exists() {
    return Err(
      "Playroom CLI dist not found. From the monorepo root run: pnpm build".to_string(),
    );
  }

  let mut child = Command::new("node")
    .arg(&cli_path)
    .arg("editor")
    .arg("--port")
    .arg(EDITOR_PORT.to_string())
    .current_dir(&resolved)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|e| format!("Failed to spawn local server: {}", e))?;

  if !wait_for_server(8_000) {
    // Collect stderr for diagnostics
    let mut err_msg = String::from("Editor server did not become ready on port 4177.");
    if let Some(mut stderr) = child.stderr.take() {
      let mut buf = String::new();
      let _ = stderr.read_to_string(&mut buf);
      if !buf.trim().is_empty() {
        err_msg.push_str("\n");
        err_msg.push_str(buf.trim());
      }
    }
    let _ = child.kill();
    let _ = child.wait();
    return Err(err_msg);
  }

  let mutex = ACTIVE_SERVER.get_or_init(|| Mutex::new(None));
  let mut guard = mutex.lock().unwrap();
  *guard = Some(child);

  Ok(resolved_str)
}

#[tauri::command]
fn stop_server() {
  free_editor_port();
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
      list_example_projects,
      secret_set,
      secret_get,
      secret_delete
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|_app_handle, event| {
    if let tauri::RunEvent::Exit = event {
      free_editor_port();
    }
  });
}
