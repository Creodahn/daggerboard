import ExtendedHtmlElement from '../../base/extended-html-element.js';

/**
 * A toast notification component using the Popover API for top-layer rendering.
 *
 * Usage:
 *   // Static methods (recommended - works from anywhere):
 *   ToastMessage.success('Operation completed!');
 *   ToastMessage.error('Something went wrong');
 *   ToastMessage.warning('Are you sure?');
 *   ToastMessage.info('New update available');
 *   ToastMessage.system('Processing...');
 *
 *   // With custom duration (ms):
 *   ToastMessage.success('Saved!', 5000);
 *
 *   // Generic show method (defaults to 'system' variant):
 *   ToastMessage.show('Message');
 *   ToastMessage.show('Message', 'success', 3000);
 */
class ToastMessage extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static #instance = null;

  #container;
  #icon;
  #text;
  #hideTimeout;
  #animationTimeout;
  stylesPath = './styles.css';
  templatePath = './template.html';

  static icons = {
    system: '●',
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  setup() {
    this.#container = this.$('.toast-container');
    this.#icon = this.$('.toast-icon');
    this.#text = this.$('.toast-text');
  }

  /**
   * Show a toast message
   * @param {string} message - The message to display
   * @param {'system'|'success'|'error'|'warning'|'info'} variant - The toast variant
   * @param {number} duration - Duration in ms before auto-hide (default: 3000)
   */
  show(message, variant = 'system', duration = 3000) {
    if (!this.#container) return;

    // Clear any pending timeouts
    if (this.#hideTimeout) {
      clearTimeout(this.#hideTimeout);
      this.#hideTimeout = null;
    }
    if (this.#animationTimeout) {
      clearTimeout(this.#animationTimeout);
      this.#animationTimeout = null;
    }

    // Reset classes
    this.#container.classList.remove('system', 'success', 'error', 'warning', 'info', 'fade-out');
    this.#container.classList.add(variant);

    // Set content
    this.#icon.textContent = ToastMessage.icons[variant] || '';
    this.#text.textContent = message;

    // Show using popover API (check if not already open)
    if (!this.#container.matches(':popover-open')) {
      this.#container.showPopover();
    }

    // Auto-hide after duration
    this.#hideTimeout = setTimeout(() => this.hide(), duration);
  }

  /**
   * Hide the toast with animation
   */
  hide() {
    if (!this.#container) return;

    // Clear the hide timeout since we're hiding now
    if (this.#hideTimeout) {
      clearTimeout(this.#hideTimeout);
      this.#hideTimeout = null;
    }

    this.#container.classList.add('fade-out');

    // Wait for animation to complete before hiding
    this.#animationTimeout = setTimeout(() => {
      if (this.#container.matches(':popover-open')) {
        this.#container.hidePopover();
      }
      this.#container.classList.remove('fade-out');
      this.#animationTimeout = null;
    }, 300);
  }

  /**
   * Static method to show a toast from anywhere.
   * Creates a singleton instance if needed.
   * @param {string} message - The message to display
   * @param {'system'|'success'|'error'|'warning'|'info'} variant - The toast variant
   * @param {number} duration - Duration in ms before auto-hide (default: 3000)
   */
  static show(message, variant = 'system', duration = 3000) {
    // Get or create singleton instance
    if (!ToastMessage.#instance) {
      ToastMessage.#instance = document.createElement('toast-message');
      document.body.appendChild(ToastMessage.#instance);
    }

    // If the component is already ready, show immediately
    // Otherwise wait for it to be ready
    if (ToastMessage.#instance.isSetup) {
      ToastMessage.#instance.show(message, variant, duration);
    } else {
      ToastMessage.#instance.ready.then(() => {
        ToastMessage.#instance.show(message, variant, duration);
      });
    }
  }

  /**
   * Show a system toast (neutral, for general messages)
   * @param {string} message - The message to display
   * @param {number} duration - Duration in ms before auto-hide (default: 3000)
   */
  static system(message, duration = 3000) {
    ToastMessage.show(message, 'system', duration);
  }

  /**
   * Show a success toast
   * @param {string} message - The message to display
   * @param {number} duration - Duration in ms before auto-hide (default: 3000)
   */
  static success(message, duration = 3000) {
    ToastMessage.show(message, 'success', duration);
  }

  /**
   * Show an error toast
   * @param {string} message - The message to display
   * @param {number} duration - Duration in ms before auto-hide (default: 3000)
   */
  static error(message, duration = 3000) {
    ToastMessage.show(message, 'error', duration);
  }

  /**
   * Show a warning toast
   * @param {string} message - The message to display
   * @param {number} duration - Duration in ms before auto-hide (default: 3000)
   */
  static warning(message, duration = 3000) {
    ToastMessage.show(message, 'warning', duration);
  }

  /**
   * Show an info toast
   * @param {string} message - The message to display
   * @param {number} duration - Duration in ms before auto-hide (default: 3000)
   */
  static info(message, duration = 3000) {
    ToastMessage.show(message, 'info', duration);
  }
}

customElements.define('toast-message', ToastMessage);

export default ToastMessage;
