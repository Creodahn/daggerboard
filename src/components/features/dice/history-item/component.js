import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { formatTime } from '../../../../helpers/date-utils.js';
import { safeJsonParse } from '../../../../helpers/string-utils.js';
import '../shape/component.js';

/**
 * A single roll item in the dice history.
 *
 * Usage:
 *   const item = document.createElement('dice-history-item');
 *   item.roll = rollData;
 *   item.latest = true;
 *
 * Properties:
 *   - roll: The roll data object from the database
 *   - latest: Whether this is the most recent roll
 *
 * Events:
 *   - delete-roll: { id } - Emitted when the delete button is clicked
 */
class DiceHistoryItem extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;

  #roll = null;
  #latest = false;

  stylesPath = './styles.css';
  templatePath = './template.html';

  get roll() {
    return this.#roll;
  }

  set roll(value) {
    this.#roll = value;
    if (this.isSetup) {
      this.updateDisplay();
    }
  }

  get latest() {
    return this.#latest;
  }

  set latest(value) {
    this.#latest = value;
    if (this.isSetup) {
      this.updateLatestState();
    }
  }

  async setup() {
    // Setup delete button handler
    this.$('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.#roll) {
        this.emit('delete-roll', { id: this.#roll.id });
      }
    });

    if (this.#roll) {
      this.updateDisplay();
    }
    this.updateLatestState();
  }

  updateLatestState() {
    const container = this.$('.history-item');
    if (container) {
      container.classList.toggle('latest', this.#latest);
    }
  }

  updateDisplay() {
    if (!this.#roll) return;

    const roll = this.#roll;
    const diceContainer = this.$('.roll-dice');
    const timeEl = this.$('.roll-time');
    const resultEl = this.$('.roll-result');

    // Parse dice_data from JSON string if needed
    const diceResults = safeJsonParse(roll.dice_data, []);

    // Render dice
    diceContainer.innerHTML = '';
    if (diceResults && diceResults.length > 0) {
      diceResults.forEach((d, i) => {
        if (i > 0) {
          const plus = document.createElement('span');
          plus.className = 'roll-operator';
          plus.textContent = '+';
          diceContainer.appendChild(plus);
        }
        const die = document.createElement('die-shape');
        die.setAttribute('sides', d.sides);
        die.setAttribute('result', d.result);
        if (d.colorIndex !== undefined) {
          die.setAttribute('color', d.colorIndex);
        }
        die.style.setProperty('--die-size', '28px');
        diceContainer.appendChild(die);
      });

      // Show modifier if present
      if (roll.modifier && roll.modifier !== 0) {
        const mod = document.createElement('span');
        mod.className = 'roll-modifier';
        mod.textContent = roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier;
        diceContainer.appendChild(mod);
      }
    }

    // Time
    timeEl.textContent = formatTime(roll.rolled_at);

    // Result
    resultEl.textContent = roll.total;
    resultEl.classList.toggle('crit', roll.is_crit);
    resultEl.classList.toggle('fumble', roll.is_fumble);

    this.updateLatestState();
  }
}

customElements.define('dice-history-item', DiceHistoryItem);
