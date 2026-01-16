use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use super::database::Database;
use super::error::AppResult;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiceRoll {
    pub id: String,
    pub campaign_id: String,
    pub notation: String,
    pub dice_data: String, // JSON array of dice results
    pub modifier: i32,
    pub total: i32,
    pub is_crit: bool,
    pub is_fumble: bool,
    pub shared_with_players: bool,
    pub rolled_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiceRollsByDate {
    pub date: String,
    pub rolls: Vec<DiceRoll>,
}

fn row_to_dice_roll(row: &Row) -> rusqlite::Result<DiceRoll> {
    Ok(DiceRoll {
        id: row.get(0)?,
        campaign_id: row.get(1)?,
        notation: row.get(2)?,
        dice_data: row.get(3)?,
        modifier: row.get(4)?,
        total: row.get(5)?,
        is_crit: row.get::<_, i32>(6)? != 0,
        is_fumble: row.get::<_, i32>(7)? != 0,
        shared_with_players: row.get::<_, i32>(8)? != 0,
        rolled_at: row.get(9)?,
    })
}

#[tauri::command]
pub fn save_dice_roll(
    db: State<Database>,
    app: AppHandle,
    campaign_id: String,
    notation: String,
    dice_data: String,
    modifier: i32,
    total: i32,
    is_crit: bool,
    is_fumble: bool,
    shared_with_players: bool,
) -> AppResult<DiceRoll> {
    db.with_conn(|conn| {
        let id = Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO dice_rolls (id, campaign_id, notation, dice_data, modifier, total, is_crit, is_fumble, shared_with_players)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                id,
                campaign_id,
                notation,
                dice_data,
                modifier,
                total,
                is_crit as i32,
                is_fumble as i32,
                shared_with_players as i32
            ],
        )?;

        // Fetch the created roll to get the server-generated timestamp
        let roll = conn.query_row(
            "SELECT id, campaign_id, notation, dice_data, modifier, total, is_crit, is_fumble, shared_with_players, rolled_at
             FROM dice_rolls WHERE id = ?1",
            params![id],
            row_to_dice_roll,
        )?;

        // Emit event for other windows
        let _ = app.emit("dice-roll-saved", &roll);

        Ok(roll)
    })
}

#[tauri::command]
pub fn get_dice_rolls(
    db: State<Database>,
    campaign_id: String,
    limit: Option<i32>,
) -> AppResult<Vec<DiceRoll>> {
    db.with_conn(|conn| {
        let limit = limit.unwrap_or(100);

        let mut stmt = conn.prepare(
            "SELECT id, campaign_id, notation, dice_data, modifier, total, is_crit, is_fumble, shared_with_players, rolled_at
             FROM dice_rolls
             WHERE campaign_id = ?1
             ORDER BY rolled_at DESC
             LIMIT ?2",
        )?;

        let rolls = stmt
            .query_map(params![campaign_id, limit], row_to_dice_roll)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(rolls)
    })
}

#[tauri::command]
pub fn get_dice_rolls_by_date(
    db: State<Database>,
    campaign_id: String,
    limit: Option<i32>,
) -> AppResult<Vec<DiceRollsByDate>> {
    db.with_conn(|conn| {
        let limit = limit.unwrap_or(100);

        let mut stmt = conn.prepare(
            "SELECT id, campaign_id, notation, dice_data, modifier, total, is_crit, is_fumble, shared_with_players, rolled_at
             FROM dice_rolls
             WHERE campaign_id = ?1
             ORDER BY rolled_at DESC
             LIMIT ?2",
        )?;

        let rolls: Vec<DiceRoll> = stmt
            .query_map(params![campaign_id, limit], row_to_dice_roll)?
            .collect::<Result<Vec<_>, _>>()?;

        // Group rolls by date
        let mut grouped: std::collections::HashMap<String, Vec<DiceRoll>> = std::collections::HashMap::new();

        for roll in rolls {
            // Extract date portion (YYYY-MM-DD) from rolled_at
            let date = roll.rolled_at.split(' ').next().unwrap_or(&roll.rolled_at).to_string();
            grouped.entry(date).or_default().push(roll);
        }

        // Convert to sorted vector
        let mut result: Vec<DiceRollsByDate> = grouped
            .into_iter()
            .map(|(date, rolls)| DiceRollsByDate { date, rolls })
            .collect();

        // Sort by date descending (most recent first)
        result.sort_by(|a, b| b.date.cmp(&a.date));

        Ok(result)
    })
}

#[tauri::command]
pub fn delete_dice_roll(db: State<Database>, id: String) -> AppResult<()> {
    db.with_conn(|conn| {
        conn.execute("DELETE FROM dice_rolls WHERE id = ?1", params![id])?;
        Ok(())
    })
}

#[tauri::command]
pub fn clear_dice_history(db: State<Database>, campaign_id: String) -> AppResult<()> {
    db.with_conn(|conn| {
        conn.execute(
            "DELETE FROM dice_rolls WHERE campaign_id = ?1",
            params![campaign_id],
        )?;
        Ok(())
    })
}
