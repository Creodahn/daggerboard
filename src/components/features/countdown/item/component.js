import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import '../../../layout/flex-row/component.js';

/**
 * A component for rendering a single countdown tracker item.
 *
 * Usage:
 *   const item = document.createElement('countdown-item');
 *   item.tracker = trackerData;
 *
 * Events:
 *   - value-change: { id, delta } - When counter is incremented/decremented
 *   - visibility-change: { id, visible } - When visibility toggle changes
 *   - name-visibility-change: { id, hidden } - When hide name toggle changes
 *   - delete: { id, name } - When tracker is deleted (after fade-out)
 */
class CountdownItem extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #tracker = null;
  #hasRendered = false;
  stylesPath = './styles.css';
  templatePath = './template.html';

  set tracker(value) {
    const oldTracker = this.#tracker;
    this.#tracker = value;

    if (this.isSetup) {
      if (this.#hasRendered && oldTracker?.id === value?.id) {
        // Same tracker, just update values without re-rendering
        this.updateValues();
      } else {
        // Different tracker or first render
        this.render();
      }
    }
  }

  get tracker() {
    return this.#tracker;
  }

  async setup() {
    // Attach delegated event listeners (setup is only called once)
    this.shadowRoot.addEventListener('counter-change', e => {
      e.stopPropagation();
      this.emit('value-change', { id: this.#tracker.id, delta: e.detail.delta });
    });

    this.shadowRoot.addEventListener('visibility-change', e => {
      e.stopPropagation();
      this.emit('visibility-change', { id: e.detail.entityId, visible: e.detail.checked });
    });

    // Hide name toggle - only handle toggle-change from hide-name switch
    this.shadowRoot.addEventListener('toggle-change', e => {
      if (e.target.closest('visibility-toggle')) return;
      e.stopPropagation();
      this.emit('name-visibility-change', { id: this.#tracker.id, hidden: e.detail.checked });
    });

    this.shadowRoot.addEventListener('delete-confirmed', async e => {
      e.stopPropagation();
      const container = this.$('card-container');
      await container.fadeOut();
      this.emit('delete', { id: e.detail.id, name: e.detail.name });
    });

    if (this.#tracker) {
      this.render();
    }
  }

  updateValues() {
    if (!this.#tracker) return;

    const tracker = this.#tracker;
    const container = this.$('card-container');
    if (!container) return;

    // Update counter control value
    const counter = container.querySelector('counter-control');
    if (counter) {
      counter.setAttribute('value', tracker.current);
    }

    // Update visibility toggle
    const visibilityToggle = container.querySelector('visibility-toggle');
    if (visibilityToggle) {
      visibilityToggle.checked = tracker.visible_to_players;
    }

    // Update hide name toggle
    const hideNameToggle = container.querySelector('toggle-switch[name="hide-name"]');
    if (hideNameToggle) {
      hideNameToggle.checked = tracker.hide_name_from_players;
    }

    // Update current label
    const isComplex = tracker.tracker_type === 'complex';
    const currentLabel =
      isComplex && tracker.tick_labels?.[tracker.current]
        ? tracker.tick_labels[tracker.current]
        : null;

    let labelEl = container.querySelector('.current-label');
    if (currentLabel) {
      if (labelEl) {
        labelEl.textContent = currentLabel;
      } else {
        labelEl = document.createElement('div');
        labelEl.className = 'current-label';
        labelEl.textContent = currentLabel;
        container.appendChild(labelEl);
      }
    } else if (labelEl) {
      labelEl.remove();
    }
  }

  render() {
    if (!this.#tracker) return;

    const tracker = this.#tracker;
    const container = this.$('card-container');
    if (!container) return;

    const isComplex = tracker.tracker_type === 'complex';
    const currentLabel =
      isComplex && tracker.tick_labels?.[tracker.current]
        ? tracker.tick_labels[tracker.current]
        : null;

    container.setAttribute('data-tracker-id', tracker.id);
    container.innerHTML = `
      <flex-row justify="space-between" align="center" gap="lg" class="tracker-header">
        <flex-row align="center" gap="md" class="tracker-info">
          <h4>${tracker.name}</h4>
          <type-badge type="${tracker.tracker_type}" label="${tracker.tracker_type.toUpperCase()}"></type-badge>
        </flex-row>
        <flex-row align="center" gap="sm" class="tracker-actions">
          <counter-control value="${tracker.current}" min="0" max="${tracker.max}" show-max="${tracker.max}"></counter-control>
          <dropdown-menu>
            <dropdown-menu-item slot="content" keep-open>
              <visibility-toggle entity-id="${tracker.id}" ${tracker.visible_to_players ? 'checked' : ''} compact></visibility-toggle>
            </dropdown-menu-item>
            <dropdown-menu-item slot="content" keep-open>
              <toggle-switch name="hide-name" label="🙈 Hide Name from Players" ${tracker.hide_name_from_players ? 'checked' : ''} label-first></toggle-switch>
            </dropdown-menu-item>
            <dropdown-menu-item slot="content" variant="delete" keep-open>
              <delete-trigger item-name="${tracker.name}" item-id="${tracker.id}">
                <span slot="trigger">🗑️ Delete Tracker</span>
              </delete-trigger>
            </dropdown-menu-item>
          </dropdown-menu>
        </flex-row>
      </flex-row>
      ${currentLabel ? `<div class="current-label">${currentLabel}</div>` : ''}
    `;

    this.#hasRendered = true;
  }
}

customElements.define('countdown-item', CountdownItem);
