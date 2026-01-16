import ExtendedHtmlElement from '../../base/extended-html-element.js';

/**
 * A reusable loading spinner component.
 *
 * Attributes:
 *   - size: "small" (12px), "medium" (16px, default), "large" (24px)
 *   - color: CSS color value (defaults to current text color)
 *
 * Usage:
 *   <loading-spinner></loading-spinner>
 *   <loading-spinner size="small"></loading-spinner>
 *   <loading-spinner size="large" color="var(--color-primary)"></loading-spinner>
 */
export default class LoadingSpinner extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  stylesPath = './styles.css';
  templatePath = './template.html';

  static get observedAttributes() {
    return ['size', 'color'];
  }

  attributeChangedCallback() {
    if (this.isSetup) {
      this.updateStyles();
    }
  }

  setup() {
    this.updateStyles();
  }

  updateStyles() {
    const spinner = this.$('.spinner');
    if (!spinner) return;

    const color = this.getAttribute('color');
    if (color) {
      spinner.style.borderTopColor = color;
    } else {
      spinner.style.borderTopColor = '';
    }
  }
}

customElements.define('loading-spinner', LoadingSpinner);
