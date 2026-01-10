class TypeBadge extends HTMLElement {
  static observedAttributes = ['type', 'label'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const type = this.getAttribute('type') || '';
    const label = this.getAttribute('label') || this.textContent || type.toUpperCase();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: #e9ecef;
          color: #666;
        }

        /* Pill variant */
        :host([variant="pill"]) .badge {
          border-radius: 12px;
          padding: 0.25rem 0.75rem;
        }

        /* Type-specific colors */
        .badge.enemy {
          background: #dc3545;
          color: white;
        }

        .badge.npc {
          background: #28a745;
          color: white;
        }

        .badge.simple {
          background: #e9ecef;
          color: #666;
        }

        .badge.complex {
          background: #d4edda;
          color: #155724;
        }

        .badge.warning {
          background: #fff3cd;
          color: #856404;
        }

        .badge.danger {
          background: #f8d7da;
          color: #721c24;
        }

        .badge.info {
          background: #d1ecf1;
          color: #0c5460;
        }

        .badge.success {
          background: #d4edda;
          color: #155724;
        }

        .badge.primary {
          background: #cce5ff;
          color: #004085;
        }
      </style>
      <span class="badge ${type}">${label}</span>
    `;
  }
}

customElements.define('type-badge', TypeBadge);
