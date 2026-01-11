import ExtendedHtmlElement from '../../base/extended-html-element.js';

class EmptyState extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['message', 'icon'];

  #iconEl;
  #messageEl;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#iconEl = this.$('.icon');
    this.#messageEl = this.$('.message');

    this.updateContent();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.#messageEl) {
      this.updateContent();
    }
  }

  updateContent() {
    const message = this.getStringAttr('message') || this.textContent || 'No items yet';
    const icon = this.getStringAttr('icon');

    this.#messageEl.textContent = message;
    this.#iconEl.textContent = icon;
    this.#iconEl.style.display = icon ? '' : 'none';
  }
}

customElements.define('empty-state', EmptyState);
