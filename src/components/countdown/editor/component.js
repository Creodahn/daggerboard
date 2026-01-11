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
  #currentCampaignId = null;
  trackers = [];
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    // Get DOM elements
    this.#modal = this.$('modal-dialog');
    this.#nameField = this.$('form-field[name="name"]');
    this.#maxField = this.$('form-field[name="max"]');
    this.#visibleToggle = this.$('visibility-toggle[name="visibleToPlayers"]');
    this.#hideNameToggle = this.$('toggle-switch[name="hideNameFromPlayers"]');
    this.#createButton = this.$('action-button.create');
    this.#trackersList = this.$('stack-list.trackers-list');
    this.#tickLabelsContainer = this.$('.tick-labels-container');
    this.#addTickLabelBtn = this.$('.add-tick-label');

    const openBtn = this.$('.open-creator');

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
      // Only accept updates for the current campaign
      if (event.payload.campaign_id === this.#currentCampaignId) {
        this.trackers = event.payload.trackers;
        this.renderTrackers();
      }
    });

    // Listen for campaign changes to reload data
    window.addEventListener('campaign-changed', () => {
      this.loadTrackers();
    });

    // Listen for events from countdown-item components
    this.addEventListener('value-change', this.handleValueChange.bind(this));
    this.addEventListener('visibility-change', this.handleVisibilityChange.bind(this));
    this.addEventListener('name-visibility-change', this.handleNameVisibilityChange.bind(this));
    this.addEventListener('delete', this.handleDelete.bind(this));
  }

  async loadTrackers() {
    try {
      // Get current campaign first
      const campaign = await invoke('get_current_campaign');
      this.#currentCampaignId = campaign?.id;

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
    const entry = this.$(`[data-id="${entryId}"]`);
    if (entry) {
      entry.remove();
      this.#tickLabelEntries = this.#tickLabelEntries.filter(id => id !== entryId);
      this.updateAddButtonState();
    }
  }

  updateTickLabelLimit() {
    const max = parseInt(this.#maxField.value) || 10;
    this.$$('.tick-input').forEach(input => {
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
    this.$$('.tick-label-entry').forEach(entry => {
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
      this.#visibleToggle.removeAttribute('checked');
      this.#hideNameToggle.removeAttribute('checked');
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

  async handleValueChange(event) {
    const { id, delta } = event.detail;
    try {
      await invoke('update_tracker_value', { id, amount: delta });
    } catch (error) {
      console.error('Failed to update tracker:', error);
    }
  }

  async handleVisibilityChange(event) {
    const { id, visible } = event.detail;
    try {
      await invoke('toggle_tracker_visibility', { id, visible });
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  }

  async handleNameVisibilityChange(event) {
    const { id, hidden } = event.detail;
    try {
      await invoke('toggle_tracker_name_visibility', { id, hideName: hidden });
    } catch (error) {
      console.error('Failed to toggle name visibility:', error);
    }
  }

  async handleDelete(event) {
    const { id } = event.detail;
    try {
      await invoke('delete_tracker', { id });
    } catch (error) {
      console.error('Failed to delete tracker:', error);
    }
  }

  renderTrackers() {
    if (this.trackers.length === 0) {
      this.#trackersList.innerHTML = '<empty-state message="No trackers yet"></empty-state>';
      return;
    }

    // Get existing items
    const existingItems = this.#trackersList.querySelectorAll('countdown-item');
    const existingById = new Map();
    existingItems.forEach(item => {
      if (item.tracker?.id) {
        existingById.set(item.tracker.id, item);
      }
    });

    // Remove empty state if present
    const emptyState = this.#trackersList.querySelector('empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    // Track which IDs we've seen
    const seenIds = new Set();

    // Update or create items
    this.trackers.forEach(tracker => {
      seenIds.add(tracker.id);
      const existingItem = existingById.get(tracker.id);

      if (existingItem) {
        // Update existing item's data without recreating
        existingItem.tracker = tracker;
      } else {
        // Create new item
        const trackerItem = document.createElement('countdown-item');
        trackerItem.tracker = tracker;
        this.#trackersList.appendChild(trackerItem);
      }
    });

    // Remove items that no longer exist
    existingItems.forEach(item => {
      if (item.tracker?.id && !seenIds.has(item.tracker.id)) {
        item.remove();
      }
    });
  }
}

customElements.define('countdown-editor', CountdownEditor);
