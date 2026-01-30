import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { CampaignAwareMixin } from '../../../../helpers/campaign-aware-mixin.js';
import { getHpChangeType } from '../../../../helpers/health-utils.js';
import { safeInvoke } from '../../../../helpers/tauri.js';

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
    const newEntities = await safeInvoke('get_entities', { visibleOnly: true }, {
      errorMessage: 'Failed to load entities'
    });
    if (newEntities) {
      this.detectHpChanges(newEntities);
      this.entities = newEntities;
      this.render();
      this.applyFlashAnimations();
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

  async applyFlashAnimations() {
    for (const [entityId, flashType] of this.#pendingFlashes) {
      const item = this.$(`entity-player-item[entity-id="${entityId}"]`);
      if (item) {
        // Wait for the component to be ready before flashing
        await item.ready;
        item.flash(flashType);
      }
    }
    this.#pendingFlashes.clear();
  }

  render() {
    const container = this.$('.entities-container');
    if (!container) return;

    const adversaries = this.entities.filter(e => e.entity_type === 'adversary');
    const npcs = this.entities.filter(e => e.entity_type === 'npc');

    // Clear loading message and empty state on first render with data
    const loadingMsg = container.querySelector('.empty-message');
    if (loadingMsg) loadingMsg.remove();
    const emptyState = container.querySelector('empty-state');
    if (emptyState && (adversaries.length > 0 || npcs.length > 0)) {
      emptyState.remove();
    }

    // Track which entity IDs we're rendering
    const currentIds = new Set(this.entities.map(e => e.id));

    // Remove items that no longer exist
    const existingItems = this.$$('entity-player-item');
    existingItems.forEach(item => {
      const id = item.getAttribute('entity-id');
      if (!currentIds.has(id)) {
        item.remove();
      }
    });

    // Update or create adversary section
    this.#renderSection(container, 'adversaries', 'Adversaries', adversaries);

    // Update or create NPC section
    this.#renderSection(container, 'npcs', 'NPCs', npcs);

    // Show empty state if no entities
    if (adversaries.length === 0 && npcs.length === 0) {
      // Clear sections first
      container.innerHTML = '<empty-state message="No visible entities"></empty-state>';
    }
  }

  #renderSection(container, sectionId, title, entities) {
    if (entities.length === 0) {
      // Remove section if it exists but has no entities
      const existingSection = this.$(`[data-section="${sectionId}"]`);
      if (existingSection) {
        existingSection.remove();
      }
      return;
    }

    // Find or create section
    let section = this.$(`[data-section="${sectionId}"]`);
    if (!section) {
      section = document.createElement('div');
      section.className = 'entity-section';
      section.setAttribute('data-section', sectionId);
      section.innerHTML = `<h3 class="section-header">${title}</h3>`;

      const list = document.createElement('ul');
      list.className = 'entities-list';
      section.appendChild(list);

      container.appendChild(section);
    }

    const list = section.querySelector('.entities-list');
    const entityType = sectionId === 'npcs' ? 'npc' : 'adversary';

    entities.forEach(entity => {
      // Find existing item or create new one
      let item = this.$(`entity-player-item[entity-id="${entity.id}"]`);

      if (!item) {
        item = document.createElement('entity-player-item');
        item.setAttribute('entity-id', entity.id);
        list.appendChild(item);
      }

      // Update attributes (triggers attributeChangedCallback for transitions)
      item.setAttribute('name', entity.name);
      item.setAttribute('type', entityType);

      if (entityType === 'npc') {
        item.setAttribute('hp-current', entity.hp_current);
        item.setAttribute('hp-max', entity.hp_max);
      }
    });
  }
}

customElements.define('entity-player-display', EntityPlayerDisplay);
