import ExtendedHtmlElement from '../../extended-html-element.js';

const { invoke } = window.__TAURI__.core;

class EntityCreator extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #nameInput;
  #entityTypeSelect;
  #hpMaxInput;
  #minorInput;
  #majorInput;
  #severeInput;
  #createButton;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    // Get DOM elements
    this.#nameInput = this.shadowRoot.querySelector('input[name="name"]');
    this.#entityTypeSelect = this.shadowRoot.querySelector('select[name="entity-type"]');
    this.#hpMaxInput = this.shadowRoot.querySelector('input[name="hp-max"]');
    this.#minorInput = this.shadowRoot.querySelector('input[name="minor"]');
    this.#majorInput = this.shadowRoot.querySelector('input[name="major"]');
    this.#severeInput = this.shadowRoot.querySelector('input[name="severe"]');
    this.#createButton = this.shadowRoot.querySelector('button.create');

    const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
    const closeBtn = this.shadowRoot.querySelector('.close-modal');

    // Listen for open event from entity list
    document.addEventListener('open-entity-creator', () => {
      backdrop.classList.remove('hidden');
      this.#nameInput.focus();
    });

    // Close modal handlers
    closeBtn.addEventListener('click', () => {
      backdrop.classList.add('hidden');
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.add('hidden');
      }
    });

    // Setup form submit handler (handles both Enter key and button click)
    this.shadowRoot.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      this.createEntity();
    });

    // Clear errors on input
    this.#nameInput.addEventListener('input', () => this.clearError(this.#nameInput));
    this.#hpMaxInput.addEventListener('input', () => this.clearError(this.#hpMaxInput));
    this.#minorInput.addEventListener('input', () => this.clearError(this.#minorInput));
    this.#majorInput.addEventListener('input', () => this.clearError(this.#majorInput));
    this.#severeInput.addEventListener('input', () => this.clearError(this.#severeInput));
  }

  showError(input, message) {
    input.classList.add('error');
    const errorMsg = this.shadowRoot.querySelector(`[data-for="${input.name}"]`);
    if (errorMsg) {
      if (message) {
        errorMsg.textContent = message;
      }
      errorMsg.classList.add('show');
    }
  }

  clearError(input) {
    input.classList.remove('error');
    const errorMsg = this.shadowRoot.querySelector(`[data-for="${input.name}"]`);
    if (errorMsg) {
      errorMsg.classList.remove('show');
    }
  }

  clearAllErrors() {
    this.shadowRoot.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    this.shadowRoot.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
  }

  async createEntity() {
    this.clearAllErrors();

    const name = this.#nameInput.value.trim();
    const entityType = this.#entityTypeSelect.value;
    const hpMax = parseInt(this.#hpMaxInput.value);
    const minor = parseInt(this.#minorInput.value);
    const major = parseInt(this.#majorInput.value);
    const severe = parseInt(this.#severeInput.value);

    let hasError = false;

    if (!name) {
      this.showError(this.#nameInput);
      hasError = true;
    }

    if (isNaN(hpMax) || hpMax <= 0) {
      this.showError(this.#hpMaxInput);
      hasError = true;
    }

    if (isNaN(minor) || minor <= 0) {
      this.showError(this.#minorInput);
      hasError = true;
    }

    if (isNaN(major) || major <= 0) {
      this.showError(this.#majorInput);
      hasError = true;
    }

    if (isNaN(severe) || severe <= 0) {
      this.showError(this.#severeInput);
      hasError = true;
    }

    if (!hasError && (minor >= major || major >= severe)) {
      this.showError(this.#minorInput, 'Thresholds must be in ascending order');
      this.showError(this.#majorInput, 'Minor < Major < Severe');
      this.showError(this.#severeInput, 'Minor < Major < Severe');
      hasError = true;
    }

    if (hasError) return;

    try {
      await invoke('create_entity', {
        name,
        hpMax,
        thresholds: {
          minor,
          major,
          severe,
        },
        entityType,
      });

      // Reset form
      this.#nameInput.value = '';
      this.#hpMaxInput.value = '';
      this.#minorInput.value = '';
      this.#majorInput.value = '';
      this.#severeInput.value = '';

      this.#nameInput.focus();

      // Close modal
      this.shadowRoot.querySelector('.modal-backdrop').classList.add('hidden');
    } catch (error) {
      console.error('Failed to create entity:', error);
      alert(`Error: ${error}`);
    }
  }
}

customElements.define('entity-creator', EntityCreator);
