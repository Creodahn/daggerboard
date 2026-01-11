import ExtendedHtmlElement from '../../base/extended-html-element.js';

/**
 * A vertical stack list container with consistent gap spacing.
 *
 * Usage:
 *   <stack-list>
 *     <div>Item 1</div>
 *     <div>Item 2</div>
 *   </stack-list>
 *
 * Attributes:
 *   - gap: 'none' | 'small' | 'medium' (default) | 'large'
 *   - scrollable: Makes the list scrollable with max-height
 *   - max-height: Custom max height when scrollable (default: 350px)
 */
class StackList extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['gap', 'scrollable', 'max-height'];

  #list;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#list = this.$('.stack-list');
    this.updateList();
  }

  attributeChangedCallback() {
    if (this.#list) {
      this.updateList();
    }
  }

  updateList() {
    if (!this.#list) return;

    const gap = this.getStringAttr('gap', 'medium');
    const scrollable = this.getBoolAttr('scrollable');
    const maxHeight = this.getStringAttr('max-height', '350px');

    this.#list.className = `stack-list gap-${gap} ${scrollable ? 'scrollable' : ''}`;
    this.#list.style.maxHeight = scrollable ? maxHeight : '';
  }
}

customElements.define('stack-list', StackList);
