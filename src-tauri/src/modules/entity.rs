use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, State};
use uuid::Uuid;

use super::campaign::get_current_campaign_id;
use super::database::Database;
use super::error::{AppError, AppResult};

// ============================================================================
// Types
// ============================================================================

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Entity {
    pub id: String,
    pub campaign_id: String,
    pub name: String,
    pub hp_current: i32,
    pub hp_max: i32,
    pub stress_current: i32,
    pub stress_max: i32,
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
    Adversary,
}

impl EntityType {
    fn as_str(&self) -> &'static str {
        match self {
            EntityType::Npc => "npc",
            EntityType::Adversary => "adversary",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "npc" => EntityType::Npc,
            _ => EntityType::Adversary,
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
    campaign_id: String,
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
        campaign_id: row.get(1)?,
        name: row.get(2)?,
        hp_current: row.get(3)?,
        hp_max: row.get(4)?,
        stress_current: row.get(5)?,
        stress_max: row.get(6)?,
        thresholds: DamageThresholds {
            minor: row.get(7)?,
            major: row.get(8)?,
            severe: row.get(9)?,
        },
        visible_to_players: row.get::<_, i32>(10)? != 0,
        entity_type: EntityType::from_str(&row.get::<_, String>(11)?),
    })
}

const SELECT_COLUMNS: &str = "id, campaign_id, name, hp_current, hp_max, stress_current, stress_max, threshold_minor, threshold_major, threshold_severe, visible_to_players, entity_type";

fn get_entities_for_campaign(conn: &Connection, campaign_id: &str) -> AppResult<Vec<Entity>> {
    let mut stmt = conn.prepare(
        &format!("SELECT {} FROM entities WHERE campaign_id = ?1", SELECT_COLUMNS)
    )?;

    let entities = stmt
        .query_map([campaign_id], |row| row_to_entity(row))?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(entities)
}

fn get_entity_by_id(conn: &Connection, id: &str) -> AppResult<Entity> {
    let mut stmt = conn.prepare(
        &format!("SELECT {} FROM entities WHERE id = ?1", SELECT_COLUMNS)
    )?;

    stmt.query_row([id], |row| row_to_entity(row))
        .map_err(|_| AppError::EntityNotFound(id.to_string()))
}

fn get_required_campaign_id(conn: &Connection) -> AppResult<String> {
    get_current_campaign_id(conn)?
        .ok_or_else(|| AppError::InvalidOperation("No campaign selected".to_string()))
}

fn emit_entities_update(app: &tauri::AppHandle, conn: &Connection, campaign_id: &str) -> AppResult<()> {
    let entities = get_entities_for_campaign(conn, campaign_id)?;
    app.emit("entities-updated", EntitiesPayload { entities, campaign_id: campaign_id.to_string() })
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
    stress_max: Option<i32>,
    thresholds: DamageThresholds,
    entity_type: EntityType,
) -> AppResult<Entity> {
    let id = Uuid::new_v4().to_string();
    let stress_max = stress_max.unwrap_or(0).min(12); // Cap at 12

    db.with_conn(|conn| {
        let campaign_id = get_required_campaign_id(conn)?;

        conn.execute(
            "INSERT INTO entities (id, campaign_id, name, hp_current, hp_max, stress_current, stress_max, threshold_minor, threshold_major, threshold_severe, visible_to_players, entity_type)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                id,
                campaign_id,
                name,
                hp_max,
                hp_max,
                0, // stress_current starts at 0
                stress_max,
                thresholds.minor,
                thresholds.major,
                thresholds.severe,
                0,
                entity_type.as_str()
            ],
        )?;

        let entity = Entity {
            id,
            campaign_id: campaign_id.clone(),
            name,
            hp_current: hp_max,
            hp_max,
            stress_current: 0,
            stress_max,
            thresholds,
            visible_to_players: false,
            entity_type,
        };

        emit_entities_update(&app, conn, &campaign_id)?;
        Ok(entity)
    })
}

#[tauri::command]
pub fn delete_entity(db: State<Database>, app: tauri::AppHandle, id: String) -> AppResult<()> {
    db.with_conn(|conn| {
        let entity = get_entity_by_id(conn, &id)?;
        let campaign_id = entity.campaign_id.clone();

        let rows_affected = conn.execute("DELETE FROM entities WHERE id = ?1", [&id])?;

        if rows_affected == 0 {
            return Err(AppError::EntityNotFound(id));
        }

        emit_entities_update(&app, conn, &campaign_id)?;
        Ok(())
    })
}

