mod config;
mod extract;
mod monitor;
mod nlbn;

use config::NlbnConfig;
use monitor::{MonitorHandle, MonitorState};
use nlbn::ExportRequest;
use serde::Serialize;
use std::io::Write;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};

// ---------------------------------------------------------------------------
// Serializable types for IPC
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone)]
pub struct AppState {
    pub history: Vec<(String, String)>,
    pub matched: Vec<(String, String)>,
    pub keyword: String,
    pub nlbn_output_path: String,
    pub nlbn_last_result: Option<String>,
    pub nlbn_show_terminal: bool,
    pub nlbn_running: bool,
    pub history_count: usize,
    pub matched_count: usize,
}

pub struct ManagedMonitor {
    pub state: Arc<Mutex<MonitorState>>,
    pub _handle: Mutex<Option<MonitorHandle>>,
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_state(monitor: State<ManagedMonitor>) -> AppState {
    if let Ok(m) = monitor.state.lock() {
        AppState {
            history_count: m.history.len(),
            matched_count: m.matched.len(),
            history: m.history.clone(),
            matched: m.matched.clone(),
            keyword: m.keyword.clone(),
            nlbn_output_path: m.nlbn_output_path.clone(),
            nlbn_last_result: m.nlbn_last_result.clone(),
            nlbn_show_terminal: m.nlbn_show_terminal,
            nlbn_running: m.nlbn_running,
        }
    } else {
        AppState {
            history: vec![],
            matched: vec![],
            keyword: String::new(),
            nlbn_output_path: "~/lib".into(),
            nlbn_last_result: None,
            nlbn_show_terminal: true,
            nlbn_running: false,
            history_count: 0,
            matched_count: 0,
        }
    }
}

#[tauri::command]
fn set_keyword(monitor: State<ManagedMonitor>, keyword: String) {
    if let Ok(mut m) = monitor.state.lock() {
        m.set_keyword(keyword);
    }
}

#[tauri::command]
fn delete_history(monitor: State<ManagedMonitor>, index: usize) {
    if let Ok(mut m) = monitor.state.lock() {
        m.delete_history(index);
    }
}

#[tauri::command]
fn delete_matched(monitor: State<ManagedMonitor>, index: usize) {
    if let Ok(mut m) = monitor.state.lock() {
        m.delete_matched(index);
    }
}

#[tauri::command]
fn clear_all(monitor: State<ManagedMonitor>) {
    if let Ok(mut m) = monitor.state.lock() {
        m.history.clear();
        m.matched.clear();
        m.last_content.clear();
        m.initialized = false;
        m.match_debug_log.clear();
        m.nlbn_last_result = None;
        m.nlbn_running = false;
    }
}

#[tauri::command]
fn save_history(monitor: State<ManagedMonitor>) -> String {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    if let Ok(m) = monitor.state.lock() {
        if m.history.is_empty() {
            return "No history to save".to_string();
        }
        let path = exe_dir.join("history.txt");
        if let Ok(mut file) = std::fs::File::create(&path) {
            for (time, content) in &m.history {
                let _ = writeln!(file, "[{}] {}", time, content);
            }
            return format!("Saved to {}", path.display());
        }
    }
    "Save failed".to_string()
}

#[tauri::command]
fn save_matched(monitor: State<ManagedMonitor>) -> String {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    if let Ok(m) = monitor.state.lock() {
        if m.matched.is_empty() {
            return "No matched results to export".to_string();
        }
        let path = exe_dir.join("matched.txt");
        if let Ok(mut file) = std::fs::File::create(&path) {
            for (_, extracted) in &m.matched {
                let _ = writeln!(file, "{}", extracted);
            }
            return format!("Exported to {}", path.display());
        }
    }
    "Export failed".to_string()
}

#[tauri::command]
fn set_nlbn_path(monitor: State<ManagedMonitor>, path: String) {
    let show_terminal;
    if let Ok(mut m) = monitor.state.lock() {
        m.set_output_path(path.clone());
        show_terminal = m.nlbn_show_terminal;
    } else {
        show_terminal = true;
    }
    let cfg = NlbnConfig {
        output_path: path,
        show_terminal,
    };
    cfg.save();
}

#[tauri::command]
fn toggle_terminal(monitor: State<ManagedMonitor>) {
    let (output_path, show_terminal);
    if let Ok(mut m) = monitor.state.lock() {
        m.toggle_show_terminal();
        output_path = m.nlbn_output_path.clone();
        show_terminal = m.nlbn_show_terminal;
    } else {
        return;
    }
    let cfg = NlbnConfig {
        output_path,
        show_terminal,
    };
    cfg.save();
}

#[tauri::command]
fn nlbn_export(monitor: State<ManagedMonitor>, app_handle: AppHandle) -> String {
    let export_data;
    let show_terminal;
    if let Ok(m) = monitor.state.lock() {
        export_data = m.get_export_data();
        show_terminal = m.nlbn_show_terminal;
    } else {
        return "State lock failed".to_string();
    }

    if let Some((ids, output_path)) = export_data {
        nlbn::spawn_export(
            Arc::clone(&monitor.state),
            ExportRequest {
                ids,
                output_path,
                show_terminal,
            },
            app_handle,
        );
        "Export started".to_string()
    } else {
        "No matched results to export".to_string()
    }
}

#[tauri::command]
fn get_unique_ids(monitor: State<ManagedMonitor>) -> Vec<String> {
    if let Ok(m) = monitor.state.lock() {
        m.get_unique_ids()
    } else {
        vec![]
    }
}

#[tauri::command]
fn copy_to_clipboard(text: String) -> Result<(), String> {
    let mut clip = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    clip.set_text(&text).map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// App entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = NlbnConfig::load();

    let state = Arc::new(Mutex::new(MonitorState::new()));
    if let Ok(mut s) = state.lock() {
        s.set_output_path(config.output_path.clone());
        s.nlbn_show_terminal = config.show_terminal;
        // Default keyword: match C-series component codes
        s.set_keyword(r"regex:C\d+".to_string());
    }

    let monitor_state = Arc::clone(&state);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(ManagedMonitor {
            state: monitor_state,
            _handle: Mutex::new(None),
        })
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let handle = MonitorHandle::spawn(Arc::clone(&state), app_handle);
            let managed: State<ManagedMonitor> = app.state();
            *managed._handle.lock().unwrap() = Some(handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            set_keyword,
            delete_history,
            delete_matched,
            clear_all,
            save_history,
            save_matched,
            set_nlbn_path,
            toggle_terminal,
            nlbn_export,
            get_unique_ids,
            copy_to_clipboard,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
