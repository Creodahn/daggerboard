import ExtendedHtmlElement from '../extended-html-element.js';

/**
 * A reusable action button component with consistent styling.
 *
 * Usage:
 *   <action-button>Click me</action-button>
 *   <action-button variant="success">Create</action-button>
 *   <action-button variant="danger">Delete</action-button>
 *
 * Attributes:
 *   - variant: 'primary' (default), 'success', 'danger', 'secondary'
 *   - size: 'small', 'medium' (default), 'large'
 *   - disabled: Disable the button
 *   - loading: Show loading state
 *   - type: 'button' (default), 'submit', 'reset'
 *
 * Events:
 *   - action-click: Fired when button is clicked (unless disabled/loading)
 */
class ActionButton extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['variant', 'size', 'disabled', 'loading', 'type'];

  #button;
  stylesPath = './styles.css';
  templatePath = './template.html';

  constructor() {
    super();

    // Attach click listener immediately in constructor
    // This ensures clicks are captured even before setup runs
    this.addEventListener('click', e => {
      if (!this.disabled) {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent('action-click', {
          bubbles: true,
          composed: true
        }));
      }
    });
  }

  get disabled() {
    return this.hasAttribute('disabled') || this.hasAttribute('loading');
  }

  set disabled(value) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  setup() {
    this.#button = this.shadowRoot.querySelector('button');
    this.updateButton();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.#button) {
      this.updateButton();
    }
  }

  updateButton() {
    if (!this.#button) return;

    const variant = this.getAttribute('variant') || 'primary';
    const size = this.getAttribute('size') || 'medium';
    const type = this.getAttribute('type') || 'button';
    const isDisabled = this.hasAttribute('disabled');
    const isLoading = this.hasAttribute('loading');

    this.#button.type = type;
    this.#button.className = `${variant} ${size}`;
    this.#button.disabled = isDisabled || isLoading;
  }
}

customElements.define('action-button', ActionButton);
