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
    this.#entitiesList = this.shadowRoot.querySelector('.entities-list');

    // Setup create button to dispatch event
    this.shadowRoot.querySelector('.open-creator').addEventListener('click', () => {
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
    const { id, hpLoss, threshold } = event.detail;
    try {
      await invoke('update_entity_hp', { id, amount: -hpLoss });
      const messages = {
        minor: '⚠️',
        major: '🔥',
        severe: '💀',
        massive: '☠️',
      };
      console.log(`${messages[threshold] || ''} ${threshold} damage: ${hpLoss} HP lost`);
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
    const { id, visible } = event.detail;
    try {
      await invoke('toggle_entity_visibility', { id, visible });
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  }

  async handleDelete(event) {
    const { id, name } = event.detail;
    try {
      await invoke('delete_entity', { id });
      console.log('Entity deleted:', name);
      // Manually reload in case event doesn't fire
      await this.loadEntities();
    } catch (error) {
      console.error('Failed to delete entity:', error);
      alert(`Failed to delete entity: ${error}`);
    }
  }

  renderEntities() {
    this.#entitiesList.innerHTML = '';

    if (this.entities.length === 0) {
      this.#entitiesList.innerHTML = '<p class="empty">No entities created yet</p>';
      return;
    }

    this.entities.forEach(entity => {
      const entityItem = document.createElement('entity-item');
      entityItem.entity = entity;
      this.#entitiesList.appendChild(entityItem);
    });
  }
}

customElements.define('entity-list', EntityList);
