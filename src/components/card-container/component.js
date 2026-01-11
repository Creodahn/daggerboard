import ExtendedHtmlElement from '../extended-html-element.js';

/**
 * A reusable card container component with consistent styling.
 * Provides a white card with border, padding, and optional fade-out animation.
 *
 * Usage:
 *   <card-container>
 *     <div>Card content</div>
 *   </card-container>
 *
 * Attributes:
 *   - variant: 'default' | 'elevated' | 'flat'
 *   - padding: 'none' | 'small' | 'medium' (default) | 'large'
 *
 * Methods:
 *   - fadeOut(): Triggers fade-out animation and returns a promise that resolves when complete
 */
class CardContainer extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['variant', 'padding'];

  #card;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#card = this.$('.card');
    this.updateCard();
  }

  attributeChangedCallback() {
    if (this.#card) {
      this.updateCard();
    }
  }

  updateCard() {
    if (!this.#card) return;

    const variant = this.getStringAttr('variant', 'default');
    const padding = this.getStringAttr('padding', 'medium');

    this.#card.className = `card variant-${variant} padding-${padding}`;
  }

  /**
   * Trigger fade-out animation.
   * @returns {Promise<void>} Resolves when animation completes
   */
  fadeOut() {
    return new Promise(resolve => {
      if (!this.#card) {
        resolve();
        return;
      }

      this.#card.classList.add('fade-out');
      this.#card.addEventListener('animationend', () => {
        resolve();
      }, { once: true });
    });
  }
}

customElements.define('card-container', CardContainer);
