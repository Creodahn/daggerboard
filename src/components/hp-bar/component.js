import ExtendedHtmlElement from '../extended-html-element.js';
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
class HpBar extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['current', 'max', 'show-text', 'compact'];

  #container;
  #bar;
  #text;
  stylesPath = './styles.css';
  templatePath = './template.html';

  get current() {
    return this.getIntAttr('current', 0);
  }

  set current(value) {
    this.setAttribute('current', value);
  }

  get max() {
    return this.getIntAttr('max', 1);
  }

  set max(value) {
    this.setAttribute('max', value);
  }

  setup() {
    this.#container = this.$('.hp-bar-container');
    this.#bar = this.$('.hp-bar');
    this.#text = this.$('.hp-text');

    this.update();
  }

  attributeChangedCallback() {
    if (this.#container) {
      this.update();
    }
  }

  update() {
    const current = this.current;
    const max = this.max;
    const showText = this.getBoolAttr('show-text');

    const percentage = getHealthPercentage(current, max);
    const healthClass = getHealthBarClass(percentage);

    // Update container dead state
    this.#container.classList.toggle('dead-state', healthClass === 'dead');

    // Update bar
    this.#bar.className = `hp-bar ${healthClass}`;
    this.#bar.style.width = `${percentage}%`;

    // Update text
    this.#text.textContent = showText ? `${current} / ${max} HP` : '';
    this.#text.style.display = showText ? '' : 'none';
  }
}

customElements.define('hp-bar', HpBar);
