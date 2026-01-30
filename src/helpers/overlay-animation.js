/**
 * Shared overlay animation utilities for modals, dropdowns, and other overlays.
 * Provides consistent open/close animations across components.
 */

/**
 * Animate an overlay element open.
 * Uses double requestAnimationFrame to ensure the browser paints the hidden state
 * before transitioning to visible.
 *
 * @param {HTMLElement} element - The element to animate (must have .overlay-animate class)
 * @param {Function} [onReady] - Optional callback after animation starts
 */
export function animateOverlayOpen(element, onReady) {
  // Double rAF ensures browser has painted the initial hidden state
  // before we trigger the transition to visible
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.classList.add('visible');
      onReady?.();
    });
  });
}

/**
 * Animate an overlay element closed.
 * Removes the visible class and waits for the transition to complete
 * before calling the hide callback.
 *
 * @param {HTMLElement} element - The element to animate
 * @param {Function} hideCallback - Called after animation completes to hide the element
 * @param {Object} [options] - Animation options
 * @param {number} [options.timeout=200] - Fallback timeout in ms if transitionend doesn't fire
 */
export function animateOverlayClose(element, hideCallback, options = {}) {
  const { timeout = 200 } = options;

  element.classList.remove('visible');

  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    hideCallback();
  };

  // Wait for opacity transition to complete
  const handler = (e) => {
    if (e.propertyName === 'opacity') {
      finish();
    }
  };
  element.addEventListener('transitionend', handler, { once: true });

  // Fallback in case transitionend doesn't fire (e.g., if element is removed)
  setTimeout(() => {
    element.removeEventListener('transitionend', handler);
    finish();
  }, timeout);
}

/**
 * Check if an overlay is currently in the visible/animated state.
 *
 * @param {HTMLElement} element - The overlay element
 * @returns {boolean} Whether the overlay has the visible class
 */
export function isOverlayVisible(element) {
  return element.classList.contains('visible');
}
