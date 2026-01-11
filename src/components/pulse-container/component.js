import ExtendedHtmlElement from '../extended-html-element.js';

/**
 * A container component that applies pulse animations based on urgency state.
 *
 * Usage:
 *   <pulse-container urgency="warning">
 *     <div>Content that pulses</div>
 *   </pulse-container>
 *
 * Attributes:
 *   - urgency: 'normal' | 'warning' | 'urgent' | 'critical'
 *   - disabled: Disable animations
 */
class PulseContainer extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['urgency', 'disabled'];

  #container;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#container = this.$('.pulse-container');
    this.updateUrgency();
  }

  attributeChangedCallback() {
    if (this.#container) {
      this.updateUrgency();
    }
  }

  updateUrgency() {
    if (!this.#container) return;

    const urgency = this.getStringAttr('urgency', 'normal');
    const disabled = this.getBoolAttr('disabled');

    this.#container.classList.remove('urgency-warning', 'urgency-urgent', 'urgency-critical');

    if (!disabled && urgency !== 'normal') {
      this.#container.classList.add(`urgency-${urgency}`);
    }
  }
}

customElements.define('pulse-container', PulseContainer);
