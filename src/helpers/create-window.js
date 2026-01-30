import { WebviewWindow } from './tauri.js';

// Track window creation count for cascading offset (persisted across windows)
const CASCADE_OFFSET = 30; // pixels to offset each new window
const MAX_CASCADE = 10; // reset after this many windows
const CASCADE_STORAGE_KEY = 'window-cascade-count';

function getWindowCreationCount() {
  const stored = localStorage.getItem(CASCADE_STORAGE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

function incrementWindowCreationCount() {
  const current = getWindowCreationCount();
  const next = (current + 1) % MAX_CASCADE;
  localStorage.setItem(CASCADE_STORAGE_KEY, next.toString());
  return current;
}

function decrementWindowCreationCount() {
  const current = getWindowCreationCount();
  const next = current > 0 ? current - 1 : MAX_CASCADE - 1;
  localStorage.setItem(CASCADE_STORAGE_KEY, next.toString());
}

/**
 * Create a new window or focus an existing one.
 * @param {string} name - Unique window label
 * @param {Object} options - Window options (url, width, height, etc.)
 * @param {Object} behavior - Behavior options
 * @param {boolean} behavior.focusIfExists - If true, focus existing window instead of recreating (default: false)
 * @param {boolean} behavior.cascade - If true, offset window position for cascading effect (default: true)
 * @param {boolean} behavior.silentIfExists - If true, silently return null if window exists (default: false)
 * @returns {Promise<WebviewWindow|null>} The window instance, or null if silentIfExists and window exists
 */
export default async function createWindow(name, options = {}, behavior = {}) {
  const { focusIfExists = false, cascade = true, silentIfExists = false } = behavior;

  const existing = await WebviewWindow.getByLabel(name);
  if (existing) {
    if (focusIfExists) {
      console.log(`Window "${name}" already exists, focusing it`);
      try {
        // Unminimize first in case it's minimized, then focus
        await existing.unminimize();
        await existing.show();
        await existing.setFocus();
      } catch (e) {
        console.error(`Failed to focus window "${name}":`, e);
      }
      return existing;
    } else if (silentIfExists) {
      // Silently return - caller doesn't want an error or close
      return null;
    } else {
      // Request the window to close itself and wait a moment
      // Note: Direct close may fail due to permissions, so we import requestWindowClose
      try {
        const { requestWindowClose } = await import('./window-lifecycle.js');
        await requestWindowClose(name);
        // Give a small delay for the close to process
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch {
        console.warn(`Could not request window "${name}" to close`);
      }
    }
  }

  // Apply cascading offset for new windows
  const finalOptions = { ...options };
  if (cascade) {
    const count = incrementWindowCreationCount();
    const offset = count * CASCADE_OFFSET;

    // Only set x/y if not already specified
    if (finalOptions.x === undefined && finalOptions.y === undefined) {
      // Use center: true with offset doesn't work, so we calculate from a base position
      // These will be relative offsets from the default position
      finalOptions.x = 100 + offset;
      finalOptions.y = 100 + offset;
    }
  }

  console.log(`Creating window "${name}" with URL: ${options.url}`);

  return new Promise((resolve) => {
    const webview = new WebviewWindow(name, finalOptions);

    webview.once('tauri://created', () => {
      console.log(`Webview "${name}" created successfully`);
      resolve(webview);
    });

    webview.once('tauri://error', error => {
      // Check if it's just a "window already exists" error - this can happen in race conditions
      if (error?.payload?.includes?.('already exists')) {
        console.log(`Window "${name}" already exists (race condition), attempting to focus`);
        WebviewWindow.getByLabel(name).then(async (existing) => {
          if (existing && focusIfExists) {
            try {
              await existing.unminimize();
              await existing.show();
              await existing.setFocus();
            } catch { /* ignore focus errors */ }
          }
          resolve(existing);
        });
      } else {
        console.error(`Error creating webview "${name}":`, error);
        resolve(null);
      }
      // Decrement on error since window wasn't actually created
      if (cascade) {
        decrementWindowCreationCount();
      }
    });

    // Decrement cascade counter when window is destroyed
    if (cascade) {
      webview.once('tauri://destroyed', () => {
        decrementWindowCreationCount();
      });
    }
  });
}
