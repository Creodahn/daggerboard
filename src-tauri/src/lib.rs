mod modules;

use modules::{campaign, countdown, database::Database, entity, fear_tracker};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            // Get app data directory for database
            let app_data_dir = app.path().app_data_dir()?;

            // Initialize SQLite database (handles migrations)
            let db = Database::new(app_data_dir)?;

            // Ensure a campaign exists and is selected
            db.with_conn(|conn| {
                campaign::ensure_campaign_exists(conn)
                    .map_err(|e| modules::error::AppError::PersistenceError(e.to_string()))
            })?;

            // Manage database as state
            app.manage(db);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Campaign commands
            campaign::create_campaign,
            campaign::get_campaigns,
            campaign::get_current_campaign,
            campaign::set_current_campaign,
            campaign::rename_campaign,
            campaign::delete_campaign,
            campaign::get_campaign_settings,
            campaign::update_campaign_settings,
            // Fear tracker commands
            fear_tracker::get_fear_level,
            fear_tracker::set_fear_level,
            fear_tracker::adjust_fear_level,
            fear_tracker::reset_fear_level,
            // Countdown tracker commands
            countdown::create_tracker,
            countdown::update_tracker_value,
            countdown::set_tracker_value,
            countdown::toggle_tracker_visibility,
            countdown::toggle_tracker_name_visibility,
            countdown::delete_tracker,
            countdown::get_trackers,
            countdown::set_tick_label,
            countdown::remove_tick_label,
            countdown::set_all_trackers_visibility,
            // Entity commands
            entity::create_entity,
            entity::delete_entity,
            entity::get_entities,
            entity::update_entity_hp,
            entity::set_entity_hp,
            entity::apply_damage,
            entity::update_entity_thresholds,
            entity::update_entity_name,
            entity::toggle_entity_visibility,
            entity::set_all_entities_visibility,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