#[tauri::command]
pub fn get_entities(db: State<Database>, visible_only: bool) -> AppResult<Vec<Entity>> {
    db.with_conn(|conn| {
        let campaign_id = get_required_campaign_id(conn)?;

        let query = if visible_only {
            format!("SELECT {} FROM entities WHERE campaign_id = ?1 AND visible_to_players = 1", SELECT_COLUMNS)
        } else {
            format!("SELECT {} FROM entities WHERE campaign_id = ?1", SELECT_COLUMNS)
        };

        let mut stmt = conn.prepare(&query)?;

        let entities = stmt
            .query_map([&campaign_id], |row| row_to_entity(row))?
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
        let entity = get_entity_by_id(conn, &id)?;
        let new_hp = (entity.hp_current + amount).clamp(0, entity.hp_max);

        conn.execute(
            "UPDATE entities SET hp_current = ?1 WHERE id = ?2",
            params![new_hp, id],
        )?;

        let updated_entity = Entity {
            hp_current: new_hp,
            ..entity
        };

        emit_entities_update(&app, conn, &updated_entity.campaign_id)?;
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

        emit_entities_update(&app, conn, &updated_entity.campaign_id)?;
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

        emit_entities_update(&app, conn, &updated_entity.campaign_id)?;

        Ok(DamageResult {
            entity: updated_entity,
            damage_dealt: actual_hp_loss,
            threshold_hit,
        })
    })
}

// ============================================================================
// Stress Management
// ============================================================================

/// Result of adjusting stress, including any HP overflow damage
#[derive(Clone, Serialize)]
pub struct StressResult {
    pub entity: Entity,
    pub stress_applied: i32,
    pub hp_overflow_damage: i32,
}

/// Default stress cap when no specific maximum is set
const DEFAULT_STRESS_CAP: i32 = 12;

#[tauri::command]
pub fn adjust_entity_stress(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    amount: i32,
) -> AppResult<StressResult> {
    db.with_conn(|conn| {
        let entity = get_entity_by_id(conn, &id)?;

        // Use entity's stress_max if set, otherwise default to 12
        let effective_stress_max = if entity.stress_max > 0 {
            entity.stress_max
        } else {
            DEFAULT_STRESS_CAP
        };

        let mut stress_applied = 0;
        let mut hp_overflow_damage = 0;
        let mut new_stress = entity.stress_current;
        let mut new_hp = entity.hp_current;

        if amount > 0 {
            // Adding stress
            for _ in 0..amount {
                if new_stress < effective_stress_max {
                    // Room for stress
                    new_stress += 1;
                    stress_applied += 1;
                } else {
                    // Stress is maxed - overflow to HP damage
                    new_hp = (new_hp - 1).max(0);
                    hp_overflow_damage += 1;
                }
            }
        } else if amount < 0 {
            // Removing stress (healing)
            let reduction = (-amount).min(new_stress);
            new_stress -= reduction;
            stress_applied = -reduction;
        }

        // Update database
        conn.execute(
            "UPDATE entities SET stress_current = ?1, hp_current = ?2 WHERE id = ?3",
            params![new_stress, new_hp, id],
        )?;

        let updated_entity = Entity {
            stress_current: new_stress,
            hp_current: new_hp,
            ..entity
        };

        emit_entities_update(&app, conn, &updated_entity.campaign_id)?;

        Ok(StressResult {
            entity: updated_entity,
            stress_applied,
            hp_overflow_damage,
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

        emit_entities_update(&app, conn, &updated_entity.campaign_id)?;
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

        emit_entities_update(&app, conn, &updated_entity.campaign_id)?;
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

        emit_entities_update(&app, conn, &updated_entity.campaign_id)?;
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
        let campaign_id = get_required_campaign_id(conn)?;

        conn.execute(
            "UPDATE entities SET visible_to_players = ?1 WHERE campaign_id = ?2",
            params![visible as i32, campaign_id],
        )?;

        let entities = get_entities_for_campaign(conn, &campaign_id)?;
        emit_entities_update(&app, conn, &campaign_id)?;
        Ok(entities)
    })
}
