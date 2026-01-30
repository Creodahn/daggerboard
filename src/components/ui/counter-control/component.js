import ExtendedHtmlElement from '../../base/extended-html-element.js';

/**
 * A reusable counter control component with increment/decrement buttons.
 *
 * Usage:
 *   <counter-control value="5"></counter-control>
 *   <counter-control value="10" max="20" label="Round"></counter-control>
 *   <counter-control value="5" show-max="10"></counter-control>
 *   <counter-control value="5" max="12" allow-overflow></counter-control>
 *
 * Attributes:
 *   - value: Current value (default: 0)
 *   - min: Minimum value (default: 0)
 *   - max: Maximum value (optional, clamps value and disables button at max)
 *   - show-max: Display format as "value / max" (optional, display only)
 *   - allow-overflow: When set with max, doesn't disable increment at max
 *                     and always emits events (for server-side overflow handling)
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
  static observedAttributes = ['value', 'min', 'max', 'show-max', 'label', 'step', 'readonly', 'allow-overflow'];

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
    const min = this.getIntAttr('min', 0);
    const maxAttr = this.getAttribute('max');
    const max = maxAttr !== null ? parseInt(maxAttr) : null;

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
    this.#valueEl = this.$('.value');
    this.#labelEl = this.$('.label');
    this.#decrementBtn = this.$('.decrement');
    this.#incrementBtn = this.$('.increment');

    this.#value = this.getIntAttr('value', 0);

    // Set initial label
    const label = this.getStringAttr('label');
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

    // show-max takes precedence, then max attribute
    const showMax = this.getStringAttr('show-max');
    const maxAttr = this.getAttribute('max');

    if (showMax) {
      this.#valueEl.textContent = `${this.#value} / ${showMax}`;
    } else if (maxAttr !== null) {
      this.#valueEl.textContent = `${this.#value} / ${maxAttr}`;
    } else {
      this.#valueEl.textContent = String(this.#value);
    }

    this.updateButtonStates();
  }

  updateButtonStates() {
    if (!this.#decrementBtn || !this.#incrementBtn) return;

    const readonly = this.getBoolAttr('readonly');
    const allowOverflow = this.getBoolAttr('allow-overflow');
    const min = this.getIntAttr('min', 0);
    const maxAttr = this.getAttribute('max');
    const max = maxAttr !== null ? parseInt(maxAttr) : null;

    this.#decrementBtn.disabled = readonly || this.#value <= min;
    // If allow-overflow is set, don't disable at max (let server handle overflow)
    this.#incrementBtn.disabled = readonly || (!allowOverflow && max !== null && this.#value >= max);
  }

  increment() {
    const step = this.getIntAttr('step', 1);
    const allowOverflow = this.getBoolAttr('allow-overflow');
    const oldValue = this.#value;
    this.value = this.#value + step;

    // If allow-overflow, always emit (server handles the actual logic)
    // Otherwise, only emit if value actually changed
    if (allowOverflow || this.#value !== oldValue) {
      this.emit('counter-increment', { value: this.#value });
      this.emit('counter-change', { value: this.#value, delta: step });
    }
  }

  decrement() {
    const step = this.getIntAttr('step', 1);
    const oldValue = this.#value;
    this.value = this.#value - step;

    if (this.#value !== oldValue) {
      this.emit('counter-decrement', { value: this.#value });
      this.emit('counter-change', { value: this.#value, delta: -step });
    }
  }
}

customElements.define('counter-control', CounterControl);
