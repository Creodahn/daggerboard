import ExtendedHtmlElement from '../../extended-html-element.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

class EntityList extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #entitiesList;
  entities = [];
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#entitiesList = this.shadowRoot.querySelector('stack-list');

    // Setup create button to dispatch event
    this.shadowRoot.querySelector('.open-creator').addEventListener('action-click', () => {
      const event = new CustomEvent('open-entity-creator', {
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    });

    // Listen for events from entity-item components
    this.addEventListener('threshold-damage', this.handleThresholdDamage.bind(this));
    this.addEventListener('heal', this.handleHeal.bind(this));
    this.addEventListener('name-change', this.handleNameChange.bind(this));
    this.addEventListener('visibility-change', this.handleVisibilityChange.bind(this));
    this.addEventListener('delete', this.handleDelete.bind(this));

    // Load existing entities
    await this.loadEntities();

    // Listen for entity updates from backend
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

  async handleThresholdDamage(event) {
    const { id, hpLoss } = event.detail;
    try {
      await invoke('update_entity_hp', { id, amount: -hpLoss });
    } catch (error) {
      console.error('Failed to apply threshold damage:', error);
    }
  }

  async handleHeal(event) {
    const { id, amount } = event.detail;
    try {
      await invoke('update_entity_hp', { id, amount });
    } catch (error) {
      console.error('Failed to heal entity:', error);
    }
  }

  async handleNameChange(event) {
    const { id, name } = event.detail;
    try {
      await invoke('update_entity_name', { id, name });
    } catch (error) {
      console.error('Failed to update entity name:', error);
    }
  }

  async handleVisibilityChange(event) {
    // Handle both old format (id, visible) and new visibility-toggle format (entityId, checked)
    const { entityId, checked, id, visible } = event.detail;
    const entityIdToUse = entityId || id;
    const visibleToUse = checked !== undefined ? checked : visible;

    try {
      await invoke('toggle_entity_visibility', { id: entityIdToUse, visible: visibleToUse });
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  }

  async handleDelete(event) {
    const { id } = event.detail;
    try {
      await invoke('delete_entity', { id });
      // Manually reload in case event doesn't fire
      await this.loadEntities();
    } catch (error) {
      console.error('Failed to delete entity:', error);
      alert(`Failed to delete entity: ${error}`);
    }
  }

  renderEntities() {
    if (this.entities.length === 0) {
      this.#entitiesList.innerHTML = '<empty-state message="No entities created yet"></empty-state>';
      return;
    }

    // Get existing items
    const existingItems = this.#entitiesList.querySelectorAll('entity-item');
    const existingById = new Map();
    existingItems.forEach(item => {
      if (item.entity?.id) {
        existingById.set(item.entity.id, item);
      }
    });

    // Remove empty state if present
    const emptyState = this.#entitiesList.querySelector('empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    // Track which IDs we've seen
    const seenIds = new Set();

    // Update or create items
    this.entities.forEach(entity => {
      seenIds.add(entity.id);
      const existingItem = existingById.get(entity.id);

      if (existingItem) {
        // Update existing item's data without recreating
        existingItem.entity = entity;
      } else {
        // Create new item
        const entityItem = document.createElement('entity-item');
        entityItem.entity = entity;
        this.#entitiesList.appendChild(entityItem);
      }
    });

    // Remove items that no longer exist
    existingItems.forEach(item => {
      if (item.entity?.id && !seenIds.has(item.entity.id)) {
        item.remove();
      }
    });
  }
}

customElements.define('entity-list', EntityList);
