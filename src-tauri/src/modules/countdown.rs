use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{Emitter, State};
use uuid::Uuid;

use super::database::Database;
use super::error::{AppError, AppResult};

// ============================================================================
// Types
// ============================================================================

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct CountdownTracker {
    pub id: String,
    pub name: String,
    pub current: i32,
    pub max: i32,
    pub visible_to_players: bool,
    #[serde(default)]
    pub hide_name_from_players: bool,
    pub tracker_type: TrackerType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tick_labels: Option<HashMap<i32, String>>,
}

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TrackerType {
    Simple,
    Complex,
}

impl TrackerType {
    fn as_str(&self) -> &'static str {
        match self {
            TrackerType::Simple => "simple",
            TrackerType::Complex => "complex",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "complex" => TrackerType::Complex,
            _ => TrackerType::Simple,
        }
    }
}

#[derive(Clone, Serialize)]
struct TrackersPayload {
    trackers: Vec<CountdownTracker>,
}

// ============================================================================
// Database Helpers
// ============================================================================

fn row_to_tracker(row: &Row) -> rusqlite::Result<CountdownTracker> {
    Ok(CountdownTracker {
        id: row.get(0)?,
        name: row.get(1)?,
        current: row.get(2)?,
        max: row.get(3)?,
        visible_to_players: row.get::<_, i32>(4)? != 0,
        hide_name_from_players: row.get::<_, i32>(5)? != 0,
        tracker_type: TrackerType::from_str(&row.get::<_, String>(6)?),
        tick_labels: None, // Will be populated separately for complex trackers
    })
}

fn get_tick_labels(conn: &Connection, tracker_id: &str) -> AppResult<HashMap<i32, String>> {
    let mut stmt = conn.prepare("SELECT tick, label FROM tick_labels WHERE tracker_id = ?1")?;

    let labels = stmt
        .query_map([tracker_id], |row| Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?)))?
        .collect::<Result<HashMap<_, _>, _>>()?;

    Ok(labels)
}

fn get_all_trackers(conn: &Connection) -> AppResult<Vec<CountdownTracker>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, current, max, visible_to_players, hide_name_from_players, tracker_type
         FROM countdown_trackers",
    )?;

    let mut trackers: Vec<CountdownTracker> = stmt
        .query_map([], |row| row_to_tracker(row))?
        .collect::<Result<Vec<_>, _>>()?;

    // Load tick labels for complex trackers
    for tracker in &mut trackers {
        if tracker.tracker_type == TrackerType::Complex {
            tracker.tick_labels = Some(get_tick_labels(conn, &tracker.id)?);
        }
    }

    Ok(trackers)
}

fn get_tracker_by_id(conn: &Connection, id: &str) -> AppResult<CountdownTracker> {
    let mut stmt = conn.prepare(
        "SELECT id, name, current, max, visible_to_players, hide_name_from_players, tracker_type
         FROM countdown_trackers WHERE id = ?1",
    )?;

    let mut tracker = stmt
        .query_row([id], |row| row_to_tracker(row))
        .map_err(|_| AppError::TrackerNotFound(id.to_string()))?;

    // Load tick labels for complex trackers
    if tracker.tracker_type == TrackerType::Complex {
        tracker.tick_labels = Some(get_tick_labels(conn, id)?);
    }

    Ok(tracker)
}

fn emit_trackers_update(app: &tauri::AppHandle, conn: &Connection) -> AppResult<()> {
    let trackers = get_all_trackers(conn)?;
    app.emit("trackers-updated", TrackersPayload { trackers })
        .map_err(|e| AppError::EmitError(e.to_string()))
}

// ============================================================================
// CRUD Commands
// ============================================================================

