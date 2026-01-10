use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, State};
use uuid::Uuid;

use super::database::Database;
use super::error::{AppError, AppResult};

// ============================================================================
// Types
// ============================================================================

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

impl EntityType {
    fn as_str(&self) -> &'static str {
        match self {
            EntityType::Npc => "npc",
            EntityType::Enemy => "enemy",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "npc" => EntityType::Npc,
            _ => EntityType::Enemy,
        }
    }
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
// Database Helpers
// ============================================================================

fn row_to_entity(row: &Row) -> rusqlite::Result<Entity> {
    Ok(Entity {
        id: row.get(0)?,
        name: row.get(1)?,
        hp_current: row.get(2)?,
        hp_max: row.get(3)?,
        thresholds: DamageThresholds {
            minor: row.get(4)?,
            major: row.get(5)?,
            severe: row.get(6)?,
        },
        visible_to_players: row.get::<_, i32>(7)? != 0,
        entity_type: EntityType::from_str(&row.get::<_, String>(8)?),
    })
}

fn get_all_entities(conn: &Connection) -> AppResult<Vec<Entity>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, hp_current, hp_max, threshold_minor, threshold_major, threshold_severe, visible_to_players, entity_type
         FROM entities"
    )?;

    let entities = stmt
        .query_map([], |row| row_to_entity(row))?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(entities)
}

fn get_entity_by_id(conn: &Connection, id: &str) -> AppResult<Entity> {
    let mut stmt = conn.prepare(
        "SELECT id, name, hp_current, hp_max, threshold_minor, threshold_major, threshold_severe, visible_to_players, entity_type
         FROM entities WHERE id = ?1"
    )?;

    stmt.query_row([id], |row| row_to_entity(row))
        .map_err(|_| AppError::EntityNotFound(id.to_string()))
}

fn emit_entities_update(app: &tauri::AppHandle, conn: &Connection) -> AppResult<()> {
    let entities = get_all_entities(conn)?;
    app.emit("entities-updated", EntitiesPayload { entities })
        .map_err(|e| AppError::EmitError(e.to_string()))
}

// ============================================================================
// CRUD Commands
// ============================================================================

#[tauri::command]
pub fn create_entity(
    db: State<Database>,
    app: tauri::AppHandle,
    name: String,
    hp_max: i32,
    thresholds: DamageThresholds,
    entity_type: EntityType,
) -> AppResult<Entity> {
    let id = Uuid::new_v4().to_string();

    db.with_conn(|conn| {
        conn.execute(
            "INSERT INTO entities (id, name, hp_current, hp_max, threshold_minor, threshold_major, threshold_severe, visible_to_players, entity_type)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                id,
                name,
                hp_max,
                hp_max,
                thresholds.minor,
                thresholds.major,
                thresholds.severe,
                0,
                entity_type.as_str()
            ],
        )?;

        let entity = Entity {
            id,
            name,
            hp_current: hp_max,
            hp_max,
            thresholds,
            visible_to_players: false,
            entity_type,
        };

        emit_entities_update(&app, conn)?;
        Ok(entity)
    })
}

#[tauri::command]
pub fn delete_entity(db: State<Database>, app: tauri::AppHandle, id: String) -> AppResult<()> {
    db.with_conn(|conn| {
        let rows_affected = conn.execute("DELETE FROM entities WHERE id = ?1", [&id])?;

        if rows_affected == 0 {
            return Err(AppError::EntityNotFound(id));
        }

        emit_entities_update(&app, conn)?;
        Ok(())
    })
}

