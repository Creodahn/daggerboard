/**
 * Window lifecycle utilities for cross-window communication.
 *
 * Usage in each page's index.js:
 *   import { initWindow } from '../../helpers/window-lifecycle.js';
 *   initWindow();
 *
 * Listen for window lifecycle events in any window:
 *   import { onWindowOpened, onWindowClosed } from '../../helpers/window-lifecycle.js';
 *
 *   onWindowOpened((label) => console.log(`${label} opened`));
 *   onWindowClosed((label) => console.log(`${label} closed`));
 *
 * Request a window to close itself (cross-window):
 *   import { requestWindowClose } from '../../helpers/window-lifecycle.js';
 *   requestWindowClose('player-view');
 */

import { emit, listen, getCurrentWindow } from './tauri.js';

const WINDOW_OPENED_EVENT = 'app://window-opened';
const WINDOW_CLOSED_EVENT = 'app://window-closed';
const WINDOW_CLOSE_REQUEST_EVENT = 'app://window-close-request';

/**
 * Initialize window lifecycle tracking.
 * Call this in each page's index.js after other initialization.
 *
 * Emits:
 *   - 'app://window-opened' immediately when called
 *   - 'app://window-closed' when the window closes
 *
 * Listens:
 *   - 'app://window-close-request' to close self when requested
 */
export function initWindow() {
  const currentWindow = getCurrentWindow();
  const label = currentWindow.label;

  // Emit that this window has opened
  emit(WINDOW_OPENED_EVENT, { label });

  // Listen for close requests from other windows
  listen(WINDOW_CLOSE_REQUEST_EVENT, async (event) => {
    if (event.payload.label === label) {
      await currentWindow.close();
    }
  });

  // Listen for the close request and emit our custom event
  currentWindow.onCloseRequested(async () => {
    await emit(WINDOW_CLOSED_EVENT, { label });
  });
}

/**
 * Request a window to close itself.
 * This works around permission restrictions by having windows close themselves.
 *
 * @param {string} label - The window label to close
 */
export async function requestWindowClose(label) {
  await emit(WINDOW_CLOSE_REQUEST_EVENT, { label });
}

/**
 * Subscribe to window open events from any window.
 *
 * @param {(label: string) => void} callback - Called with the window label when any window opens
 * @returns {Promise<() => void>} Unlisten function
 */
export async function onWindowOpened(callback) {
  return await listen(WINDOW_OPENED_EVENT, (event) => {
    callback(event.payload.label);
  });
}

/**
 * Subscribe to window close events from any window.
 *
 * @param {(label: string) => void} callback - Called with the window label when any window closes
 * @returns {Promise<() => void>} Unlisten function
 */
export async function onWindowClosed(callback) {
  return await listen(WINDOW_CLOSED_EVENT, (event) => {
    callback(event.payload.label);
  });
}

/**
 * Check if a specific window is currently open.
 * Useful for one-time checks (not polling).
 *
 * @param {string} label - The window label to check
 * @returns {Promise<boolean>}
 */
export async function isWindowOpen(label) {
  const { WebviewWindow } = await import('./tauri.js');
  const window = await WebviewWindow.getByLabel(label);
  return !!window;
}
