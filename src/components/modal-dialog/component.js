import ExtendedHtmlElement from '../extended-html-element.js';

class ModalDialog extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['title'];
  #dialog;
  #titleEl;
  #closeBtn;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#dialog = this.shadowRoot.querySelector('.modal-dialog');
    this.#titleEl = this.shadowRoot.querySelector('.modal-title');
    this.#closeBtn = this.shadowRoot.querySelector('.close-btn');

    // Set initial title from attribute
    if (this.hasAttribute('title')) {
      this.#titleEl.textContent = this.getAttribute('title');
    }

    // Close button handler
    this.#closeBtn.addEventListener('click', () => this.close());

    // Close on backdrop click
    this.#dialog.addEventListener('click', (e) => {
      if (e.target === this.#dialog) {
        this.close();
      }
    });

    // Handle Escape key
    this.#dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.close();
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'title' && this.#titleEl) {
      this.#titleEl.textContent = newValue;
      this.updateHeaderVisibility();
    }
  }

  updateHeaderVisibility() {
    const header = this.shadowRoot.querySelector('.modal-header');
    if (header) {
      const title = this.#titleEl?.textContent?.trim();
      header.classList.toggle('hidden', !title);
    }
  }

  /**
   * Open the modal dialog
   */
  open() {
    this.#dialog.showModal();
    this.dispatchEvent(new CustomEvent('modal-open', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Close the modal dialog
   */
  close() {
    this.#dialog.close();
    this.dispatchEvent(new CustomEvent('modal-close', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Check if the modal is currently open
   * @returns {boolean}
   */
  get isOpen() {
    return this.#dialog?.open ?? false;
  }

  /**
   * Set the modal title
   * @param {string} title
   */
  setTitle(title) {
    if (this.#titleEl) {
      this.#titleEl.textContent = title;
      this.updateHeaderVisibility();
    }
  }
}

customElements.define('modal-dialog', ModalDialog);
