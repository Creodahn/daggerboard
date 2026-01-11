import ExtendedHtmlElement from '../../base/extended-html-element.js';

class ConfirmDialog extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #modal;
  #messageEl;
  #confirmBtn;
  #cancelBtn;
  #resolvePromise;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#modal = this.$('modal-dialog');
    this.#messageEl = this.$('.confirm-message');
    this.#confirmBtn = this.$('.btn-confirm');
    this.#cancelBtn = this.$('.btn-cancel');

    this.#confirmBtn.addEventListener('action-click', () => this.close(true));
    this.#cancelBtn.addEventListener('action-click', () => this.close(false));

    // Listen for modal close event (backdrop click or escape)
    this.#modal.addEventListener('modal-close', () => {
      // Only resolve if we haven't already (i.e., user closed via backdrop/escape)
      if (this.#resolvePromise) {
        this.#resolvePromise(false);
        this.#resolvePromise = null;
      }
    });
  }

  /**
   * Show the confirmation dialog
   * @param {Object} options - Dialog options
   * @param {string} options.message - The message to display
   * @param {string} [options.confirmText='Confirm'] - Text for confirm button
   * @param {string} [options.cancelText='Cancel'] - Text for cancel button
   * @param {string} [options.variant='danger'] - Visual variant ('danger', 'warning')
   * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
   */
  show({ message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' } = {}) {
    this.#messageEl.textContent = message;
    this.#confirmBtn.textContent = confirmText;
    this.#cancelBtn.textContent = cancelText;

    // Update confirm button variant
    this.#confirmBtn.setAttribute('variant', variant);

    // Hide the modal title for confirm dialogs
    this.#modal.setTitle('');

    this.#modal.open();

    return new Promise((resolve) => {
      this.#resolvePromise = resolve;
    });
  }

  /**
   * Close the dialog
   * @param {boolean} confirmed - Whether the action was confirmed
   */
  close(confirmed) {
    if (this.#resolvePromise) {
      this.#resolvePromise(confirmed);
      this.#resolvePromise = null;
    }

    this.#modal.close();

    this.emit('dialog-close', { confirmed });
  }
}

customElements.define('confirm-dialog', ConfirmDialog);
