use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, State};

use super::database::Database;
use super::error::{AppError, AppResult};

// ============================================================================
// Types
// ============================================================================

const FEAR_LEVEL_KEY: &str = "fear_level";
const EVENT_NAME: &str = "fear-level-updated";

#[derive(Clone, Serialize, Deserialize)]
struct FearLevelPayload {
    level: i32,
}

// ============================================================================
// Database Helpers
// ============================================================================

fn get_fear_level_from_db(conn: &Connection) -> AppResult<i32> {
    let result: Result<String, _> = conn.query_row(
        "SELECT value FROM app_state WHERE key = ?1",
        [FEAR_LEVEL_KEY],
        |row| row.get(0),
    );

    match result {
        Ok(value) => value
            .parse::<i32>()
            .map_err(|e| AppError::PersistenceError(e.to_string())),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(0), // Default to 0 if not set
        Err(e) => Err(AppError::PersistenceError(e.to_string())),
    }
}

fn set_fear_level_in_db(conn: &Connection, level: i32) -> AppResult<()> {
    conn.execute(
        "INSERT OR REPLACE INTO app_state (key, value) VALUES (?1, ?2)",
        params![FEAR_LEVEL_KEY, level.to_string()],
    )?;
    Ok(())
}

fn emit_fear_update(app: &tauri::AppHandle, level: i32) -> AppResult<()> {
    app.emit(EVENT_NAME, FearLevelPayload { level })
        .map_err(|e| AppError::EmitError(e.to_string()))
}

// ============================================================================
// Commands
// ============================================================================

/// Get the current fear level
#[tauri::command]
pub fn get_fear_level(db: State<Database>) -> AppResult<i32> {
    db.with_conn(|conn| get_fear_level_from_db(conn))
}

/// Adjust the fear level by a delta amount (positive or negative)
#[tauri::command]
pub fn adjust_fear_level(
    db: State<Database>,
    app: tauri::AppHandle,
    amount: i32,
) -> AppResult<i32> {
    db.with_conn(|conn| {
        let current = get_fear_level_from_db(conn)?;
        let new_level = (current + amount).max(0);
        set_fear_level_in_db(conn, new_level)?;
        emit_fear_update(&app, new_level)?;
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
        let new_level = value.max(0);
        set_fear_level_in_db(conn, new_level)?;
        emit_fear_update(&app, new_level)?;
        Ok(new_level)
    })
}

/// Reset the fear level to 0
#[tauri::command]
pub fn reset_fear_level(db: State<Database>, app: tauri::AppHandle) -> AppResult<i32> {
    set_fear_level(db, app, 0)
}

// ============================================================================
// Migration
// ============================================================================

/// Migrate fear level from the old store to SQLite
pub fn migrate_from_store(
    conn: &Connection,
    fear_level: i32,
) -> Result<(), Box<dyn std::error::Error>> {
    // Only set if not already present
    let existing: Result<String, _> = conn.query_row(
        "SELECT value FROM app_state WHERE key = ?1",
        [FEAR_LEVEL_KEY],
        |row| row.get(0),
    );

    if existing.is_err() {
        conn.execute(
            "INSERT INTO app_state (key, value) VALUES (?1, ?2)",
            params![FEAR_LEVEL_KEY, fear_level.to_string()],
        )?;
    }

    Ok(())
}
