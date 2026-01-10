class ToggleSwitch extends HTMLElement {
  static observedAttributes = ['checked', 'label', 'name'];

  #checkbox;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  get checked() {
    return this.#checkbox?.checked ?? false;
  }

  set checked(value) {
    if (this.#checkbox) {
      this.#checkbox.checked = Boolean(value);
    }
    if (value) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
  }

  get value() {
    return this.checked;
  }

  connectedCallback() {
    this.render();
    this.#checkbox = this.shadowRoot.querySelector('input[type="checkbox"]');

    // Sync initial checked state
    if (this.hasAttribute('checked')) {
      this.#checkbox.checked = true;
    }

    this.#checkbox.addEventListener('change', e => {
      if (e.target.checked) {
        this.setAttribute('checked', '');
      } else {
        this.removeAttribute('checked');
      }

      this.dispatchEvent(new CustomEvent('toggle-change', {
        bubbles: true,
        composed: true,
        detail: {
          checked: e.target.checked,
          name: this.getAttribute('name')
        }
      }));
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'checked' && this.#checkbox) {
      this.#checkbox.checked = newValue !== null;
    }
    if (name === 'label') {
      const labelEl = this.shadowRoot?.querySelector('.label-text');
      if (labelEl) {
        labelEl.textContent = newValue || '';
      }
    }
  }

  render() {
    const label = this.getAttribute('label') || '';
    const name = this.getAttribute('name') || '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
        }

        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          user-select: none;
        }

        /* Hide the default checkbox */
        input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        /* The toggle track */
        .toggle-track {
          position: relative;
          width: 40px;
          height: 22px;
          background: #ccc;
          border-radius: 11px;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        /* The toggle knob */
        .toggle-track::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          transition: transform 0.2s;
        }

        /* Checked state */
        input[type="checkbox"]:checked + .toggle-track {
          background: #28a745;
        }

        input[type="checkbox"]:checked + .toggle-track::after {
          transform: translateX(18px);
        }

        /* Focus state */
        input[type="checkbox"]:focus + .toggle-track {
          box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.25);
        }

        /* Hover state */
        .toggle-switch:hover .toggle-track {
          background: #bbb;
        }

        .toggle-switch:hover input[type="checkbox"]:checked + .toggle-track {
          background: #218838;
        }

        .label-text {
          font-size: 0.9rem;
          color: #333;
          white-space: nowrap;
        }

        /* Label-first variant (label before toggle) */
        :host([label-first]) .toggle-switch {
          flex-direction: row-reverse;
        }

        /* Disabled state */
        :host([disabled]) .toggle-switch {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Compact variant */
        :host([compact]) .toggle-track {
          width: 32px;
          height: 18px;
          border-radius: 9px;
        }

        :host([compact]) .toggle-track::after {
          width: 14px;
          height: 14px;
          top: 2px;
          left: 2px;
        }

        :host([compact]) input[type="checkbox"]:checked + .toggle-track::after {
          transform: translateX(14px);
        }

        :host([compact]) .label-text {
          font-size: 0.85rem;
        }

        /* Icon prefix support */
        ::slotted([slot="icon"]) {
          display: flex;
          align-items: center;
        }
      </style>
      <label class="toggle-switch">
        <input type="checkbox" name="${name}">
        <span class="toggle-track"></span>
        <slot name="icon"></slot>
        <span class="label-text">${label}</span>
      </label>
    `;
  }
}

customElements.define('toggle-switch', ToggleSwitch);
