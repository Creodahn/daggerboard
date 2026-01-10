import ExtendedHtmlElement from '../../extended-html-element.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

class CountdownEditor extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #modal;
  #nameField;
  #maxField;
  #visibleToggle;
  #hideNameToggle;
  #createButton;
  #trackersList;
  #tickLabelsContainer;
  #addTickLabelBtn;
  #tickLabelEntries = [];
  trackers = [];
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    // Get DOM elements
    this.#modal = this.shadowRoot.querySelector('modal-dialog');
    this.#nameField = this.shadowRoot.querySelector('form-field[name="name"]');
    this.#maxField = this.shadowRoot.querySelector('form-field[name="max"]');
    this.#visibleToggle = this.shadowRoot.querySelector('visibility-toggle[name="visibleToPlayers"]');
    this.#hideNameToggle = this.shadowRoot.querySelector('toggle-switch[name="hideNameFromPlayers"]');
    this.#createButton = this.shadowRoot.querySelector('button.create');
    this.#trackersList = this.shadowRoot.querySelector('stack-list.trackers-list');
    this.#tickLabelsContainer = this.shadowRoot.querySelector('.tick-labels-container');
    this.#addTickLabelBtn = this.shadowRoot.querySelector('.add-tick-label');

    const openBtn = this.shadowRoot.querySelector('.open-creator');

    // Open modal handler
    openBtn.addEventListener('action-click', () => {
      this.#modal.open();
      setTimeout(() => this.#nameField.focus(), 100);
    });

    // Load existing trackers
    await this.loadTrackers();

    // Setup event listeners
    this.#createButton.addEventListener('action-click', () => this.createTracker());
    this.#addTickLabelBtn.addEventListener('action-click', () => this.addTickLabelEntry());

    // Listen for max field changes to update tick label limits
    this.#maxField.addEventListener('field-input', () => this.updateTickLabelLimit());

    // Add first tick label entry by default
    this.addTickLabelEntry();

    // Listen for tracker updates from other windows
    await listen('trackers-updated', event => {
      this.trackers = event.payload.trackers;
      this.renderTrackers();
    });
  }

  async loadTrackers() {
    try {
      this.trackers = await invoke('get_trackers', { visibleOnly: false });
      this.renderTrackers();
    } catch (error) {
      console.error('Failed to load trackers:', error);
    }
  }

  addTickLabelEntry() {
    const max = parseInt(this.#maxField.value) || 10;

    if (this.#tickLabelEntries.length >= max) {
      alert(`Cannot add more than ${max} tick labels (maximum value)`);
      return;
    }

    const entryId = Date.now();
    const entry = document.createElement('div');
    entry.className = 'tick-label-entry';
    entry.dataset.id = entryId;
    entry.innerHTML = `
      <input type="number" class="tick-input" placeholder="Tick" min="0" max="${max}" required>
      <input type="text" class="label-input" placeholder="Label" required>
      <action-button type="button" variant="danger" size="small" class="remove-tick-label" data-id="${entryId}">×</action-button>
    `;

    entry.querySelector('.remove-tick-label').addEventListener('action-click', () => {
      this.removeTickLabelEntry(entryId);
    });

    this.#tickLabelsContainer.appendChild(entry);
    this.#tickLabelEntries.push(entryId);
    this.updateAddButtonState();
  }

  removeTickLabelEntry(entryId) {
    const entry = this.shadowRoot.querySelector(`[data-id="${entryId}"]`);
    if (entry) {
      entry.remove();
      this.#tickLabelEntries = this.#tickLabelEntries.filter(id => id !== entryId);
      this.updateAddButtonState();
    }
  }

  updateTickLabelLimit() {
    const max = parseInt(this.#maxField.value) || 10;
    this.shadowRoot.querySelectorAll('.tick-input').forEach(input => {
      input.max = max;
    });
    this.updateAddButtonState();
  }

  updateAddButtonState() {
    const max = parseInt(this.#maxField.value) || 10;
    this.#addTickLabelBtn.disabled = this.#tickLabelEntries.length >= max;
  }

  clearAllErrors() {
    this.#nameField?.clearError();
    this.#maxField?.clearError();
  }

  getTickLabels() {
    const labels = {};
    this.shadowRoot.querySelectorAll('.tick-label-entry').forEach(entry => {
      const tickInput = entry.querySelector('.tick-input');
      const labelInput = entry.querySelector('.label-input');
      const tick = parseInt(tickInput.value);
      const label = labelInput.value.trim();

      if (!isNaN(tick) && label) {
        labels[tick] = label;
      }
    });
    return labels;
  }

  async createTracker() {
    this.clearAllErrors();

    const name = this.#nameField.value.trim();
    const max = parseInt(this.#maxField.value);
    const visibleToPlayers = this.#visibleToggle.checked;
    const hideNameFromPlayers = this.#hideNameToggle.checked;
    const tickLabels = this.getTickLabels();
    const hasLabels = Object.keys(tickLabels).length > 0;
    const trackerType = hasLabels ? 'complex' : 'simple';

    let hasError = false;

    if (!name) {
      this.#nameField.showError();
      hasError = true;
    }

    if (isNaN(max) || max <= 0) {
      this.#maxField.showError();
      hasError = true;
    }

    // Validate tick labels are within range
    for (const tick of Object.keys(tickLabels)) {
      const tickNum = parseInt(tick);
      if (tickNum < 0 || tickNum > max) {
        alert(`Tick ${tickNum} is out of range (0-${max})`);
        hasError = true;
      }
    }

    if (hasError) return;

    try {
      const tracker = await invoke('create_tracker', {
        name,
        max,
        trackerType,
      });

      // Set visibility preference
      if (visibleToPlayers && tracker.id) {
        await invoke('toggle_tracker_visibility', {
          id: tracker.id,
          visible: true,
        });
      }

      // Set name visibility preference
      if (hideNameFromPlayers && tracker.id) {
        await invoke('toggle_tracker_name_visibility', {
          id: tracker.id,
          hideName: true,
        });
      }

      // Set tick labels if complex
      if (hasLabels && tracker.id) {
        for (const [tick, text] of Object.entries(tickLabels)) {
          await invoke('set_tick_label', {
            id: tracker.id,
            tick: parseInt(tick),
            text,
          });
        }
      }

      // Reset form
      this.#nameField.value = '';
      this.#maxField.value = '10';
      this.#visibleToggle.checked = false;
      this.#hideNameToggle.checked = false;
      this.#tickLabelsContainer.innerHTML = '';
      this.#tickLabelEntries = [];
      this.updateAddButtonState();

      // Close modal
      this.#modal.close();
    } catch (error) {
      console.error('Failed to create tracker:', error);
      alert(`Error: ${error}`);
    }
  }

  async updateTrackerValue(id, amount) {
    try {
      await invoke('update_tracker_value', { id, amount });
    } catch (error) {
      console.error('Failed to update tracker:', error);
    }
  }

  async deleteTracker(id, name, buttonEl) {
    try {
      // Show loading state
      if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.textContent = 'Deleting...';
      }

      await invoke('delete_tracker', { id });

      // Find and animate out the tracker item
      const trackerItem = this.shadowRoot.querySelector(`[data-tracker-id="${id}"]`);
      if (trackerItem) {
        trackerItem.classList.add('fade-out');
        setTimeout(() => {
          trackerItem.remove();
        }, 300);
      }
    } catch (error) {
      console.error('Failed to delete tracker:', error);
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.textContent = 'Delete';
      }
    }
  }

  async toggleVisibility(id, visible) {
    try {
      await invoke('toggle_tracker_visibility', { id, visible });
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  }

  renderTrackers() {
    this.#trackersList.innerHTML = '';

    if (this.trackers.length === 0) {
      this.#trackersList.innerHTML = '<empty-state message="No trackers yet"></empty-state>';
      return;
    }

    this.trackers.forEach(tracker => {
      const isComplex = tracker.tracker_type === 'complex';
      const currentLabel = isComplex && tracker.tick_labels?.[tracker.current]
        ? tracker.tick_labels[tracker.current]
        : null;

      const trackerEl = document.createElement('card-container');
      trackerEl.setAttribute('data-tracker-id', tracker.id);
      trackerEl.innerHTML = `
        <div class="tracker-header">
          <h4>${tracker.name}</h4>
          <type-badge type="${tracker.tracker_type}" label="${tracker.tracker_type.toUpperCase()}"></type-badge>
        </div>
        <div class="tracker-controls">
          <counter-control value="${tracker.current}" min="0" max="${tracker.max}" show-max="${tracker.max}" data-tracker-id="${tracker.id}"></counter-control>
          <visibility-toggle entity-id="${tracker.id}" ${tracker.visible_to_players ? 'checked' : ''}></visibility-toggle>
          <toggle-switch name="hide-name-${tracker.id}" label="🙈 Hide Name from Players" ${tracker.hide_name_from_players ? 'checked' : ''}></toggle-switch>
        </div>
        ${currentLabel ? `<div class="current-label">${currentLabel}</div>` : ''}
        <div class="delete-section">
          <delete-trigger item-name="${tracker.name}" item-id="${tracker.id}"></delete-trigger>
        </div>
      `;

      // Attach event listeners
      trackerEl.querySelector('counter-control').addEventListener('counter-change', e => {
        this.updateTrackerValue(tracker.id, e.detail.delta);
      });

      trackerEl.querySelector('delete-trigger').addEventListener('delete-confirmed', async e => {
        await trackerEl.fadeOut();
        this.deleteTracker(e.detail.id, e.detail.name);
      });

      trackerEl.querySelector('visibility-toggle').addEventListener('visibility-change', e => {
        this.toggleVisibility(e.detail.entityId, e.detail.checked);
      });

      trackerEl.querySelector(`toggle-switch[name="hide-name-${tracker.id}"]`).addEventListener('toggle-change', async e => {
        try {
          await invoke('toggle_tracker_name_visibility', {
            id: tracker.id,
            hideName: e.detail.checked,
          });
        } catch (error) {
          console.error('Failed to toggle name visibility:', error);
        }
      });

      this.#trackersList.appendChild(trackerEl);
    });
  }
}

customElements.define('countdown-editor', CountdownEditor);
