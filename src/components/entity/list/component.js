import ExtendedHtmlElement from '../../extended-html-element.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

class EntityList extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #entitiesList;
  #nameUpdateTimeouts = {};
  entities = [];
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#entitiesList = this.shadowRoot.querySelector('.entities-list');

    // Setup create button to dispatch event
    this.shadowRoot.querySelector('.open-creator').addEventListener('click', () => {
      const event = new CustomEvent('open-entity-creator', {
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    });

    // Load existing entities
    await this.loadEntities();

    // Listen for entity updates
    await listen('entities-updated', event => {
      this.entities = event.payload.entities;
      this.renderEntities();
    });
  }

  async loadEntities() {
    try {
      this.entities = await invoke('get_entities', { visibleOnly: false });
      this.renderEntities();
    } catch (error) {
      console.error('Failed to load entities:', error);
    }
  }

  async updateHP(id, amount) {
    try {
      await invoke('update_entity_hp', { id, amount });
    } catch (error) {
      console.error('Failed to update HP:', error);
    }
  }

  updateEntityName(id, name) {
    // Clear existing timeout for this entity
    if (this.#nameUpdateTimeouts[id]) {
      clearTimeout(this.#nameUpdateTimeouts[id]);
    }

    // Debounce the update by 500ms
    this.#nameUpdateTimeouts[id] = setTimeout(async () => {
      try {
        await invoke('update_entity_name', { id, name });
      } catch (error) {
        console.error('Failed to update entity name:', error);
      }
    }, 500);
  }

  updateEntityName(id, name) {
    // Clear existing timeout for this entity
    if (this.#nameUpdateTimeouts[id]) {
      clearTimeout(this.#nameUpdateTimeouts[id]);
    }

    // Debounce the update by 500ms
    this.#nameUpdateTimeouts[id] = setTimeout(async () => {
      try {
        await invoke('update_entity_name', { id, name });
      } catch (error) {
        console.error('Failed to update entity name:', error);
      }
    }, 500);
  }

  async applyThresholdDamage(id, hpLoss, thresholdName) {
    try {
      await invoke('update_entity_hp', { id, amount: -hpLoss });
      const messages = {
        minor: '⚠️',
        major: '🔥',
        severe: '💀',
        massive: '☠️',
      };
      console.log(`${messages[thresholdName] || ''} ${thresholdName} damage: ${hpLoss} HP lost`);
    } catch (error) {
      console.error('Failed to apply threshold damage:', error);
    }
  }

  async applyDamage(id) {
    const damageInput = this.shadowRoot.querySelector(`input[data-damage-id="${id}"]`);
    const damage = parseInt(damageInput.value);

    if (isNaN(damage) || damage <= 0) {
      alert('Please enter a valid damage amount');
      return;
    }

    try {
      const result = await invoke('apply_damage', { id, damage });

      if (result.threshold_hit) {
        const messages = {
          minor: `⚠️ Minor threshold hit! ${result.damage_dealt} HP lost`,
          major: `🔥 Major threshold hit! ${result.damage_dealt} HP lost`,
          severe: `💀 Severe threshold hit! ${result.damage_dealt} HP lost`,
          massive: `☠️ MASSIVE damage! ${result.damage_dealt} HP lost`,
        };
        alert(messages[result.threshold_hit] || `Damage applied: ${result.damage_dealt} HP lost`);
      } else {
        alert('Damage below minor threshold - no HP lost');
      }

      damageInput.value = '';
    } catch (error) {
      console.error('Failed to apply damage:', error);
      alert(`Error: ${error}`);
    }
  }

  async toggleVisibility(id, visible) {
    try {
      await invoke('toggle_entity_visibility', { id, visible });
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  }

  async deleteEntity(id, name, buttonEl) {
    console.log('deleteEntity called with:', id, name);

    // Disable button and show loading state
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.textContent = 'Deleting...';
      buttonEl.style.opacity = '0.6';
      buttonEl.style.cursor = 'wait';
    }

    // Find and fade out the entity element
    const entityEl = this.shadowRoot.querySelector(`[data-entity-id="${id}"]`);
    if (entityEl) {
      entityEl.classList.add('fade-out');
      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    try {
      await invoke('delete_entity', { id });
      console.log('delete_entity command succeeded');
      // Manually reload in case event doesn't fire
      await this.loadEntities();
      console.log('Entities reloaded after delete');
    } catch (error) {
      console.error('Failed to delete entity:', error);
      alert(`Failed to delete entity: ${error}`);

      // Remove fade-out class and re-enable button on error
      if (entityEl) {
        entityEl.classList.remove('fade-out');
      }
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.textContent = 'Yes';
        buttonEl.style.opacity = '1';
        buttonEl.style.cursor = 'pointer';
      }
    }
  }

  getHealthPercentage(current, max) {
    return (current / max) * 100;
  }

  getHealthClass(percentage) {
    if (percentage <= 25) return 'critical';
    if (percentage <= 50) return 'low';
    if (percentage <= 75) return 'medium';
    return 'healthy';
  }

  renderEntities() {
    this.#entitiesList.innerHTML = '';

    if (this.entities.length === 0) {
      this.#entitiesList.innerHTML = '<p class="empty">No entities created yet</p>';
      return;
    }

    this.entities.forEach(entity => {
      const healthPercent = this.getHealthPercentage(entity.hp_current, entity.hp_max);
      const healthClass = this.getHealthClass(healthPercent);
      const massiveThreshold = entity.thresholds.severe * 2;

      const entityEl = document.createElement('div');
      entityEl.className = 'entity-item';
      entityEl.setAttribute('data-entity-id', entity.id);
      entityEl.innerHTML = `
        <div class="entity-header">
          <div class="entity-name-section">
            <input type="text" class="entity-name-input" value="${entity.name}" data-id="${entity.id}">
            <span class="entity-type-badge ${entity.entity_type}">${entity.entity_type === 'enemy' ? 'Enemy' : 'NPC'}</span>
          </div>
          <label class="visibility-toggle">
            <input type="checkbox" data-id="${entity.id}" ${entity.visible_to_players ? 'checked' : ''}>
            <span>👁️ Players</span>
          </label>
        </div>

        <div class="hp-section">
          <div class="hp-bar-container">
            <div class="hp-bar ${healthClass}" style="width: ${healthPercent}%"></div>
            <span class="hp-text">${entity.hp_current} / ${entity.hp_max} HP</span>
          </div>
        </div>

        <div class="damage-section">
          <label>Apply Damage:</label>
          <div class="damage-controls">
            <input type="number" min="1" placeholder="Amount" data-damage-id="${entity.id}">
            <button class="apply-damage" data-id="${entity.id}">Deal</button>
          </div>
          <p class="damage-info">
            ≥${entity.thresholds.minor}: 1 HP |
            ≥${entity.thresholds.major}: 2 HP |
            ≥${entity.thresholds.severe}: 3 HP |
            ≥${massiveThreshold}: 4 HP
          </p>
        </div>

        <div class="thresholds-display">
          <button class="threshold minor" data-id="${entity.id}" data-hp-loss="1" data-threshold="minor">
            Minor: ${entity.thresholds.minor} (-1 HP)
          </button>
          <button class="threshold major" data-id="${entity.id}" data-hp-loss="2" data-threshold="major">
            Major: ${entity.thresholds.major} (-2 HP)
          </button>
          <button class="threshold severe" data-id="${entity.id}" data-hp-loss="3" data-threshold="severe">
            Severe: ${entity.thresholds.severe} (-3 HP)
          </button>
          <button class="threshold massive" data-id="${entity.id}" data-hp-loss="4" data-threshold="massive">
            Massive: ${massiveThreshold} (-4 HP)
          </button>
        </div>

        <div class="delete-section">
          <div class="delete-backdrop hidden"></div>
          <button class="delete" data-id="${entity.id}">Delete</button>
          <div class="delete-confirmation hidden">
            <p class="delete-message">Are you sure you want to delete?</p>
            <div class="delete-actions">
              <button class="delete-yes">Yes</button>
              <button class="delete-no">No</button>
            </div>
          </div>
        </div>
      `;

      // Attach event listeners
      entityEl.querySelectorAll('.threshold').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const hpLoss = parseInt(btn.dataset.hpLoss);
          const threshold = btn.dataset.threshold;
          this.applyThresholdDamage(id, hpLoss, threshold);
        });
      });

      entityEl.querySelector('.apply-damage').addEventListener('click', () => {
        this.applyDamage(entity.id);
      });

      entityEl.querySelector('.entity-name-input').addEventListener('input', e => {
        this.updateEntityName(entity.id, e.target.value);
      });

      entityEl.querySelector('input[type="checkbox"]').addEventListener('change', e => {
        this.toggleVisibility(entity.id, e.target.checked);
      });

      const deleteBtn = entityEl.querySelector('.delete');
      const deleteConfirmation = entityEl.querySelector('.delete-confirmation');
      const deleteBackdrop = entityEl.querySelector('.delete-backdrop');
      const deleteYesBtn = entityEl.querySelector('.delete-yes');
      const deleteNoBtn = entityEl.querySelector('.delete-no');

      deleteBtn.addEventListener('click', () => {
        console.log('Delete button clicked for entity:', entity.id, entity.name);
        deleteBackdrop.classList.remove('hidden');
        deleteConfirmation.classList.remove('hidden');
        deleteConfirmation.classList.remove('slide-up');
      });

      deleteNoBtn.addEventListener('click', () => {
        deleteConfirmation.classList.add('slide-up');
        deleteBackdrop.classList.add('fade-out');
        setTimeout(() => {
          deleteConfirmation.classList.add('hidden');
          deleteBackdrop.classList.add('hidden');
          deleteConfirmation.classList.remove('slide-up');
          deleteBackdrop.classList.remove('fade-out');
        }, 300);
      });

      deleteYesBtn.addEventListener('click', () => {
        this.deleteEntity(entity.id, entity.name, deleteYesBtn);
      });

      this.#entitiesList.appendChild(entityEl);
    });
  }
}

customElements.define('entity-list', EntityList);
