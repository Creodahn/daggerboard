use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;

use super::error::{AppError, AppResult};

/// Database wrapper for SQLite connection
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Create a new database connection and initialize schema
    pub fn new(app_data_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        // Ensure the directory exists
        std::fs::create_dir_all(&app_data_dir)?;

        let db_path = app_data_dir.join("daggerboard.db");
        let conn = Connection::open(&db_path)?;

        // Enable foreign keys
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        // Run migrations
        run_migrations(&conn)?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Execute a function with the database connection
    pub fn with_conn<T, F>(&self, f: F) -> AppResult<T>
    where
        F: FnOnce(&Connection) -> AppResult<T>,
    {
        let conn = self.conn.lock().map_err(|e| {
            AppError::LockError(format!("Failed to acquire database lock: {}", e))
        })?;
        f(&conn)
    }
}

// Helper trait for converting rusqlite errors to AppError
impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::PersistenceError(err.to_string())
    }
}

/// Run database migrations
fn run_migrations(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    // Create migrations table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    )?;

    // Get current version
    let current_version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Run migrations in order
    if current_version < 1 {
        migrate_v1_initial_schema(conn)?;
    }

    if current_version < 2 {
        migrate_v2_add_campaigns(conn)?;
    }

    if current_version < 3 {
        migrate_v3_fear_level_on_campaign(conn)?;
    }

    Ok(())
}

/// V1: Initial schema (for fresh installs)
fn migrate_v1_initial_schema(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    // Check if tables already exist (from pre-migration installs)
    let entities_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='entities'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !entities_exists {
        // Fresh install - create tables with campaign support from the start
        conn.execute_batch(include_str!("../schema.sql"))?;
    }

    conn.execute(
        "INSERT INTO schema_migrations (version) VALUES (1)",
        [],
    )?;

    Ok(())
}

/// V2: Add campaigns support to existing tables
fn migrate_v2_add_campaigns(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    // Check if campaigns table exists
    let campaigns_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='campaigns'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !campaigns_exists {
        // Create campaigns table
        conn.execute(
            "CREATE TABLE campaigns (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            [],
        )?;
    }

    // Check if entities has campaign_id column
    let has_campaign_id: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('entities') WHERE name='campaign_id'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !has_campaign_id {
        // Create a default campaign for existing data
        let default_campaign_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO campaigns (id, name) VALUES (?1, 'Default Campaign')",
            [&default_campaign_id],
        )?;

        // Add campaign_id to entities
        conn.execute(
            "ALTER TABLE entities ADD COLUMN campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE",
            [],
        )?;
        conn.execute(
            &format!("UPDATE entities SET campaign_id = '{}'", default_campaign_id),
            [],
        )?;

        // Add campaign_id to countdown_trackers
        conn.execute(
            "ALTER TABLE countdown_trackers ADD COLUMN campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE",
            [],
        )?;
        conn.execute(
            &format!("UPDATE countdown_trackers SET campaign_id = '{}'", default_campaign_id),
            [],
        )?;

        // Migrate app_state to support campaign scoping
        // First, check if it has the old schema (just key as primary key)
        let old_app_state: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM pragma_table_info('app_state') WHERE name='campaign_id'",
                [],
                |row| row.get(0),
            )
            .map(|v: bool| !v)
            .unwrap_or(true);

        if old_app_state {
            // Rename old table
            conn.execute("ALTER TABLE app_state RENAME TO app_state_old", [])?;

            // Create new table with campaign support
            conn.execute(
                "CREATE TABLE app_state (
                    key TEXT NOT NULL,
                    campaign_id TEXT,
                    value TEXT NOT NULL,
                    PRIMARY KEY (key, campaign_id),
                    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
                )",
                [],
            )?;

            // Migrate old data (assign to default campaign for campaign-scoped keys)
            conn.execute(
                &format!(
                    "INSERT INTO app_state (key, campaign_id, value)
                     SELECT key, '{}', value FROM app_state_old
                     WHERE key IN ('fear_level')",
                    default_campaign_id
                ),
                [],
            )?;

            // Migrate global keys (like current_campaign, migration_completed)
            conn.execute(
                "INSERT OR IGNORE INTO app_state (key, campaign_id, value)
                 SELECT key, NULL, value FROM app_state_old
                 WHERE key NOT IN ('fear_level')",
                [],
            )?;

            // Set current campaign to default
            conn.execute(
                "INSERT OR REPLACE INTO app_state (key, campaign_id, value) VALUES ('current_campaign', NULL, ?1)",
                [&default_campaign_id],
            )?;

            // Drop old table
            conn.execute("DROP TABLE app_state_old", [])?;
        }

        // Create indexes
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_entities_campaign ON entities(campaign_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_trackers_campaign ON countdown_trackers(campaign_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_app_state_campaign ON app_state(campaign_id)",
            [],
        )?;

        println!("Migrated existing data to default campaign: {}", default_campaign_id);
    }

    conn.execute(
        "INSERT INTO schema_migrations (version) VALUES (2)",
        [],
    )?;

    Ok(())
}

/// V3: Move fear_level from app_state to campaigns table
fn migrate_v3_fear_level_on_campaign(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    // Check if campaigns table has fear_level column
    let has_fear_level: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('campaigns') WHERE name='fear_level'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !has_fear_level {
        // Add fear_level column to campaigns (default 0)
        conn.execute(
            "ALTER TABLE campaigns ADD COLUMN fear_level INTEGER NOT NULL DEFAULT 0",
            [],
        )?;

        // Migrate existing fear levels from app_state to campaigns
        conn.execute(
            "UPDATE campaigns SET fear_level = COALESCE(
                (SELECT CAST(value AS INTEGER) FROM app_state
                 WHERE key = 'fear_level' AND campaign_id = campaigns.id),
                0
            )",
            [],
        )?;

        // Remove fear_level entries from app_state (no longer needed)
        conn.execute(
            "DELETE FROM app_state WHERE key = 'fear_level'",
            [],
        )?;

        println!("Migrated fear_level to campaigns table");
    }

    conn.execute(
        "INSERT INTO schema_migrations (version) VALUES (3)",
        [],
    )?;

    Ok(())
}
