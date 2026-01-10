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
class VisibilityToggle extends HTMLElement {
  static observedAttributes = ['checked', 'label', 'name', 'entity-id'];

  #toggleSwitch;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  get checked() {
    return this.#toggleSwitch?.checked ?? this.hasAttribute('checked');
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

  connectedCallback() {
    this.render();
    this.#toggleSwitch = this.shadowRoot.querySelector('toggle-switch');

    // Sync initial checked state
    if (this.hasAttribute('checked')) {
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
        name: this.getAttribute('name')
      };

      // Include entity ID if provided
      const entityId = this.getAttribute('entity-id');
      if (entityId) {
        detail.entityId = entityId;
      }

      this.dispatchEvent(new CustomEvent('visibility-change', {
        bubbles: true,
        composed: true,
        detail
      }));
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.#toggleSwitch) return;

    if (name === 'checked') {
      this.#toggleSwitch.checked = newValue !== null;
    }
    if (name === 'label') {
      this.#toggleSwitch.setAttribute('label', newValue || 'Visible to Players');
    }
  }

  render() {
    const label = this.getAttribute('label') || 'Visible to Players';
    const name = this.getAttribute('name') || 'visible';
    const isChecked = this.hasAttribute('checked');
    const isCompact = this.hasAttribute('compact');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
        }
      </style>
      <toggle-switch
        name="${name}"
        label="👁️ ${label}"
        ${isChecked ? 'checked' : ''}
        ${isCompact ? 'compact' : ''}
        label-first
      ></toggle-switch>
    `;
  }
}

customElements.define('visibility-toggle', VisibilityToggle);
