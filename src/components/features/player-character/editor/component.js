import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { CampaignAwareMixin } from '../../../../helpers/campaign-aware-mixin.js';
import { invoke } from '../../../../helpers/tauri.js';
import '../../../overlays/modal-dialog/component.js';
import '../../../ui/form-field/component.js';
import '../../../ui/action-button/component.js';
import '../../../layout/flex-row/component.js';

class PlayerCharacterEditor extends CampaignAwareMixin(ExtendedHtmlElement) {
  static moduleUrl = import.meta.url;

  #modal;
  #form;
  #editingId = null;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#modal = this.$('modal-dialog');
    this.#form = this.$('.character-form');

    // Form submission
    this.#form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveCharacter();
    });

    // Cancel button
    this.$('.cancel-btn').addEventListener('action-click', () => {
      this.close();
    });

    // Modal close
    this.#modal.addEventListener('modal-close', () => {
      this.resetForm();
    });

    // Setup campaign awareness (just for currentCampaignId)
    await this.setupCampaignAwareness({
      loadData: () => {}
    });
  }

  open(characterId = null) {
    this.#editingId = characterId;

    if (characterId) {
      this.loadCharacter(characterId);
      this.#modal.setAttribute('title', 'Edit Character');
      this.$('.save-btn').textContent = 'Save Changes';
    } else {
      this.resetForm();
      this.#modal.setAttribute('title', 'Create Character');
      this.$('.save-btn').textContent = 'Create Character';
    }

    this.#modal.open();
  }

  close() {
    this.#modal.close();
  }

  async loadCharacter(id) {
    try {
      const character = await invoke('get_player_character', { id });
      this.populateForm(character);
    } catch (error) {
      console.error('Failed to load character:', error);
    }
  }

  populateForm(c) {
    this.setFieldValue('name', c.name);
    this.setFieldValue('ancestry', c.ancestry || '');
    this.setFieldValue('community', c.community || '');
    this.setFieldValue('class', c.class || '');
    this.setFieldValue('subclass', c.subclass || '');
    this.setFieldValue('domain', c.domain || '');
    this.setFieldValue('level', c.level);
    this.setFieldValue('attr_agility', c.attr_agility);
    this.setFieldValue('attr_strength', c.attr_strength);
    this.setFieldValue('attr_finesse', c.attr_finesse);
    this.setFieldValue('attr_instinct', c.attr_instinct);
    this.setFieldValue('attr_presence', c.attr_presence);
    this.setFieldValue('attr_knowledge', c.attr_knowledge);
    this.setFieldValue('hp_max', c.hp_max);
    this.setFieldValue('armor_max', c.armor_max);
    this.setFieldValue('evasion', c.evasion);
    this.setFieldValue('threshold_minor', c.threshold_minor);
    this.setFieldValue('threshold_major', c.threshold_major);
    this.setFieldValue('threshold_severe', c.threshold_severe);
    this.setFieldValue('stress_max', c.stress_max);
  }

  setFieldValue(name, value) {
    const field = this.$(`form-field[name="${name}"]`);
    if (field) {
      field.value = value;
    }
  }

  getFieldValue(name) {
    const field = this.$(`form-field[name="${name}"]`);
    return field ? field.value : null;
  }

  resetForm() {
    this.#editingId = null;

    // Clear any validation errors
    this.clearValidationErrors();

    // Reset to defaults
    this.setFieldValue('name', '');
    this.setFieldValue('ancestry', '');
    this.setFieldValue('community', '');
    this.setFieldValue('class', '');
    this.setFieldValue('subclass', '');
    this.setFieldValue('domain', '');
    this.setFieldValue('level', 1);
    this.setFieldValue('attr_agility', 0);
    this.setFieldValue('attr_strength', 0);
    this.setFieldValue('attr_finesse', 0);
    this.setFieldValue('attr_instinct', 0);
    this.setFieldValue('attr_presence', 0);
    this.setFieldValue('attr_knowledge', 0);
    this.setFieldValue('hp_max', 6);
    this.setFieldValue('armor_max', 0);
    this.setFieldValue('evasion', 0);
    this.setFieldValue('threshold_minor', 1);
    this.setFieldValue('threshold_major', 6);
    this.setFieldValue('threshold_severe', 11);
    this.setFieldValue('stress_max', 6);
  }

  /**
   * Validate all form fields
   * @returns {boolean} True if form is valid
   */
  validateForm() {
    // Clear previous validation errors
    this.clearValidationErrors();

    // Get all form fields
    const fields = this.$$('form-field');
    let isValid = true;
    let firstInvalid = null;

    // Check native validation on all fields
    fields.forEach(field => {
      if (!field.checkValidity()) {
        isValid = false;
        if (!firstInvalid) {
          firstInvalid = field;
        }
      }
    });

    // Custom validation: threshold ordering (Minor < Major < Severe)
    const minor = parseInt(this.getFieldValue('threshold_minor'), 10) || 0;
    const major = parseInt(this.getFieldValue('threshold_major'), 10) || 0;
    const severe = parseInt(this.getFieldValue('threshold_severe'), 10) || 0;

    if (minor >= major) {
      const minorField = this.$('form-field[name="threshold_minor"]');
      minorField.showError('Minor must be less than Major');
      isValid = false;
      if (!firstInvalid) firstInvalid = minorField;
    }

    if (major >= severe) {
      const majorField = this.$('form-field[name="threshold_major"]');
      majorField.showError('Major must be less than Severe');
      isValid = false;
      if (!firstInvalid) firstInvalid = majorField;
    }

    // Report validity on first invalid field
    if (firstInvalid) {
      firstInvalid.reportValidity();
    }

    return isValid;
  }

  /**
   * Clear all validation errors from form fields
   */
  clearValidationErrors() {
    const fields = this.$$('form-field');
    fields.forEach(field => {
      field.clearError();
    });
  }

  async saveCharacter() {
    // Validate all fields
    if (!this.validateForm()) {
      return;
    }

    const data = {
      name: this.getFieldValue('name'),
      ancestry: this.getFieldValue('ancestry') || null,
      community: this.getFieldValue('community') || null,
      class: this.getFieldValue('class') || null,
      subclass: this.getFieldValue('subclass') || null,
      domain: this.getFieldValue('domain') || null,
      level: parseInt(this.getFieldValue('level'), 10) || 1,
      attr_agility: parseInt(this.getFieldValue('attr_agility'), 10) || 0,
      attr_strength: parseInt(this.getFieldValue('attr_strength'), 10) || 0,
      attr_finesse: parseInt(this.getFieldValue('attr_finesse'), 10) || 0,
      attr_instinct: parseInt(this.getFieldValue('attr_instinct'), 10) || 0,
      attr_presence: parseInt(this.getFieldValue('attr_presence'), 10) || 0,
      attr_knowledge: parseInt(this.getFieldValue('attr_knowledge'), 10) || 0,
      hp_max: parseInt(this.getFieldValue('hp_max'), 10) || 6,
      armor_max: parseInt(this.getFieldValue('armor_max'), 10) || 0,
      evasion: parseInt(this.getFieldValue('evasion'), 10) || 0,
      threshold_minor: parseInt(this.getFieldValue('threshold_minor'), 10) || 1,
      threshold_major: parseInt(this.getFieldValue('threshold_major'), 10) || 6,
      threshold_severe: parseInt(this.getFieldValue('threshold_severe'), 10) || 11,
      stress_max: parseInt(this.getFieldValue('stress_max'), 10) || 6,
    };

    try {
      if (this.#editingId) {
        await invoke('update_player_character', {
          id: this.#editingId,
          data
        });
      } else {
        await invoke('create_player_character', {
          campaignId: this.currentCampaignId,
          data
        });
      }

      this.close();
    } catch (error) {
      console.error('Failed to save character:', error);
    }
  }
}

customElements.define('player-character-editor', PlayerCharacterEditor);
