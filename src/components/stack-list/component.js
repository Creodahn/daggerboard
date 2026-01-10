/**
 * A vertical stack list container with consistent gap spacing.
 *
 * Usage:
 *   <stack-list>
 *     <div>Item 1</div>
 *     <div>Item 2</div>
 *   </stack-list>
 *
 * Attributes:
 *   - gap: 'none' | 'small' | 'medium' (default) | 'large'
 *   - scrollable: Makes the list scrollable with max-height
 *   - max-height: Custom max height when scrollable (default: 350px)
 */
class StackList extends HTMLElement {
  static observedAttributes = ['gap', 'scrollable', 'max-height'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.querySelector('.stack-list')) {
      this.render();
    }
  }

  render() {
    const gap = this.getAttribute('gap') || 'medium';
    const scrollable = this.hasAttribute('scrollable');
    const maxHeight = this.getAttribute('max-height') || '350px';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .stack-list {
          display: flex;
          flex-direction: column;
        }

        .stack-list.gap-none {
          gap: 0;
        }

        .stack-list.gap-small {
          gap: 0.5rem;
        }

        .stack-list.gap-medium {
          gap: 1rem;
        }

        .stack-list.gap-large {
          gap: 1.5rem;
        }

        .stack-list.scrollable {
          overflow-y: auto;
          max-height: ${maxHeight};
          padding-right: 0.5rem;
        }

        /* Custom scrollbar */
        .stack-list.scrollable::-webkit-scrollbar {
          width: 8px;
        }

        .stack-list.scrollable::-webkit-scrollbar-track {
          background: #e9ecef;
          border-radius: 4px;
        }

        .stack-list.scrollable::-webkit-scrollbar-thumb {
          background: #adb5bd;
          border-radius: 4px;
        }

        .stack-list.scrollable::-webkit-scrollbar-thumb:hover {
          background: #6c757d;
        }
      </style>
      <div class="stack-list gap-${gap} ${scrollable ? 'scrollable' : ''}">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('stack-list', StackList);
