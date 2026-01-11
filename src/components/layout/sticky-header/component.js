import ExtendedHtmlElement from '../../base/extended-html-element.js';

/**
 * A sticky header component for page layouts.
 *
 * Usage:
 *   <sticky-header title="Page Title">
 *     <fear-tracker slot="controls" inline></fear-tracker>
 *     <campaign-menu slot="controls"></campaign-menu>
 *   </sticky-header>
 *
 * Attributes:
 *   - title: The header title text
 *
 * Slots:
 *   - controls: Elements to display in the header controls area (right side)
 */
class StickyHeader extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['title'];

  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.updateTitle();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.isSetup && name === 'title' && oldValue !== newValue) {
      this.updateTitle();
    }
  }

  updateTitle() {
    const titleEl = this.$('.header-title');
    if (titleEl) {
      titleEl.textContent = this.getStringAttr('title', '');
    }
  }
}

customElements.define('sticky-header', StickyHeader);
