import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import '../../../layout/flex-row/component.js';
import createWindow from '../../../../helpers/create-window.js';

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
  #timerInterval = null;
  #isRunning = false;
  stylesPath = './styles.css';
  templatePath = './template.html';

  set tracker(value) {
    const oldTracker = this.#tracker;
    this.#tracker = value;

    if (this.isSetup) {
      if (oldTracker?.id === value?.id) {
        // Same tracker, just update values
        this.updateDisplay();
      } else {
        // Different tracker, full update
        this.bindTracker();
      }
    }
  }

  get tracker() {
    return this.#tracker;
  }

  async setup() {
    // Attach delegated event listeners
    this.shadowRoot.addEventListener('counter-change', e => {
      e.stopPropagation();
      this.emit('value-change', { id: this.#tracker.id, delta: e.detail.delta });
    });

    this.shadowRoot.addEventListener('visibility-change', e => {
      e.stopPropagation();
      this.emit('visibility-change', { id: e.detail.entityId, visible: e.detail.checked });
    });

    // Hide name toggle
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

    // Play/pause button click handler
    this.shadowRoot.addEventListener('action-click', e => {
      if (e.target.closest('.play-pause-btn')) {
        this.toggleTimer();
      }
    });

    if (this.#tracker) {
      this.bindTracker();
    }
  }

  cleanup() {
    this.stopTimer();
  }

  /**
   * Initial binding of tracker data to template elements
   */
  bindTracker() {
    if (!this.#tracker) return;

    const tracker = this.#tracker;
    const container = this.$('card-container');

    // Set tracker ID on container
    container.setAttribute('data-tracker-id', tracker.id);

    // Name
    this.$('.tracker-name').textContent = tracker.name;

    // Type badge
    const typeBadge = this.$('.tracker-type-badge');
    typeBadge.setAttribute('type', tracker.tracker_type);
    typeBadge.setAttribute('label', tracker.tracker_type.toUpperCase());

    // Visibility toggle
    const visToggle = this.$('visibility-toggle');
    visToggle.setAttribute('entity-id', tracker.id);

    // Delete trigger
    const deleteTrigger = this.$('delete-trigger');
    deleteTrigger.setAttribute('item-name', tracker.name);
    deleteTrigger.setAttribute('item-id', tracker.id);

    // Counter control
    const counter = this.$('counter-control');
    counter.setAttribute('min', '0');
    counter.setAttribute('max', tracker.max);
    counter.setAttribute('show-max', tracker.max);

    // Update dynamic values
    this.updateDisplay();
  }

  /**
   * Update dynamic values without rebuilding DOM
   */
  updateDisplay() {
    if (!this.#tracker) return;

    const tracker = this.#tracker;

    // Counter value
    const counter = this.$('counter-control');
    if (counter) {
      counter.setAttribute('value', tracker.current);
    }

    // Visibility toggle
    const visibilityToggle = this.$('visibility-toggle');
    if (visibilityToggle) {
      visibilityToggle.checked = tracker.visible_to_players;
    }

    // Hide name toggle
    const hideNameToggle = this.$('toggle-switch[name="hide-name"]');
    if (hideNameToggle) {
      hideNameToggle.checked = tracker.hide_name_from_players;
    }

    // Auto interval badge and play/pause button
    const hasAutoInterval = tracker.auto_interval > 0;
    const intervalBadge = this.$('.auto-interval-badge');
    const playPauseBtn = this.$('.play-pause-btn');

    if (intervalBadge) {
      intervalBadge.hidden = !hasAutoInterval;
      if (hasAutoInterval) {
        this.$('.interval-value').textContent = tracker.auto_interval;
        intervalBadge.title = `Auto: ${tracker.auto_interval}s`;
      }
    }

    if (playPauseBtn) {
      playPauseBtn.hidden = !hasAutoInterval;
    }

    // Current label (for complex trackers)
    const isComplex = tracker.tracker_type === 'complex';
    const currentLabel =
      isComplex && tracker.tick_labels?.[tracker.current]
        ? tracker.tick_labels[tracker.current]
        : null;

    const labelEl = this.$('.current-label');
    if (labelEl) {
      labelEl.hidden = !currentLabel;
      labelEl.textContent = currentLabel || '';
    }
  }

  toggleTimer() {
    if (this.#isRunning) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
    this.updatePlayPauseButton();
  }

  startTimer() {
    if (this.#isRunning || !this.#tracker?.auto_interval) return;

    this.#isRunning = true;
    this.#timerInterval = setInterval(() => {
      if (this.#tracker.current > 0) {
        this.emit('value-change', { id: this.#tracker.id, delta: -1 });

        // Check if we just hit 0 (current was 1, now will be 0)
        if (this.#tracker.current === 1 && this.#tracker.notify_on_complete) {
          this.showCompletionAlert();
        }
      } else {
        this.stopTimer();
        this.updatePlayPauseButton();
      }
    }, this.#tracker.auto_interval * 1000);
  }

  async showCompletionAlert() {
    const tracker = this.#tracker;
    const windowLabel = `countdown-alert-${tracker.id}`;
    const encodedName = encodeURIComponent(tracker.name);

    // Get the tick label for tick 0 if it exists (for complex trackers)
    const tickLabel = tracker.tick_labels?.[0] || '';
    const encodedTickLabel = encodeURIComponent(tickLabel);

    let url = `/pages/countdown-alert/index.html?id=${tracker.id}&name=${encodedName}`;
    if (tickLabel) {
      url += `&tickLabel=${encodedTickLabel}`;
    }

    await createWindow(windowLabel, {
      url,
      title: 'Countdown Complete',
      width: 450,
      height: 320,
      resizable: false,
      alwaysOnTop: true,
      center: true,
    }, {
      focusIfExists: true,
      cascade: false,
    });
  }

  stopTimer() {
    if (this.#timerInterval) {
      clearInterval(this.#timerInterval);
      this.#timerInterval = null;
    }
    this.#isRunning = false;
  }

  updatePlayPauseButton() {
    const btn = this.$('.play-pause-btn');
    if (btn) {
      btn.textContent = this.#isRunning ? '⏸' : '▶';
      btn.setAttribute('variant', this.#isRunning ? 'warning' : 'success');
    }
  }
}

customElements.define('countdown-item', CountdownItem);
