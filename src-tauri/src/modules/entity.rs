use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};
use tauri_plugin_store::StoreExt;
use uuid::Uuid;

// ============================================================================
// Types & State
// ============================================================================

#[derive(Default)]
pub struct EntityState {
    pub entities: Mutex<Vec<Entity>>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Entity {
    pub id: String,
    pub name: String,
    pub hp_current: i32,
    pub hp_max: i32,
    pub thresholds: DamageThresholds,
    pub visible_to_players: bool,
    #[serde(default)]
    pub entity_type: EntityType,
}

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Default)]
#[serde(rename_all = "lowercase")]
pub enum EntityType {
    Npc,
    #[default]
    Enemy,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DamageThresholds {
    pub minor: i32,
    pub major: i32,
    pub severe: i32,
}

#[derive(Clone, Serialize)]
struct EntitiesPayload {
    entities: Vec<Entity>,
}

#[derive(Clone, Serialize)]
pub struct DamageResult {
    pub entity: Entity,
    pub damage_dealt: i32,
    pub threshold_hit: Option<String>,
}

// ============================================================================
// CRUD Commands
// ============================================================================

#[tauri::command]
pub fn create_entity(
    state: State<EntityState>,
    app: tauri::AppHandle,
    name: String,
    hp_max: i32,
    thresholds: DamageThresholds,
    entity_type: EntityType,
) -> Result<Entity, String> {
    let entity = Entity {
        id: Uuid::new_v4().to_string(),
        name,
        hp_current: hp_max,
        hp_max,
        thresholds,
        visible_to_players: false,
        entity_type,
    };

    let entities_clone = {
        let mut entities = state.entities.lock().unwrap();
        entities.push(entity.clone());
        entities.clone()
    };

    save_entities(&app, &entities_clone)?;
    emit_entity_update(&app, &entities_clone)?;

    Ok(entity)
}

#[tauri::command]
pub fn delete_entity(
    state: State<EntityState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let entities_clone = {
        let mut entities = state.entities.lock().unwrap();
        entities.retain(|e| e.id != id);
        entities.clone()
    };

    save_entities(&app, &entities_clone)?;
    emit_entity_update(&app, &entities_clone)?;

    Ok(())
}

#[tauri::command]
pub fn get_entities(
    state: State<EntityState>,
    visible_only: bool,
) -> Vec<Entity> {
    let entities = state.entities.lock().unwrap();

    if visible_only {
        entities
            .iter()
            .filter(|e| e.visible_to_players)
            .cloned()
            .collect()
    } else {
        entities.clone()
    }
}

// ============================================================================
// HP Management
// ============================================================================

#[tauri::command]
pub fn update_entity_hp(
    state: State<EntityState>,
    app: tauri::AppHandle,
    id: String,
    amount: i32,
) -> Result<Entity, String> {
    let (entity_clone, entities_clone) = {
        let mut entities = state.entities.lock().unwrap();
        let entity = entities
            .iter_mut()
            .find(|e| e.id == id)
            .ok_or("Entity not found")?;

        entity.hp_current = (entity.hp_current + amount).clamp(0, entity.hp_max);

        (entity.clone(), entities.clone())
    };

    save_entities(&app, &entities_clone)?;
    emit_entity_update(&app, &entities_clone)?;

    Ok(entity_clone)
}

#[tauri::command]
pub fn set_entity_hp(
    state: State<EntityState>,
    app: tauri::AppHandle,
    id: String,
    value: i32,
) -> Result<Entity, String> {
    let (entity_clone, entities_clone) = {
        let mut entities = state.entities.lock().unwrap();
        let entity = entities
            .iter_mut()
            .find(|e| e.id == id)
            .ok_or("Entity not found")?;

        entity.hp_current = value.clamp(0, entity.hp_max);

        (entity.clone(), entities.clone())
    };

    save_entities(&app, &entities_clone)?;
    emit_entity_update(&app, &entities_clone)?;

    Ok(entity_clone)
}

#[tauri::command]
pub fn apply_damage(
    state: State<EntityState>,
    app: tauri::AppHandle,
    id: String,
    damage: i32,
) -> Result<DamageResult, String> {
    let (result, entities_clone) = {
        let mut entities = state.entities.lock().unwrap();
        let entity = entities
            .iter_mut()
            .find(|e| e.id == id)
            .ok_or("Entity not found")?;

        // Calculate HP loss based on threshold hit
        let massive_threshold = entity.thresholds.severe * 2;
        let (threshold_hit, hp_loss) = if damage >= massive_threshold {
            (Some("massive".to_string()), 4)
        } else if damage >= entity.thresholds.severe {
            (Some("severe".to_string()), 3)
        } else if damage >= entity.thresholds.major {
            (Some("major".to_string()), 2)
        } else if damage >= entity.thresholds.minor {
            (Some("minor".to_string()), 1)
        } else {
            (None, 0)
        };

        // Apply HP loss (capped at current HP)
        let actual_hp_loss = hp_loss.min(entity.hp_current);
        entity.hp_current -= actual_hp_loss;

        let result = DamageResult {
            entity: entity.clone(),
            damage_dealt: actual_hp_loss,
            threshold_hit,
        };

        (result, entities.clone())
    };

    save_entities(&app, &entities_clone)?;
    emit_entity_update(&app, &entities_clone)?;

    Ok(result)
}

// ============================================================================
// Configuration
// ============================================================================

#[tauri::command]
pub fn update_entity_thresholds(
    state: State<EntityState>,
    app: tauri::AppHandle,
    id: String,
    thresholds: DamageThresholds,
) -> Result<Entity, String> {
    let (entity_clone, entities_clone) = {
        let mut entities = state.entities.lock().unwrap();
        let entity = entities
            .iter_mut()
            .find(|e| e.id == id)
            .ok_or("Entity not found")?;

        entity.thresholds = thresholds;

        (entity.clone(), entities.clone())
    };

    save_entities(&app, &entities_clone)?;
    emit_entity_update(&app, &entities_clone)?;

    Ok(entity_clone)
}

#[tauri::command]
pub fn update_entity_name(
    state: State<EntityState>,
    app: tauri::AppHandle,
    id: String,
    name: String,
) -> Result<Entity, String> {
    let (entity_clone, entities_clone) = {
        let mut entities = state.entities.lock().unwrap();
        let entity = entities
            .iter_mut()
            .find(|e| e.id == id)
            .ok_or("Entity not found")?;

        entity.name = name;

        (entity.clone(), entities.clone())
    };

    save_entities(&app, &entities_clone)?;
    emit_entity_update(&app, &entities_clone)?;

    Ok(entity_clone)
}

#[tauri::command]
pub fn toggle_entity_visibility(
    state: State<EntityState>,
    app: tauri::AppHandle,
    id: String,
    visible: bool,
) -> Result<Entity, String> {
    let (entity_clone, entities_clone) = {
        let mut entities = state.entities.lock().unwrap();
        let entity = entities
            .iter_mut()
            .find(|e| e.id == id)
            .ok_or("Entity not found")?;

        entity.visible_to_players = visible;

        (entity.clone(), entities.clone())
    };

    save_entities(&app, &entities_clone)?;
    emit_entity_update(&app, &entities_clone)?;

    Ok(entity_clone)
}

// ============================================================================
// Persistence
// ============================================================================

fn save_entities(app: &tauri::AppHandle, entities: &[Entity]) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    let json_value = serde_json::to_value(entities).map_err(|e| e.to_string())?;
    store.set("entities", json_value);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

fn emit_entity_update(
    app: &tauri::AppHandle,
    entities: &[Entity],
) -> Result<(), String> {
    app.emit("entities-updated", EntitiesPayload {
        entities: entities.to_vec(),
    })
    .map_err(|e| e.to_string())
}

/// Load persisted entities from store into state
pub fn load_state(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store("store.json")?;
    if let Some(entities_value) = store.get("entities") {
        let entities: Vec<Entity> = serde_json::from_value(entities_value.clone())?;
        let entity_state: State<EntityState> = app.state();
        *entity_state.entities.lock().unwrap() = entities;
    }
    Ok(())
}
