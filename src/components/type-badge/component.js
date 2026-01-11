import ExtendedHtmlElement from '../extended-html-element.js';

class TypeBadge extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['type', 'label'];

  #badge;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#badge = this.shadowRoot.querySelector('.badge');
    this.updateBadge();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.#badge) {
      this.updateBadge();
    }
  }

  updateBadge() {
    if (!this.#badge) return;

    const type = this.getAttribute('type') || '';
    const label = this.getAttribute('label') || this.textContent || type.toUpperCase();

    this.#badge.className = `badge ${type}`;
    this.#badge.textContent = label;
  }
}

customElements.define('type-badge', TypeBadge);
