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
pub struct Campaign {
    pub id: String,
    pub name: String,
    pub fear_level: i32,
    pub allow_massive_damage: bool,
    pub created_at: String,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct CampaignSettings {
    pub allow_massive_damage: bool,
}

#[derive(Clone, Serialize)]
struct SettingsPayload {
    campaign_id: String,
    settings: CampaignSettings,
}

#[derive(Clone, Serialize)]
struct CampaignsPayload {
    campaigns: Vec<Campaign>,
}

#[derive(Clone, Serialize)]
struct CurrentCampaignPayload {
    campaign: Option<Campaign>,
}

// ============================================================================
// Database Helpers
// ============================================================================

fn row_to_campaign(row: &Row) -> rusqlite::Result<Campaign> {
    Ok(Campaign {
        id: row.get(0)?,
        name: row.get(1)?,
        fear_level: row.get(2)?,
        allow_massive_damage: row.get::<_, i32>(3)? != 0,
        created_at: row.get(4)?,
    })
}

fn get_all_campaigns(conn: &Connection) -> AppResult<Vec<Campaign>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, fear_level, allow_massive_damage, created_at FROM campaigns ORDER BY created_at DESC",
    )?;

    let campaigns = stmt
        .query_map([], |row| row_to_campaign(row))?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(campaigns)
}

pub fn get_campaign_by_id(conn: &Connection, id: &str) -> AppResult<Campaign> {
    let mut stmt = conn.prepare(
        "SELECT id, name, fear_level, allow_massive_damage, created_at FROM campaigns WHERE id = ?1",
    )?;

    stmt.query_row([id], |row| row_to_campaign(row))
        .map_err(|_| AppError::EntityNotFound(format!("Campaign not found: {}", id)))
}

pub fn get_current_campaign_id(conn: &Connection) -> AppResult<Option<String>> {
    let result: Result<String, _> = conn.query_row(
        "SELECT value FROM app_state WHERE key = 'current_campaign' AND campaign_id IS NULL",
        [],
        |row| row.get(0),
    );

    match result {
        Ok(id) => Ok(Some(id)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::PersistenceError(e.to_string())),
    }
}

fn emit_campaigns_update(app: &tauri::AppHandle, conn: &Connection) -> AppResult<()> {
    let campaigns = get_all_campaigns(conn)?;
    app.emit("campaigns-updated", CampaignsPayload { campaigns })
        .map_err(|e| AppError::EmitError(e.to_string()))
}

fn emit_current_campaign_update(app: &tauri::AppHandle, campaign: Option<Campaign>) -> AppResult<()> {
    app.emit("current-campaign-changed", CurrentCampaignPayload { campaign })
        .map_err(|e| AppError::EmitError(e.to_string()))
}

// ============================================================================
// Commands
// ============================================================================

#[tauri::command]
pub fn create_campaign(
    db: State<Database>,
    app: tauri::AppHandle,
    name: String,
) -> AppResult<Campaign> {
    let id = Uuid::new_v4().to_string();

    db.with_conn(|conn| {
        conn.execute(
            "INSERT INTO campaigns (id, name) VALUES (?1, ?2)",
            params![id, name],
        )?;

        let campaign = get_campaign_by_id(conn, &id)?;
        emit_campaigns_update(&app, conn)?;

        Ok(campaign)
    })
}

#[tauri::command]
pub fn get_campaigns(db: State<Database>) -> AppResult<Vec<Campaign>> {
    db.with_conn(|conn| get_all_campaigns(conn))
}

#[tauri::command]
pub fn get_current_campaign(db: State<Database>) -> AppResult<Option<Campaign>> {
    db.with_conn(|conn| {
        match get_current_campaign_id(conn)? {
            Some(id) => Ok(Some(get_campaign_by_id(conn, &id)?)),
            None => Ok(None),
        }
    })
}

#[tauri::command]
pub fn set_current_campaign(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
) -> AppResult<Campaign> {
    db.with_conn(|conn| {
        // Verify campaign exists
        let campaign = get_campaign_by_id(conn, &id)?;

        // Set as current - delete first to avoid NULL primary key issues in SQLite
        conn.execute(
            "DELETE FROM app_state WHERE key = 'current_campaign' AND campaign_id IS NULL",
            [],
        )?;
        conn.execute(
            "INSERT INTO app_state (key, campaign_id, value) VALUES ('current_campaign', NULL, ?1)",
            [&id],
        )?;

        emit_current_campaign_update(&app, Some(campaign.clone()))?;

        // Also emit updates for all campaign-scoped data so UI refreshes
        app.emit("campaign-switched", serde_json::json!({ "campaign_id": id }))
            .map_err(|e| AppError::EmitError(e.to_string()))?;

        Ok(campaign)
    })
}

