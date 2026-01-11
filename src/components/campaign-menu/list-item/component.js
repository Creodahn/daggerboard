import ExtendedHtmlElement from '../../extended-html-element.js';

/**
 * A campaign list item for the campaign menu.
 * Displays campaign name with selection and delete functionality.
 *
 * Usage:
 *   <campaign-list-item
 *     campaign-id="abc123"
 *     name="My Campaign"
 *     current
 *   ></campaign-list-item>
 *
 * Attributes:
 *   - campaign-id: The campaign's unique ID
 *   - name: Campaign name to display
 *   - current: If present, marks this as the current campaign (not selectable)
 *
 * Events:
 *   - campaign-select: { id } - Fired when campaign is clicked (non-current only)
 *   - campaign-delete: { id, name } - Fired when delete button is clicked
 */
class CampaignListItem extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['campaign-id', 'name', 'current'];

  #nameEl;
  #deleteBtn;
  #currentIndicator;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#nameEl = this.$('.campaign-item-name');
    this.#deleteBtn = this.$('.delete-campaign-btn');
    this.#currentIndicator = this.$('.current-indicator');

    this.updateDisplay();

    // Click on name to select (only if not current)
    this.#nameEl.addEventListener('click', () => {
      if (!this.getBoolAttr('current')) {
        this.emit('campaign-select', { id: this.getStringAttr('campaign-id') });
      }
    });

    // Delete button
    this.#deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.emit('campaign-delete', {
        id: this.getStringAttr('campaign-id'),
        name: this.getStringAttr('name')
      });
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.isSetup && oldValue !== newValue) {
      this.updateDisplay();
    }
  }

  updateDisplay() {
    const name = this.getStringAttr('name', '');
    const isCurrent = this.getBoolAttr('current');

    this.#nameEl.textContent = name;
    this.#nameEl.classList.toggle('selectable', !isCurrent);
    this.#currentIndicator.style.display = isCurrent ? '' : 'none';
    this.#deleteBtn.style.display = isCurrent ? 'none' : '';
  }
}

customElements.define('campaign-list-item', CampaignListItem);
