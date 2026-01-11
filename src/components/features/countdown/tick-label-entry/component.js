import ExtendedHtmlElement from '../../../base/extended-html-element.js';

/**
 * A tick label entry for the countdown tracker editor.
 * Contains tick number input, label text input, and remove button.
 *
 * Usage:
 *   <tick-label-entry max="10"></tick-label-entry>
 *
 * Attributes:
 *   - max: Maximum tick value allowed
 *   - tick: Pre-set tick value
 *   - label: Pre-set label text
 *
 * Properties:
 *   - tick: Get/set the tick number
 *   - label: Get/set the label text
 *
 * Events:
 *   - remove: Fired when remove button is clicked
 *   - change: { tick, label } - Fired when values change
 */
class TickLabelEntry extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['max', 'tick', 'label'];

  #tickInput;
  #labelInput;
  #removeBtn;
  stylesPath = './styles.css';
  templatePath = './template.html';

  get tick() {
    return parseInt(this.#tickInput?.value) || 0;
  }

  set tick(value) {
    if (this.#tickInput) {
      this.#tickInput.value = value;
    }
  }

  get label() {
    return this.#labelInput?.value?.trim() || '';
  }

  set label(value) {
    if (this.#labelInput) {
      this.#labelInput.value = value;
    }
  }

  get isValid() {
    return !isNaN(this.tick) && this.label !== '';
  }

  setup() {
    this.#tickInput = this.$('.tick-input');
    this.#labelInput = this.$('.label-input');
    this.#removeBtn = this.$('action-button');

    this.updateMax();

    // Set initial values from attributes
    const tickAttr = this.getStringAttr('tick');
    if (tickAttr) {
      this.#tickInput.value = tickAttr;
    }

    const labelAttr = this.getStringAttr('label');
    if (labelAttr) {
      this.#labelInput.value = labelAttr;
    }

    // Remove button
    this.#removeBtn.addEventListener('action-click', () => {
      this.emit('remove');
    });

    // Value change events
    this.#tickInput.addEventListener('input', () => this.emitChange());
    this.#labelInput.addEventListener('input', () => this.emitChange());
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isSetup) return;

    if (name === 'max') {
      this.updateMax();
    }
    if (name === 'tick' && this.#tickInput) {
      this.#tickInput.value = newValue || '';
    }
    if (name === 'label' && this.#labelInput) {
      this.#labelInput.value = newValue || '';
    }
  }

  updateMax() {
    const max = this.getIntAttr('max', 10);
    if (this.#tickInput) {
      this.#tickInput.max = max;
    }
  }

  emitChange() {
    this.emit('change', {
      tick: this.tick,
      label: this.label
    });
  }

  focus() {
    this.#tickInput?.focus();
  }

  clear() {
    if (this.#tickInput) this.#tickInput.value = '';
    if (this.#labelInput) this.#labelInput.value = '';
  }
}

customElements.define('tick-label-entry', TickLabelEntry);
