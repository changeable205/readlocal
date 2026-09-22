// ReadLocal Desktop — Tauri 2 backend.
//
// Responsibilities:
//  * recursively scan a folder for Markdown files and return a real disk tree;
//  * read UTF-8 file text in-process (no network / no upload);
//  * watch the opened folder and emit `fs-changed` events for auto-refresh;
//  * remember the file passed at launch / via Finder "Open with" (file association);
//  * native save dialogs for HTML / PDF export.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use notify::event::{EventKind, ModifyKind};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{Emitter, Manager, State};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DiskNode {
    name: String,
    abs_path: String,
    rel_path: String,
    kind: String, // "dir" | "file"
    size: u64,
    children: Vec<DiskNode>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct FsChanged {
    kind: String,
    path: String,
}

struct AppState {
    // Kept alive so the filesystem watcher is not dropped.
    watcher: Mutex<Option<Box<dyn Watcher + Send>>>,
    // Consumed once by the frontend at startup (double-click file association).
    launch_file: Mutex<Option<String>>,
}

fn is_markdown_name(name: &str) -> bool {
    match name.rfind('.') {
        Some(i) => matches!(
            name[i + 1..].to_lowercase().as_str(),
            "md" | "markdown" | "mdx" | "txt"
        ),
        None => false,
    }
}

fn kind_name(k: &EventKind) -> &'static str {
    match k {
        EventKind::Create(_) => "create",
        EventKind::Remove(_) => "remove",
        EventKind::Modify(ModifyKind::Name(_)) => "rename",
        EventKind::Modify(_) => "modify",
        _ => "other",
    }
}

/// Recursively build a directory tree that contains only Markdown files;
/// directories that contain no Markdown (at any depth) are pruned.
fn build_node(abs: &Path, root: &Path, _is_root: bool) -> Option<DiskNode> {
    let name = abs
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| abs.to_string_lossy().to_string());
    let rel = abs
        .strip_prefix(root)
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .unwrap_or_default();

    if !abs.is_dir() {
        return None;
    }

    let mut dirs: Vec<DiskNode> = Vec::new();
    let mut files: Vec<DiskNode> = Vec::new();

    if let Ok(entries) = fs::read_dir(abs) {
        for entry in entries.flatten() {
            let p = entry.path();
            let fname = entry.file_name().to_string_lossy().to_string();
            if fname.starts_with('.') {
                continue; // skip .git, .DS_Store, etc.
            }
            if p.is_dir() {
                if let Some(node) = build_node(&p, root, false) {
                    dirs.push(node);
                }
            } else if p.is_file() && is_markdown_name(&fname) {
                let size = fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
                let file_rel = p
                    .strip_prefix(root)
                    .map(|x| x.to_string_lossy().replace('\\', "/"))
                    .unwrap_or_default();
                files.push(DiskNode {
                    name: fname,
                    abs_path: p.to_string_lossy().to_string(),
                    rel_path: file_rel,
                    kind: "file".to_string(),
                    size,
                    children: Vec::new(),
                });
            }
        }
    }

    dirs.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    let mut children = dirs;
    children.extend(files);

    // Keep every directory so the sidebar mirrors the real on-disk folder tree
    // (sub-folders that currently contain no Markdown are still shown, just with
    // no Markdown leaves). Only hidden (dot-prefixed) entries are skipped above.
    Some(DiskNode {
        name,
        abs_path: abs.to_string_lossy().to_string(),
        rel_path: rel,
        kind: "dir".to_string(),
        size: 0,
        children,
    })
}

fn start_watcher(app: &tauri::AppHandle, root: PathBuf) -> Result<(), String> {
    let handle = app.clone();
    let mut watcher: RecommendedWatcher = notify::recommended_watcher(
        move |result: notify::Result<notify::Event>| {
            if let Ok(event) = result {
                let kind = kind_name(&event.kind).to_string();
                for path in event.paths {
                    let _ = handle.emit(
                        "fs-changed",
                        FsChanged {
                            kind: kind.clone(),
                            path: path.to_string_lossy().to_string(),
                        },
                    );
                }
            }
        },
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    let state = app.state::<AppState>();
    *state.watcher.lock().map_err(|e| e.to_string())? = Some(Box::new(watcher));
    Ok(())
}

#[tauri::command]
fn scan_directory(app: tauri::AppHandle, root: String) -> Result<DiskNode, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.is_dir() {
        return Err(format!("Not a directory: {root}"));
    }
    // (Re)start the watcher for the newly opened folder.
    start_watcher(&app, root_path.clone())?;
    build_node(&root_path, &root_path, true).ok_or_else(|| "Failed to build directory tree".to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Cannot read {path}: {e}"))
}

/// Persist edited Markdown text back to disk (Cmd/Ctrl+S in the editor).
#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents.as_bytes()).map_err(|e| format!("Cannot write {path}: {e}"))
}

#[tauri::command]
fn get_launch_file(state: State<AppState>) -> Option<String> {
    state.launch_file.lock().ok().and_then(|mut g| g.take())
}

