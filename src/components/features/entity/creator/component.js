import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { invoke } from '../../../../helpers/tauri.js';

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
      this.#modal.openAndFocus(this.#nameField);
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

  async createEntity() {
    // Use native form validation for required fields and min/max
    const fields = [this.#nameField, this.#hpMaxField, this.#minorField, this.#majorField, this.#severeField];
    const allValid = fields.every(field => field.checkValidity());

    if (!allValid) {
      // Find first invalid field and show native validation UI
      const firstInvalid = fields.find(field => !field.checkValidity());
      firstInvalid?.reportValidity();
      return;
    }

    const name = this.#nameField.value.trim();
    const entityType = this.#entityTypeSelect.value;
    const hpMax = parseInt(this.#hpMaxField.value);
    const minor = parseInt(this.#minorField.value);
    const major = parseInt(this.#majorField.value);
    const severe = parseInt(this.#severeField.value);

    // Custom validation: thresholds must be in ascending order
    if (minor >= major || major >= severe) {
      this.#minorField.setCustomValidity('Thresholds must be in ascending order: Minor < Major < Severe');
      this.#minorField.reportValidity();
      return;
    }

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

      // Reset form and clear any custom validity
      this.#nameField.value = '';
      this.#hpMaxField.value = '20';
      this.#minorField.value = '5';
      this.#majorField.value = '10';
      this.#severeField.value = '15';
      this.#minorField.setCustomValidity(''); // Clear threshold ordering error

      // Close modal
      this.#modal.close();
    } catch (error) {
      console.error('Failed to create entity:', error);
      alert(`Error: ${error}`);
    }
  }
}

customElements.define('entity-creator', EntityCreator);
