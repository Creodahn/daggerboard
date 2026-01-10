/**
 * A container component that can flash with visual feedback.
 * Used for indicating state changes like healing or damage.
 *
 * Usage:
 *   <flash-container id="entity-1">
 *     <div>Entity content</div>
 *   </flash-container>
 *
 *   // Trigger flash programmatically:
 *   document.querySelector('#entity-1').flash('heal');
 *   document.querySelector('#entity-1').flash('damage');
 *
 * Attributes:
 *   - flash-type: 'heal' | 'damage' | 'success' | 'error' (can be set to auto-flash on connect)
 *
 * Methods:
 *   - flash(type): Trigger a flash animation
 */
class FlashContainer extends HTMLElement {
  static observedAttributes = ['flash-type'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();

    // Auto-flash if flash-type is set
    const flashType = this.getAttribute('flash-type');
    if (flashType) {
      this.flash(flashType);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'flash-type' && newValue && newValue !== oldValue) {
      this.flash(newValue);
    }
  }

  /**
   * Trigger a flash animation.
   * @param {'heal' | 'damage' | 'success' | 'error'} type - Type of flash
   */
  flash(type) {
    const container = this.shadowRoot?.querySelector('.flash-container');
    if (!container) return;

    // Map type to class
    const classMap = {
      heal: 'flash-heal',
      damage: 'flash-damage',
      success: 'flash-heal',
      error: 'flash-damage'
    };

    const flashClass = classMap[type] || 'flash-heal';

    // Remove any existing flash classes
    container.classList.remove('flash-heal', 'flash-damage');

    // Force reflow to restart animation
    void container.offsetWidth;

    // Add the flash class
    container.classList.add(flashClass);

    // Remove class after animation completes
    container.addEventListener('animationend', () => {
      container.classList.remove(flashClass);
      this.removeAttribute('flash-type');
    }, { once: true });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .flash-container {
          position: relative;
        }

        @keyframes flash-heal {
          0% {
            background-color: transparent;
            box-shadow: none;
          }
          15% {
            background-color: rgba(40, 167, 69, 0.5);
            box-shadow: 0 0 20px rgba(40, 167, 69, 0.8), inset 0 0 15px rgba(40, 167, 69, 0.3);
          }
          100% {
            background-color: transparent;
            box-shadow: none;
          }
        }

        @keyframes flash-damage {
          0% {
            background-color: transparent;
            box-shadow: none;
          }
          15% {
            background-color: rgba(220, 53, 69, 0.5);
            box-shadow: 0 0 20px rgba(220, 53, 69, 0.8), inset 0 0 15px rgba(220, 53, 69, 0.3);
          }
          100% {
            background-color: transparent;
            box-shadow: none;
          }
        }

        .flash-container.flash-heal {
          animation: flash-heal 0.75s ease-out forwards;
        }

        .flash-container.flash-damage {
          animation: flash-damage 0.75s ease-out forwards;
        }
      </style>
      <div class="flash-container">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('flash-container', FlashContainer);