#[tauri::command]
async fn save_text_dialog(
    default_name: String,
    filter_label: String,
    filter_ext: String,
    contents: String,
) -> Result<Option<String>, String> {
    let chosen = rfd::AsyncFileDialog::new()
        .set_file_name(&default_name)
        .add_filter(&filter_label, &[filter_ext.as_str()])
        .save_file()
        .await;
    if let Some(handle) = chosen {
        let path = handle.path().to_path_buf();
        fs::write(&path, contents.as_bytes()).map_err(|e| e.to_string())?;
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn save_base64_dialog(
    default_name: String,
    filter_label: String,
    filter_ext: String,
    base64: String,
) -> Result<Option<String>, String> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64.trim())
        .map_err(|e| e.to_string())?;
    let chosen = rfd::AsyncFileDialog::new()
        .set_file_name(&default_name)
        .add_filter(&filter_label, &[filter_ext.as_str()])
        .save_file()
        .await;
    if let Some(handle) = chosen {
        let path = handle.path().to_path_buf();
        fs::write(&path, &bytes).map_err(|e| e.to_string())?;
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

// Native HTML→PDF helper, compiled from html2pdf.swift at build time (macOS only).
#[cfg(target_os = "macos")]
const HTML2PDF_BIN: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/html2pdf"));

/// Extract the embedded Swift helper to a temp path once (and make it runnable).
#[cfg(target_os = "macos")]
fn extract_pdf_helper() -> Result<PathBuf, String> {
    let p = std::env::temp_dir().join("readlocal-html2pdf");
    let needs_write = match fs::metadata(&p) {
        Ok(m) => m.len() as usize != HTML2PDF_BIN.len(),
        Err(_) => true,
    };
    if needs_write {
        fs::write(&p, HTML2PDF_BIN).map_err(|e| e.to_string())?;
        let mut perms = fs::metadata(&p).map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&p, perms).map_err(|e| e.to_string())?;
    }
    Ok(p)
}

#[cfg(target_os = "macos")]
#[tauri::command]
async fn html_to_pdf_dialog(default_name: String, html: String) -> Result<Option<String>, String> {
    let helper = extract_pdf_helper()?;
    let tmp = std::env::temp_dir();
    let html_path = tmp.join("readlocal-export.html");
    let pdf_path = tmp.join("readlocal-export.pdf");
    let _ = fs::remove_file(&pdf_path);
    fs::write(&html_path, html.as_bytes()).map_err(|e| e.to_string())?;

    let output = std::process::Command::new(&helper)
        .arg(&html_path)
        .arg(&pdf_path)
        .output()
        .map_err(|e| format!("failed to launch pdf helper: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "pdf helper failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let bytes = fs::read(&pdf_path).map_err(|e| format!("cannot read generated pdf: {e}"))?;
    let chosen = rfd::AsyncFileDialog::new()
        .set_file_name(&default_name)
        .add_filter("PDF", &["pdf"])
        .save_file()
        .await;
    if let Some(handle) = chosen {
        let dest = handle.path().to_path_buf();
        fs::write(&dest, &bytes).map_err(|e| e.to_string())?;
        Ok(Some(dest.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

/// First positional CLI argument that is an existing Markdown file.
fn initial_launch_file() -> Option<String> {
    std::env::args()
        .skip(1)
        .find(|a| !a.starts_with('-') && Path::new(a).is_file() && is_markdown_name(a))
}

fn main() {
    let base = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            watcher: Mutex::new(None),
            launch_file: Mutex::new(initial_launch_file()),
        });

    // html_to_pdf_dialog exists only on macOS; Windows uses window.print().
    #[cfg(target_os = "macos")]
    let builder = base.invoke_handler(tauri::generate_handler![
        scan_directory,
        read_text_file,
        write_text_file,
        get_launch_file,
        save_text_dialog,
        save_base64_dialog,
        html_to_pdf_dialog
    ]);
    #[cfg(not(target_os = "macos"))]
    let builder = base.invoke_handler(tauri::generate_handler![
        scan_directory,
        read_text_file,
        write_text_file,
        get_launch_file,
        save_text_dialog,
        save_base64_dialog
    ]);

    builder
        .build(tauri::generate_context!())
        .expect("error while building ReadLocal Desktop")
        .run(|app, event| {
            // macOS Finder double-click / "Open With" while running (and cold open).
            if let tauri::RunEvent::Opened { urls } = event {
                let state = app.state::<AppState>();
                for url in urls {
                    if url.scheme() == "file" {
                        if let Ok(path) = url.to_file_path() {
                            let path_str = path.to_string_lossy().to_string();
                            // Always refresh the pending launch file so a slightly
                            // later get_launch_file poll from the webview still sees it.
                            if let Ok(mut guard) = state.launch_file.lock() {
                                *guard = Some(path_str.clone());
                            }
                            // Covers the already-running case (window open).
                            let _ = app.emit("open-file", path_str);
                        }
                    }
                }
            }
        });
}
