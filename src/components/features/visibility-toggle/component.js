import ExtendedHtmlElement from '../../base/extended-html-element.js';

/**
 * A reusable visibility toggle component for controlling player visibility.
 * Wraps the toggle-switch component with visibility-specific styling.
 *
 * Usage:
 *   <visibility-toggle checked></visibility-toggle>
 *   <visibility-toggle label="Show to Players"></visibility-toggle>
 *
 * Attributes:
 *   - checked: Whether the item is visible to players
 *   - label: Custom label text (default: "Visible to Players")
 *   - name: Form field name
 *   - entity-id: Optional ID to include in events
 *   - compact: Smaller styling for menu contexts
 *
 * Events:
 *   - visibility-change: { checked: boolean, entityId?: string }
 */
class VisibilityToggle extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['checked', 'label', 'name', 'entity-id', 'compact'];

  #toggleSwitch;
  stylesPath = './styles.css';
  templatePath = './template.html';

  get checked() {
    return this.#toggleSwitch?.checked ?? this.getBoolAttr('checked');
  }

  set checked(value) {
    if (this.#toggleSwitch) {
      this.#toggleSwitch.checked = Boolean(value);
    }
    if (value) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
  }

  get value() {
    return this.checked;
  }

  async setup() {
    this.#toggleSwitch = this.$('toggle-switch');

    // Wait for the child component to be ready
    await this.#toggleSwitch.ready;

    // Set initial attributes
    const label = this.getStringAttr('label', 'Visible to Players');
    const name = this.getStringAttr('name', 'visible');

    this.#toggleSwitch.setAttribute('name', name);
    this.#toggleSwitch.setAttribute('label', `👁️ ${label}`);

    if (this.getBoolAttr('compact')) {
      this.#toggleSwitch.setAttribute('compact', '');
    }

    // Sync initial checked state
    if (this.getBoolAttr('checked')) {
      this.#toggleSwitch.checked = true;
    }

    this.#toggleSwitch.addEventListener('toggle-change', e => {
      if (e.detail.checked) {
        this.setAttribute('checked', '');
      } else {
        this.removeAttribute('checked');
      }

      const detail = {
        checked: e.detail.checked,
        name: this.getStringAttr('name')
      };

      // Include entity ID if provided
      const entityId = this.getStringAttr('entity-id');
      if (entityId) {
        detail.entityId = entityId;
      }

      this.emit('visibility-change', detail);
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.#toggleSwitch) return;

    if (name === 'checked') {
      this.#toggleSwitch.checked = newValue !== null;
    }
    if (name === 'label') {
      this.#toggleSwitch.setAttribute('label', `👁️ ${newValue || 'Visible to Players'}`);
    }
    if (name === 'compact') {
      if (newValue !== null) {
        this.#toggleSwitch.setAttribute('compact', '');
      } else {
        this.#toggleSwitch.removeAttribute('compact');
      }
    }
  }
}

customElements.define('visibility-toggle', VisibilityToggle);
