import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { getUrgencyByPercentage } from '../../../../helpers/urgency-utils.js';

/**
 * A player-facing countdown tracker item display.
 * Shows the tracker name and current value with urgency-based pulse animation.
 * Urgency is calculated as a percentage of max, kicking in at ~60% remaining.
 *
 * Usage:
 *   <countdown-player-item
 *     name="Doom Clock"
 *     current="3"
 *     max="10"
 *     hide-name
 *   ></countdown-player-item>
 *
 * Attributes:
 *   - name: Tracker name to display
 *   - current: Current countdown value
 *   - max: Maximum countdown value (for percentage-based urgency)
 *   - hide-name: If present, shows "???" instead of name
 */
class CountdownPlayerItem extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['name', 'current', 'max', 'hide-name'];

  #pulseContainer;
  #nameEl;
  #counterEl;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#pulseContainer = this.$('pulse-container');
    this.#nameEl = this.$('.countdown-name');
    this.#counterEl = this.$('counter-control');

    this.updateDisplay();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.isSetup && oldValue !== newValue) {
      this.updateDisplay();
    }
  }

  updateDisplay() {
    const name = this.getStringAttr('name', '');
    const current = this.getIntAttr('current', 0);
    const max = this.getIntAttr('max', 10);
    const hideName = this.getBoolAttr('hide-name');

    const displayName = hideName ? '???' : name;
    const urgency = getUrgencyByPercentage(current, max);

    this.#nameEl.textContent = displayName;
    this.#counterEl.setAttribute('value', current);
    this.#pulseContainer.setAttribute('urgency', urgency);
  }
}

customElements.define('countdown-player-item', CountdownPlayerItem);
