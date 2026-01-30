import ExtendedHtmlElement from '../../base/extended-html-element.js';
import '../collapse-toggle/component.js';

/**
 * A collapsible section with header and animated content area.
 *
 * Usage:
 *   <collapsible-section label="Section Title">
 *     <p>Content goes here</p>
 *   </collapsible-section>
 *
 *   <collapsible-section label="Initially Expanded" expanded>
 *     <p>This starts open</p>
 *   </collapsible-section>
 *
 * Attributes:
 *   - label: The section header text
 *   - expanded: Whether the section starts expanded
 *   - size: Size of the collapse toggle ('small' | 'medium' | 'large')
 *
 * Events:
 *   - section-toggle: { expanded: boolean } - When the section is toggled
 */
class CollapsibleSection extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['label', 'expanded'];

  #toggle;
  #labelEl;
  #content;
  stylesPath = './styles.css';
  templatePath = './template.html';

  get expanded() {
    return this.getBoolAttr('expanded');
  }

  set expanded(value) {
    if (value) {
      this.setAttribute('expanded', '');
    } else {
      this.removeAttribute('expanded');
    }
    this.updateExpandedState();
  }

  get label() {
    return this.getAttribute('label') || '';
  }

  set label(value) {
    this.setAttribute('label', value || '');
  }

  async setup() {
    this.#toggle = this.$('collapse-toggle');
    this.#labelEl = this.$('.section-label');
    this.#content = this.$('.section-content');

    // Set initial label
    this.#labelEl.textContent = this.label;

    // Set toggle size if specified
    const size = this.getAttribute('size');
    if (size) {
      this.#toggle.setAttribute('size', size);
    }

    // Sync toggle with expanded state
    this.#toggle.expanded = this.expanded;
    this.updateExpandedState();

    // Handle toggle clicks
    this.#toggle.addEventListener('collapse-toggle', (e) => {
      this.expanded = e.detail.expanded;
      this.emit('section-toggle', { expanded: this.expanded });
    });

    // Allow clicking on header to toggle
    this.$('.section-header').addEventListener('click', (e) => {
      if (e.target.closest('collapse-toggle')) return;
      this.expanded = !this.expanded;
      this.#toggle.expanded = this.expanded;
      this.emit('section-toggle', { expanded: this.expanded });
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isSetup) return;

    if (name === 'label' && this.#labelEl) {
      this.#labelEl.textContent = newValue || '';
    }
    if (name === 'expanded') {
      this.#toggle.expanded = this.expanded;
      this.updateExpandedState();
    }
  }

  updateExpandedState() {
    if (!this.#content) return;
    this.#content.classList.toggle('collapsed', !this.expanded);
  }
}

customElements.define('collapsible-section', CollapsibleSection);
