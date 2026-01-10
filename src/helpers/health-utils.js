/**
 * Shared health calculation utilities used across GM and player views.
 */

/**
 * Calculate health percentage from current and max HP.
 * @param {number} current - Current HP
 * @param {number} max - Maximum HP
 * @returns {number} Percentage (0-100)
 */
export function getHealthPercentage(current, max) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

/**
 * Get health status class based on percentage.
 * Returns a normalized status that can be used with CSS classes.
 *
 * @param {number} percentage - Health percentage (0-100)
 * @returns {'dead' | 'critical' | 'danger' | 'warning' | 'healthy'} Health status
 */
export function getHealthStatus(percentage) {
  if (percentage <= 0) return 'dead';
  if (percentage <= 25) return 'critical';
  if (percentage <= 50) return 'danger';
  if (percentage <= 75) return 'warning';
  return 'healthy';
}

/**
 * Get CSS class for health bar styling (GM view).
 * @param {number} percentage - Health percentage (0-100)
 * @returns {string} CSS class name
 */
export function getHealthBarClass(percentage) {
  const status = getHealthStatus(percentage);
  // Map to existing class names used in entity-item
  const classMap = {
    dead: 'dead',
    critical: 'critical',
    danger: 'low',
    warning: 'medium',
    healthy: 'healthy'
  };
  return classMap[status];
}

/**
 * Get CSS class for NPC health display (player view).
 * @param {number} percentage - Health percentage (0-100)
 * @returns {string} CSS class name
 */
export function getNpcHealthClass(percentage) {
  const status = getHealthStatus(percentage);
  // Map to existing class names used in player-display
  const classMap = {
    dead: 'health-dead',
    critical: 'health-critical',
    danger: 'health-danger',
    warning: 'health-warning',
    healthy: 'health-good'
  };
  return classMap[status];
}

/**
 * Determine if HP change is healing or damage.
 * @param {number|undefined} previousHp - Previous HP value (undefined on first load)
 * @param {number} currentHp - Current HP value
 * @returns {'heal' | 'damage' | null} Change type or null if no change or first load
 */
export function getHpChangeType(previousHp, currentHp) {
  // No flash on first load (previousHp is undefined)
  if (previousHp === undefined) return null;
  if (previousHp === currentHp) return null;
  return currentHp > previousHp ? 'heal' : 'damage';
}
