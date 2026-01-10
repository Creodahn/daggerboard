use thiserror::Error;

/// Custom error types for the application
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Entity not found: {0}")]
    EntityNotFound(String),

    #[error("Tracker not found: {0}")]
    TrackerNotFound(String),

    #[error("Invalid operation: {0}")]
    InvalidOperation(String),

    #[error("Value out of range: {0}")]
    OutOfRange(String),

    #[error("State lock error: {0}")]
    LockError(String),

    #[error("Persistence error: {0}")]
    PersistenceError(String),

    #[error("Event emission error: {0}")]
    EmitError(String),
}

/// Result type alias for commands
pub type AppResult<T> = Result<T, AppError>;

// Implement serialization for Tauri command returns
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
