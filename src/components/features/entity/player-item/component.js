import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { getHealthPercentage, getNpcHealthClass } from '../../../../helpers/health-utils.js';

/**
 * A player-facing entity item display.
 * Shows the entity name with appropriate styling based on type and health.
 *
 * Usage:
 *   <entity-player-item
 *     entity-id="abc123"
 *     name="Goblin"
 *     type="enemy"
 *   ></entity-player-item>
 *
 *   <entity-player-item
 *     entity-id="xyz789"
 *     name="Innkeeper"
 *     type="npc"
 *     hp-current="15"
 *     hp-max="20"
 *   ></entity-player-item>
 *
 * Attributes:
 *   - entity-id: Unique entity ID (used for flash animations)
 *   - name: Entity name to display
 *   - type: 'enemy' | 'npc'
 *   - hp-current: Current HP (for NPCs, determines health styling)
 *   - hp-max: Maximum HP (for NPCs)
 *
 * Methods:
 *   - flash(type): Trigger heal/damage flash animation
 */
class EntityPlayerItem extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['entity-id', 'name', 'type', 'hp-current', 'hp-max'];

  #flashContainer;
  #nameEl;
  #itemEl;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#flashContainer = this.$('flash-container');
    this.#nameEl = this.$('.entity-name');
    this.#itemEl = this.$('.entity-item');

    this.updateDisplay();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.isSetup && oldValue !== newValue) {
      this.updateDisplay();
    }
  }

  updateDisplay() {
    const name = this.getStringAttr('name', '');
    const type = this.getStringAttr('type', 'enemy');
    const hpCurrent = this.getIntAttr('hp-current', 0);
    const hpMax = this.getIntAttr('hp-max', 1);

    this.#nameEl.textContent = name;

    // Remove only health-related classes to preserve transition
    this.#itemEl.classList.remove(
      'npc-item',
      'health-good',
      'health-warning',
      'health-danger',
      'health-critical',
      'health-dead'
    );

    if (type === 'npc') {
      this.#itemEl.classList.add('npc-item');
      const healthPercent = getHealthPercentage(hpCurrent, hpMax);
      const healthClass = getNpcHealthClass(healthPercent);
      if (healthClass) {
        this.#itemEl.classList.add(healthClass);
      }
    }
  }

  /**
   * Trigger a flash animation
   * @param {'heal' | 'damage'} type
   */
  async flash(type) {
    if (this.#flashContainer) {
      // Wait for flash-container to be ready
      await this.#flashContainer.ready;
      this.#flashContainer.flash(type);
    }
  }
}

customElements.define('entity-player-item', EntityPlayerItem);
