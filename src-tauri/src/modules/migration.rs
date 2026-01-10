use rusqlite::Connection;
use std::path::Path;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

use super::{countdown, entity, fear_tracker};

/// Check if migration is needed and perform it
pub fn migrate_if_needed(
    app: &tauri::App,
    conn: &Connection,
) -> Result<(), Box<dyn std::error::Error>> {
    // Check if migration has already been done
    let migration_done: Result<String, _> = conn.query_row(
        "SELECT value FROM app_state WHERE key = 'migration_completed'",
        [],
        |row| row.get(0),
    );

    if migration_done.is_ok() {
        // Already migrated
        return Ok(());
    }

    // Try to load from old store
    let store_result = app.store("store.json");

    if let Ok(store) = store_result {
        println!("Migrating data from store.json to SQLite...");

        // Migrate entities
        if let Some(entities_value) = store.get("entities") {
            if let Ok(entities) = serde_json::from_value::<Vec<entity::Entity>>(entities_value.clone()) {
                entity::migrate_from_store(conn, entities)?;
                println!("  Migrated {} entities", store.get("entities").map(|v| v.as_array().map(|a| a.len()).unwrap_or(0)).unwrap_or(0));
            }
        }

        // Migrate countdown trackers
        if let Some(trackers_value) = store.get("countdownTrackers") {
            if let Ok(trackers) = serde_json::from_value::<Vec<countdown::CountdownTracker>>(trackers_value.clone()) {
                countdown::migrate_from_store(conn, trackers)?;
                println!("  Migrated {} countdown trackers", store.get("countdownTrackers").map(|v| v.as_array().map(|a| a.len()).unwrap_or(0)).unwrap_or(0));
            }
        }

        // Migrate fear level
        if let Some(fear_value) = store.get("fearLevel") {
            if let Some(level) = fear_value.as_i64() {
                fear_tracker::migrate_from_store(conn, level as i32)?;
                println!("  Migrated fear level: {}", level);
            }
        }

        println!("Migration complete!");
    }

    // Mark migration as complete
    conn.execute(
        "INSERT INTO app_state (key, value) VALUES ('migration_completed', 'true')",
        [],
    )?;

    // Optionally, rename old store file to indicate it's been migrated
    let app_data_dir = app.path().app_data_dir()?;
    let old_store_path = app_data_dir.join("store.json");
    let backup_path = app_data_dir.join("store.json.migrated");

    if Path::new(&old_store_path).exists() && !Path::new(&backup_path).exists() {
        if let Err(e) = std::fs::rename(&old_store_path, &backup_path) {
            eprintln!("Warning: Could not rename old store file: {}", e);
        }
    }

    Ok(())
}
