import ExtendedHtmlElement from '../../extended-html-element.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

export default class EntityPlayerDisplay extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = [];

  entities = [];
  #previousHp = new Map();
  #pendingFlashes = new Map();
  stylesPath = './styles.css';
  templatePath = './template.html';

  async connectedCallback() {
    await super.connectedCallback();
    await this.loadEntities();
    this.setupEventListener();
  }

  async loadEntities() {
    try {
      const newEntities = await invoke('get_entities', { visibleOnly: true });
      this.detectHpChanges(newEntities);
      this.entities = newEntities;
      this.render();
      this.applyFlashAnimations();
    } catch (error) {
      console.error('Failed to load entities:', error);
    }
  }

  detectHpChanges(newEntities) {
    for (const entity of newEntities) {
      const previousHp = this.#previousHp.get(entity.id);
      if (previousHp !== undefined && previousHp !== entity.hp_current) {
        const flashType = entity.hp_current > previousHp ? 'heal' : 'damage';
        this.#pendingFlashes.set(entity.id, flashType);
      }
      this.#previousHp.set(entity.id, entity.hp_current);
    }
  }

  applyFlashAnimations() {
    for (const [entityId, flashType] of this.#pendingFlashes) {
      const element = this.shadowRoot.querySelector(`[data-entity-id="${entityId}"]`);
      if (element) {
        element.classList.add(`flash-${flashType}`);
        element.addEventListener('animationend', () => {
          element.classList.remove(`flash-${flashType}`);
        }, { once: true });
      }
    }
    this.#pendingFlashes.clear();
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
        <li class="entity-item" data-entity-id="${entity.id}">
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
          <li class="entity-item npc-item ${healthClass}" data-entity-id="${entity.id}">
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
      html = '<empty-state message="No visible entities"></empty-state>';
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
