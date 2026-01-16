import ExtendedHtmlElement from '../../base/extended-html-element.js';

/**
 * A two-panel layout with a fixed-width sidebar and flexible content area.
 *
 * Usage:
 *   <split-panel sidebar-width="280">
 *     <div slot="sidebar">Sidebar content</div>
 *     <div slot="content">Main content</div>
 *   </split-panel>
 *
 * Attributes:
 *   - sidebar-width: Width of sidebar in pixels (default: 280)
 *   - sidebar-position: 'left' | 'right' (default: 'left')
 *   - gap: 'none' | 'sm' | 'md' | 'lg' (default: 'none')
 *   - divider: Show border between panels (default: true)
 *
 * Slots:
 *   - sidebar: Content for the fixed-width panel
 *   - content: Content for the flexible panel
 */
class SplitPanel extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['sidebar-width', 'sidebar-position', 'gap', 'divider'];

  stylesPath = './styles.css';
  templatePath = './template.html';

  #container;
  #sidebar;

  setup() {
    this.#container = this.$('.split-panel');
    this.#sidebar = this.$('.sidebar');
    this.updateLayout();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.isSetup && oldValue !== newValue) {
      this.updateLayout();
    }
  }

  updateLayout() {
    if (!this.#container || !this.#sidebar) return;

    const width = this.getStringAttr('sidebar-width', '280');
    const position = this.getStringAttr('sidebar-position', 'left');
    const gap = this.getStringAttr('gap', 'none');
    const divider = !this.getBoolAttr('no-divider');

    // Set sidebar width
    this.#sidebar.style.width = `${width}px`;
    this.#sidebar.style.minWidth = `${width}px`;

    // Reset classes
    this.#container.className = 'split-panel';

    // Add modifier classes
    if (position === 'right') {
      this.#container.classList.add('sidebar-right');
    }

    this.#container.classList.add(`gap-${gap}`);

    if (divider) {
      this.#container.classList.add('has-divider');
    }
  }
}

customElements.define('split-panel', SplitPanel);
