/**
 * A small section label component for categorizing content.
 *
 * Usage:
 *   <section-label>Category Name</section-label>
 *   <section-label icon="⚔️">Damage</section-label>
 *
 * Attributes:
 *   - icon: Optional icon/emoji to display before text
 *   - size: 'small' | 'medium' (default)
 */
class SectionLabel extends HTMLElement {
  static observedAttributes = ['icon', 'size'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.querySelector('.section-label')) {
      this.render();
    }
  }

  render() {
    const icon = this.getAttribute('icon') || '';
    const size = this.getAttribute('size') || 'medium';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .section-label {
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .section-label.size-small {
          font-size: 0.65rem;
        }

        .section-label.size-medium {
          font-size: 0.75rem;
        }

        .icon {
          font-size: 1em;
        }
      </style>
      <span class="section-label size-${size}">
        ${icon ? `<span class="icon">${icon}</span>` : ''}
        <slot></slot>
      </span>
    `;
  }
}

customElements.define('section-label', SectionLabel);
