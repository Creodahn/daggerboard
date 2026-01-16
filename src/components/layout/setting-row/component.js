import ExtendedHtmlElement from '../../base/extended-html-element.js';

/**
 * A setting/option row with label, description, and control slot.
 *
 * Usage:
 *   <setting-row label="Option Name" description="Description text">
 *     <toggle-switch></toggle-switch>
 *   </setting-row>
 *
 * Attributes:
 *   - label: The setting label text
 *   - description: Optional description text
 *   - separator: Show bottom border separator (default: true for non-last items)
 *
 * Slots:
 *   - default: The control element (toggle, input, button, etc.)
 */
class SettingRow extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['label', 'description'];

  stylesPath = './styles.css';
  templatePath = './template.html';

  #labelEl;
  #descriptionEl;

  setup() {
    this.#labelEl = this.$('.setting-label');
    this.#descriptionEl = this.$('.setting-description');
    this.updateContent();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.isSetup && oldValue !== newValue) {
      this.updateContent();
    }
  }

  updateContent() {
    const label = this.getStringAttr('label');
    const description = this.getStringAttr('description');

    if (this.#labelEl) {
      this.#labelEl.textContent = label;
    }

    if (this.#descriptionEl) {
      this.#descriptionEl.textContent = description;
      this.#descriptionEl.style.display = description ? '' : 'none';
    }
  }
}

customElements.define('setting-row', SettingRow);
