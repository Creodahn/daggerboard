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
 * Logs errors and optionally shows user feedback.
 *
 * @param {string} command - The Tauri command to invoke
 * @param {Object} [args] - Arguments to pass to the command
 * @param {Object} [options] - Options for error handling
 * @param {string} [options.errorMessage] - Custom error message prefix
 * @param {boolean} [options.showToast] - Show toast on error (requires ToastMessage import)
 * @param {boolean} [options.rethrow] - Re-throw the error after logging
 * @returns {Promise<any>} - The result of the invoke call
 */
export async function safeInvoke(command, args = {}, options = {}) {
  const { errorMessage, showToast = false, rethrow = false } = options;

  try {
    return await invoke(command, args);
  } catch (error) {
    const message = errorMessage || `Failed to execute ${command}`;
    console.error(`${message}:`, error);

    if (showToast && window.ToastMessage) {
      window.ToastMessage.error(message);
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
