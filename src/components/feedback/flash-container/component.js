import ExtendedHtmlElement from '../../base/extended-html-element.js';

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
class FlashContainer extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['flash-type'];

  #overlay;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#overlay = this.$('.flash-overlay');

    // Auto-flash if flash-type is set
    const flashType = this.getStringAttr('flash-type');
    if (flashType) {
      this.flash(flashType);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'flash-type' && newValue && newValue !== oldValue && this.#overlay) {
      this.flash(newValue);
    }
  }

  /**
   * Trigger a flash animation.
   * @param {'heal' | 'damage' | 'success' | 'error'} type - Type of flash
   */
  flash(type) {
    if (!this.#overlay) return;

    // Map type to class
    const classMap = {
      heal: 'flash-heal',
      damage: 'flash-damage',
      success: 'flash-heal',
      error: 'flash-damage'
    };

    const flashClass = classMap[type] || 'flash-heal';

    // Remove any existing flash classes
    this.#overlay.classList.remove('flash-heal', 'flash-damage');

    // Force reflow to restart animation
    void this.#overlay.offsetWidth;

    // Add the flash class
    this.#overlay.classList.add(flashClass);

    // Remove class after animation completes
    this.#overlay.addEventListener('animationend', () => {
      this.#overlay.classList.remove(flashClass);
      this.removeAttribute('flash-type');
    }, { once: true });
  }
}

customElements.define('flash-container', FlashContainer);
