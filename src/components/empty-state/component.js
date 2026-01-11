import ExtendedHtmlElement from '../extended-html-element.js';

class EmptyState extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['message', 'icon'];

  #iconEl;
  #messageEl;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#iconEl = this.shadowRoot.querySelector('.icon');
    this.#messageEl = this.shadowRoot.querySelector('.message');

    this.updateContent();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.#messageEl) {
      this.updateContent();
    }
  }

  updateContent() {
    const message = this.getAttribute('message') || this.textContent || 'No items yet';
    const icon = this.getAttribute('icon') || '';

    this.#messageEl.textContent = message;
    this.#iconEl.textContent = icon;
    this.#iconEl.style.display = icon ? '' : 'none';
  }
}

customElements.define('empty-state', EmptyState);
