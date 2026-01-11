import ExtendedHtmlElement from '../../extended-html-element.js';
import { getUrgencyClass } from '../../../helpers/urgency-utils.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

class CountdownDisplay extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #countdownsList;
  #currentCampaignId = null;
  trackers = [];
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#countdownsList = this.$('.countdowns-list');

    // Load visible trackers
    await this.loadTrackers();

    // Listen for tracker updates
    await listen('trackers-updated', event => {
      // Only accept updates for the current campaign
      if (event.payload.campaign_id === this.#currentCampaignId) {
        this.trackers = event.payload.trackers.filter(t => t.visible_to_players);
        this.renderTrackers();
      }
    });

    // Listen for campaign changes to reload data
    window.addEventListener('campaign-changed', () => {
      this.loadTrackers();
    });
  }

  async loadTrackers() {
    try {
      // Get current campaign first
      const campaign = await invoke('get_current_campaign');
      this.#currentCampaignId = campaign?.id;

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
      const urgency = getUrgencyClass(tracker.current);
      const displayName = tracker.hide_name_from_players ? '???' : tracker.name;

      const trackerEl = document.createElement('pulse-container');
      trackerEl.setAttribute('urgency', urgency || 'normal');
      trackerEl.className = 'countdown-item';
      trackerEl.setAttribute('data-urgency', urgency || 'normal');

      trackerEl.innerHTML = `
        <div class="countdown-content">
          <h4 class="countdown-name">${displayName}</h4>
          <counter-control value="${tracker.current}" display-only size="large"></counter-control>
        </div>
      `;

      this.#countdownsList.appendChild(trackerEl);
    });
  }
}

customElements.define('countdown-display', CountdownDisplay);
