use rusqlite::params;
use serde::Serialize;
use tauri::{Emitter, State};

use super::campaign::{get_campaign_by_id, get_current_campaign_id};
use super::database::Database;
use super::error::{AppError, AppResult};

// ============================================================================
// Types
// ============================================================================

const EVENT_NAME: &str = "fear-level-updated";

#[derive(Clone, Serialize)]
struct FearLevelPayload {
    level: i32,
    campaign_id: String,
}

// ============================================================================
// Helpers
// ============================================================================

fn get_required_campaign_id(conn: &rusqlite::Connection) -> AppResult<String> {
    get_current_campaign_id(conn)?
        .ok_or_else(|| AppError::InvalidOperation("No campaign selected".to_string()))
}

fn emit_fear_update(app: &tauri::AppHandle, level: i32, campaign_id: &str) -> AppResult<()> {
    app.emit(EVENT_NAME, FearLevelPayload { level, campaign_id: campaign_id.to_string() })
        .map_err(|e| AppError::EmitError(e.to_string()))
}

// ============================================================================
// Commands
// ============================================================================

/// Get the current fear level
#[tauri::command]
pub fn get_fear_level(db: State<Database>) -> AppResult<i32> {
    db.with_conn(|conn| {
        let campaign_id = get_required_campaign_id(conn)?;
        let campaign = get_campaign_by_id(conn, &campaign_id)?;
        Ok(campaign.fear_level)
    })
}

/// Adjust the fear level by a delta amount (positive or negative)
#[tauri::command]
pub fn adjust_fear_level(
    db: State<Database>,
    app: tauri::AppHandle,
    amount: i32,
) -> AppResult<i32> {
    db.with_conn(|conn| {
        let campaign_id = get_required_campaign_id(conn)?;
        let campaign = get_campaign_by_id(conn, &campaign_id)?;
        let new_level = (campaign.fear_level + amount).max(0);

        conn.execute(
            "UPDATE campaigns SET fear_level = ?1 WHERE id = ?2",
            params![new_level, campaign_id],
        )?;

        emit_fear_update(&app, new_level, &campaign_id)?;
        Ok(new_level)
    })
}

/// Set the fear level to an absolute value
#[tauri::command]
pub fn set_fear_level(
    db: State<Database>,
    app: tauri::AppHandle,
    value: i32,
) -> AppResult<i32> {
    db.with_conn(|conn| {
        let campaign_id = get_required_campaign_id(conn)?;
        let new_level = value.max(0);

        conn.execute(
            "UPDATE campaigns SET fear_level = ?1 WHERE id = ?2",
            params![new_level, campaign_id],
        )?;

        emit_fear_update(&app, new_level, &campaign_id)?;
        Ok(new_level)
    })
}

/// Reset the fear level to 0
#[tauri::command]
pub fn reset_fear_level(db: State<Database>, app: tauri::AppHandle) -> AppResult<i32> {
    set_fear_level(db, app, 0)
}
