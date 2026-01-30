/**
 * Utility for locking/unlocking body scroll.
 * Useful for modals, dialogs, and overlays that should prevent background scrolling.
 *
 * Supports nested locks - body scroll is only restored when all locks are released.
 *
 * Usage:
 *   import { lockScroll, unlockScroll } from './scroll-lock.js';
 *
 *   // When opening a dialog
 *   lockScroll();
 *
 *   // When closing a dialog
 *   unlockScroll();
 */

let lockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

/**
 * Lock body scroll by setting overflow: hidden.
 * Accounts for scrollbar width to prevent layout shift.
 */
export function lockScroll() {
  if (lockCount === 0) {
    // Save original styles
    originalOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Apply lock
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  lockCount++;
}

/**
 * Unlock body scroll by restoring original overflow style.
 * Only restores when all locks have been released.
 */
export function unlockScroll() {
  if (lockCount > 0) {
    lockCount--;
  }

  if (lockCount === 0) {
    // Restore original styles
    document.body.style.overflow = originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
  }
}

/**
 * Force reset all scroll locks.
 * Use sparingly - primarily for cleanup in edge cases.
 */
export function resetScrollLocks() {
  lockCount = 0;
  document.body.style.overflow = originalOverflow;
  document.body.style.paddingRight = originalPaddingRight;
}

/**
 * Check if scroll is currently locked.
 * @returns {boolean}
 */
export function isScrollLocked() {
  return lockCount > 0;
}
