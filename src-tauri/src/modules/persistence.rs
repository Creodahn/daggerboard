use serde::{de::DeserializeOwned, Serialize};
use tauri::Emitter;
use tauri_plugin_store::StoreExt;

use super::error::{AppError, AppResult};

/// Trait for types that can be persisted to the store
pub trait Persistable: Serialize + DeserializeOwned + Clone + Send + 'static {
    /// The key used to store this type in the store
    fn store_key() -> &'static str;

    /// The event name used when emitting updates
    fn event_name() -> &'static str;
}

/// Save items to the store
pub fn save<T: Persistable>(app: &tauri::AppHandle, items: &[T]) -> AppResult<()> {
    let store = app
        .store("store.json")
        .map_err(|e| AppError::PersistenceError(e.to_string()))?;

    let json_value =
        serde_json::to_value(items).map_err(|e| AppError::PersistenceError(e.to_string()))?;

    store.set(T::store_key(), json_value);
    store
        .save()
        .map_err(|e| AppError::PersistenceError(e.to_string()))?;

    Ok(())
}

/// Emit an update event to all windows
pub fn emit_update<T, P>(app: &tauri::AppHandle, items: &[T], payload_fn: impl FnOnce(Vec<T>) -> P) -> AppResult<()>
where
    T: Persistable,
    P: Serialize + Clone,
{
    let payload = payload_fn(items.to_vec());
    app.emit(T::event_name(), payload)
        .map_err(|e| AppError::EmitError(e.to_string()))
}

/// Save items and emit update in one operation
pub fn save_and_emit<T, P>(
    app: &tauri::AppHandle,
    items: &[T],
    payload_fn: impl FnOnce(Vec<T>) -> P,
) -> AppResult<()>
where
    T: Persistable,
    P: Serialize + Clone,
{
    save(app, items)?;
    emit_update(app, items, payload_fn)
}

/// Load items from the store
pub fn load<T: Persistable>(app: &tauri::App) -> Result<Vec<T>, Box<dyn std::error::Error>> {
    let store = app.store("store.json")?;
    if let Some(value) = store.get(T::store_key()) {
        let items: Vec<T> = serde_json::from_value(value.clone())?;
        Ok(items)
    } else {
        Ok(Vec::new())
    }
}

/// Save a single value to the store
pub fn save_value<T: Serialize>(
    app: &tauri::AppHandle,
    key: &str,
    value: &T,
) -> AppResult<()> {
    let store = app
        .store("store.json")
        .map_err(|e| AppError::PersistenceError(e.to_string()))?;

    let json_value =
        serde_json::to_value(value).map_err(|e| AppError::PersistenceError(e.to_string()))?;

    store.set(key, json_value);
    store
        .save()
        .map_err(|e| AppError::PersistenceError(e.to_string()))?;

    Ok(())
}

/// Load a single value from the store
pub fn load_value<T: DeserializeOwned>(
    app: &tauri::App,
    key: &str,
) -> Result<Option<T>, Box<dyn std::error::Error>> {
    let store = app.store("store.json")?;
    if let Some(value) = store.get(key) {
        let item: T = serde_json::from_value(value.clone())?;
        Ok(Some(item))
    } else {
        Ok(None)
    }
}

/// Emit a simple value update
pub fn emit_value<P: Serialize + Clone>(
    app: &tauri::AppHandle,
    event: &str,
    payload: P,
) -> AppResult<()> {
    app.emit(event, payload)
        .map_err(|e| AppError::EmitError(e.to_string()))
}
