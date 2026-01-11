import ExtendedHtmlElement from '../extended-html-element.js';

/**
 * A small section label component for categorizing content.
 *
 * Usage:
 *   <section-label>Category Name</section-label>
 *   <section-label icon="⚔️">Damage</section-label>
 *
 * Attributes:
 *   - icon: Optional icon/emoji to display before text
 *   - size: 'small' | 'medium' (default)
 */
class SectionLabel extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['icon', 'size'];

  #labelEl;
  #iconEl;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#labelEl = this.shadowRoot.querySelector('.section-label');
    this.#iconEl = this.shadowRoot.querySelector('.icon');

    this.updateLabel();
  }

  attributeChangedCallback() {
    if (this.#labelEl) {
      this.updateLabel();
    }
  }

  updateLabel() {
    if (!this.#labelEl || !this.#iconEl) return;

    const icon = this.getAttribute('icon') || '';
    const size = this.getAttribute('size') || 'medium';

    this.#labelEl.className = `section-label size-${size}`;
    this.#iconEl.textContent = icon;
    this.#iconEl.style.display = icon ? '' : 'none';
  }
}

customElements.define('section-label', SectionLabel);
