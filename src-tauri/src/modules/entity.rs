use serde::{Deserialize, Serialize};
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

// Implement Persistable for Entity
impl Persistable for Entity {
    fn store_key() -> &'static str {
        "entities"
    }

    fn event_name() -> &'static str {
        "entities-updated"
    }
}

// Helper to create the payload
fn entities_payload(entities: Vec<Entity>) -> EntitiesPayload {
    EntitiesPayload { entities }
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
) -> AppResult<Entity> {
    let entity = Entity {
        id: Uuid::new_v4().to_string(),
        name,
        hp_current: hp_max,
        hp_max,
        thresholds,
        visible_to_players: false,
        entity_type,
    };

    let entity_clone = entity.clone();

    mutate_and_persist(
        &state.entities,
        &app,
        |entities| {
            entities.push(entity);
            Ok(())
        },
        entities_payload,
    )?;

    Ok(entity_clone)
}

#[tauri::command]
pub fn delete_entity(
    state: State<EntityState>,
    app: tauri::AppHandle,
    id: String,
) -> AppResult<()> {
    delete_and_persist(
        &state.entities,
        &app,
        &id,
        |e| &e.id,
        entities_payload,
    )
}

#[tauri::command]
pub fn get_entities(state: State<EntityState>, visible_only: bool) -> AppResult<Vec<Entity>> {
    if visible_only {
        read_items(&state.entities, Some(|e: &Entity| e.visible_to_players))
    } else {
        read_items::<Entity, fn(&Entity) -> bool>(&state.entities, None)
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
) -> AppResult<Entity> {
    mutate_and_persist(
        &state.entities,
        &app,
        |entities| {
            let entity = entities
                .iter_mut()
                .find(|e| e.id == id)
                .ok_or_else(|| AppError::EntityNotFound(id.clone()))?;

            entity.hp_current = (entity.hp_current + amount).clamp(0, entity.hp_max);
            Ok(entity.clone())
        },
        entities_payload,
    )
}

#[tauri::command]
pub fn set_entity_hp(
    state: State<EntityState>,
    app: tauri::AppHandle,
    id: String,
    value: i32,
) -> AppResult<Entity> {
    mutate_and_persist(
        &state.entities,
        &app,
        |entities| {
            let entity = entities
                .iter_mut()
                .find(|e| e.id == id)
                .ok_or_else(|| AppError::EntityNotFound(id.clone()))?;

            entity.hp_current = value.clamp(0, entity.hp_max);
            Ok(entity.clone())
        },
        entities_payload,
    )
}

#[tauri::command]
pub fn apply_damage(
    state: State<EntityState>,
    app: tauri::AppHandle,
    id: String,
    damage: i32,
) -> AppResult<DamageResult> {
    mutate_and_persist(
        &state.entities,
        &app,
        |entities| {
            let entity = entities
                .iter_mut()
                .find(|e| e.id == id)
                .ok_or_else(|| AppError::EntityNotFound(id.clone()))?;

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

            Ok(DamageResult {
                entity: entity.clone(),
                damage_dealt: actual_hp_loss,
                threshold_hit,
            })
        },
        entities_payload,
    )
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
) -> AppResult<Entity> {
    mutate_and_persist(
        &state.entities,
        &app,
        |entities| {
            let entity = entities
                .iter_mut()
                .find(|e| e.id == id)
                .ok_or_else(|| AppError::EntityNotFound(id.clone()))?;

            entity.thresholds = thresholds;
            Ok(entity.clone())
        },
        entities_payload,
    )
}

#[tauri::command]
pub fn update_entity_name(
    state: State<EntityState>,
    app: tauri::AppHandle,
    id: String,
    name: String,
) -> AppResult<Entity> {
    mutate_and_persist(
        &state.entities,
        &app,
        |entities| {
            let entity = entities
                .iter_mut()
                .find(|e| e.id == id)
                .ok_or_else(|| AppError::EntityNotFound(id.clone()))?;

            entity.name = name;
            Ok(entity.clone())
        },
        entities_payload,
    )
}

#[tauri::command]
pub fn toggle_entity_visibility(
    state: State<EntityState>,
    app: tauri::AppHandle,
    id: String,
    visible: bool,
) -> AppResult<Entity> {
    mutate_and_persist(
        &state.entities,
        &app,
        |entities| {
            let entity = entities
                .iter_mut()
                .find(|e| e.id == id)
                .ok_or_else(|| AppError::EntityNotFound(id.clone()))?;

            entity.visible_to_players = visible;
            Ok(entity.clone())
        },
        entities_payload,
    )
}

// ============================================================================
// Bulk Operations
// ============================================================================

#[tauri::command]
pub fn set_all_entities_visibility(
    state: State<EntityState>,
    app: tauri::AppHandle,
    visible: bool,
) -> AppResult<Vec<Entity>> {
    mutate_and_persist(
        &state.entities,
        &app,
        |entities| {
            for entity in entities.iter_mut() {
                entity.visible_to_players = visible;
            }
            Ok(entities.clone())
        },
        entities_payload,
    )
}

// ============================================================================
// Persistence
// ============================================================================

/// Load persisted entities from store into state
pub fn load_state(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let entities = persistence::load::<Entity>(app)?;
    let entity_state: State<EntityState> = app.state();
    *lock_or_error(&entity_state.entities)
        .map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))? =
        entities;
    Ok(())
}
