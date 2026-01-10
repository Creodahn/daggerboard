/**
 * A panel section container with consistent styling.
 * Used for grouping related content with a gray background.
 *
 * Usage:
 *   <panel-section>
 *     <section-header slot="header" title="My Section"></section-header>
 *     <div>Content goes here</div>
 *   </panel-section>
 *
 * Attributes:
 *   - variant: 'default' | 'flush' (no padding)
 *   - padding: 'small' | 'medium' (default) | 'large'
 */
class PanelSection extends HTMLElement {
  static observedAttributes = ['variant', 'padding'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.querySelector('.panel-section')) {
      this.render();
    }
  }

  render() {
    const variant = this.getAttribute('variant') || 'default';
    const padding = this.getAttribute('padding') || 'medium';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .panel-section {
          background: #f5f5f5;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
        }

        .panel-section.padding-small {
          padding: 1rem;
        }

        .panel-section.padding-medium {
          padding: 1.5rem;
        }

        .panel-section.padding-large {
          padding: 2rem;
        }

        .panel-section.variant-flush {
          padding: 0;
          background: transparent;
        }

        ::slotted([slot="header"]) {
          margin-bottom: 1rem;
        }

        .content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
      </style>
      <div class="panel-section padding-${padding} variant-${variant}">
        <slot name="header"></slot>
        <div class="content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('panel-section', PanelSection);
