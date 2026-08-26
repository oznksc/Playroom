use std::io::Read;
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::Duration;

use keyring::Entry;
use serde::Serialize;

static ACTIVE_EDITOR: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
static ACTIVE_MCP: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
const EDITOR_PORT: u16 = 4177;
const MCP_PORT: u16 = 4189;
const KEYRING_SERVICE: &str = "playroom-agent";

fn stop_active_editor() {
  let mutex = ACTIVE_EDITOR.get_or_init(|| Mutex::new(None));
  let mut guard = mutex.lock().unwrap();
  if let Some(mut child) = guard.take() {
    let _ = child.kill();
    let _ = child.wait();
    println!("GameKit Studio: editor server terminated.");
  }
}

fn stop_active_mcp() {
  let mutex = ACTIVE_MCP.get_or_init(|| Mutex::new(None));
  let mut guard = mutex.lock().unwrap();
  if let Some(mut child) = guard.take() {
    let _ = child.kill();
    let _ = child.wait();
    println!("GameKit Studio: MCP inspector terminated.");
  }
}

/// Best-effort free of the editor port so a previous zombie doesn't block startup.
fn free_editor_port() {
  stop_active_editor();
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

fn sidecar_path() -> PathBuf {
  monorepo_root().join("apps/studio/scripts/mcp-inspector.mjs")
}

fn tsx_path() -> PathBuf {
  monorepo_root().join("node_modules/.bin/tsx")
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
    if let Some(parent) = p.parent() {
      if parent.join("gamekit").canonicalize().ok().as_ref() == p.canonicalize().ok().as_ref() {
        return Ok(parent.to_path_buf());
      }
    }
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

fn wait_for_port(port: u16, timeout_ms: u64) -> bool {
  let steps = (timeout_ms / 100).max(1);
  for _ in 0..steps {
    if port_is_open(port) {
      return true;
    }
    thread::sleep(Duration::from_millis(100));
  }
  port_is_open(port)
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CliOutput {
  ok: bool,
  code: i32,
  lines: Vec<String>,
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
fn select_directory() -> Option<String> {
  let dir = rfd::FileDialog::new()
    .set_title("Open Playroom Project Folder")
    .pick_folder();
  dir.map(|path| path.to_string_lossy().to_string())
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
fn run_cli(args: Vec<String>, project_path: String) -> Result<CliOutput, String> {
  let resolved = resolve_project_root(&project_path)?;
  let cli_path = cli_dist_path();
  if !cli_path.exists() {
    return Err("Playroom CLI dist not found. Run `pnpm build` from the monorepo root.".into());
  }

  let mut child = Command::new("node")
    .arg(&cli_path)
    .args(&args)
    .current_dir(&resolved)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|e| format!("Failed to spawn CLI: {}", e))?;

  let mut out = String::new();
  let mut err = String::new();
  if let Some(mut o) = child.stdout.take() {
    let _ = o.read_to_string(&mut out);
  }
  if let Some(mut e) = child.stderr.take() {
    let _ = e.read_to_string(&mut err);
  }
  let status = child.wait().map_err(|e| e.to_string())?;
  let code = status.code().unwrap_or(-1);

  let mut lines: Vec<String> = out.lines().map(|s| s.to_string()).collect();
  for l in err.lines() {
    lines.push(l.to_string());
  }

  Ok(CliOutput {
    ok: status.success(),
    code,
    lines,
  })
}

#[tauri::command]
fn start_editor_server(project_path: String) -> Result<String, String> {
  let resolved = resolve_project_root(&project_path)?;
  let resolved_str = resolved.to_string_lossy().to_string();

  free_editor_port();

  let cli_path = cli_dist_path();
  if !cli_path.exists() {
    return Err("Playroom CLI dist not found. Run `pnpm build` from the monorepo root.".into());
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
    .map_err(|e| format!("Failed to spawn editor server: {}", e))?;

  if !wait_for_port(EDITOR_PORT, 8_000) {
    let mut buf = String::new();
    if let Some(mut s) = child.stderr.take() {
      let _ = s.read_to_string(&mut buf);
    }
    let _ = child.kill();
    let _ = child.wait();
    return Err(format!(
      "Editor server did not become ready on port {}.\n{}",
      EDITOR_PORT,
      buf.trim()
    ));
  }

  let mutex = ACTIVE_EDITOR.get_or_init(|| Mutex::new(None));
  let mut guard = mutex.lock().unwrap();
  *guard = Some(child);

  Ok(resolved_str)
}

#[tauri::command]
fn stop_editor_server() {
  free_editor_port();
}

#[tauri::command]
fn start_mcp(project_path: String) -> Result<u16, String> {
  let resolved = resolve_project_root(&project_path)?;
  stop_active_mcp();

  let sidecar = sidecar_path();
  if !sidecar.exists() {
    return Err(format!("MCP inspector sidecar missing: {}", sidecar.display()));
  }
  let tsx = tsx_path();
  let tsx_cmd: PathBuf = if tsx.exists() { tsx } else { PathBuf::from("tsx") };

  let mut child = Command::new(&tsx_cmd)
    .arg(&sidecar)
    .arg(resolved.to_string_lossy().to_string())
    .env("STUDIO_MCP_PORT", MCP_PORT.to_string())
    .current_dir(monorepo_root())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|e| format!("Failed to spawn MCP inspector: {}", e))?;

  if !wait_for_port(MCP_PORT, 8_000) {
    let mut buf = String::new();
    if let Some(mut s) = child.stderr.take() {
      let _ = s.read_to_string(&mut buf);
    }
    let _ = child.kill();
    let _ = child.wait();
    return Err(format!(
      "MCP inspector did not start on port {}.\n{}",
      MCP_PORT,
      buf.trim()
    ));
  }

  let mutex = ACTIVE_MCP.get_or_init(|| Mutex::new(None));
  let mut guard = mutex.lock().unwrap();
  *guard = Some(child);

  Ok(MCP_PORT)
}

#[tauri::command]
fn stop_mcp() {
  stop_active_mcp();
}

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
      list_example_projects,
      run_cli,
      start_editor_server,
      stop_editor_server,
      start_mcp,
      stop_mcp,
      secret_set,
      secret_get,
      secret_delete
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|_app_handle, event| {
    if let tauri::RunEvent::Exit = event {
      free_editor_port();
      stop_active_mcp();
    }
  });
}
