import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { safeInvoke } from '../../../../helpers/tauri.js';

class EntityCreator extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #modal;
  #nameField;
  #entityTypeSelect;
  #hpMaxField;
  #stressMaxField;
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
    this.#stressMaxField = this.$('form-field[name="stress-max"]');
    this.#minorField = this.$('form-field[name="minor"]');
    this.#majorField = this.$('form-field[name="major"]');
    this.#severeField = this.$('form-field[name="severe"]');

    // Listen for open event from entity list
    document.addEventListener('open-entity-creator', () => {
      this.#modal.openAndFocus(this.#nameField);
    });

    // Setup form submit handler (handles both Enter key and action-button type="submit")
    this.$('form').addEventListener('submit', e => {
      e.preventDefault();
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
    const stressMax = parseInt(this.#stressMaxField.value) || 0;
    const minor = parseInt(this.#minorField.value);
    const major = parseInt(this.#majorField.value);
    const severe = parseInt(this.#severeField.value);

    // Custom validation: thresholds must be in ascending order
    if (minor >= major || major >= severe) {
      this.#minorField.setCustomValidity('Thresholds must be in ascending order: Minor < Major < Severe');
      this.#minorField.reportValidity();
      return;
    }

    const result = await safeInvoke('create_entity', {
      name,
      hpMax,
      stressMax,
      thresholds: {
        minor,
        major,
        severe,
      },
      entityType,
    }, { errorMessage: 'Failed to create adversary' });

    if (result) {
      // Reset form and clear any custom validity
      this.#nameField.value = '';
      this.#hpMaxField.value = '20';
      this.#stressMaxField.value = '0';
      this.#minorField.value = '5';
      this.#majorField.value = '10';
      this.#severeField.value = '15';
      this.#minorField.setCustomValidity(''); // Clear threshold ordering error

      // Close modal
      this.#modal.close();
    }
  }
}

customElements.define('entity-creator', EntityCreator);
