import ExtendedHtmlElement from '../extended-html-element.js';

/**
 * A toggle button for collapsing/expanding content.
 *
 * Usage:
 *   <collapse-toggle></collapse-toggle>
 *   <collapse-toggle expanded></collapse-toggle>
 *
 * Attributes:
 *   - expanded: Whether the toggle is in expanded state
 *   - size: 'small' | 'medium' (default) | 'large'
 *
 * Events:
 *   - collapse-toggle: { expanded: boolean }
 */
class CollapseToggle extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['expanded', 'size'];

  #button;
  #icon;
  stylesPath = './styles.css';
  templatePath = './template.html';

  get expanded() {
    return this.hasAttribute('expanded');
  }

  set expanded(value) {
    if (value) {
      this.setAttribute('expanded', '');
    } else {
      this.removeAttribute('expanded');
    }
  }

  setup() {
    this.#button = this.shadowRoot.querySelector('button');
    this.#icon = this.shadowRoot.querySelector('.caret-icon');

    this.#button.addEventListener('click', () => {
      this.expanded = !this.expanded;
      this.dispatchEvent(new CustomEvent('collapse-toggle', {
        bubbles: true,
        composed: true,
        detail: { expanded: this.expanded }
      }));
    });

    this.updateSize();
  }

  attributeChangedCallback(name) {
    if (name === 'size' && this.#icon) {
      this.updateSize();
    }
  }

  updateSize() {
    if (!this.#icon) return;

    const size = this.getAttribute('size') || 'medium';
    const sizes = {
      small: '12',
      medium: '16',
      large: '20'
    };
    const iconSize = sizes[size] || sizes.medium;

    this.#icon.setAttribute('width', iconSize);
    this.#icon.setAttribute('height', iconSize);
  }
}

customElements.define('collapse-toggle', CollapseToggle);