#[tauri::command]
pub fn create_tracker(
    db: State<Database>,
    app: tauri::AppHandle,
    name: String,
    max: i32,
    tracker_type: TrackerType,
    visible_to_players: Option<bool>,
    hide_name_from_players: Option<bool>,
) -> AppResult<CountdownTracker> {
    let id = Uuid::new_v4().to_string();
    let visible = visible_to_players.unwrap_or(false);
    let hide_name = hide_name_from_players.unwrap_or(false);

    db.with_conn(|conn| {
        conn.execute(
            "INSERT INTO countdown_trackers (id, name, current, max, visible_to_players, hide_name_from_players, tracker_type)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                id,
                name,
                max,
                max,
                visible as i32,
                hide_name as i32,
                tracker_type.as_str()
            ],
        )?;

        let tracker = CountdownTracker {
            id,
            name,
            current: max,
            max,
            visible_to_players: visible,
            hide_name_from_players: hide_name,
            tracker_type: tracker_type.clone(),
            tick_labels: if tracker_type == TrackerType::Complex {
                Some(HashMap::new())
            } else {
                None
            },
        };

        emit_trackers_update(&app, conn)?;
        Ok(tracker)
    })
}

#[tauri::command]
pub fn delete_tracker(db: State<Database>, app: tauri::AppHandle, id: String) -> AppResult<()> {
    db.with_conn(|conn| {
        // Delete tick labels first (foreign key constraint)
        conn.execute("DELETE FROM tick_labels WHERE tracker_id = ?1", [&id])?;

        let rows_affected = conn.execute("DELETE FROM countdown_trackers WHERE id = ?1", [&id])?;

        if rows_affected == 0 {
            return Err(AppError::TrackerNotFound(id));
        }

        emit_trackers_update(&app, conn)?;
        Ok(())
    })
}

#[tauri::command]
pub fn get_trackers(db: State<Database>, visible_only: bool) -> AppResult<Vec<CountdownTracker>> {
    db.with_conn(|conn| {
        let mut stmt = if visible_only {
            conn.prepare(
                "SELECT id, name, current, max, visible_to_players, hide_name_from_players, tracker_type
                 FROM countdown_trackers WHERE visible_to_players = 1",
            )?
        } else {
            conn.prepare(
                "SELECT id, name, current, max, visible_to_players, hide_name_from_players, tracker_type
                 FROM countdown_trackers",
            )?
        };

        let mut trackers: Vec<CountdownTracker> = stmt
            .query_map([], |row| row_to_tracker(row))?
            .collect::<Result<Vec<_>, _>>()?;

        // Load tick labels for complex trackers
        for tracker in &mut trackers {
            if tracker.tracker_type == TrackerType::Complex {
                tracker.tick_labels = Some(get_tick_labels(conn, &tracker.id)?);
            }
        }

        Ok(trackers)
    })
}

// ============================================================================
// Value Management
// ============================================================================

#[tauri::command]
pub fn update_tracker_value(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    amount: i32,
) -> AppResult<CountdownTracker> {
    db.with_conn(|conn| {
        let tracker = get_tracker_by_id(conn, &id)?;
        let new_value = (tracker.current + amount).clamp(0, tracker.max);

        conn.execute(
            "UPDATE countdown_trackers SET current = ?1 WHERE id = ?2",
            params![new_value, id],
        )?;

        let updated_tracker = CountdownTracker {
            current: new_value,
            ..tracker
        };

        emit_trackers_update(&app, conn)?;
        Ok(updated_tracker)
    })
}

#[tauri::command]
pub fn set_tracker_value(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    value: i32,
) -> AppResult<CountdownTracker> {
    db.with_conn(|conn| {
        let tracker = get_tracker_by_id(conn, &id)?;
        let new_value = value.clamp(0, tracker.max);

        conn.execute(
            "UPDATE countdown_trackers SET current = ?1 WHERE id = ?2",
            params![new_value, id],
        )?;

        let updated_tracker = CountdownTracker {
            current: new_value,
            ..tracker
        };

        emit_trackers_update(&app, conn)?;
        Ok(updated_tracker)
    })
}

// ============================================================================
// Visibility Management
// ============================================================================

#[tauri::command]
pub fn toggle_tracker_visibility(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    visible: bool,
) -> AppResult<CountdownTracker> {
    db.with_conn(|conn| {
        let tracker = get_tracker_by_id(conn, &id)?;

        conn.execute(
            "UPDATE countdown_trackers SET visible_to_players = ?1 WHERE id = ?2",
            params![visible as i32, id],
        )?;

        let updated_tracker = CountdownTracker {
            visible_to_players: visible,
            ..tracker
        };

        emit_trackers_update(&app, conn)?;
        Ok(updated_tracker)
    })
}

