import ExtendedHtmlElement from '../extended-html-element.js';

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
class FadeWrapper extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;

  #container;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#container = this.$('.fade-wrapper');
  }

  /**
   * Trigger fade-out animation.
   * @returns {Promise<void>} Resolves when animation completes
   */
  fadeOut() {
    return new Promise(resolve => {
      if (!this.#container) {
        resolve();
        return;
      }

      this.#container.classList.add('fading');
      this.#container.addEventListener('animationend', () => {
        resolve();
      }, { once: true });
    });
  }
}

customElements.define('fade-wrapper', FadeWrapper);
