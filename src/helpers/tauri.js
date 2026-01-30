/**
 * Centralized Tauri API exports and helpers.
 * Import from here instead of accessing window.__TAURI__ directly.
 */

// Core Tauri APIs
export const { invoke } = window.__TAURI__.core;
export const { listen, emit, emitTo } = window.__TAURI__.event;
export const { getCurrentWindow, getAllWindows } = window.__TAURI__.window;
export const { WebviewWindow } = window.__TAURI__.webviewWindow;

/**
 * Wrapper for invoke that handles common error patterns.
 * Shows toast errors by default and logs to console.
 *
 * @param {string} command - The Tauri command to invoke
 * @param {Object} [args] - Arguments to pass to the command
 * @param {Object} [options] - Options for error handling
 * @param {string} [options.errorMessage] - Custom error message prefix
 * @param {boolean} [options.showToast=true] - Show toast on error (default: true)
 * @param {boolean} [options.silent] - Suppress both toast and console logging
 * @param {boolean} [options.rethrow] - Re-throw the error after handling
 * @returns {Promise<any>} - The result of the invoke call, or null on error
 */
export async function safeInvoke(command, args = {}, options = {}) {
  const { errorMessage, showToast = true, silent = false, rethrow = false } = options;

  try {
    return await invoke(command, args);
  } catch (error) {
    const message = errorMessage || `Failed to execute ${command}`;

    if (!silent) {
      console.error(`${message}:`, error);

      if (showToast) {
        // Dynamically import to avoid circular dependencies
        try {
          const { default: ToastMessage } = await import('../components/feedback/toast-message/component.js');
          ToastMessage.error(message);
        } catch {
          // Toast component not available, already logged to console
        }
      }
    }

    if (rethrow) {
      throw error;
    }

    return null;
  }
}

/**
 * Helper to create a managed event listener that can be easily cleaned up.
 * Returns an object with the unlisten function.
 *
 * @param {string} eventName - The event to listen for
 * @param {Function} handler - The event handler
 * @param {Object} [options] - Options
 * @param {Function} [options.filter] - Filter function to determine if handler should be called
 * @returns {Promise<Function>} - Unlisten function
 */
export async function createListener(eventName, handler, options = {}) {
  const { filter } = options;

  return await listen(eventName, (event) => {
    if (filter && !filter(event.payload)) {
      return;
    }
    handler(event.payload, event);
  });
}