#[tauri::command]
pub fn toggle_tracker_name_visibility(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    hide_name: bool,
) -> AppResult<CountdownTracker> {
    db.with_conn(|conn| {
        let tracker = get_tracker_by_id(conn, &id)?;

        conn.execute(
            "UPDATE countdown_trackers SET hide_name_from_players = ?1 WHERE id = ?2",
            params![hide_name as i32, id],
        )?;

        let updated_tracker = CountdownTracker {
            hide_name_from_players: hide_name,
            ..tracker
        };

        emit_trackers_update(&app, conn)?;
        Ok(updated_tracker)
    })
}

// ============================================================================
// Bulk Operations
// ============================================================================

#[tauri::command]
pub fn set_all_trackers_visibility(
    db: State<Database>,
    app: tauri::AppHandle,
    visible: bool,
) -> AppResult<Vec<CountdownTracker>> {
    db.with_conn(|conn| {
        conn.execute(
            "UPDATE countdown_trackers SET visible_to_players = ?1",
            params![visible as i32],
        )?;

        let trackers = get_all_trackers(conn)?;
        emit_trackers_update(&app, conn)?;
        Ok(trackers)
    })
}

// ============================================================================
// Complex Tracker Labels
// ============================================================================

#[tauri::command]
pub fn set_tick_label(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    tick: i32,
    text: String,
) -> AppResult<CountdownTracker> {
    db.with_conn(|conn| {
        let tracker = get_tracker_by_id(conn, &id)?;

        if tracker.tracker_type != TrackerType::Complex {
            return Err(AppError::InvalidOperation(
                "Cannot add tick labels to simple tracker".to_string(),
            ));
        }

        if tick < 0 || tick > tracker.max {
            return Err(AppError::OutOfRange(format!(
                "Tick {} out of range (0-{})",
                tick, tracker.max
            )));
        }

        // Insert or replace the tick label
        conn.execute(
            "INSERT OR REPLACE INTO tick_labels (tracker_id, tick, label) VALUES (?1, ?2, ?3)",
            params![id, tick, text],
        )?;

        // Reload tracker with updated labels
        let updated_tracker = get_tracker_by_id(conn, &id)?;

        emit_trackers_update(&app, conn)?;
        Ok(updated_tracker)
    })
}

#[tauri::command]
pub fn remove_tick_label(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    tick: i32,
) -> AppResult<CountdownTracker> {
    db.with_conn(|conn| {
        // Verify tracker exists
        let _tracker = get_tracker_by_id(conn, &id)?;

        conn.execute(
            "DELETE FROM tick_labels WHERE tracker_id = ?1 AND tick = ?2",
            params![id, tick],
        )?;

        // Reload tracker with updated labels
        let updated_tracker = get_tracker_by_id(conn, &id)?;

        emit_trackers_update(&app, conn)?;
        Ok(updated_tracker)
    })
}

// ============================================================================
// Migration
// ============================================================================

/// Migrate countdown trackers from the old store to SQLite
pub fn migrate_from_store(
    conn: &Connection,
    trackers: Vec<CountdownTracker>,
) -> Result<(), Box<dyn std::error::Error>> {
    for tracker in trackers {
        conn.execute(
            "INSERT OR IGNORE INTO countdown_trackers (id, name, current, max, visible_to_players, hide_name_from_players, tracker_type)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                tracker.id,
                tracker.name,
                tracker.current,
                tracker.max,
                tracker.visible_to_players as i32,
                tracker.hide_name_from_players as i32,
                tracker.tracker_type.as_str()
            ],
        )?;

        // Migrate tick labels if present
        if let Some(labels) = tracker.tick_labels {
            for (tick, label) in labels {
                conn.execute(
                    "INSERT OR IGNORE INTO tick_labels (tracker_id, tick, label) VALUES (?1, ?2, ?3)",
                    params![tracker.id, tick, label],
                )?;
            }
        }
    }
    Ok(())
}
