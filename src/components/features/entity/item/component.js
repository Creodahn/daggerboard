import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { debounce } from '../../../../helpers/debounce.js';
import '../../../layout/flex-row/component.js';

class EntityItem extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #entity = null;
  #emitNameChange;
  #allowMassiveDamage = false;
  stylesPath = './styles.css';
  templatePath = './template.html';

  constructor() {
    super();
    // Create debounced name change emitter
    this.#emitNameChange = debounce((id, name) => {
      this.emit('name-change', { id, name });
    }, 500);
  }

  set entity(value) {
    const oldEntity = this.#entity;
    this.#entity = value;

    if (this.isSetup) {
      if (oldEntity?.id === value?.id) {
        // Same entity, just update values
        this.updateDisplay();
      } else {
        // Different entity, full binding
        this.bindEntity();
      }
    }
  }

  get entity() {
    return this.#entity;
  }

  set allowMassiveDamage(value) {
    const changed = this.#allowMassiveDamage !== value;
    this.#allowMassiveDamage = value;

    if (changed && this.isSetup) {
      this.updateMassiveDamageButton();
    }
  }

  get allowMassiveDamage() {
    return this.#allowMassiveDamage;
  }

  async setup() {
    // Attach delegated event listeners
    this.shadowRoot.addEventListener('delete-confirmed', async e => {
      e.stopPropagation();
      const container = this.$('card-container');
      await container.fadeOut();
      this.emit('delete', { id: e.detail.id, name: e.detail.name });
    });

    // Collapse toggle
    this.$('collapse-toggle').addEventListener('collapse-toggle', e => {
      this.$('card-container').classList.toggle('collapsed', !e.detail.expanded);
    });

    // Threshold buttons
    this.$$('.threshold').forEach(btn => {
      btn.addEventListener('click', () => {
        const hpLoss = parseInt(btn.dataset.hpLoss);
        const threshold = btn.dataset.threshold;
        this.emit('threshold-damage', { id: this.#entity.id, hpLoss, threshold });
      });
    });

    // Heal input-group
    this.$('.heal-input-group').addEventListener('action-submit', e => {
      const amount = parseInt(e.detail.value);
      if (!isNaN(amount) && amount > 0) {
        this.emit('heal', { id: this.#entity.id, amount });
      }
    });

    // Stress counter
    this.$('.stress-counter').addEventListener('counter-change', e => {
      const delta = e.detail.delta;
      this.emit('stress-change', { id: this.#entity.id, amount: delta });
    });

    // Name input
    this.$('.entity-name-input').addEventListener('input', e => {
      this.#emitNameChange(this.#entity.id, e.target.value);
    });

    if (this.#entity) {
      this.bindEntity();
    }
  }

  cleanup() {
    this.#emitNameChange.cancel();
  }

  /**
   * Initial binding of entity data to template elements
   */
  bindEntity() {
    if (!this.#entity) return;

    const entity = this.#entity;

    // Type badge
    const typeBadge = this.$('.entity-type-badge');
    typeBadge.setAttribute('type', entity.entity_type);
    typeBadge.setAttribute('label', entity.entity_type === 'adversary' ? 'Adversary' : 'NPC');

    // Visibility toggle
    this.$('visibility-toggle').setAttribute('entity-id', entity.id);

    // Delete trigger
    const deleteTrigger = this.$('delete-trigger');
    deleteTrigger.setAttribute('item-name', entity.name);
    deleteTrigger.setAttribute('item-id', entity.id);

    // Threshold values
    this.$('.minor-value').textContent = entity.thresholds.minor;
    this.$('.major-value').textContent = entity.thresholds.major;
    this.$('.severe-value').textContent = entity.thresholds.severe;
    this.$('.massive-value').textContent = entity.thresholds.severe * 2;

    // Update dynamic values
    this.updateDisplay();
    this.updateMassiveDamageButton();
  }

  /**
   * Update dynamic values without rebuilding DOM
   */
  updateDisplay() {
    if (!this.#entity) return;

    const entity = this.#entity;

    // HP bar
    const hpBar = this.$('hp-bar');
    if (hpBar) {
      hpBar.setAttribute('current', entity.hp_current);
      hpBar.setAttribute('max', entity.hp_max);
    }

    // Stress counter - always show, use 12 as default max
    // Use allow-overflow so increment stays enabled at max (backend handles overflow to HP)
    const stressCounter = this.$('.stress-counter');
    if (stressCounter) {
      const effectiveMax = entity.stress_max > 0 ? entity.stress_max : 12;
      stressCounter.hidden = false;
      stressCounter.setAttribute('value', entity.stress_current);
      stressCounter.setAttribute('max', effectiveMax);
      stressCounter.setAttribute('allow-overflow', '');
    }

    // Visibility toggle
    const visibilityToggle = this.$('visibility-toggle');
    if (visibilityToggle) {
      visibilityToggle.checked = entity.visible_to_players;
    }

    // Name input (only update if not focused to avoid overwriting user input)
    const nameInput = this.$('.entity-name-input');
    if (nameInput && document.activeElement !== nameInput) {
      nameInput.value = entity.name;
    }
  }

  updateMassiveDamageButton() {
    const massiveBtn = this.$('.threshold.massive');
    if (massiveBtn) {
      massiveBtn.hidden = !this.#allowMassiveDamage;
    }
  }
}

customElements.define('entity-item', EntityItem);
