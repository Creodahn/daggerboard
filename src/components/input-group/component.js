import ExtendedHtmlElement from '../extended-html-element.js';

/**
 * An input with an attached action button component.
 *
 * Usage:
 *   <input-group
 *     type="number"
 *     placeholder="Amount"
 *     button-text="Apply"
 *     button-variant="success"
 *   ></input-group>
 *
 * Attributes:
 *   - type: Input type (text, number, etc.)
 *   - placeholder: Input placeholder text
 *   - value: Input value
 *   - min/max: For number inputs
 *   - button-text: Text for the action button
 *   - button-variant: 'primary' | 'success' | 'danger' (default: 'primary')
 *   - button-position: 'right' (default) | 'left'
 *   - disabled: Disable both input and button
 *
 * Events:
 *   - input-change: Fired when input value changes
 *   - action-submit: Fired when button is clicked or Enter is pressed
 */
class InputGroup extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['type', 'placeholder', 'value', 'min', 'max', 'button-text', 'button-variant', 'button-position', 'disabled'];

  #input;
  #button;
  stylesPath = './styles.css';
  templatePath = './template.html';

  get value() {
    return this.#input?.value || '';
  }

  set value(val) {
    if (this.#input) {
      this.#input.value = val;
    }
  }

  setup() {
    this.#input = this.shadowRoot.querySelector('input');
    this.#button = this.shadowRoot.querySelector('button');

    this.updateElements();
    this.attachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.#input && oldValue !== newValue) {
      this.updateElements();
    }
  }

  updateElements() {
    if (!this.#input || !this.#button) return;

    const type = this.getAttribute('type') || 'text';
    const placeholder = this.getAttribute('placeholder') || '';
    const value = this.getAttribute('value') || '';
    const min = this.getAttribute('min');
    const max = this.getAttribute('max');
    const buttonText = this.getAttribute('button-text') || 'Submit';
    const disabled = this.hasAttribute('disabled');

    this.#input.type = type;
    this.#input.placeholder = placeholder;
    if (value && !this.#input.value) {
      this.#input.value = value;
    }
    if (min !== null) this.#input.min = min;
    if (max !== null) this.#input.max = max;
    this.#input.disabled = disabled;

    this.#button.textContent = buttonText;
    this.#button.disabled = disabled;
  }

  attachEventListeners() {
    this.#input.addEventListener('input', e => {
      this.dispatchEvent(new CustomEvent('input-change', {
        bubbles: true,
        composed: true,
        detail: { value: e.target.value }
      }));
    });

    this.#input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submit();
      }
    });

    this.#button.addEventListener('click', () => {
      this.submit();
    });
  }

  submit() {
    this.dispatchEvent(new CustomEvent('action-submit', {
      bubbles: true,
      composed: true,
      detail: { value: this.#input?.value || '' }
    }));
  }

  clear() {
    if (this.#input) {
      this.#input.value = '';
    }
  }

  focus() {
    this.#input?.focus();
  }
}

customElements.define('input-group', InputGroup);
