import ExtendedHtmlElement from '../../base/extended-html-element.js';

class ToggleSwitch extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['checked', 'label', 'name'];

  #checkbox;
  #labelText;
  stylesPath = './styles.css';
  templatePath = './template.html';

  get checked() {
    return this.#checkbox?.checked ?? false;
  }

  set checked(value) {
    if (this.#checkbox) {
      this.#checkbox.checked = Boolean(value);
    }
    if (value) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
  }

  get value() {
    return this.checked;
  }

  setup() {
    this.#checkbox = this.$('input[type="checkbox"]');
    this.#labelText = this.$('.label-text');

    // Set initial state
    this.#checkbox.name = this.getStringAttr('name');
    this.#labelText.textContent = this.getStringAttr('label');

    // Sync initial checked state
    if (this.getBoolAttr('checked')) {
      this.#checkbox.checked = true;
    }

    this.#checkbox.addEventListener('change', e => {
      if (e.target.checked) {
        this.setAttribute('checked', '');
      } else {
        this.removeAttribute('checked');
      }

      this.emit('toggle-change', {
        checked: e.target.checked,
        name: this.getStringAttr('name')
      });
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.#checkbox) return;

    if (name === 'checked') {
      this.#checkbox.checked = newValue !== null;
    }
    if (name === 'label' && this.#labelText) {
      this.#labelText.textContent = newValue || '';
    }
    if (name === 'name') {
      this.#checkbox.name = newValue || '';
    }
  }
}

customElements.define('toggle-switch', ToggleSwitch);
