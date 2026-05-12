use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_log::{Target, TargetKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Saves `content` as `filename` in the user's Downloads directory.
/// Returns the absolute path of the written file.
#[tauri::command]
fn save_file(app: tauri::AppHandle, filename: String, content: String) -> Result<String, String> {
    let downloads_dir = app.path().download_dir().map_err(|e| e.to_string())?;
    let file_path = downloads_dir.join(&filename);
    std::fs::write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(
        tauri_plugin_log::Builder::new()
            .level(tauri_plugin_log::log::LevelFilter::Info)
            .build(),
    );

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
          println!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
          // when defining deep link schemes at runtime, you must also check `argv` here
        }));
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build())
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            #[cfg(desktop)]
            {
                app.deep_link().register("cmts")?;
                app.deep_link().register("openid")?;
                app.deep_link().register("openid-credential-offer")?;
            }

            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![greet, save_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
