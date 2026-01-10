use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

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

        // Initialize schema
        conn.execute_batch(include_str!("../schema.sql"))?;

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
