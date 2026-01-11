import ExtendedHtmlElement from '../extended-html-element.js';

class FormField extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['label', 'name', 'type', 'value', 'placeholder', 'required', 'min', 'max', 'error-message'];

  #input;
  #label;
  #errorMessage;
  stylesPath = './styles.css';
  templatePath = './template.html';

  get value() {
    if (!this.#input) return '';
    if (this.getStringAttr('type') === 'checkbox') {
      return this.#input.checked;
    }
    return this.#input.value;
  }

  set value(val) {
    if (!this.#input) return;
    if (this.getStringAttr('type') === 'checkbox') {
      this.#input.checked = Boolean(val);
    } else {
      this.#input.value = val;
    }
  }

  get checked() {
    return this.#input?.checked ?? false;
  }

  set checked(val) {
    if (this.#input) {
      this.#input.checked = Boolean(val);
    }
  }

  async setup() {
    this.#label = this.$('label');
    this.#errorMessage = this.$('.error-message');

    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.isSetup && oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const type = this.getStringAttr('type', 'text');
    const label = this.getStringAttr('label');
    const name = this.getStringAttr('name');
    const value = this.getStringAttr('value');
    const placeholder = this.getStringAttr('placeholder');
    const required = this.getBoolAttr('required');
    const min = this.getAttribute('min');
    const max = this.getAttribute('max');
    const errorMessage = this.getStringAttr('error-message', 'This field is required');

    // Update label
    if (this.#label) {
      this.#label.textContent = label;
      this.#label.setAttribute('for', name);
    }

    // Update error message
    if (this.#errorMessage) {
      this.#errorMessage.textContent = errorMessage;
    }

    // Create input element based on type
    const inputContainer = this.$('.input-container');
    if (!inputContainer) return;

    // Check if we need to recreate the input (type changed)
    const existingInput = inputContainer.querySelector('input, select, textarea');
    const existingType = existingInput?.tagName.toLowerCase() === 'select' ? 'select' : existingInput?.type;

    if (existingType !== type) {
      inputContainer.innerHTML = '';

      let inputEl;
      if (type === 'select') {
        inputEl = document.createElement('select');
        inputEl.innerHTML = '<slot name="options"></slot>';
      } else if (type === 'textarea') {
        inputEl = document.createElement('textarea');
      } else {
        inputEl = document.createElement('input');
        inputEl.type = type;
      }

      inputEl.name = name;
      inputEl.id = name;
      inputContainer.appendChild(inputEl);

      // Attach event listeners
      inputEl.addEventListener('input', () => {
        this.clearError();
        this.emit('field-input', { name, value: this.value });
      });

      inputEl.addEventListener('change', () => {
        this.emit('field-change', { name, value: this.value });
      });
    }

    this.#input = inputContainer.querySelector('input, select, textarea');

    if (this.#input) {
      this.#input.name = name;
      this.#input.id = name;

      if (type !== 'select') {
        this.#input.placeholder = placeholder;
        if (type === 'checkbox') {
          this.#input.checked = value === 'true' || value === true;
        } else {
          this.#input.value = value;
        }
      }

      if (required) {
        this.#input.required = true;
      }

      if (min !== null && type === 'number') {
        this.#input.min = min;
      }

      if (max !== null && type === 'number') {
        this.#input.max = max;
      }
    }

    // Handle checkbox layout
    const container = this.$('.form-field');
    if (container) {
      container.classList.toggle('checkbox', type === 'checkbox');
    }
  }

  showError(message) {
    const container = this.$('.form-field');
    if (container) {
      container.classList.add('has-error');
    }
    if (this.#input) {
      this.#input.classList.add('error');
    }
    if (this.#errorMessage && message) {
      this.#errorMessage.textContent = message;
    }
  }

  clearError() {
    const container = this.$('.form-field');
    if (container) {
      container.classList.remove('has-error');
    }
    if (this.#input) {
      this.#input.classList.remove('error');
    }
  }

  focus() {
    this.#input?.focus();
  }
}

customElements.define('form-field', FormField);
