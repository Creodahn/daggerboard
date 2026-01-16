import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { CampaignAwareMixin } from '../../../../helpers/campaign-aware-mixin.js';
import { invoke } from '../../../../helpers/tauri.js';
import '../item/component.js';
import '../../../ui/section-header/component.js';
import '../../../ui/action-button/component.js';
import '../../../ui/empty-state/component.js';
import '../../../layout/panel-section/component.js';
import '../../../layout/stack-list/component.js';

class PlayerCharacterList extends CampaignAwareMixin(ExtendedHtmlElement) {
  static moduleUrl = import.meta.url;
  #characterList;
  characters = [];
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#characterList = this.$('stack-list');

    // Setup create button to dispatch event
    this.$('.open-editor').addEventListener('action-click', () => {
      this.emit('open-character-editor');
    });

    // Listen for events from player-character-item components
    this.addEventListener('character-hp-change', this.handleHpChange.bind(this));
    this.addEventListener('character-hope-change', this.handleHopeChange.bind(this));
    this.addEventListener('character-stress-change', this.handleStressChange.bind(this));
    this.addEventListener('character-armor-change', this.handleArmorChange.bind(this));
    this.addEventListener('character-edit', this.handleEdit.bind(this));
    this.addEventListener('character-delete', this.handleDelete.bind(this));

    // Setup campaign awareness
    await this.setupCampaignAwareness({
      loadData: () => this.loadCharacters(),
      events: {
        'player-characters-updated': () => this.loadCharacters()
      }
    });
  }

  async loadCharacters() {
    if (!this.currentCampaignId) {
      this.characters = [];
      this.renderCharacters();
      return;
    }

    try {
      this.characters = await invoke('get_player_characters', {
        campaignId: this.currentCampaignId
      });
      this.renderCharacters();
    } catch (error) {
      console.error('Failed to load player characters:', error);
    }
  }

  async handleHpChange(event) {
    const { id, amount } = event.detail;
    try {
      await invoke('adjust_player_hp', { id, amount });
    } catch (error) {
      console.error('Failed to adjust HP:', error);
    }
  }

  async handleHopeChange(event) {
    const { id, amount } = event.detail;
    try {
      await invoke('adjust_player_hope', { id, amount });
    } catch (error) {
      console.error('Failed to adjust hope:', error);
    }
  }

  async handleStressChange(event) {
    const { id, amount } = event.detail;
    try {
      await invoke('adjust_player_stress', { id, amount });
    } catch (error) {
      console.error('Failed to adjust stress:', error);
    }
  }

  async handleArmorChange(event) {
    const { id, amount } = event.detail;
    try {
      await invoke('adjust_player_armor', { id, amount });
    } catch (error) {
      console.error('Failed to adjust armor:', error);
    }
  }

  handleEdit(event) {
    const { id } = event.detail;
    this.emit('open-character-editor', { characterId: id });
  }

  async handleDelete(event) {
    const { id } = event.detail;
    try {
      await invoke('delete_player_character', { id });
    } catch (error) {
      console.error('Failed to delete character:', error);
    }
  }

  renderCharacters() {
    if (this.characters.length === 0) {
      this.#characterList.innerHTML = '<empty-state message="No player characters yet"></empty-state>';
      return;
    }

    // Get existing items
    const existingItems = this.#characterList.querySelectorAll('player-character-item');
    const existingById = new Map();
    existingItems.forEach(item => {
      if (item.character?.id) {
        existingById.set(item.character.id, item);
      }
    });

    // Remove empty state if present
    const emptyState = this.#characterList.querySelector('empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    // Track which IDs we've seen
    const seenIds = new Set();

    // Update or create items
    this.characters.forEach(character => {
      seenIds.add(character.id);
      const existingItem = existingById.get(character.id);

      if (existingItem) {
        existingItem.character = character;
      } else {
        const item = document.createElement('player-character-item');
        item.character = character;
        this.#characterList.appendChild(item);
      }
    });

    // Remove items that no longer exist
    existingItems.forEach(item => {
      if (item.character?.id && !seenIds.has(item.character.id)) {
        item.remove();
      }
    });
  }
}

customElements.define('player-character-list', PlayerCharacterList);
