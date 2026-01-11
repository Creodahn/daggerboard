import ExtendedHtmlElement from '../extended-html-element.js';
import { CampaignAwareMixin } from '../../helpers/campaign-aware-mixin.js';

const { invoke } = window.__TAURI__.core;

class FearTracker extends CampaignAwareMixin(ExtendedHtmlElement) {
  static moduleUrl = import.meta.url;
  #counter;
  fearLevel = 0;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#counter = this.$('counter-control');

    // If no-controls mode, set counter to display-only
    if (this.getBoolAttr('no-controls')) {
      this.#counter.setAttribute('display-only', '');
    }

    // Setup campaign awareness
    await this.setupCampaignAwareness({
      loadData: () => this.loadFearLevel(),
      events: {
        'fear-level-updated': (payload) => {
          this.fearLevel = payload.level;
          this.#counter.value = this.fearLevel;
        }
      }
    });

    // Listen for counter changes (only if controls are enabled)
    if (!this.getBoolAttr('no-controls')) {
      this.#counter.addEventListener('counter-change', e => {
        this.changeFearLevel(e.detail.delta);
      });
    }
  }

  async loadFearLevel() {
    try {
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
