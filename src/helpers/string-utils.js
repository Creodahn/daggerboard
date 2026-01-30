/**
 * String utility functions for common operations.
 */

/**
 * Safely parse a JSON string, returning a fallback value on error.
 * If the value is not a string, it's returned as-is.
 * @param {*} value - The value to parse (string or already parsed)
 * @param {*} fallback - The fallback value if parsing fails (default: null)
 * @returns {*} The parsed value or fallback
 */
export function safeJsonParse(value, fallback = null) {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Truncate a string to a maximum length, adding ellipsis if needed.
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} The truncated string
 */
export function truncate(str, maxLength) {
  if (!str || str.length <= maxLength) return str || '';
  return str.slice(0, maxLength - 1) + '…';
}
