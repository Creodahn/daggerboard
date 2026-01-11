use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{Emitter, State};
use uuid::Uuid;

use super::campaign::get_current_campaign_id;
use super::database::Database;
use super::error::{AppError, AppResult};

// ============================================================================
// Types
// ============================================================================

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct CountdownTracker {
    pub id: String,
    pub campaign_id: String,
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
    campaign_id: String,
}

// ============================================================================
// Database Helpers
// ============================================================================

fn row_to_tracker(row: &Row) -> rusqlite::Result<CountdownTracker> {
    Ok(CountdownTracker {
        id: row.get(0)?,
        campaign_id: row.get(1)?,
        name: row.get(2)?,
        current: row.get(3)?,
        max: row.get(4)?,
        visible_to_players: row.get::<_, i32>(5)? != 0,
        hide_name_from_players: row.get::<_, i32>(6)? != 0,
        tracker_type: TrackerType::from_str(&row.get::<_, String>(7)?),
        tick_labels: None,
    })
}

fn get_tick_labels(conn: &Connection, tracker_id: &str) -> AppResult<HashMap<i32, String>> {
    let mut stmt = conn.prepare("SELECT tick, label FROM tick_labels WHERE tracker_id = ?1")?;

    let labels = stmt
        .query_map([tracker_id], |row| Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?)))?
        .collect::<Result<HashMap<_, _>, _>>()?;

    Ok(labels)
}

fn get_trackers_for_campaign(conn: &Connection, campaign_id: &str) -> AppResult<Vec<CountdownTracker>> {
    let mut stmt = conn.prepare(
        "SELECT id, campaign_id, name, current, max, visible_to_players, hide_name_from_players, tracker_type
         FROM countdown_trackers WHERE campaign_id = ?1",
    )?;

    let mut trackers: Vec<CountdownTracker> = stmt
        .query_map([campaign_id], |row| row_to_tracker(row))?
        .collect::<Result<Vec<_>, _>>()?;

    for tracker in &mut trackers {
        if tracker.tracker_type == TrackerType::Complex {
            tracker.tick_labels = Some(get_tick_labels(conn, &tracker.id)?);
        }
    }

    Ok(trackers)
}

fn get_tracker_by_id(conn: &Connection, id: &str) -> AppResult<CountdownTracker> {
    let mut stmt = conn.prepare(
        "SELECT id, campaign_id, name, current, max, visible_to_players, hide_name_from_players, tracker_type
         FROM countdown_trackers WHERE id = ?1",
    )?;

    let mut tracker = stmt
        .query_row([id], |row| row_to_tracker(row))
        .map_err(|_| AppError::TrackerNotFound(id.to_string()))?;

    if tracker.tracker_type == TrackerType::Complex {
        tracker.tick_labels = Some(get_tick_labels(conn, id)?);
    }

    Ok(tracker)
}

fn get_required_campaign_id(conn: &Connection) -> AppResult<String> {
    get_current_campaign_id(conn)?
        .ok_or_else(|| AppError::InvalidOperation("No campaign selected".to_string()))
}

fn emit_trackers_update(app: &tauri::AppHandle, conn: &Connection, campaign_id: &str) -> AppResult<()> {
    let trackers = get_trackers_for_campaign(conn, campaign_id)?;
    app.emit("trackers-updated", TrackersPayload { trackers, campaign_id: campaign_id.to_string() })
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
        let campaign_id = get_required_campaign_id(conn)?;

        conn.execute(
            "INSERT INTO countdown_trackers (id, campaign_id, name, current, max, visible_to_players, hide_name_from_players, tracker_type)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                id,
                campaign_id,
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
            campaign_id: campaign_id.clone(),
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

        emit_trackers_update(&app, conn, &campaign_id)?;
        Ok(tracker)
    })
}

#[tauri::command]
pub fn delete_tracker(db: State<Database>, app: tauri::AppHandle, id: String) -> AppResult<()> {
    db.with_conn(|conn| {
        let tracker = get_tracker_by_id(conn, &id)?;
        let campaign_id = tracker.campaign_id.clone();

        conn.execute("DELETE FROM tick_labels WHERE tracker_id = ?1", [&id])?;
        let rows_affected = conn.execute("DELETE FROM countdown_trackers WHERE id = ?1", [&id])?;

        if rows_affected == 0 {
            return Err(AppError::TrackerNotFound(id));
        }

        emit_trackers_update(&app, conn, &campaign_id)?;
        Ok(())
    })
}

#[tauri::command]
pub fn get_trackers(db: State<Database>, visible_only: bool) -> AppResult<Vec<CountdownTracker>> {
    db.with_conn(|conn| {
        let campaign_id = get_required_campaign_id(conn)?;

        let mut stmt = if visible_only {
            conn.prepare(
                "SELECT id, campaign_id, name, current, max, visible_to_players, hide_name_from_players, tracker_type
                 FROM countdown_trackers WHERE campaign_id = ?1 AND visible_to_players = 1",
            )?
        } else {
            conn.prepare(
                "SELECT id, campaign_id, name, current, max, visible_to_players, hide_name_from_players, tracker_type
                 FROM countdown_trackers WHERE campaign_id = ?1",
            )?
        };

        let mut trackers: Vec<CountdownTracker> = stmt
            .query_map([&campaign_id], |row| row_to_tracker(row))?
            .collect::<Result<Vec<_>, _>>()?;

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

        emit_trackers_update(&app, conn, &updated_tracker.campaign_id)?;
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

        emit_trackers_update(&app, conn, &updated_tracker.campaign_id)?;
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

        emit_trackers_update(&app, conn, &updated_tracker.campaign_id)?;
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

        emit_trackers_update(&app, conn, &updated_tracker.campaign_id)?;
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
        let campaign_id = get_required_campaign_id(conn)?;

        conn.execute(
            "UPDATE countdown_trackers SET visible_to_players = ?1 WHERE campaign_id = ?2",
            params![visible as i32, campaign_id],
        )?;

        let trackers = get_trackers_for_campaign(conn, &campaign_id)?;
        emit_trackers_update(&app, conn, &campaign_id)?;
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

        conn.execute(
            "INSERT OR REPLACE INTO tick_labels (tracker_id, tick, label) VALUES (?1, ?2, ?3)",
            params![id, tick, text],
        )?;

        let updated_tracker = get_tracker_by_id(conn, &id)?;

        emit_trackers_update(&app, conn, &updated_tracker.campaign_id)?;
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
        let _tracker = get_tracker_by_id(conn, &id)?;

        conn.execute(
            "DELETE FROM tick_labels WHERE tracker_id = ?1 AND tick = ?2",
            params![id, tick],
        )?;

        let updated_tracker = get_tracker_by_id(conn, &id)?;

        emit_trackers_update(&app, conn, &updated_tracker.campaign_id)?;
        Ok(updated_tracker)
    })
}
