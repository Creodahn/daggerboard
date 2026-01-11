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
class ActionButton extends HTMLElement {
  static observedAttributes = ['variant', 'size', 'disabled', 'loading', 'type'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Attach click listener immediately in constructor
    // This ensures clicks are captured even before connectedCallback runs
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

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.querySelector('button')) {
      this.render();
    }
  }

  render() {
    const variant = this.getAttribute('variant') || 'primary';
    const size = this.getAttribute('size') || 'medium';
    const type = this.getAttribute('type') || 'button';
    const isDisabled = this.hasAttribute('disabled');
    const isLoading = this.hasAttribute('loading');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }

        button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
          font-family: inherit;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        button:active:not(:disabled) {
          transform: translateY(0);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Sizes */
        button.small {
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
        }

        button.medium {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
        }

        button.large {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
        }

        /* Variants */
        button.primary {
          background: #007bff;
          color: white;
        }

        button.primary:hover:not(:disabled) {
          background: #0056b3;
        }

        button.success {
          background: #28a745;
          color: white;
        }

        button.success:hover:not(:disabled) {
          background: #218838;
        }

        button.danger {
          background: #dc3545;
          color: white;
        }

        button.danger:hover:not(:disabled) {
          background: #c82333;
        }

        button.secondary {
          background: #6c757d;
          color: white;
        }

        button.secondary:hover:not(:disabled) {
          background: #5a6268;
        }

        /* Loading spinner */
        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
      <button
        type="${type}"
        class="${variant} ${size}"
        ${isDisabled || isLoading ? 'disabled' : ''}
      >
        ${isLoading ? '<span class="spinner"></span>' : ''}
        <slot></slot>
      </button>
    `;
  }
}

customElements.define('action-button', ActionButton);
