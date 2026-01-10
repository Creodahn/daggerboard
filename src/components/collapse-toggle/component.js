/**
 * A toggle button for collapsing/expanding content.
 *
 * Usage:
 *   <collapse-toggle></collapse-toggle>
 *   <collapse-toggle expanded></collapse-toggle>
 *
 * Attributes:
 *   - expanded: Whether the toggle is in expanded state
 *   - size: 'small' | 'medium' (default) | 'large'
 *
 * Events:
 *   - collapse-toggle: { expanded: boolean }
 */
class CollapseToggle extends HTMLElement {
  static observedAttributes = ['expanded', 'size'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  get expanded() {
    return this.hasAttribute('expanded');
  }

  set expanded(value) {
    if (value) {
      this.setAttribute('expanded', '');
    } else {
      this.removeAttribute('expanded');
    }
  }

  connectedCallback() {
    this.render();
    this.shadowRoot.querySelector('button').addEventListener('click', () => {
      this.expanded = !this.expanded;
      this.updateIcon();
      this.dispatchEvent(new CustomEvent('collapse-toggle', {
        bubbles: true,
        composed: true,
        detail: { expanded: this.expanded }
      }));
    });
  }

  attributeChangedCallback(name) {
    if (name === 'expanded') {
      this.updateIcon();
    }
  }

  updateIcon() {
    const icon = this.shadowRoot.querySelector('.caret-icon');
    if (icon) {
      icon.style.transform = this.expanded ? 'rotate(0deg)' : 'rotate(-90deg)';
    }
  }

  render() {
    const size = this.getAttribute('size') || 'medium';
    const sizes = {
      small: { button: '20px', icon: '12' },
      medium: { button: '24px', icon: '16' },
      large: { button: '32px', icon: '20' }
    };
    const s = sizes[size] || sizes.medium;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
        }

        button {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: color 0.2s;
          width: ${s.button};
          height: ${s.button};
        }

        button:hover {
          color: #333;
        }

        .caret-icon {
          transition: transform 0.2s ease;
          transform: ${this.expanded ? 'rotate(0deg)' : 'rotate(-90deg)'};
        }
      </style>
      <button type="button" aria-label="Toggle expand/collapse">
        <svg class="caret-icon" width="${s.icon}" height="${s.icon}" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 6l4 4 4-4z"/>
        </svg>
      </button>
    `;
  }
}

customElements.define('collapse-toggle', CollapseToggle);