#[tauri::command]
pub fn get_entities(db: State<Database>, visible_only: bool) -> AppResult<Vec<Entity>> {
    db.with_conn(|conn| {
        let mut stmt = if visible_only {
            conn.prepare(
                "SELECT id, name, hp_current, hp_max, threshold_minor, threshold_major, threshold_severe, visible_to_players, entity_type
                 FROM entities WHERE visible_to_players = 1"
            )?
        } else {
            conn.prepare(
                "SELECT id, name, hp_current, hp_max, threshold_minor, threshold_major, threshold_severe, visible_to_players, entity_type
                 FROM entities"
            )?
        };

        let entities = stmt
            .query_map([], |row| row_to_entity(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(entities)
    })
}

// ============================================================================
// HP Management
// ============================================================================

#[tauri::command]
pub fn update_entity_hp(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    amount: i32,
) -> AppResult<Entity> {
    db.with_conn(|conn| {
        // Get current entity
        let entity = get_entity_by_id(conn, &id)?;

        // Calculate new HP
        let new_hp = (entity.hp_current + amount).clamp(0, entity.hp_max);

        // Update in database
        conn.execute(
            "UPDATE entities SET hp_current = ?1 WHERE id = ?2",
            params![new_hp, id],
        )?;

        let updated_entity = Entity {
            hp_current: new_hp,
            ..entity
        };

        emit_entities_update(&app, conn)?;
        Ok(updated_entity)
    })
}

#[tauri::command]
pub fn set_entity_hp(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    value: i32,
) -> AppResult<Entity> {
    db.with_conn(|conn| {
        let entity = get_entity_by_id(conn, &id)?;
        let new_hp = value.clamp(0, entity.hp_max);

        conn.execute(
            "UPDATE entities SET hp_current = ?1 WHERE id = ?2",
            params![new_hp, id],
        )?;

        let updated_entity = Entity {
            hp_current: new_hp,
            ..entity
        };

        emit_entities_update(&app, conn)?;
        Ok(updated_entity)
    })
}

#[tauri::command]
pub fn apply_damage(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    damage: i32,
) -> AppResult<DamageResult> {
    db.with_conn(|conn| {
        let entity = get_entity_by_id(conn, &id)?;

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
        let new_hp = entity.hp_current - actual_hp_loss;

        conn.execute(
            "UPDATE entities SET hp_current = ?1 WHERE id = ?2",
            params![new_hp, id],
        )?;

        let updated_entity = Entity {
            hp_current: new_hp,
            ..entity
        };

        emit_entities_update(&app, conn)?;

        Ok(DamageResult {
            entity: updated_entity,
            damage_dealt: actual_hp_loss,
            threshold_hit,
        })
    })
}

// ============================================================================
// Configuration
// ============================================================================

#[tauri::command]
pub fn update_entity_thresholds(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    thresholds: DamageThresholds,
) -> AppResult<Entity> {
    db.with_conn(|conn| {
        let entity = get_entity_by_id(conn, &id)?;

        conn.execute(
            "UPDATE entities SET threshold_minor = ?1, threshold_major = ?2, threshold_severe = ?3 WHERE id = ?4",
            params![thresholds.minor, thresholds.major, thresholds.severe, id],
        )?;

        let updated_entity = Entity {
            thresholds,
            ..entity
        };

        emit_entities_update(&app, conn)?;
        Ok(updated_entity)
    })
}

#[tauri::command]
pub fn update_entity_name(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    name: String,
) -> AppResult<Entity> {
    db.with_conn(|conn| {
        let entity = get_entity_by_id(conn, &id)?;

        conn.execute(
            "UPDATE entities SET name = ?1 WHERE id = ?2",
            params![name, id],
        )?;

        let updated_entity = Entity { name, ..entity };

        emit_entities_update(&app, conn)?;
        Ok(updated_entity)
    })
}

#[tauri::command]
pub fn toggle_entity_visibility(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    visible: bool,
) -> AppResult<Entity> {
    db.with_conn(|conn| {
        let entity = get_entity_by_id(conn, &id)?;

        conn.execute(
            "UPDATE entities SET visible_to_players = ?1 WHERE id = ?2",
            params![visible as i32, id],
        )?;

        let updated_entity = Entity {
            visible_to_players: visible,
            ..entity
        };

        emit_entities_update(&app, conn)?;
        Ok(updated_entity)
    })
}

// ============================================================================
// Bulk Operations
// ============================================================================

#[tauri::command]
pub fn set_all_entities_visibility(
    db: State<Database>,
    app: tauri::AppHandle,
    visible: bool,
) -> AppResult<Vec<Entity>> {
    db.with_conn(|conn| {
        conn.execute(
            "UPDATE entities SET visible_to_players = ?1",
            params![visible as i32],
        )?;

        let entities = get_all_entities(conn)?;
        emit_entities_update(&app, conn)?;
        Ok(entities)
    })
}

// ============================================================================
// Migration
// ============================================================================

/// Migrate entities from the old store to SQLite
pub fn migrate_from_store(
    conn: &Connection,
    entities: Vec<Entity>,
) -> Result<(), Box<dyn std::error::Error>> {
    for entity in entities {
        conn.execute(
            "INSERT OR IGNORE INTO entities (id, name, hp_current, hp_max, threshold_minor, threshold_major, threshold_severe, visible_to_players, entity_type)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                entity.id,
                entity.name,
                entity.hp_current,
                entity.hp_max,
                entity.thresholds.minor,
                entity.thresholds.major,
                entity.thresholds.severe,
                entity.visible_to_players as i32,
                entity.entity_type.as_str()
            ],
        )?;
    }
    Ok(())
}
