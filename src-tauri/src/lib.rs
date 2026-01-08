mod modules;

use modules::{countdown, entity, fear_tracker};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(fear_tracker::FearTrackerState::default())
        .manage(countdown::CountdownState::default())
        .manage(entity::EntityState::default())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            // Load persisted state
            fear_tracker::load_state(app)?;
            countdown::load_state(app)?;
            entity::load_state(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fear_tracker::get_fear_level,
            fear_tracker::set_fear_level,
            countdown::create_tracker,
            countdown::update_tracker_value,
            countdown::set_tracker_value,
            countdown::toggle_tracker_visibility,
            countdown::toggle_tracker_name_visibility,
            countdown::delete_tracker,
            countdown::get_trackers,
            countdown::set_tick_label,
            countdown::remove_tick_label,
            entity::create_entity,
            entity::delete_entity,
            entity::get_entities,
            entity::update_entity_hp,
            entity::set_entity_hp,
            entity::apply_damage,
            entity::update_entity_thresholds,
            entity::update_entity_name,
            entity::toggle_entity_visibility
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
