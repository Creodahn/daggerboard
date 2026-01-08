use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};
use tauri_plugin_store::StoreExt;
use uuid::Uuid;

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
) -> Result<CountdownTracker, String> {
    let tracker = CountdownTracker {
        id: Uuid::new_v4().to_string(),
        name,
        current: max,
        max,
        visible_to_players: false,
        hide_name_from_players: false,
        tracker_type: tracker_type.clone(),
        tick_labels: if tracker_type == TrackerType::Complex {
            Some(HashMap::new())
        } else {
            None
        },
    };

    let trackers_clone = {
        let mut trackers = state.trackers.lock().unwrap();
        trackers.push(tracker.clone());
        trackers.clone()
    };

    save_trackers(&app, &trackers_clone)?;
    emit_tracker_update(&app, &trackers_clone)?;

    Ok(tracker)
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
) -> Result<CountdownTracker, String> {
    let (tracker_clone, trackers_clone) = {
        let mut trackers = state.trackers.lock().unwrap();
        let tracker = trackers
            .iter_mut()
            .find(|t| t.id == id)
            .ok_or("Tracker not found")?;
        tracker.current = (tracker.current + amount).clamp(0, tracker.max);
        (tracker.clone(), trackers.clone())
    };

    save_trackers(&app, &trackers_clone)?;
    emit_tracker_update(&app, &trackers_clone)?;

    Ok(tracker_clone)
}

#[tauri::command]
pub fn set_tracker_value(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    id: String,
    value: i32,
) -> Result<CountdownTracker, String> {
    let (tracker_clone, trackers_clone) = {
        let mut trackers = state.trackers.lock().unwrap();
        let tracker = trackers
            .iter_mut()
            .find(|t| t.id == id)
            .ok_or("Tracker not found")?;
        tracker.current = value.clamp(0, tracker.max);
        (tracker.clone(), trackers.clone())
    };

    save_trackers(&app, &trackers_clone)?;
    emit_tracker_update(&app, &trackers_clone)?;

    Ok(tracker_clone)
}

// ============================================================================
// Visibility & Deletion
// ============================================================================

#[tauri::command]
pub fn toggle_tracker_visibility(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    id: String,
    visible: bool,
) -> Result<CountdownTracker, String> {
    let (tracker_clone, trackers_clone) = {
        let mut trackers = state.trackers.lock().unwrap();
        let tracker = trackers
            .iter_mut()
            .find(|t| t.id == id)
            .ok_or("Tracker not found")?;
        tracker.visible_to_players = visible;
        (tracker.clone(), trackers.clone())
    };

    save_trackers(&app, &trackers_clone)?;
    emit_tracker_update(&app, &trackers_clone)?;

    Ok(tracker_clone)
}

#[tauri::command]
pub fn toggle_tracker_name_visibility(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    id: String,
    hide_name: bool,
) -> Result<CountdownTracker, String> {
    let (tracker_clone, trackers_clone) = {
        let mut trackers = state.trackers.lock().unwrap();
        let tracker = trackers
            .iter_mut()
            .find(|t| t.id == id)
            .ok_or("Tracker not found")?;
        tracker.hide_name_from_players = hide_name;
        (tracker.clone(), trackers.clone())
    };

    save_trackers(&app, &trackers_clone)?;
    emit_tracker_update(&app, &trackers_clone)?;

    Ok(tracker_clone)
}

#[tauri::command]
pub fn delete_tracker(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let trackers_clone = {
        let mut trackers = state.trackers.lock().unwrap();
        trackers.retain(|t| t.id != id);
        trackers.clone()
    };

    save_trackers(&app, &trackers_clone)?;
    emit_tracker_update(&app, &trackers_clone)?;

    Ok(())
}

// ============================================================================
// Query Commands
// ============================================================================

#[tauri::command]
pub fn get_trackers(
    state: State<CountdownState>,
    visible_only: bool,
) -> Vec<CountdownTracker> {
    let trackers = state.trackers.lock().unwrap();

    if visible_only {
        trackers
            .iter()
            .filter(|t| t.visible_to_players)
            .cloned()
            .collect()
    } else {
        trackers.clone()
    }
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
) -> Result<CountdownTracker, String> {
    let (tracker_clone, trackers_clone) = {
        let mut trackers = state.trackers.lock().unwrap();
        let tracker = trackers
            .iter_mut()
            .find(|t| t.id == id)
            .ok_or("Tracker not found")?;

        if tracker.tracker_type != TrackerType::Complex {
            return Err("Cannot add tick labels to simple tracker".to_string());
        }

        if tick < 0 || tick > tracker.max {
            return Err(format!("Tick {} out of range (0-{})", tick, tracker.max));
        }

        if let Some(labels) = &mut tracker.tick_labels {
            labels.insert(tick, text);
        }

        (tracker.clone(), trackers.clone())
    };

    save_trackers(&app, &trackers_clone)?;
    emit_tracker_update(&app, &trackers_clone)?;

    Ok(tracker_clone)
}

#[tauri::command]
pub fn remove_tick_label(
    state: State<CountdownState>,
    app: tauri::AppHandle,
    id: String,
    tick: i32,
) -> Result<CountdownTracker, String> {
    let (tracker_clone, trackers_clone) = {
        let mut trackers = state.trackers.lock().unwrap();
        let tracker = trackers
            .iter_mut()
            .find(|t| t.id == id)
            .ok_or("Tracker not found")?;

        if let Some(labels) = &mut tracker.tick_labels {
            labels.remove(&tick);
        }

        (tracker.clone(), trackers.clone())
    };

    save_trackers(&app, &trackers_clone)?;
    emit_tracker_update(&app, &trackers_clone)?;

    Ok(tracker_clone)
}

// ============================================================================
// Persistence
// ============================================================================

fn save_trackers(app: &tauri::AppHandle, trackers: &[CountdownTracker]) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let json_value = serde_json::to_value(trackers).map_err(|e| e.to_string())?;
    store.set("countdownTrackers", json_value);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

fn emit_tracker_update(
    app: &tauri::AppHandle,
    trackers: &[CountdownTracker],
) -> Result<(), String> {
    app.emit("trackers-updated", TrackersPayload {
        trackers: trackers.to_vec(),
    })
    .map_err(|e| e.to_string())
}

pub fn load_state(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store("store.json")?;
    if let Some(trackers_value) = store.get("countdownTrackers") {
        let trackers: Vec<CountdownTracker> = serde_json::from_value(trackers_value.clone())?;
        let countdown_state: State<CountdownState> = app.state();
        *countdown_state.trackers.lock().unwrap() = trackers;
    }
    Ok(())
}
