/**
 * Shared urgency/threshold calculation utilities.
 * Used for countdown trackers and similar value-based status indicators.
 */

/**
 * Get urgency level based on a current value.
 * @param {number} current - Current value
 * @param {Object} [thresholds] - Custom thresholds
 * @param {number} [thresholds.critical=0] - Value at or below which is critical
 * @param {number} [thresholds.urgent=2] - Value at or below which is urgent
 * @param {number} [thresholds.warning=5] - Value below which is warning
 * @returns {'critical' | 'urgent' | 'warning' | 'normal'} Urgency level
 */
export function getUrgencyLevel(current, thresholds = {}) {
  const { critical = 0, urgent = 2, warning = 5 } = thresholds;

  if (current <= critical) return 'critical';
  if (current <= urgent) return 'urgent';
  if (current < warning) return 'warning';
  return 'normal';
}

/**
 * Get CSS class for urgency state.
 * @param {number} current - Current value
 * @param {Object} [thresholds] - Custom thresholds
 * @returns {string} CSS class name (empty string for normal)
 */
export function getUrgencyClass(current, thresholds) {
  const level = getUrgencyLevel(current, thresholds);
  return level === 'normal' ? '' : level;
}

/**
 * Get urgency level based on percentage remaining.
 * @param {number} current - Current value
 * @param {number} max - Maximum value
 * @returns {'critical' | 'urgent' | 'warning' | 'normal'} Urgency level
 */
export function getUrgencyByPercentage(current, max) {
  if (max <= 0) return 'critical';
  const percentage = (current / max) * 100;

  if (percentage <= 0) return 'critical';
  if (percentage <= 20) return 'urgent';
  if (percentage <= 40) return 'warning';
  return 'normal';
}
