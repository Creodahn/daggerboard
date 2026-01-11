import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { CampaignAwareMixin } from '../../../../helpers/campaign-aware-mixin.js';

const { invoke } = window.__TAURI__.core;

class CountdownDisplay extends CampaignAwareMixin(ExtendedHtmlElement) {
  static moduleUrl = import.meta.url;
  #countdownsList;
  trackers = [];
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#countdownsList = this.$('.countdowns-list');

    // Setup campaign awareness
    await this.setupCampaignAwareness({
      loadData: () => this.loadTrackers(),
      events: {
        'trackers-updated': (payload) => {
          this.trackers = payload.trackers.filter(t => t.visible_to_players);
          this.renderTrackers();
        }
      }
    });
  }

  async loadTrackers() {
    try {
      this.trackers = await invoke('get_trackers', { visibleOnly: true });
      this.renderTrackers();
    } catch (error) {
      console.error('Failed to load trackers:', error);
    }
  }

  renderTrackers() {
    this.#countdownsList.innerHTML = '';

    if (this.trackers.length === 0) {
      this.#countdownsList.innerHTML = '<empty-state message="No active countdowns"></empty-state>';
      return;
    }

    this.trackers.forEach(tracker => {
      const item = document.createElement('countdown-player-item');
      item.setAttribute('name', tracker.name);
      item.setAttribute('current', tracker.current);
      if (tracker.hide_name_from_players) {
        item.setAttribute('hide-name', '');
      }
      this.#countdownsList.appendChild(item);
    });
  }
}

customElements.define('countdown-display', CountdownDisplay);
