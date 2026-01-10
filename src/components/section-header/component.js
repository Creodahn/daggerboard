import ExtendedHtmlElement from '../extended-html-element.js';

class SectionHeader extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['title'];

  #titleEl;
  #isReady = false;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#titleEl = this.shadowRoot.querySelector('.section-title');
    this.updateTitle();
    this.#isReady = true;

    // Listen for action button clicks
    this.shadowRoot.querySelector('.action-slot').addEventListener('click', e => {
      if (e.target.closest('[slot="action"]')) {
        this.dispatchEvent(new CustomEvent('action-click', {
          bubbles: true,
          composed: true
        }));
      }
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.#isReady && name === 'title' && oldValue !== newValue) {
      this.updateTitle();
    }
  }

  updateTitle() {
    if (this.#titleEl) {
      this.#titleEl.textContent = this.getAttribute('title') || '';
    }
  }
}

customElements.define('section-header', SectionHeader);
