import ExtendedHtmlElement from '../../../base/extended-html-element.js';

/**
 * Visual representation of a die with appropriate shape and color.
 *
 * Usage:
 *   <die-shape sides="20"></die-shape>
 *   <die-shape sides="6" result="4"></die-shape>
 *   <die-shape sides="6" style="--die-size: 36px"></die-shape>
 *
 * Attributes:
 *   - sides: Number of sides (4, 6, 8, 10, 12, 20, 100)
 *   - result: Optional custom label (e.g., the roll result) - overrides default label
 */
class DieShape extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['sides', 'result'];

  stylesPath = './styles.css';
  templatePath = './template.html';

  #label;

  async setup() {
    this.#label = this.$('.die-label');
    this.updateLabel();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if ((name === 'sides' || name === 'result') && this.#label) {
      this.updateLabel();
    }
  }

  updateLabel() {
    const result = this.getAttribute('result');
    if (result !== null) {
      // Show roll result
      this.#label.textContent = result;
    } else {
      // Show default die label
      const sides = this.getAttribute('sides');
      this.#label.textContent = sides === '100' ? '%' : sides;
    }
  }

  get sides() {
    return parseInt(this.getAttribute('sides'), 10);
  }

  set sides(value) {
    this.setAttribute('sides', value);
  }

  get result() {
    const val = this.getAttribute('result');
    return val !== null ? parseInt(val, 10) : null;
  }

  set result(value) {
    if (value !== null) {
      this.setAttribute('result', value);
    } else {
      this.removeAttribute('result');
    }
  }
}

customElements.define('die-shape', DieShape);