#[tauri::command]
pub fn rename_campaign(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
    name: String,
) -> AppResult<Campaign> {
    db.with_conn(|conn| {
        conn.execute(
            "UPDATE campaigns SET name = ?1 WHERE id = ?2",
            params![name, id],
        )?;

        let campaign = get_campaign_by_id(conn, &id)?;
        emit_campaigns_update(&app, conn)?;

        // If this is the current campaign, also emit current-campaign-changed
        // so the header menu updates
        if let Some(current_id) = get_current_campaign_id(conn)? {
            if current_id == id {
                emit_current_campaign_update(&app, Some(campaign.clone()))?;
            }
        }

        Ok(campaign)
    })
}

#[tauri::command]
pub fn delete_campaign(
    db: State<Database>,
    app: tauri::AppHandle,
    id: String,
) -> AppResult<()> {
    db.with_conn(|conn| {
        // Check if this is the current campaign
        let current_id = get_current_campaign_id(conn)?;

        // Don't allow deleting the current campaign
        if current_id == Some(id.clone()) {
            return Err(AppError::Validation(
                "Cannot delete the active campaign. Switch to another campaign first.".into(),
            ));
        }

        // Check if this is the last campaign
        let count: i32 = conn.query_row("SELECT COUNT(*) FROM campaigns", [], |row| row.get(0))?;
        if count <= 1 {
            return Err(AppError::Validation(
                "Cannot delete the last campaign. There must be at least one campaign.".into(),
            ));
        }

        // Delete the campaign (cascades to entities, trackers, app_state)
        let rows = conn.execute("DELETE FROM campaigns WHERE id = ?1", [&id])?;

        if rows == 0 {
            return Err(AppError::EntityNotFound(format!("Campaign not found: {}", id)));
        }

        emit_campaigns_update(&app, conn)?;

        Ok(())
    })
}

#[tauri::command]
pub fn get_campaign_settings(
    db: State<Database>,
    campaign_id: String,
) -> AppResult<CampaignSettings> {
    db.with_conn(|conn| {
        let campaign = get_campaign_by_id(conn, &campaign_id)?;
        Ok(CampaignSettings {
            allow_massive_damage: campaign.allow_massive_damage,
        })
    })
}

#[tauri::command]
pub fn update_campaign_settings(
    db: State<Database>,
    app: tauri::AppHandle,
    campaign_id: String,
    settings: CampaignSettings,
) -> AppResult<CampaignSettings> {
    db.with_conn(|conn| {
        // Verify campaign exists
        let _ = get_campaign_by_id(conn, &campaign_id)?;

        conn.execute(
            "UPDATE campaigns SET allow_massive_damage = ?1 WHERE id = ?2",
            params![settings.allow_massive_damage as i32, campaign_id],
        )?;

        // Emit settings update event
        app.emit(
            "campaign-settings-updated",
            SettingsPayload {
                campaign_id: campaign_id.clone(),
                settings: settings.clone(),
            },
        )
        .map_err(|e| AppError::EmitError(e.to_string()))?;

        // Also emit campaigns update for UI refresh
        emit_campaigns_update(&app, conn)?;

        Ok(settings)
    })
}

/// Ensure a campaign exists and is selected. Creates a default if needed.
pub fn ensure_campaign_exists(conn: &Connection) -> Result<String, Box<dyn std::error::Error>> {
    // Check if there's a current campaign
    if let Some(id) = get_current_campaign_id(conn)? {
        // Verify it still exists
        if get_campaign_by_id(conn, &id).is_ok() {
            return Ok(id);
        }
    }

    // Check if any campaigns exist
    let campaigns = get_all_campaigns(conn)?;
    if let Some(campaign) = campaigns.first() {
        // Use the first one
        conn.execute(
            "INSERT OR REPLACE INTO app_state (key, campaign_id, value) VALUES ('current_campaign', NULL, ?1)",
            [&campaign.id],
        )?;
        return Ok(campaign.id.clone());
    }

    // Create a default campaign
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO campaigns (id, name) VALUES (?1, 'My Campaign')",
        [&id],
    )?;
    conn.execute(
        "INSERT OR REPLACE INTO app_state (key, campaign_id, value) VALUES ('current_campaign', NULL, ?1)",
        [&id],
    )?;

    println!("Created default campaign: {}", id);
    Ok(id)
}

// ============================================================================
// Notes Commands
// ============================================================================

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct CampaignNote {
    pub id: String,
    pub campaign_id: String,
    pub title: Option<String>,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Serialize)]
struct NotePayload {
    note: CampaignNote,
}

#[derive(Clone, Serialize)]
struct NotesListPayload {
    campaign_id: String,
    notes: Vec<CampaignNote>,
}

