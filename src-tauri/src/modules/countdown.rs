use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{Manager, State};
use uuid::Uuid;

use super::error::{AppError, AppResult};
use super::persistence::{self, Persistable};
use super::state_manager::{delete_and_persist, lock_or_error, mutate_and_persist, read_items};

// ============================================================================
// Types & State
// ============================================================================

#[derive(Default)]
pub struct CountdownState {
    pub trackers: Mutex<Vec<CountdownTracker>>,
}

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

#[derive(Clone, Serialize)]
struct TrackersPayload {
    trackers: Vec<CountdownTracker>,
}

// Implement Persistable for CountdownTracker
impl Persistable for CountdownTracker {
    fn store_key() -> &'static str {
        "countdownTrackers"
    }

    fn event_name() -> &'static str {
        "trackers-updated"
    }
}

// Helper to create the payload
fn trackers_payload(trackers: Vec<CountdownTracker>) -> TrackersPayload {
    TrackersPayload { trackers }
}

// ============================================================================
// CRUD Commands
// ============================================================================

#[tauri::command]
pub fn create_tracker(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    name: String,
    max: i32,
    tracker_type: TrackerType,
    visible_to_players: Option<bool>,
    hide_name_from_players: Option<bool>,
) -> AppResult<CountdownTracker> {
    let tracker = CountdownTracker {
        id: Uuid::new_v4().to_string(),
        name,
        current: max,
        max,
        visible_to_players: visible_to_players.unwrap_or(false),
        hide_name_from_players: hide_name_from_players.unwrap_or(false),
        tracker_type: tracker_type.clone(),
        tick_labels: if tracker_type == TrackerType::Complex {
            Some(HashMap::new())
        } else {
            None
        },
    };

    let tracker_clone = tracker.clone();

    mutate_and_persist(
        &state.trackers,
        &app,
        |trackers| {
            trackers.push(tracker);
            Ok(())
        },
        trackers_payload,
    )?;

    Ok(tracker_clone)
}

#[tauri::command]
pub fn delete_tracker(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    id: String,
) -> AppResult<()> {
    delete_and_persist(&state.trackers, &app, &id, |t| &t.id, trackers_payload)
}

#[tauri::command]
pub fn get_trackers(
    state: State<CountdownState>,
    visible_only: bool,
) -> AppResult<Vec<CountdownTracker>> {
    if visible_only {
        read_items(
            &state.trackers,
            Some(|t: &CountdownTracker| t.visible_to_players),
        )
    } else {
        read_items::<CountdownTracker, fn(&CountdownTracker) -> bool>(&state.trackers, None)
    }
}

// ============================================================================
// Value Management
// ============================================================================

#[tauri::command]
pub fn update_tracker_value(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    id: String,
    amount: i32,
) -> AppResult<CountdownTracker> {
    mutate_and_persist(
        &state.trackers,
        &app,
        |trackers| {
            let tracker = trackers
                .iter_mut()
                .find(|t| t.id == id)
                .ok_or_else(|| AppError::TrackerNotFound(id.clone()))?;

            tracker.current = (tracker.current + amount).clamp(0, tracker.max);
            Ok(tracker.clone())
        },
        trackers_payload,
    )
}

#[tauri::command]
pub fn set_tracker_value(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    id: String,
    value: i32,
) -> AppResult<CountdownTracker> {
    mutate_and_persist(
        &state.trackers,
        &app,
        |trackers| {
            let tracker = trackers
                .iter_mut()
                .find(|t| t.id == id)
                .ok_or_else(|| AppError::TrackerNotFound(id.clone()))?;

            tracker.current = value.clamp(0, tracker.max);
            Ok(tracker.clone())
        },
        trackers_payload,
    )
}

// ============================================================================
// Visibility Management
// ============================================================================

#[tauri::command]
pub fn toggle_tracker_visibility(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    id: String,
    visible: bool,
) -> AppResult<CountdownTracker> {
    mutate_and_persist(
        &state.trackers,
        &app,
        |trackers| {
            let tracker = trackers
                .iter_mut()
                .find(|t| t.id == id)
                .ok_or_else(|| AppError::TrackerNotFound(id.clone()))?;

            tracker.visible_to_players = visible;
            Ok(tracker.clone())
        },
        trackers_payload,
    )
}

#[tauri::command]
pub fn toggle_tracker_name_visibility(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    id: String,
    hide_name: bool,
) -> AppResult<CountdownTracker> {
    mutate_and_persist(
        &state.trackers,
        &app,
        |trackers| {
            let tracker = trackers
                .iter_mut()
                .find(|t| t.id == id)
                .ok_or_else(|| AppError::TrackerNotFound(id.clone()))?;

            tracker.hide_name_from_players = hide_name;
            Ok(tracker.clone())
        },
        trackers_payload,
    )
}

// ============================================================================
// Bulk Operations
// ============================================================================

#[tauri::command]
pub fn set_all_trackers_visibility(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    visible: bool,
) -> AppResult<Vec<CountdownTracker>> {
    mutate_and_persist(
        &state.trackers,
        &app,
        |trackers| {
            for tracker in trackers.iter_mut() {
                tracker.visible_to_players = visible;
            }
            Ok(trackers.clone())
        },
        trackers_payload,
    )
}

// ============================================================================
// Complex Tracker Labels
// ============================================================================

#[tauri::command]
pub fn set_tick_label(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    id: String,
    tick: i32,
    text: String,
) -> AppResult<CountdownTracker> {
    mutate_and_persist(
        &state.trackers,
        &app,
        |trackers| {
            let tracker = trackers
                .iter_mut()
                .find(|t| t.id == id)
                .ok_or_else(|| AppError::TrackerNotFound(id.clone()))?;

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

            if let Some(labels) = &mut tracker.tick_labels {
                labels.insert(tick, text);
            }

            Ok(tracker.clone())
        },
        trackers_payload,
    )
}

#[tauri::command]
pub fn remove_tick_label(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    id: String,
    tick: i32,
) -> AppResult<CountdownTracker> {
    mutate_and_persist(
        &state.trackers,
        &app,
        |trackers| {
            let tracker = trackers
                .iter_mut()
                .find(|t| t.id == id)
                .ok_or_else(|| AppError::TrackerNotFound(id.clone()))?;

            if let Some(labels) = &mut tracker.tick_labels {
                labels.remove(&tick);
            }

            Ok(tracker.clone())
        },
        trackers_payload,
    )
}

// ============================================================================
// Persistence
// ============================================================================

pub fn load_state(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let trackers = persistence::load::<CountdownTracker>(app)?;
    let countdown_state: State<CountdownState> = app.state();
    *lock_or_error(&countdown_state.trackers)
        .map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))? =
        trackers;
    Ok(())
}
