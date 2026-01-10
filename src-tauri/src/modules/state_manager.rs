use serde::Serialize;
use std::sync::{Mutex, PoisonError};

use super::error::{AppError, AppResult};
use super::persistence::{self, Persistable};

/// Helper to safely lock a mutex and convert poison errors
pub fn lock_or_error<T>(mutex: &Mutex<T>) -> AppResult<std::sync::MutexGuard<'_, T>> {
    mutex.lock().map_err(|e: PoisonError<_>| {
        AppError::LockError(format!("Failed to acquire lock: {}", e))
    })
}

/// Execute a mutation on a collection, then save and emit
///
/// This is the main helper that encapsulates the common pattern:
/// 1. Lock mutex
/// 2. Perform mutation
/// 3. Clone result and collection
/// 4. Release lock
/// 5. Save to store
/// 6. Emit update event
pub fn mutate_and_persist<T, R, P, M, F>(
    mutex: &Mutex<Vec<T>>,
    app: &tauri::AppHandle,
    mutate_fn: M,
    payload_fn: F,
) -> AppResult<R>
where
    T: Persistable,
    P: Serialize + Clone,
    M: FnOnce(&mut Vec<T>) -> AppResult<R>,
    F: FnOnce(Vec<T>) -> P,
    R: Clone,
{
    let (result, items_clone) = {
        let mut items = lock_or_error(mutex)?;
        let result = mutate_fn(&mut items)?;
        (result, items.clone())
    };

    persistence::save_and_emit(app, &items_clone, payload_fn)?;

    Ok(result)
}

/// Delete an item by ID
pub fn delete_and_persist<T, P, F>(
    mutex: &Mutex<Vec<T>>,
    app: &tauri::AppHandle,
    id: &str,
    id_getter: impl Fn(&T) -> &str,
    payload_fn: F,
) -> AppResult<()>
where
    T: Persistable,
    P: Serialize + Clone,
    F: FnOnce(Vec<T>) -> P,
{
    mutate_and_persist(
        mutex,
        app,
        |items| {
            items.retain(|item| id_getter(item) != id);
            Ok(())
        },
        payload_fn,
    )
}

/// Read items with optional filtering
pub fn read_items<T, F>(mutex: &Mutex<Vec<T>>, filter: Option<F>) -> AppResult<Vec<T>>
where
    T: Clone,
    F: Fn(&T) -> bool,
{
    let items = lock_or_error(mutex)?;

    match filter {
        Some(f) => Ok(items.iter().filter(|item| f(item)).cloned().collect()),
        None => Ok(items.clone()),
    }
}
