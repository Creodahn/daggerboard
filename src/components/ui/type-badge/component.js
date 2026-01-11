import ExtendedHtmlElement from '../../base/extended-html-element.js';

class TypeBadge extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['type', 'label'];

  #badge;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#badge = this.$('.badge');
    this.updateBadge();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.#badge) {
      this.updateBadge();
    }
  }

  updateBadge() {
    if (!this.#badge) return;

    const type = this.getStringAttr('type');
    const label = this.getStringAttr('label') || this.textContent || type?.toUpperCase() || '';

    this.#badge.className = `badge ${type || ''}`;
    this.#badge.textContent = label;
  }
}

customElements.define('type-badge', TypeBadge);
