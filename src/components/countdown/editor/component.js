import ExtendedHtmlElement from '../../extended-html-element.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

class CountdownEditor extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #modal;
  #nameInput;
  #maxInput;
  #visibleCheckbox;
  #hideNameCheckbox;
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
    this.#nameInput = this.shadowRoot.querySelector('input[name="name"]');
    this.#maxInput = this.shadowRoot.querySelector('input[name="max"]');
    this.#visibleCheckbox = this.shadowRoot.querySelector('input[name="visibleToPlayers"]');
    this.#hideNameCheckbox = this.shadowRoot.querySelector('input[name="hideNameFromPlayers"]');
    this.#createButton = this.shadowRoot.querySelector('button.create');
    this.#trackersList = this.shadowRoot.querySelector('.trackers-list');
    this.#tickLabelsContainer = this.shadowRoot.querySelector('.tick-labels-container');
    this.#addTickLabelBtn = this.shadowRoot.querySelector('.add-tick-label');

    const openBtn = this.shadowRoot.querySelector('.open-creator');

    // Open modal handler
    openBtn.addEventListener('click', () => {
      this.#modal.open();
      setTimeout(() => this.#nameInput.focus(), 100);
    });

    // Load existing trackers
    await this.loadTrackers();

    // Setup event listeners
    this.#createButton.addEventListener('click', () => this.createTracker());
    this.#addTickLabelBtn.addEventListener('click', () => this.addTickLabelEntry());
    this.#maxInput.addEventListener('input', () => this.updateTickLabelLimit());

    // Clear errors on input
    this.#nameInput.addEventListener('input', () => this.clearError(this.#nameInput));
    this.#maxInput.addEventListener('input', () => this.clearError(this.#maxInput));

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
    const max = parseInt(this.#maxInput.value) || 10;

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
      <button type="button" class="remove-tick-label" data-id="${entryId}">&times;</button>
    `;

    entry.querySelector('.remove-tick-label').addEventListener('click', () => {
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
    const max = parseInt(this.#maxInput.value) || 10;
    this.shadowRoot.querySelectorAll('.tick-input').forEach(input => {
      input.max = max;
    });
    this.updateAddButtonState();
  }

  updateAddButtonState() {
    const max = parseInt(this.#maxInput.value) || 10;
    this.#addTickLabelBtn.disabled = this.#tickLabelEntries.length >= max;
  }

  showError(input, message) {
    input.classList.add('error');
    const errorMsg = this.shadowRoot.querySelector(`[data-for="${input.name}"]`);
    if (errorMsg) {
      if (message) {
        errorMsg.textContent = message;
      }
      errorMsg.classList.add('show');
    }
  }

  clearError(input) {
    input.classList.remove('error');
    const errorMsg = this.shadowRoot.querySelector(`[data-for="${input.name}"]`);
    if (errorMsg) {
      errorMsg.classList.remove('show');
    }
  }

  clearAllErrors() {
    this.shadowRoot.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    this.shadowRoot.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
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

    const name = this.#nameInput.value.trim();
    const max = parseInt(this.#maxInput.value);
    const visibleToPlayers = this.#visibleCheckbox.checked;
    const hideNameFromPlayers = this.#hideNameCheckbox.checked;
    const tickLabels = this.getTickLabels();
    const hasLabels = Object.keys(tickLabels).length > 0;
    const trackerType = hasLabels ? 'complex' : 'simple';

    let hasError = false;

    if (!name) {
      this.showError(this.#nameInput);
      hasError = true;
    }

    if (isNaN(max) || max <= 0) {
      this.showError(this.#maxInput);
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
      this.#nameInput.value = '';
      this.#maxInput.value = '10';
      this.#visibleCheckbox.checked = false;
      this.#hideNameCheckbox.checked = false;
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
      this.#trackersList.innerHTML = '<p class="empty">No trackers yet</p>';
      return;
    }

    this.trackers.forEach(tracker => {
      const isComplex = tracker.tracker_type === 'complex';
      const currentLabel = isComplex && tracker.tick_labels?.[tracker.current]
        ? tracker.tick_labels[tracker.current]
        : null;

      const trackerEl = document.createElement('div');
      trackerEl.className = 'tracker-item';
      trackerEl.setAttribute('data-tracker-id', tracker.id);
      trackerEl.innerHTML = `
        <div class="tracker-header">
          <h4>${tracker.name}</h4>
          <span class="tracker-type ${tracker.tracker_type}">${tracker.tracker_type.toUpperCase()}</span>
        </div>
        <div class="tracker-controls">
          <div class="value-controls">
            <button class="decrease" data-id="${tracker.id}">-</button>
            <span class="value">${tracker.current} / ${tracker.max}</span>
            <button class="increase" data-id="${tracker.id}">+</button>
          </div>
          <label class="visibility-toggle">
            <input type="checkbox" class="visibility-checkbox" data-id="${tracker.id}" ${tracker.visible_to_players ? 'checked' : ''}>
            <span>Visible to Players</span>
          </label>
          <label class="hide-name-toggle">
            <input type="checkbox" class="hide-name-checkbox" data-id="${tracker.id}" ${tracker.hide_name_from_players ? 'checked' : ''}>
            <span>Hide Name from Players</span>
          </label>
        </div>
        ${currentLabel ? `<div class="current-label">${currentLabel}</div>` : ''}
        <div class="delete-section">
          <button class="delete" data-id="${tracker.id}">Delete</button>
          <confirm-dialog></confirm-dialog>
        </div>
      `;

      // Attach event listeners
      trackerEl.querySelector('.decrease').addEventListener('click', () => {
        this.updateTrackerValue(tracker.id, -1);
      });

      trackerEl.querySelector('.increase').addEventListener('click', () => {
        this.updateTrackerValue(tracker.id, 1);
      });

      trackerEl.querySelector('.delete').addEventListener('click', async () => {
        const confirmDialog = trackerEl.querySelector('confirm-dialog');
        const confirmed = await confirmDialog.show({
          message: `Are you sure you want to delete "${tracker.name}"?`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          variant: 'danger'
        });

        if (confirmed) {
          this.deleteTracker(tracker.id, tracker.name);
        }
      });

      trackerEl.querySelector('.visibility-checkbox').addEventListener('change', e => {
        this.toggleVisibility(tracker.id, e.target.checked);
      });

      trackerEl.querySelector('.hide-name-checkbox').addEventListener('change', async e => {
        try {
          await invoke('toggle_tracker_name_visibility', {
            id: tracker.id,
            hideName: e.target.checked,
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
