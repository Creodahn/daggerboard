use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use super::database::Database;
use super::error::AppResult;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlayerCharacter {
    pub id: String,
    pub campaign_id: String,

    // Basic info
    pub name: String,
    pub ancestry: Option<String>,
    pub community: Option<String>,
    pub class: Option<String>,
    pub subclass: Option<String>,
    pub domain: Option<String>,
    pub level: i32,

    // Attributes
    pub attr_agility: i32,
    pub attr_strength: i32,
    pub attr_finesse: i32,
    pub attr_instinct: i32,
    pub attr_presence: i32,
    pub attr_knowledge: i32,

    // Health
    pub hp_current: i32,
    pub hp_max: i32,
    pub threshold_minor: i32,
    pub threshold_major: i32,
    pub threshold_severe: i32,

    // Defense
    pub armor_current: i32,
    pub armor_max: i32,
    pub evasion: i32,

    // Resources
    pub hope: i32,
    pub stress_current: i32,
    pub stress_max: i32,

    // Experiences & background
    pub experiences: String, // JSON array
    pub background: Option<String>,
    pub notes: Option<String>,

    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePlayerCharacter {
    pub name: String,
    pub ancestry: Option<String>,
    pub community: Option<String>,
    pub class: Option<String>,
    pub subclass: Option<String>,
    pub domain: Option<String>,
    #[serde(default = "default_level")]
    pub level: i32,
    #[serde(default)]
    pub attr_agility: i32,
    #[serde(default)]
    pub attr_strength: i32,
    #[serde(default)]
    pub attr_finesse: i32,
    #[serde(default)]
    pub attr_instinct: i32,
    #[serde(default)]
    pub attr_presence: i32,
    #[serde(default)]
    pub attr_knowledge: i32,
    #[serde(default = "default_hp")]
    pub hp_max: i32,
    #[serde(default = "default_threshold_minor")]
    pub threshold_minor: i32,
    #[serde(default = "default_threshold_major")]
    pub threshold_major: i32,
    #[serde(default = "default_threshold_severe")]
    pub threshold_severe: i32,
    #[serde(default)]
    pub armor_max: i32,
    #[serde(default)]
    pub evasion: i32,
    #[serde(default = "default_stress")]
    pub stress_max: i32,
}

fn default_level() -> i32 { 1 }
fn default_hp() -> i32 { 6 }
fn default_threshold_minor() -> i32 { 1 }
fn default_threshold_major() -> i32 { 6 }
fn default_threshold_severe() -> i32 { 11 }
fn default_stress() -> i32 { 6 }

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePlayerCharacter {
    pub name: Option<String>,
    pub ancestry: Option<String>,
    pub community: Option<String>,
    pub class: Option<String>,
    pub subclass: Option<String>,
    pub domain: Option<String>,
    pub level: Option<i32>,
    pub attr_agility: Option<i32>,
    pub attr_strength: Option<i32>,
    pub attr_finesse: Option<i32>,
    pub attr_instinct: Option<i32>,
    pub attr_presence: Option<i32>,
    pub attr_knowledge: Option<i32>,
    pub hp_current: Option<i32>,
    pub hp_max: Option<i32>,
    pub threshold_minor: Option<i32>,
    pub threshold_major: Option<i32>,
    pub threshold_severe: Option<i32>,
    pub armor_current: Option<i32>,
    pub armor_max: Option<i32>,
    pub evasion: Option<i32>,
    pub hope: Option<i32>,
    pub stress_current: Option<i32>,
    pub stress_max: Option<i32>,
    pub experiences: Option<String>,
    pub background: Option<String>,
    pub notes: Option<String>,
}

fn row_to_player_character(row: &Row) -> rusqlite::Result<PlayerCharacter> {
    Ok(PlayerCharacter {
        id: row.get(0)?,
        campaign_id: row.get(1)?,
        name: row.get(2)?,
        ancestry: row.get(3)?,
        community: row.get(4)?,
        class: row.get(5)?,
        subclass: row.get(6)?,
        domain: row.get(7)?,
        level: row.get(8)?,
        attr_agility: row.get(9)?,
        attr_strength: row.get(10)?,
        attr_finesse: row.get(11)?,
        attr_instinct: row.get(12)?,
        attr_presence: row.get(13)?,
        attr_knowledge: row.get(14)?,
        hp_current: row.get(15)?,
        hp_max: row.get(16)?,
        threshold_minor: row.get(17)?,
        threshold_major: row.get(18)?,
        threshold_severe: row.get(19)?,
        armor_current: row.get(20)?,
        armor_max: row.get(21)?,
        evasion: row.get(22)?,
        hope: row.get(23)?,
        stress_current: row.get(24)?,
        stress_max: row.get(25)?,
        experiences: row.get(26)?,
        background: row.get(27)?,
        notes: row.get(28)?,
        created_at: row.get(29)?,
        updated_at: row.get(30)?,
    })
}

const SELECT_COLUMNS: &str = "id, campaign_id, name, ancestry, community, class, subclass, domain, level,
    attr_agility, attr_strength, attr_finesse, attr_instinct, attr_presence, attr_knowledge,
    hp_current, hp_max, threshold_minor, threshold_major, threshold_severe,
    armor_current, armor_max, evasion, hope, stress_current, stress_max,
    experiences, background, notes, created_at, updated_at";

#[tauri::command]
pub fn create_player_character(
    db: State<Database>,
    app: AppHandle,
    campaign_id: String,
    data: CreatePlayerCharacter,
) -> AppResult<PlayerCharacter> {
    db.with_conn(|conn| {
        let id = Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO player_characters (
                id, campaign_id, name, ancestry, community, class, subclass, domain, level,
                attr_agility, attr_strength, attr_finesse, attr_instinct, attr_presence, attr_knowledge,
                hp_current, hp_max, threshold_minor, threshold_major, threshold_severe,
                armor_max, evasion, stress_max
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
            params![
                id,
                campaign_id,
                data.name,
                data.ancestry,
                data.community,
                data.class,
                data.subclass,
                data.domain,
                data.level,
                data.attr_agility,
                data.attr_strength,
                data.attr_finesse,
                data.attr_instinct,
                data.attr_presence,
                data.attr_knowledge,
                data.hp_max, // hp_current starts at hp_max
                data.hp_max,
                data.threshold_minor,
                data.threshold_major,
                data.threshold_severe,
                data.armor_max,
                data.evasion,
                data.stress_max
            ],
        )?;

        let character = conn.query_row(
            &format!("SELECT {} FROM player_characters WHERE id = ?1", SELECT_COLUMNS),
            params![id],
            row_to_player_character,
        )?;

        let _ = app.emit("player-characters-updated", &campaign_id);

        Ok(character)
    })
}

#[tauri::command]
pub fn get_player_characters(
    db: State<Database>,
    campaign_id: String,
) -> AppResult<Vec<PlayerCharacter>> {
    db.with_conn(|conn| {
        let mut stmt = conn.prepare(&format!(
            "SELECT {} FROM player_characters WHERE campaign_id = ?1 ORDER BY name",
            SELECT_COLUMNS
        ))?;

        let characters = stmt
            .query_map(params![campaign_id], row_to_player_character)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(characters)
    })
}

#[tauri::command]
pub fn get_player_character(
    db: State<Database>,
    id: String,
) -> AppResult<PlayerCharacter> {
    db.with_conn(|conn| {
        let character = conn.query_row(
            &format!("SELECT {} FROM player_characters WHERE id = ?1", SELECT_COLUMNS),
            params![id],
            row_to_player_character,
        )?;

        Ok(character)
    })
}

#[tauri::command]
pub fn update_player_character(
    db: State<Database>,
    app: AppHandle,
    id: String,
    data: UpdatePlayerCharacter,
) -> AppResult<PlayerCharacter> {
    db.with_conn(|conn| {
        // Build dynamic update query
        let mut updates = vec!["updated_at = datetime('now')".to_string()];
        let mut values: Vec<Box<dyn rusqlite::ToSql>> = vec![];

        macro_rules! add_field {
            ($field:ident, $column:expr) => {
                if let Some(val) = data.$field {
                    updates.push(format!("{} = ?{}", $column, values.len() + 1));
                    values.push(Box::new(val));
                }
            };
        }

        add_field!(name, "name");
        add_field!(ancestry, "ancestry");
        add_field!(community, "community");
        add_field!(class, "class");
        add_field!(subclass, "subclass");
        add_field!(domain, "domain");
        add_field!(level, "level");
        add_field!(attr_agility, "attr_agility");
        add_field!(attr_strength, "attr_strength");
        add_field!(attr_finesse, "attr_finesse");
        add_field!(attr_instinct, "attr_instinct");
        add_field!(attr_presence, "attr_presence");
        add_field!(attr_knowledge, "attr_knowledge");
        add_field!(hp_current, "hp_current");
        add_field!(hp_max, "hp_max");
        add_field!(threshold_minor, "threshold_minor");
        add_field!(threshold_major, "threshold_major");
        add_field!(threshold_severe, "threshold_severe");
        add_field!(armor_current, "armor_current");
        add_field!(armor_max, "armor_max");
        add_field!(evasion, "evasion");
        add_field!(hope, "hope");
        add_field!(stress_current, "stress_current");
        add_field!(stress_max, "stress_max");
        add_field!(experiences, "experiences");
        add_field!(background, "background");
        add_field!(notes, "notes");

        let query = format!(
            "UPDATE player_characters SET {} WHERE id = ?{}",
            updates.join(", "),
            values.len() + 1
        );

        values.push(Box::new(id.clone()));

        let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        conn.execute(&query, params.as_slice())?;

        let character = conn.query_row(
            &format!("SELECT {} FROM player_characters WHERE id = ?1", SELECT_COLUMNS),
            params![id],
            row_to_player_character,
        )?;

        let _ = app.emit("player-characters-updated", &character.campaign_id);
        let _ = app.emit("player-character-updated", &character);

        Ok(character)
    })
}

#[tauri::command]
pub fn delete_player_character(
    db: State<Database>,
    app: AppHandle,
    id: String,
) -> AppResult<()> {
    db.with_conn(|conn| {
        // Get campaign_id before deleting
        let campaign_id: String = conn.query_row(
            "SELECT campaign_id FROM player_characters WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )?;

        conn.execute("DELETE FROM player_characters WHERE id = ?1", params![id])?;

        let _ = app.emit("player-characters-updated", &campaign_id);

        Ok(())
    })
}

#[tauri::command]
pub fn adjust_player_hp(
    db: State<Database>,
    app: AppHandle,
    id: String,
    amount: i32,
) -> AppResult<PlayerCharacter> {
    db.with_conn(|conn| {
        conn.execute(
            "UPDATE player_characters SET hp_current = MAX(0, hp_current + ?1), updated_at = datetime('now') WHERE id = ?2",
            params![amount, id],
        )?;

        let character = conn.query_row(
            &format!("SELECT {} FROM player_characters WHERE id = ?1", SELECT_COLUMNS),
            params![id],
            row_to_player_character,
        )?;

        let _ = app.emit("player-characters-updated", &character.campaign_id);
        let _ = app.emit("player-character-updated", &character);

        Ok(character)
    })
}

#[tauri::command]
pub fn adjust_player_hope(
    db: State<Database>,
    app: AppHandle,
    id: String,
    amount: i32,
) -> AppResult<PlayerCharacter> {
    db.with_conn(|conn| {
        conn.execute(
            "UPDATE player_characters SET hope = MAX(0, hope + ?1), updated_at = datetime('now') WHERE id = ?2",
            params![amount, id],
        )?;

        let character = conn.query_row(
            &format!("SELECT {} FROM player_characters WHERE id = ?1", SELECT_COLUMNS),
            params![id],
            row_to_player_character,
        )?;

        let _ = app.emit("player-characters-updated", &character.campaign_id);
        let _ = app.emit("player-character-updated", &character);

        Ok(character)
    })
}

#[tauri::command]
pub fn adjust_player_stress(
    db: State<Database>,
    app: AppHandle,
    id: String,
    amount: i32,
) -> AppResult<PlayerCharacter> {
    db.with_conn(|conn| {
        conn.execute(
            "UPDATE player_characters SET stress_current = CLAMP(stress_current + ?1, 0, stress_max), updated_at = datetime('now') WHERE id = ?2",
            params![amount, id],
        )?;

        let character = conn.query_row(
            &format!("SELECT {} FROM player_characters WHERE id = ?1", SELECT_COLUMNS),
            params![id],
            row_to_player_character,
        )?;

        let _ = app.emit("player-characters-updated", &character.campaign_id);
        let _ = app.emit("player-character-updated", &character);

        Ok(character)
    })
}

#[tauri::command]
pub fn adjust_player_armor(
    db: State<Database>,
    app: AppHandle,
    id: String,
    amount: i32,
) -> AppResult<PlayerCharacter> {
    db.with_conn(|conn| {
        conn.execute(
            "UPDATE player_characters SET armor_current = CLAMP(armor_current + ?1, 0, armor_max), updated_at = datetime('now') WHERE id = ?2",
            params![amount, id],
        )?;

        let character = conn.query_row(
            &format!("SELECT {} FROM player_characters WHERE id = ?1", SELECT_COLUMNS),
            params![id],
            row_to_player_character,
        )?;

        let _ = app.emit("player-characters-updated", &character.campaign_id);
        let _ = app.emit("player-character-updated", &character);

        Ok(character)
    })
}
