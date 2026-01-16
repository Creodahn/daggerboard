import ExtendedHtmlElement from '../../base/extended-html-element.js';
import { CampaignAwareMixin } from '../../../helpers/campaign-aware-mixin.js';

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
          this.updateScale();
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

  updateScale() {
    // Only apply to player view (no-controls mode)
    if (!this.getBoolAttr('no-controls')) return;

    // Set CSS custom property for CSS-based scaling calculations
    const level = Math.min(this.fearLevel, 12);
    this.style.setProperty('--fear-level', level);

    // Animate for any fear > 0, with speed increasing as level rises
    if (level > 0) {
      // Duration: 5s at level 1, decreasing to ~0.4s at level 12
      // Formula: 5 / level, with minimum of 0.3s
      const duration = Math.max(5 / level, 0.3);
      this.#counter.style.setProperty('--pulse-duration', `${duration}s`);
      this.#counter.classList.add('pulsing');
    } else {
      this.#counter.classList.remove('pulsing');
    }
  }

  async loadFearLevel() {
    try {
      this.fearLevel = await invoke('get_fear_level');
      this.#counter.value = this.fearLevel;
      this.updateScale();
    } catch (error) {
      console.error('Failed to load fear level:', error);
    }
  }

  changeFearLevel(amount) {
    invoke('adjust_fear_level', { amount });
  }
}

customElements.define('fear-tracker', FearTracker);
