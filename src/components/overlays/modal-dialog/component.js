import ExtendedHtmlElement from '../../base/extended-html-element.js';
import { lockScroll, unlockScroll } from '../../../helpers/scroll-lock.js';
import { animateOverlayOpen, animateOverlayClose } from '../../../helpers/overlay-animation.js';

class ModalDialog extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['title'];

  #dialog;
  #titleEl;
  #closeBtn;
  #isClosing = false;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#dialog = this.$('.modal-dialog');
    this.#titleEl = this.$('.modal-title');
    this.#closeBtn = this.$('.close-btn');

    // Set initial title from attribute
    const title = this.getStringAttr('title');
    if (title) {
      this.#titleEl.textContent = title;
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
    const header = this.$('.modal-header');
    if (header) {
      const title = this.#titleEl?.textContent?.trim();
      header.classList.toggle('hidden', !title);
    }
  }

  /**
   * Open the modal dialog
   */
  open() {
    this.#isClosing = false;
    lockScroll();
    this.#dialog.showModal();
    animateOverlayOpen(this.#dialog);
    this.emit('modal-open');
  }

  /**
   * Open the modal and focus an element after it's rendered
   * @param {HTMLElement|null} elementToFocus - Element to focus after opening
   * @param {number} delay - Delay before focusing (default: 100ms)
   */
  openAndFocus(elementToFocus, delay = 100) {
    this.open();
    if (elementToFocus) {
      setTimeout(() => elementToFocus.focus(), delay);
    }
  }

  /**
   * Close the modal dialog
   */
  close() {
    if (this.#isClosing || !this.#dialog.open) return;
    this.#isClosing = true;

    animateOverlayClose(this.#dialog, () => {
      this.#dialog.close();
      unlockScroll();
      this.emit('modal-close');
      this.#isClosing = false;
    }, { timeout: 250 });
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
