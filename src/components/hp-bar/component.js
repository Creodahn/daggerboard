import { getHealthPercentage, getHealthBarClass } from '../../helpers/health-utils.js';

/**
 * A reusable HP bar component with health state styling.
 *
 * Usage:
 *   <hp-bar current="15" max="20"></hp-bar>
 *   <hp-bar current="15" max="20" show-text></hp-bar>
 *
 * Attributes:
 *   - current: Current HP value
 *   - max: Maximum HP value
 *   - show-text: Show HP text overlay (e.g., "15 / 20 HP")
 *   - compact: Smaller height variant
 */
class HpBar extends HTMLElement {
  static observedAttributes = ['current', 'max', 'show-text', 'compact'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  get current() {
    return parseInt(this.getAttribute('current')) || 0;
  }

  set current(value) {
    this.setAttribute('current', value);
  }

  get max() {
    return parseInt(this.getAttribute('max')) || 1;
  }

  set max(value) {
    this.setAttribute('max', value);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.querySelector('.hp-bar-container')) {
      this.render();
    }
  }

  render() {
    const current = this.current;
    const max = this.max;
    const showText = this.hasAttribute('show-text');
    const compact = this.hasAttribute('compact');

    const percentage = getHealthPercentage(current, max);
    const healthClass = getHealthBarClass(percentage);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .hp-bar-container {
          position: relative;
          background: #e9ecef;
          border-radius: 6px;
          height: ${compact ? '16px' : '24px'};
          overflow: hidden;
          cursor: pointer;
          transition: box-shadow 0.2s;
        }

        .hp-bar-container:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .hp-bar {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 6px;
        }

        .hp-bar.healthy {
          background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
        }

        .hp-bar.medium {
          background: linear-gradient(90deg, #ffc107 0%, #fd7e14 100%);
        }

        .hp-bar.low {
          background: linear-gradient(90deg, #fd7e14 0%, #dc3545 100%);
        }

        .hp-bar.critical {
          background: linear-gradient(90deg, #dc3545 0%, #bd2130 100%);
          animation: pulse-critical 0.5s ease-in-out infinite;
        }

        .hp-bar.dead {
          width: 100% !important;
          background: #8b0000;
        }

        .hp-bar-container.dead-state {
          background: #8b0000;
          box-shadow: 0 2px 8px rgba(139, 0, 0, 0.5);
        }

        .hp-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: 600;
          font-size: ${compact ? '0.65rem' : '0.75rem'};
          color: #333;
          text-shadow: 0 0 3px white;
          white-space: nowrap;
        }

        .hp-bar-container.dead-state .hp-text {
          color: #ffcccc;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        @keyframes pulse-critical {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      </style>
      <div class="hp-bar-container ${healthClass === 'dead' ? 'dead-state' : ''}">
        <div class="hp-bar ${healthClass}" style="width: ${percentage}%"></div>
        ${showText ? `<span class="hp-text">${current} / ${max} HP</span>` : ''}
      </div>
    `;
  }
}

customElements.define('hp-bar', HpBar);
