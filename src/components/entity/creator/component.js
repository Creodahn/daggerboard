import ExtendedHtmlElement from '../../extended-html-element.js';

const { invoke } = window.__TAURI__.core;

class EntityCreator extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #modal;
  #nameField;
  #entityTypeSelect;
  #hpMaxField;
  #minorField;
  #majorField;
  #severeField;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    // Get DOM elements
    this.#modal = this.$('modal-dialog');
    this.#nameField = this.$('form-field[name="name"]');
    this.#entityTypeSelect = this.$('select[name="entity-type"]');
    this.#hpMaxField = this.$('form-field[name="hp-max"]');
    this.#minorField = this.$('form-field[name="minor"]');
    this.#majorField = this.$('form-field[name="major"]');
    this.#severeField = this.$('form-field[name="severe"]');

    // Listen for open event from entity list
    document.addEventListener('open-entity-creator', () => {
      this.#modal.open();
      // Focus name input after modal opens
      setTimeout(() => this.#nameField.focus(), 100);
    });

    // Setup form submit handler (handles Enter key in form fields)
    this.$('form').addEventListener('submit', e => {
      e.preventDefault();
      this.createEntity();
    });

    // Handle action-button click (button is in shadow DOM so can't trigger form submit)
    this.$('action-button.create').addEventListener('action-click', () => {
      this.createEntity();
    });
  }

  clearAllErrors() {
    this.#nameField?.clearError();
    this.#hpMaxField?.clearError();
    this.#minorField?.clearError();
    this.#majorField?.clearError();
    this.#severeField?.clearError();
  }

  async createEntity() {
    this.clearAllErrors();

    const name = this.#nameField.value.trim();
    const entityType = this.#entityTypeSelect.value;
    const hpMax = parseInt(this.#hpMaxField.value);
    const minor = parseInt(this.#minorField.value);
    const major = parseInt(this.#majorField.value);
    const severe = parseInt(this.#severeField.value);

    let hasError = false;

    if (!name) {
      this.#nameField.showError();
      hasError = true;
    }

    if (isNaN(hpMax) || hpMax <= 0) {
      this.#hpMaxField.showError();
      hasError = true;
    }

    if (isNaN(minor) || minor <= 0) {
      this.#minorField.showError();
      hasError = true;
    }

    if (isNaN(major) || major <= 0) {
      this.#majorField.showError();
      hasError = true;
    }

    if (isNaN(severe) || severe <= 0) {
      this.#severeField.showError();
      hasError = true;
    }

    if (!hasError && (minor >= major || major >= severe)) {
      this.#minorField.showError('Thresholds must be in ascending order');
      this.#majorField.showError('Minor < Major < Severe');
      this.#severeField.showError('Minor < Major < Severe');
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
      this.#nameField.value = '';
      this.#hpMaxField.value = '20';
      this.#minorField.value = '5';
      this.#majorField.value = '10';
      this.#severeField.value = '15';

      // Close modal
      this.#modal.close();
    } catch (error) {
      console.error('Failed to create entity:', error);
      alert(`Error: ${error}`);
    }
  }
}

customElements.define('entity-creator', EntityCreator);
