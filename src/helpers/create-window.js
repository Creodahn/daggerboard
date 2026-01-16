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
 */
export default async function createWindow(name, options = {}, behavior = {}) {
  const { WebviewWindow } = window.__TAURI__.webviewWindow;
  const { focusIfExists = false, cascade = true } = behavior;

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
    } else {
      console.log(`Window "${name}" already exists, closing it first`);
      await existing.close();
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
  const webview = new WebviewWindow(name, finalOptions);

  webview.once('tauri://created', () => {
    console.log(`Webview "${name}" created successfully`);
  });

  webview.once('tauri://error', error => {
    console.error(`Error creating webview "${name}":`, error);
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

  return webview;
}
