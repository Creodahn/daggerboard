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
class InputGroup extends HTMLElement {
  static observedAttributes = ['type', 'placeholder', 'value', 'min', 'max', 'button-text', 'button-variant', 'button-position', 'disabled'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  get value() {
    return this.shadowRoot?.querySelector('input')?.value || '';
  }

  set value(val) {
    const input = this.shadowRoot?.querySelector('input');
    if (input) {
      input.value = val;
    }
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.querySelector('.input-group')) {
      this.render();
      this.attachEventListeners();
    }
  }

  attachEventListeners() {
    const input = this.shadowRoot.querySelector('input');
    const button = this.shadowRoot.querySelector('button');

    input?.addEventListener('input', e => {
      this.dispatchEvent(new CustomEvent('input-change', {
        bubbles: true,
        composed: true,
        detail: { value: e.target.value }
      }));
    });

    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submit();
      }
    });

    button?.addEventListener('click', () => {
      this.submit();
    });
  }

  submit() {
    const input = this.shadowRoot.querySelector('input');
    this.dispatchEvent(new CustomEvent('action-submit', {
      bubbles: true,
      composed: true,
      detail: { value: input?.value || '' }
    }));
  }

  clear() {
    const input = this.shadowRoot.querySelector('input');
    if (input) {
      input.value = '';
    }
  }

  focus() {
    this.shadowRoot?.querySelector('input')?.focus();
  }

  render() {
    const type = this.getAttribute('type') || 'text';
    const placeholder = this.getAttribute('placeholder') || '';
    const value = this.getAttribute('value') || '';
    const min = this.getAttribute('min');
    const max = this.getAttribute('max');
    const buttonText = this.getAttribute('button-text') || 'Submit';
    const buttonVariant = this.getAttribute('button-variant') || 'primary';
    const buttonPosition = this.getAttribute('button-position') || 'right';
    const disabled = this.hasAttribute('disabled');

    const variantColors = {
      primary: { base: '#007bff', hover: '#0056b3' },
      success: { base: '#28a745', hover: '#218838' },
      danger: { base: '#dc3545', hover: '#c82333' }
    };

    const colors = variantColors[buttonVariant] || variantColors.primary;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .input-group {
          display: flex;
          flex-direction: ${buttonPosition === 'left' ? 'row-reverse' : 'row'};
        }

        input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid ${colors.base};
          border-radius: ${buttonPosition === 'left' ? '0 4px 4px 0' : '4px 0 0 4px'};
          font-size: 0.85rem;
          min-width: 0;
        }

        input:focus {
          outline: none;
          border-color: ${colors.hover};
          box-shadow: 0 0 0 3px ${colors.base}1a;
          position: relative;
          z-index: 1;
        }

        input:disabled {
          background: #e9ecef;
          cursor: not-allowed;
        }

        button {
          padding: 0.5rem 0.75rem;
          background: ${colors.base};
          color: white;
          border: 1px solid ${colors.base};
          ${buttonPosition === 'left' ? 'border-right: none;' : 'border-left: none;'}
          border-radius: ${buttonPosition === 'left' ? '4px 0 0 4px' : '0 4px 4px 0'};
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }

        button:hover:not(:disabled) {
          background: ${colors.hover};
          border-color: ${colors.hover};
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      </style>
      <div class="input-group">
        <input
          type="${type}"
          placeholder="${placeholder}"
          value="${value}"
          ${min !== null ? `min="${min}"` : ''}
          ${max !== null ? `max="${max}"` : ''}
          ${disabled ? 'disabled' : ''}
        >
        <button type="button" ${disabled ? 'disabled' : ''}>${buttonText}</button>
      </div>
    `;
  }
}

customElements.define('input-group', InputGroup);
