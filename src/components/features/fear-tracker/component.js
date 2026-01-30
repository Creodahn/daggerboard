import ExtendedHtmlElement from '../../base/extended-html-element.js';
import { CampaignAwareMixin } from '../../../helpers/campaign-aware-mixin.js';
import { safeInvoke } from '../../../helpers/tauri.js';

class FearTracker extends CampaignAwareMixin(ExtendedHtmlElement) {
  static moduleUrl = import.meta.url;
  #counter;
  fearLevel = 0;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#counter = this.$('counter-control');

    // If no-controls mode (player view), set counter to display-only
    // Otherwise (dashboard), show the max value
    if (this.getBoolAttr('no-controls')) {
      this.#counter.setAttribute('display-only', '');
    } else {
      this.#counter.setAttribute('show-max', '12');
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
    const level = await safeInvoke('get_fear_level', {}, {
      errorMessage: 'Failed to load fear level'
    });

    if (level !== null) {
      this.fearLevel = level;
      this.#counter.value = this.fearLevel;
      this.updateScale();
    }
  }

  changeFearLevel(amount) {
    safeInvoke('adjust_fear_level', { amount }, {
      errorMessage: 'Failed to adjust fear level'
    });
  }
}

customElements.define('fear-tracker', FearTracker);
