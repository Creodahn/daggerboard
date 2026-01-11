import ExtendedHtmlElement from '../extended-html-element.js';

/**
 * A reusable counter control component with increment/decrement buttons.
 *
 * Usage:
 *   <counter-control value="5"></counter-control>
 *   <counter-control value="10" max="20" label="Round"></counter-control>
 *   <counter-control value="5" show-max="10"></counter-control>
 *
 * Attributes:
 *   - value: Current value (default: 0)
 *   - min: Minimum value (default: 0)
 *   - max: Maximum value (optional)
 *   - show-max: Display format as "value / max" (optional)
 *   - label: Optional label to display
 *   - step: Increment/decrement step (default: 1)
 *   - readonly: Disable controls, display only
 *
 * Events:
 *   - counter-change: { value: number, delta: number }
 *   - counter-increment: { value: number }
 *   - counter-decrement: { value: number }
 */
class CounterControl extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['value', 'min', 'max', 'show-max', 'label', 'step', 'readonly'];

  #value = 0;
  #valueEl;
  #labelEl;
  #decrementBtn;
  #incrementBtn;
  stylesPath = './styles.css';
  templatePath = './template.html';

  get value() {
    return this.#value;
  }

  set value(val) {
    const num = parseInt(val) || 0;
    const min = parseInt(this.getAttribute('min')) || 0;
    const max = this.getAttribute('max') ? parseInt(this.getAttribute('max')) : null;

    // Clamp value to min/max
    let clamped = Math.max(min, num);
    if (max !== null) {
      clamped = Math.min(max, clamped);
    }

    this.#value = clamped;
    this.setAttribute('value', String(clamped));
    this.updateDisplay();
  }

  setup() {
    this.#valueEl = this.shadowRoot.querySelector('.value');
    this.#labelEl = this.shadowRoot.querySelector('.label');
    this.#decrementBtn = this.shadowRoot.querySelector('.decrement');
    this.#incrementBtn = this.shadowRoot.querySelector('.increment');

    this.#value = parseInt(this.getAttribute('value')) || 0;

    // Set initial label
    const label = this.getAttribute('label') || '';
    this.#labelEl.textContent = label;
    this.#labelEl.style.display = label ? '' : 'none';

    this.updateDisplay();

    this.#decrementBtn.addEventListener('click', () => this.decrement());
    this.#incrementBtn.addEventListener('click', () => this.increment());
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.#valueEl) return;

    if (name === 'value' && oldValue !== newValue) {
      this.#value = parseInt(newValue) || 0;
      this.updateDisplay();
    }
    if (name === 'label') {
      this.#labelEl.textContent = newValue || '';
      this.#labelEl.style.display = newValue ? '' : 'none';
    }
    if (name === 'readonly') {
      this.updateButtonStates();
    }
  }

  updateDisplay() {
    if (!this.#valueEl) return;

    const showMax = this.getAttribute('show-max');
    if (showMax) {
      this.#valueEl.textContent = `${this.#value} / ${showMax}`;
    } else {
      this.#valueEl.textContent = String(this.#value);
    }

    this.updateButtonStates();
  }

  updateButtonStates() {
    if (!this.#decrementBtn || !this.#incrementBtn) return;

    const readonly = this.hasAttribute('readonly');
    const min = parseInt(this.getAttribute('min')) || 0;
    const max = this.getAttribute('max') ? parseInt(this.getAttribute('max')) : null;

    this.#decrementBtn.disabled = readonly || this.#value <= min;
    this.#incrementBtn.disabled = readonly || (max !== null && this.#value >= max);
  }

  increment() {
    const step = parseInt(this.getAttribute('step')) || 1;
    const oldValue = this.#value;
    this.value = this.#value + step;

    if (this.#value !== oldValue) {
      this.dispatchEvent(new CustomEvent('counter-increment', {
        bubbles: true,
        composed: true,
        detail: { value: this.#value }
      }));
      this.dispatchEvent(new CustomEvent('counter-change', {
        bubbles: true,
        composed: true,
        detail: { value: this.#value, delta: step }
      }));
    }
  }

  decrement() {
    const step = parseInt(this.getAttribute('step')) || 1;
    const oldValue = this.#value;
    this.value = this.#value - step;

    if (this.#value !== oldValue) {
      this.dispatchEvent(new CustomEvent('counter-decrement', {
        bubbles: true,
        composed: true,
        detail: { value: this.#value }
      }));
      this.dispatchEvent(new CustomEvent('counter-change', {
        bubbles: true,
        composed: true,
        detail: { value: this.#value, delta: -step }
      }));
    }
  }
}

customElements.define('counter-control', CounterControl);
