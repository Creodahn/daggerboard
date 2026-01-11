import ExtendedHtmlElement from '../../extended-html-element.js';
import { getHealthPercentage, getNpcHealthClass, getHpChangeType } from '../../../helpers/health-utils.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

export default class EntityPlayerDisplay extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = [];

  entities = [];
  #previousHp = new Map();
  #pendingFlashes = new Map();
  #currentCampaignId = null;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async connectedCallback() {
    await super.connectedCallback();
    await this.loadEntities();
    this.setupEventListener();
  }

  async loadEntities() {
    try {
      // Get current campaign first
      const campaign = await invoke('get_current_campaign');
      this.#currentCampaignId = campaign?.id;

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
      const changeType = getHpChangeType(previousHp, entity.hp_current);
      if (changeType) {
        this.#pendingFlashes.set(entity.id, changeType);
      }
      this.#previousHp.set(entity.id, entity.hp_current);
    }
  }

  applyFlashAnimations() {
    for (const [entityId, flashType] of this.#pendingFlashes) {
      const flashContainer = this.$(`flash-container[data-entity-id="${entityId}"]`);
      if (flashContainer) {
        flashContainer.flash(flashType);
      }
    }
    this.#pendingFlashes.clear();
  }

  setupEventListener() {
    listen('entities-updated', async (event) => {
      // Only accept updates for the current campaign
      if (event.payload.campaign_id === this.#currentCampaignId) {
        const newEntities = event.payload.entities.filter(e => e.visible_to_players);
        this.detectHpChanges(newEntities);
        this.entities = newEntities;
        this.render();
        this.applyFlashAnimations();
      }
    });

    // Listen for campaign changes to reload data
    window.addEventListener('campaign-changed', () => {
      this.#previousHp.clear();
      this.#pendingFlashes.clear();
      this.loadEntities();
    });
  }

  render() {
    const container = this.$('.entities-container');
    if (!container) return;

    const enemies = this.entities.filter(e => e.entity_type === 'enemy');
    const npcs = this.entities.filter(e => e.entity_type === 'npc');

    let html = '';

    if (enemies.length > 0) {
      const enemiesList = enemies.map(entity => `
        <flash-container data-entity-id="${entity.id}">
          <li class="entity-item">
            <span class="entity-name">${entity.name}</span>
          </li>
        </flash-container>
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
        const healthPercent = getHealthPercentage(entity.hp_current, entity.hp_max);
        const healthClass = getNpcHealthClass(healthPercent);
        return `
          <flash-container data-entity-id="${entity.id}">
            <li class="entity-item npc-item ${healthClass}">
              <span class="entity-name">${entity.name}</span>
            </li>
          </flash-container>
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

}

customElements.define('entity-player-display', EntityPlayerDisplay);
