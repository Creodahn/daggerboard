import ExtendedHtmlElement from '../../base/extended-html-element.js';

/**
 * A flexible column layout component with configurable alignment and spacing.
 *
 * Usage:
 *   <flex-column>content</flex-column>
 *   <flex-column align="center" gap="md">content</flex-column>
 *   <flex-column justify="space-between" stretch>content</flex-column>
 *
 * Attributes:
 *   - justify: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly' (default: 'start')
 *   - align: 'start' | 'center' | 'end' | 'stretch' (default: 'stretch')
 *   - gap: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default: 'none')
 *   - stretch: boolean - whether to fill available height (default: false)
 *
 * Note: For scrollable vertical lists, consider using <stack-list scrollable> instead.
 */
class FlexColumn extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['justify', 'align', 'gap', 'stretch'];

  stylesPath = './styles.css';
  templatePath = './template.html';

  #container;

  setup() {
    this.#container = this.$('.flex-column');
    this.updateLayout();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.isSetup && oldValue !== newValue) {
      this.updateLayout();
    }
  }

  updateLayout() {
    if (!this.#container) return;

    const justify = this.getStringAttr('justify', 'start');
    const align = this.getStringAttr('align', 'stretch');
    const gap = this.getStringAttr('gap', 'none');
    const stretch = this.getBoolAttr('stretch');

    // Reset classes
    this.#container.className = 'flex-column';

    // Add modifier classes
    this.#container.classList.add(`justify-${justify}`);
    this.#container.classList.add(`align-${align}`);
    this.#container.classList.add(`gap-${gap}`);

    if (stretch) this.#container.classList.add('stretch');
  }
}

customElements.define('flex-column', FlexColumn);
