/**
 * Date and time formatting utilities for consistent handling of SQLite timestamps
 * and localized display across the application.
 */

/**
 * Parse a SQLite timestamp string as a Date object.
 * SQLite stores datetime without timezone indicator, so we treat it as UTC.
 * @param {string} str - The timestamp string from SQLite (e.g., "2026-01-30 15:45:00")
 * @returns {Date|null} The parsed Date object, or null if invalid
 */
export function parseDbTimestamp(str) {
  if (!str) return null;
  // SQLite uses space between date and time, JS needs 'T'
  const normalized = str.replace(' ', 'T');
  // Append 'Z' if not already present to indicate UTC
  return new Date(normalized.endsWith('Z') ? normalized : normalized + 'Z');
}

/**
 * Format a date as a short time string (e.g., "3:45 PM")
 * @param {Date|string} date - Date object or timestamp string
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
  const d = typeof date === 'string' ? parseDbTimestamp(date) : date;
  if (!d) return '';
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Format a date as a short date string (e.g., "Jan 30")
 * @param {Date|string} date - Date object or timestamp string
 * @returns {string} Formatted date string
 */
export function formatShortDate(date) {
  const d = typeof date === 'string' ? parseDbTimestamp(date) : date;
  if (!d) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a date as a full date/time string (e.g., "Jan 30, 2026, 3:45 PM")
 * @param {Date|string} date - Date object or timestamp string
 * @returns {string} Formatted date/time string
 */
export function formatDateTime(date) {
  const d = typeof date === 'string' ? parseDbTimestamp(date) : date;
  if (!d) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Format a date as a relative date string ("Today", "Yesterday", or formatted date)
 * @param {Date|string} date - Date object or timestamp string
 * @returns {string} Relative date string
 */
export function formatRelativeDate(date) {
  const d = typeof date === 'string' ? parseDbTimestamp(date) : date;
  if (!d) return '';

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a date string for grouping (YYYY-MM-DD format)
 * @param {Date|string} date - Date object or timestamp string
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function formatDateKey(date) {
  const d = typeof date === 'string' ? parseDbTimestamp(date) : date;
  if (!d) return '';
  return d.toISOString().split('T')[0];
}
