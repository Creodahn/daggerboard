/**
 * Theme management utility for light/dark mode.
 * Uses synced state for cross-window persistence.
 *
 * Usage:
 *   import { initTheme, toggleTheme, setTheme, getTheme } from './theme.js';
 *
 *   // On page load
 *   initTheme();
 *
 *   // Toggle between light/dark
 *   toggleTheme();
 *
 *   // Set specific theme
 *   setTheme('dark'); // 'light', 'dark', or 'system'
 */

import { createSyncedState } from './synced-state.js';

const themeState = createSyncedState('daggerboard-theme', 'system', { serialize: false });

/**
 * Get the current theme preference.
 * @returns {'light' | 'dark' | 'system'} The current theme preference
 */
export function getTheme() {
  return themeState.get();
}

/**
 * Get the effective theme (resolves 'system' to actual theme).
 * @returns {'light' | 'dark'} The effective theme
 */
export function getEffectiveTheme() {
  const theme = getTheme();
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Set the theme preference.
 * @param {'light' | 'dark' | 'system'} theme - The theme to set
 */
export function setTheme(theme) {
  if (theme === 'system') {
    themeState.clear();
  } else {
    themeState.set(theme);
  }
  applyTheme();
}

/**
 * Toggle between light and dark themes.
 * If currently on 'system', switches to the opposite of current effective theme.
 * @returns {'light' | 'dark'} The new theme
 */
export function toggleTheme() {
  const effective = getEffectiveTheme();
  const newTheme = effective === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  return newTheme;
}

/**
 * Apply the current theme to the document.
 * Sets data-theme attribute on the root element.
 */
export function applyTheme() {
  const theme = getTheme();
  const root = document.documentElement;

  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

/**
 * Initialize theme on page load.
 * Should be called as early as possible to prevent flash.
 */
export function initTheme() {
  applyTheme();

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'system') {
      applyTheme();
    }
  });

  // Listen for theme changes from other windows
  themeState.subscribe((value, source) => {
    if (source === 'external') {
      applyTheme();
    }
  });
}

/**
 * Check if dark mode is currently active.
 * @returns {boolean}
 */
export function isDarkMode() {
  return getEffectiveTheme() === 'dark';
}
