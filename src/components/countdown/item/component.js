import ExtendedHtmlElement from '../../extended-html-element.js';

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
  #isReady = false;
  stylesPath = './styles.css';
  templatePath = './template.html';

  set tracker(value) {
    this.#tracker = value;
    if (this.#isReady) {
      this.render();
    }
  }

  get tracker() {
    return this.#tracker;
  }

  async setup() {
    this.#isReady = true;
    if (this.#tracker) {
      this.render();
    }
  }

  render() {
    if (!this.#tracker) return;

    const tracker = this.#tracker;
    const container = this.shadowRoot.querySelector('card-container');
    if (!container) return;

    const isComplex = tracker.tracker_type === 'complex';
    const currentLabel = isComplex && tracker.tick_labels?.[tracker.current]
      ? tracker.tick_labels[tracker.current]
      : null;

    container.setAttribute('data-tracker-id', tracker.id);
    container.innerHTML = `
      <div class="tracker-header">
        <h4>${tracker.name}</h4>
        <type-badge type="${tracker.tracker_type}" label="${tracker.tracker_type.toUpperCase()}"></type-badge>
      </div>
      <stack-list gap="small" class="tracker-controls">
        <counter-control value="${tracker.current}" min="0" max="${tracker.max}" show-max="${tracker.max}"></counter-control>
        <visibility-toggle entity-id="${tracker.id}" ${tracker.visible_to_players ? 'checked' : ''}></visibility-toggle>
        <toggle-switch name="hide-name" label="🙈 Hide Name from Players" ${tracker.hide_name_from_players ? 'checked' : ''} label-first></toggle-switch>
      </stack-list>
      ${currentLabel ? `<div class="current-label">${currentLabel}</div>` : ''}
      <div class="delete-section">
        <delete-trigger item-name="${tracker.name}" item-id="${tracker.id}"></delete-trigger>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const container = this.shadowRoot.querySelector('card-container');
    if (!container) return;

    // Counter control
    this.shadowRoot.addEventListener('counter-change', e => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('value-change', {
        bubbles: true,
        composed: true,
        detail: { id: this.#tracker.id, delta: e.detail.delta }
      }));
    });

    // Visibility toggle
    this.shadowRoot.addEventListener('visibility-change', e => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('visibility-change', {
        bubbles: true,
        composed: true,
        detail: { id: e.detail.entityId, visible: e.detail.checked }
      }));
    });

    // Hide name toggle - only handle toggle-change from hide-name switch
    this.shadowRoot.addEventListener('toggle-change', e => {
      // Only handle if it's from the hide-name toggle, not visibility-toggle's internal toggle
      if (e.target.closest('visibility-toggle')) return;
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('name-visibility-change', {
        bubbles: true,
        composed: true,
        detail: { id: this.#tracker.id, hidden: e.detail.checked }
      }));
    });

    // Delete trigger
    this.shadowRoot.addEventListener('delete-confirmed', async e => {
      e.stopPropagation();
      await container.fadeOut();
      this.dispatchEvent(new CustomEvent('delete', {
        bubbles: true,
        composed: true,
        detail: { id: e.detail.id, name: e.detail.name }
      }));
    });
  }
}

customElements.define('countdown-item', CountdownItem);
