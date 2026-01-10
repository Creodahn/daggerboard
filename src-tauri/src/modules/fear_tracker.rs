use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State};

use super::error::AppResult;
use super::persistence::{self, emit_value, save_value};
use super::state_manager::lock_or_error;

// ============================================================================
// Types & State
// ============================================================================

const STORE_KEY: &str = "fearLevel";
const EVENT_NAME: &str = "fear-level-updated";

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

/// Get the current fear level
#[tauri::command]
pub fn get_fear_level(state: State<FearTrackerState>) -> AppResult<i32> {
    let level = lock_or_error(&state.level)?;
    Ok(*level)
}

/// Adjust the fear level by a delta amount (positive or negative)
/// This is the renamed version of the old set_fear_level
#[tauri::command]
pub fn adjust_fear_level(
    state: State<FearTrackerState>,
    app: tauri::AppHandle,
    amount: i32,
) -> AppResult<i32> {
    let new_level = {
        let mut level = lock_or_error(&state.level)?;
        *level = (*level + amount).max(0);
        *level
    };

    save_and_broadcast(&app, new_level)?;
    Ok(new_level)
}

/// Set the fear level to an absolute value
#[tauri::command]
pub fn set_fear_level(
    state: State<FearTrackerState>,
    app: tauri::AppHandle,
    value: i32,
) -> AppResult<i32> {
    let new_level = {
        let mut level = lock_or_error(&state.level)?;
        *level = value.max(0);
        *level
    };

    save_and_broadcast(&app, new_level)?;
    Ok(new_level)
}

/// Reset the fear level to 0
#[tauri::command]
pub fn reset_fear_level(
    state: State<FearTrackerState>,
    app: tauri::AppHandle,
) -> AppResult<i32> {
    set_fear_level(state, app, 0)
}

// ============================================================================
// Internal Helpers
// ============================================================================

fn save_and_broadcast(app: &tauri::AppHandle, level: i32) -> AppResult<()> {
    save_value(app, STORE_KEY, &level)?;
    emit_value(app, EVENT_NAME, FearLevelPayload { level })
}

// ============================================================================
// Persistence
// ============================================================================

/// Load persisted fear level from store into state
pub fn load_state(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(level) = persistence::load_value::<i32>(app, STORE_KEY)? {
        let fear_state: State<FearTrackerState> = app.state();
        *lock_or_error(&fear_state.level)
            .map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))? =
            level;
    }
    Ok(())
}
