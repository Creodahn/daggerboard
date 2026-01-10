/**
 * A wrapper component that provides fade-out animation for its content.
 *
 * Usage:
 *   <fade-wrapper id="item-1">
 *     <div>Content to fade</div>
 *   </fade-wrapper>
 *
 *   // Trigger fade-out programmatically:
 *   const wrapper = document.querySelector('#item-1');
 *   await wrapper.fadeOut();
 *   wrapper.remove();
 *
 * Methods:
 *   - fadeOut(): Returns a promise that resolves when animation completes
 */
class FadeWrapper extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  /**
   * Trigger fade-out animation.
   * @returns {Promise<void>} Resolves when animation completes
   */
  fadeOut() {
    return new Promise(resolve => {
      const container = this.shadowRoot.querySelector('.fade-wrapper');
      if (!container) {
        resolve();
        return;
      }

      container.classList.add('fading');
      container.addEventListener('animationend', () => {
        resolve();
      }, { once: true });
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .fade-wrapper {
          transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        }

        @keyframes fade-out-left {
          0% {
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-20px);
          }
        }

        .fade-wrapper.fading {
          animation: fade-out-left 0.3s ease-out forwards;
          pointer-events: none;
        }
      </style>
      <div class="fade-wrapper">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('fade-wrapper', FadeWrapper);
