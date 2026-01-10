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
class CounterControl extends HTMLElement {
  static observedAttributes = ['value', 'min', 'max', 'show-max', 'label', 'step', 'readonly'];

  #value = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

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

  connectedCallback() {
    this.render();
    this.#value = parseInt(this.getAttribute('value')) || 0;
    this.updateDisplay();
    this.attachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'value' && oldValue !== newValue) {
      this.#value = parseInt(newValue) || 0;
      this.updateDisplay();
    }
    if (name === 'label') {
      const labelEl = this.shadowRoot?.querySelector('.label');
      if (labelEl) {
        labelEl.textContent = newValue || '';
        labelEl.style.display = newValue ? '' : 'none';
      }
    }
    if (name === 'readonly') {
      this.updateButtonStates();
    }
  }

  updateDisplay() {
    const valueEl = this.shadowRoot?.querySelector('.value');
    if (!valueEl) return;

    const showMax = this.getAttribute('show-max');
    if (showMax) {
      valueEl.textContent = `${this.#value} / ${showMax}`;
    } else {
      valueEl.textContent = String(this.#value);
    }

    this.updateButtonStates();
  }

  updateButtonStates() {
    const decrementBtn = this.shadowRoot?.querySelector('.decrement');
    const incrementBtn = this.shadowRoot?.querySelector('.increment');
    if (!decrementBtn || !incrementBtn) return;

    const readonly = this.hasAttribute('readonly');
    const min = parseInt(this.getAttribute('min')) || 0;
    const max = this.getAttribute('max') ? parseInt(this.getAttribute('max')) : null;

    decrementBtn.disabled = readonly || this.#value <= min;
    incrementBtn.disabled = readonly || (max !== null && this.#value >= max);
  }

  attachEventListeners() {
    const decrementBtn = this.shadowRoot.querySelector('.decrement');
    const incrementBtn = this.shadowRoot.querySelector('.increment');

    decrementBtn.addEventListener('click', () => this.decrement());
    incrementBtn.addEventListener('click', () => this.increment());
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

  render() {
    const label = this.getAttribute('label') || '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .label {
          font-weight: 600;
          font-size: 0.9rem;
          color: #333;
        }

        .controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        button {
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 1.25rem;
          font-weight: 600;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: opacity 0.2s, transform 0.1s;
        }

        button:hover:not(:disabled) {
          transform: scale(1.05);
        }

        button:active:not(:disabled) {
          transform: scale(0.95);
        }

        button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .decrement {
          background-color: #dc3545;
        }

        .decrement:hover:not(:disabled) {
          background-color: #c82333;
        }

        .increment {
          background-color: #28a745;
        }

        .increment:hover:not(:disabled) {
          background-color: #218838;
        }

        .value {
          min-width: 3rem;
          text-align: center;
          font-weight: 600;
          font-size: 1rem;
          color: var(--counter-value-color, #333);
        }

        /* Compact variant */
        :host([compact]) button {
          width: 24px;
          height: 24px;
          font-size: 1rem;
        }

        :host([compact]) .value {
          min-width: 2rem;
          font-size: 0.9rem;
        }

        /* Large variant */
        :host([size="large"]) button {
          width: 40px;
          height: 40px;
          font-size: 1.5rem;
        }

        :host([size="large"]) .value {
          min-width: 4rem;
          font-size: 1.25rem;
        }

        /* Vertical layout */
        :host([layout="vertical"]) {
          flex-direction: column;
        }

        :host([layout="vertical"]) .controls {
          flex-direction: column;
        }

        /* Display-only mode - hide buttons, show only value */
        :host([display-only]) button {
          display: none;
        }

        :host([display-only]) .value {
          font-size: 2rem;
          font-weight: 700;
        }

        :host([display-only][size="large"]) .value {
          font-size: 2.5rem;
        }
      </style>
      <span class="label" style="${label ? '' : 'display: none;'}">${label}</span>
      <div class="controls">
        <button type="button" class="decrement" aria-label="Decrease">−</button>
        <span class="value">0</span>
        <button type="button" class="increment" aria-label="Increase">+</button>
      </div>
    `;
  }
}

customElements.define('counter-control', CounterControl);
