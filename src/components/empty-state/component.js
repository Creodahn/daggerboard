class EmptyState extends HTMLElement {
  static observedAttributes = ['message', 'icon'];

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
    const message = this.getAttribute('message') || this.textContent || 'No items yet';
    const icon = this.getAttribute('icon') || '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .empty-state {
          color: #999;
          font-style: italic;
          text-align: center;
          padding: 2rem;
          margin: 0;
        }

        .icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          opacity: 0.5;
        }

        .message {
          margin: 0;
        }

        /* Size variants */
        :host([size="small"]) .empty-state {
          padding: 1rem;
        }

        :host([size="small"]) .icon {
          font-size: 1.5rem;
        }

        :host([size="small"]) .message {
          font-size: 0.9rem;
        }

        :host([size="large"]) .empty-state {
          padding: 3rem;
        }

        :host([size="large"]) .icon {
          font-size: 3rem;
        }

        :host([size="large"]) .message {
          font-size: 1.1rem;
        }
      </style>
      <div class="empty-state">
        ${icon ? `<div class="icon">${icon}</div>` : ''}
        <p class="message">${message}</p>
      </div>
    `;
  }
}

customElements.define('empty-state', EmptyState);
