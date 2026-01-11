import ExtendedHtmlElement from '../../base/extended-html-element.js';

/**
 * A panel section container with consistent styling.
 * Used for grouping related content with a gray background.
 *
 * Usage:
 *   <panel-section>
 *     <section-header slot="header" title="My Section"></section-header>
 *     <div>Content goes here</div>
 *   </panel-section>
 *
 * Attributes:
 *   - variant: 'default' | 'flush' (no padding)
 *   - padding: 'small' | 'medium' (default) | 'large'
 */
class PanelSection extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['variant', 'padding'];

  #panel;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#panel = this.$('.panel-section');
    this.updatePanel();
  }

  attributeChangedCallback() {
    if (this.#panel) {
      this.updatePanel();
    }
  }

  updatePanel() {
    if (!this.#panel) return;

    const variant = this.getStringAttr('variant', 'default');
    const padding = this.getStringAttr('padding', 'medium');

    this.#panel.className = `panel-section padding-${padding} variant-${variant}`;
  }
}

customElements.define('panel-section', PanelSection);
