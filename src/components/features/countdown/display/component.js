import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { CampaignAwareMixin } from '../../../../helpers/campaign-aware-mixin.js';
import { safeInvoke } from '../../../../helpers/tauri.js';

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
    const trackers = await safeInvoke('get_trackers', { visibleOnly: true }, {
      errorMessage: 'Failed to load trackers'
    });
    if (trackers) {
      this.trackers = trackers;
      this.renderTrackers();
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
      item.setAttribute('max', tracker.max);
      if (tracker.hide_name_from_players) {
        item.setAttribute('hide-name', '');
      }
      this.#countdownsList.appendChild(item);
    });
  }
}

customElements.define('countdown-display', CountdownDisplay);
