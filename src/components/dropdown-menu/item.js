class DropdownMenuItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Use a div instead of button when keep-open is set (for interactive controls)
    const isKeepOpen = this.hasAttribute('keep-open');
    const wrapperTag = isKeepOpen ? 'div' : 'button';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          width: 100%;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
          font-family: inherit;
          box-sizing: border-box;
        }

        .menu-item:hover {
          background: #f8f9fa;
        }

        :host(:first-child) .menu-item {
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
        }

        :host(:last-child) .menu-item {
          border-bottom-left-radius: 6px;
          border-bottom-right-radius: 6px;
        }

        :host([variant="delete"]) .menu-item {
          color: #dc3545;
          border-top: 1px solid #e9ecef;
        }

        :host([variant="delete"]) .menu-item:hover {
          background: #fee;
        }

        /* Interactive items (keep-open) should not look like buttons */
        :host([keep-open]) .menu-item {
          cursor: default;
        }
      </style>
      <${wrapperTag} class="menu-item" part="item">
        <slot></slot>
      </${wrapperTag}>
    `;

    // Only dispatch menu-item-click for button items (not keep-open items)
    if (!isKeepOpen) {
      const item = this.shadowRoot.querySelector('.menu-item');
      item.addEventListener('click', e => {
        this.dispatchEvent(
          new CustomEvent('menu-item-click', {
            bubbles: true,
            composed: true,
            detail: { originalEvent: e },
          })
        );
      });
    }
  }
}

customElements.define('dropdown-menu-item', DropdownMenuItem);
