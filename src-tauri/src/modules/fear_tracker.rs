use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};
use tauri_plugin_store::StoreExt;

// ============================================================================
// Types & State
// ============================================================================

#[derive(Default)]
pub struct FearTrackerState {
    pub level: Mutex<i32>,
}

#[derive(Clone, Serialize, Deserialize)]
struct FearLevelPayload {
    level: i32,
}

// ============================================================================
// Commands
// ============================================================================

#[tauri::command]
pub fn get_fear_level(state: State<FearTrackerState>) -> i32 {
    *state.level.lock().unwrap()
}

#[tauri::command]
pub fn set_fear_level(
    state: State<FearTrackerState>,
    app: tauri::AppHandle,
    amount: i32,
) -> Result<i32, String> {
    let mut level = state.level.lock().unwrap();
    *level = (*level + amount).max(0);
    let new_level = *level;

    // Persist to store
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.set("fearLevel", new_level);
    store.save().map_err(|e| e.to_string())?;

    // Broadcast to all windows
    app.emit("fear-level-updated", FearLevelPayload { level: new_level })
        .map_err(|e| e.to_string())?;

    Ok(new_level)
}

// ============================================================================
// Persistence
// ============================================================================

/// Load persisted fear level from store into state
pub fn load_state(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store("store.json")?;
    if let Some(level) = store.get("fearLevel") {
        let fear_state: State<FearTrackerState> = app.state();
        *fear_state.level.lock().unwrap() = level.as_i64().unwrap_or(0) as i32;
    }
    Ok(())
}
