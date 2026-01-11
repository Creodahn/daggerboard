import ExtendedHtmlElement from '../extended-html-element.js';
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

class FearTracker extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #counter;
  #currentCampaignId = null;
  fearLevel = 0;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#counter = this.shadowRoot.querySelector('counter-control');

    // If no-controls mode, set counter to display-only
    if (this.hasAttribute('no-controls')) {
      this.#counter.setAttribute('display-only', '');
    }

    // Load initial state
    await this.loadFearLevel();

    // Listen for counter changes (only if controls are enabled)
    if (!this.hasAttribute('no-controls')) {
      this.#counter.addEventListener('counter-change', e => {
        this.changeFearLevel(e.detail.delta);
      });
    }

    // Listen for backend updates
    await listen('fear-level-updated', event => {
      // Only accept updates for the current campaign
      if (event.payload.campaign_id === this.#currentCampaignId) {
        this.fearLevel = event.payload.level;
        this.#counter.value = this.fearLevel;
      }
    });

    // Listen for campaign changes to reload data
    window.addEventListener('campaign-changed', async () => {
      await this.loadFearLevel();
    });
  }

  async loadFearLevel() {
    try {
      const campaign = await invoke('get_current_campaign');
      this.#currentCampaignId = campaign?.id;

      this.fearLevel = await invoke('get_fear_level');
      this.#counter.value = this.fearLevel;
    } catch (error) {
      console.error('Failed to load fear level:', error);
    }
  }

  changeFearLevel(amount) {
    invoke('adjust_fear_level', { amount });
  }
}

customElements.define('fear-tracker', FearTracker);
