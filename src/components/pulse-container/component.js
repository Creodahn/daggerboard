/**
 * A container component that applies pulse animations based on urgency state.
 *
 * Usage:
 *   <pulse-container urgency="warning">
 *     <div>Content that pulses</div>
 *   </pulse-container>
 *
 * Attributes:
 *   - urgency: 'normal' | 'warning' | 'urgent' | 'critical'
 *   - disabled: Disable animations
 */
class PulseContainer extends HTMLElement {
  static observedAttributes = ['urgency', 'disabled'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.querySelector('.pulse-container')) {
      this.updateUrgency();
    }
  }

  updateUrgency() {
    const container = this.shadowRoot.querySelector('.pulse-container');
    if (!container) return;

    const urgency = this.getAttribute('urgency') || 'normal';
    const disabled = this.hasAttribute('disabled');

    container.classList.remove('urgency-warning', 'urgency-urgent', 'urgency-critical');

    if (!disabled && urgency !== 'normal') {
      container.classList.add(`urgency-${urgency}`);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .pulse-container {
          transition: transform 0.2s, box-shadow 0.2s;
        }

        @keyframes pulse-warning {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.9;
          }
        }

        @keyframes pulse-urgent {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          50% {
            transform: scale(1.03);
            opacity: 0.95;
            box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
          }
        }

        @keyframes pulse-critical {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
            box-shadow: 0 6px 16px rgba(244, 67, 54, 0.5);
          }
        }

        .pulse-container.urgency-warning {
          animation: pulse-warning 2s ease-in-out infinite;
        }

        .pulse-container.urgency-urgent {
          animation: pulse-urgent 1s ease-in-out infinite;
        }

        .pulse-container.urgency-critical {
          animation: pulse-critical 0.5s ease-in-out infinite;
        }
      </style>
      <div class="pulse-container">
        <slot></slot>
      </div>
    `;

    this.updateUrgency();
  }
}

customElements.define('pulse-container', PulseContainer);