fn row_to_note(row: &Row) -> rusqlite::Result<CampaignNote> {
    Ok(CampaignNote {
        id: row.get(0)?,
        campaign_id: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn get_notes_for_campaign(conn: &Connection, campaign_id: &str) -> AppResult<Vec<CampaignNote>> {
    let mut stmt = conn.prepare(
        "SELECT id, campaign_id, title, content, created_at, updated_at
         FROM campaign_notes
         WHERE campaign_id = ?1
         ORDER BY updated_at DESC"
    )?;

    let notes = stmt
        .query_map([campaign_id], row_to_note)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(notes)
}

fn emit_notes_list_update(app: &tauri::AppHandle, conn: &Connection, campaign_id: &str) -> AppResult<()> {
    let notes = get_notes_for_campaign(conn, campaign_id)?;
    app.emit(
        "campaign-notes-list-updated",
        NotesListPayload {
            campaign_id: campaign_id.to_string(),
            notes,
        },
    )
    .map_err(|e| AppError::EmitError(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub fn get_campaign_notes(db: State<Database>, campaign_id: String) -> AppResult<Vec<CampaignNote>> {
    db.with_conn(|conn| get_notes_for_campaign(conn, &campaign_id))
}

#[tauri::command]
pub fn get_note(db: State<Database>, note_id: String) -> AppResult<CampaignNote> {
    db.with_conn(|conn| {
        conn.query_row(
            "SELECT id, campaign_id, title, content, created_at, updated_at
             FROM campaign_notes WHERE id = ?1",
            [&note_id],
            row_to_note,
        )
        .map_err(|_| AppError::EntityNotFound(format!("Note not found: {}", note_id)))
    })
}

#[tauri::command]
pub fn create_note(
    db: State<Database>,
    app: tauri::AppHandle,
    campaign_id: String,
    title: Option<String>,
) -> AppResult<CampaignNote> {
    db.with_conn(|conn| {
        let id = Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO campaign_notes (id, campaign_id, title, content) VALUES (?1, ?2, ?3, '')",
            params![id, campaign_id, title],
        )?;

        let note = conn.query_row(
            "SELECT id, campaign_id, title, content, created_at, updated_at
             FROM campaign_notes WHERE id = ?1",
            [&id],
            row_to_note,
        )?;

        // Emit note created event
        app.emit("campaign-note-created", NotePayload { note: note.clone() })
            .map_err(|e| AppError::EmitError(e.to_string()))?;

        // Emit updated notes list
        emit_notes_list_update(&app, conn, &campaign_id)?;

        Ok(note)
    })
}

#[tauri::command]
pub fn update_note(
    db: State<Database>,
    app: tauri::AppHandle,
    note_id: String,
    title: Option<String>,
    content: String,
) -> AppResult<CampaignNote> {
    db.with_conn(|conn| {
        let rows = conn.execute(
            "UPDATE campaign_notes SET title = ?1, content = ?2, updated_at = datetime('now') WHERE id = ?3",
            params![title, content, note_id],
        )?;

        if rows == 0 {
            return Err(AppError::EntityNotFound(format!("Note not found: {}", note_id)));
        }

        let note = conn.query_row(
            "SELECT id, campaign_id, title, content, created_at, updated_at
             FROM campaign_notes WHERE id = ?1",
            [&note_id],
            row_to_note,
        )?;

        // Emit note updated event
        app.emit("campaign-note-updated", NotePayload { note: note.clone() })
            .map_err(|e| AppError::EmitError(e.to_string()))?;

        // Emit updated notes list
        emit_notes_list_update(&app, conn, &note.campaign_id)?;

        Ok(note)
    })
}

#[tauri::command]
pub fn delete_note(
    db: State<Database>,
    app: tauri::AppHandle,
    note_id: String,
) -> AppResult<()> {
    db.with_conn(|conn| {
        // Get the campaign_id before deleting
        let campaign_id: String = conn
            .query_row(
                "SELECT campaign_id FROM campaign_notes WHERE id = ?1",
                [&note_id],
                |row| row.get(0),
            )
            .map_err(|_| AppError::EntityNotFound(format!("Note not found: {}", note_id)))?;

        let rows = conn.execute("DELETE FROM campaign_notes WHERE id = ?1", [&note_id])?;

        if rows == 0 {
            return Err(AppError::EntityNotFound(format!("Note not found: {}", note_id)));
        }

        // Emit note deleted event
        app.emit("campaign-note-deleted", serde_json::json!({ "note_id": note_id, "campaign_id": campaign_id }))
            .map_err(|e| AppError::EmitError(e.to_string()))?;

        // Emit updated notes list
        emit_notes_list_update(&app, conn, &campaign_id)?;

        Ok(())
    })
}
