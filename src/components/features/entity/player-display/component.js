import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { CampaignAwareMixin } from '../../../../helpers/campaign-aware-mixin.js';
import { getHpChangeType } from '../../../../helpers/health-utils.js';

const { invoke } = window.__TAURI__.core;

export default class EntityPlayerDisplay extends CampaignAwareMixin(ExtendedHtmlElement) {
  static moduleUrl = import.meta.url;
  static observedAttributes = [];

  entities = [];
  #previousHp = new Map();
  #pendingFlashes = new Map();
  stylesPath = './styles.css';
  templatePath = './template.html';

  async connectedCallback() {
    await super.connectedCallback();

    // Setup campaign awareness
    await this.setupCampaignAwareness({
      loadData: () => this.loadEntities(),
      events: {
        'entities-updated': (payload) => {
          const newEntities = payload.entities.filter(e => e.visible_to_players);
          this.detectHpChanges(newEntities);
          this.entities = newEntities;
          this.render();
          this.applyFlashAnimations();
        }
      },
      onCampaignChange: () => {
        this.#previousHp.clear();
        this.#pendingFlashes.clear();
      }
    });
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
      const changeType = getHpChangeType(previousHp, entity.hp_current);
      if (changeType) {
        this.#pendingFlashes.set(entity.id, changeType);
      }
      this.#previousHp.set(entity.id, entity.hp_current);
    }
  }

  applyFlashAnimations() {
    for (const [entityId, flashType] of this.#pendingFlashes) {
      const item = this.$(`entity-player-item[entity-id="${entityId}"]`);
      if (item) {
        item.flash(flashType);
      }
    }
    this.#pendingFlashes.clear();
  }

  render() {
    const container = this.$('.entities-container');
    if (!container) return;

    const enemies = this.entities.filter(e => e.entity_type === 'enemy');
    const npcs = this.entities.filter(e => e.entity_type === 'npc');

    container.innerHTML = '';

    if (enemies.length > 0) {
      const section = document.createElement('div');
      section.className = 'entity-section';
      section.innerHTML = '<h3 class="section-header">Enemies</h3>';

      const list = document.createElement('ul');
      list.className = 'entities-list';

      enemies.forEach(entity => {
        const item = document.createElement('entity-player-item');
        item.setAttribute('entity-id', entity.id);
        item.setAttribute('name', entity.name);
        item.setAttribute('type', 'enemy');
        list.appendChild(item);
      });

      section.appendChild(list);
      container.appendChild(section);
    }

    if (npcs.length > 0) {
      const section = document.createElement('div');
      section.className = 'entity-section';
      section.innerHTML = '<h3 class="section-header">NPCs</h3>';

      const list = document.createElement('ul');
      list.className = 'entities-list';

      npcs.forEach(entity => {
        const item = document.createElement('entity-player-item');
        item.setAttribute('entity-id', entity.id);
        item.setAttribute('name', entity.name);
        item.setAttribute('type', 'npc');
        item.setAttribute('hp-current', entity.hp_current);
        item.setAttribute('hp-max', entity.hp_max);
        list.appendChild(item);
      });

      section.appendChild(list);
      container.appendChild(section);
    }

    if (enemies.length === 0 && npcs.length === 0) {
      container.innerHTML = '<empty-state message="No visible entities"></empty-state>';
    }
  }
}

customElements.define('entity-player-display', EntityPlayerDisplay);
