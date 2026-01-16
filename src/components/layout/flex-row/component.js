import ExtendedHtmlElement from '../../base/extended-html-element.js';

/**
 * A flexible row layout component with configurable alignment and spacing.
 *
 * Usage:
 *   <flex-row>content</flex-row>
 *   <flex-row justify="space-between" align="center" gap="md">content</flex-row>
 *   <flex-row wrap>wrapping content</flex-row>
 *
 * Attributes:
 *   - justify: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly' (default: 'start')
 *   - align: 'start' | 'center' | 'end' | 'stretch' | 'baseline' (default: 'stretch')
 *   - gap: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default: 'none')
 *   - wrap: boolean - whether items should wrap (default: false)
 *   - inline: boolean - use inline-flex instead of flex (default: false)
 */
class FlexRow extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['justify', 'align', 'gap', 'wrap', 'inline'];

  stylesPath = './styles.css';
  templatePath = './template.html';

  #container;

  setup() {
    this.#container = this.$('.flex-row');
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
    const wrap = this.getBoolAttr('wrap');
    const inline = this.getBoolAttr('inline');

    // Reset classes
    this.#container.className = 'flex-row';

    // Add modifier classes
    this.#container.classList.add(`justify-${justify}`);
    this.#container.classList.add(`align-${align}`);
    this.#container.classList.add(`gap-${gap}`);

    if (wrap) this.#container.classList.add('wrap');
    if (inline) this.#container.classList.add('inline');
  }
}

customElements.define('flex-row', FlexRow);
