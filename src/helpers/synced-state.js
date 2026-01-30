/**
 * Cross-window state synchronization utility.
 * Uses localStorage for persistence and cross-window sync via storage events.
 *
 * Usage:
 *   import { createSyncedState } from './synced-state.js';
 *
 *   const themeState = createSyncedState('theme', 'system');
 *
 *   // Get current value
 *   themeState.get(); // 'system'
 *
 *   // Set value (automatically syncs to other windows)
 *   themeState.set('dark');
 *
 *   // Subscribe to changes (from this window or others)
 *   const unsubscribe = themeState.subscribe((value, source) => {
 *     console.log(`Theme changed to ${value} from ${source}`);
 *   });
 *
 *   // Clean up
 *   unsubscribe();
 *
 *   // Remove from storage
 *   themeState.clear();
 */

/**
 * Creates a synchronized state object that persists to localStorage
 * and syncs across browser windows.
 *
 * @param {string} key - The localStorage key
 * @param {*} defaultValue - Default value if nothing in storage
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.serialize=true] - JSON serialize/deserialize values
 * @returns {Object} State object with get, set, subscribe, clear methods
 */
export function createSyncedState(key, defaultValue, options = {}) {
  const { serialize = true } = options;
  const subscribers = new Set();

  // Parse stored value
  const parse = (raw) => {
    if (raw === null) return defaultValue;
    if (!serialize) return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  };

  // Stringify value for storage
  const stringify = (value) => {
    if (!serialize) return String(value);
    return JSON.stringify(value);
  };

  // Notify all subscribers
  const notify = (value, source) => {
    for (const callback of subscribers) {
      try {
        callback(value, source);
      } catch (error) {
        console.error('Synced state subscriber error:', error);
      }
    }
  };

  // Listen for changes from other windows
  const handleStorage = (event) => {
    if (event.key === key) {
      const newValue = parse(event.newValue);
      notify(newValue, 'external');
    }
  };

  window.addEventListener('storage', handleStorage);

  return {
    /**
     * Get the current value
     * @returns {*} Current value or default
     */
    get() {
      return parse(localStorage.getItem(key));
    },

    /**
     * Set a new value
     * @param {*} value - The value to set
     */
    set(value) {
      const serialized = stringify(value);
      const current = localStorage.getItem(key);

      if (serialized !== current) {
        localStorage.setItem(key, serialized);
        notify(value, 'local');
      }
    },

    /**
     * Subscribe to value changes
     * @param {Function} callback - Called with (newValue, source) where source is 'local' or 'external'
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },

    /**
     * Clear the value from storage (resets to default)
     */
    clear() {
      localStorage.removeItem(key);
      notify(defaultValue, 'local');
    },

    /**
     * Clean up event listeners (call when no longer needed)
     */
    destroy() {
      window.removeEventListener('storage', handleStorage);
      subscribers.clear();
    }
  };
}
