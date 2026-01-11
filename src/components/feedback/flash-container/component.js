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

  #container;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#container = this.$('.flash-container');

    // Auto-flash if flash-type is set
    const flashType = this.getStringAttr('flash-type');
    if (flashType) {
      this.flash(flashType);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'flash-type' && newValue && newValue !== oldValue && this.#container) {
      this.flash(newValue);
    }
  }

  /**
   * Trigger a flash animation.
   * @param {'heal' | 'damage' | 'success' | 'error'} type - Type of flash
   */
  flash(type) {
    if (!this.#container) return;

    // Map type to class
    const classMap = {
      heal: 'flash-heal',
      damage: 'flash-damage',
      success: 'flash-heal',
      error: 'flash-damage'
    };

    const flashClass = classMap[type] || 'flash-heal';

    // Remove any existing flash classes
    this.#container.classList.remove('flash-heal', 'flash-damage');

    // Force reflow to restart animation
    void this.#container.offsetWidth;

    // Add the flash class
    this.#container.classList.add(flashClass);

    // Remove class after animation completes
    this.#container.addEventListener('animationend', () => {
      this.#container.classList.remove(flashClass);
      this.removeAttribute('flash-type');
    }, { once: true });
  }
}

customElements.define('flash-container', FlashContainer);
