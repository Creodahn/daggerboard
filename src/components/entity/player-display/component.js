import ExtendedHtmlElement from '../../extended-html-element.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

export default class EntityPlayerDisplay extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = [];

  entities = [];
  stylesPath = './styles.css';
  templatePath = './template.html';

  async connectedCallback() {
    await super.connectedCallback();
    await this.loadEntities();
    this.setupEventListener();
  }

  async loadEntities() {
    try {
      this.entities = await invoke('get_entities', { visibleOnly: true });
      this.render();
    } catch (error) {
      console.error('Failed to load entities:', error);
    }
  }

  setupEventListener() {
    listen('entities-updated', async () => {
      await this.loadEntities();
    });
  }

  render() {
    const container = this.shadowRoot.querySelector('.entities-container');
    if (!container) return;

    const enemies = this.entities.filter(e => e.entity_type === 'enemy');
    const npcs = this.entities.filter(e => e.entity_type === 'npc');

    let html = '';

    if (enemies.length > 0) {
      const enemiesList = enemies.map(entity => `
        <li class="entity-item">
          <span class="entity-name">${entity.name}</span>
        </li>
      `).join('');
      html += `
        <div class="entity-section">
          <h3 class="section-header">Enemies</h3>
          <ul class="entities-list">${enemiesList}</ul>
        </div>
      `;
    }

    if (npcs.length > 0) {
      const npcsList = npcs.map(entity => {
        const healthPercent = (entity.hp_current / entity.hp_max) * 100;
        const healthClass = this.getHealthClass(healthPercent);
        return `
          <li class="entity-item npc-item ${healthClass}">
            <span class="entity-name">${entity.name}</span>
          </li>
        `;
      }).join('');
      html += `
        <div class="entity-section">
          <h3 class="section-header">NPCs</h3>
          <ul class="entities-list">${npcsList}</ul>
        </div>
      `;
    }

    if (enemies.length === 0 && npcs.length === 0) {
      html = '<p class="empty-message">No visible entities</p>';
    }

    container.innerHTML = html;
  }

  getHealthClass(healthPercent) {
    if (healthPercent <= 0) return 'health-dead';
    if (healthPercent >= 75) return 'health-good';
    if (healthPercent >= 50) return 'health-warning';
    if (healthPercent >= 24) return 'health-danger';
    return 'health-critical';
  }
}

customElements.define('entity-player-display', EntityPlayerDisplay);
