import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import '../shape/component.js';
import '../../../layout/flex-column/component.js';
import '../../../layout/flex-row/component.js';

/**
 * Displays the most recent shared dice roll result.
 * Listens for 'dice-roll-shared' events from the dice bag.
 */
class DiceResultDisplay extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  stylesPath = './styles.css';
  templatePath = './template.html';

  #container;
  #diceContainer;
  #totalDisplay;
  #rollTimeout = null;
  #rollingDuration = 1200; // Duration of rolling animation in ms

  async setup() {
    this.#container = this.$('.dice-result-display');
    this.#diceContainer = this.$('.result-dice');
    this.#totalDisplay = this.$('.result-total');

    // Listen for shared dice rolls (auto-cleanup via base class)
    await this.listenTauri('dice-roll-shared', (payload) => {
      this.startRolling(payload);
    });

    // Listen for when sharing is disabled
    await this.listenTauri('dice-roll-hidden', () => {
      this.hideResult();
    });
  }

  hideResult() {
    // Clear any pending roll
    if (this.#rollTimeout) {
      clearTimeout(this.#rollTimeout);
      this.#rollTimeout = null;
    }

    // Hide the result
    this.#container.classList.remove('has-result', 'rolling');
    this.#diceContainer.innerHTML = '';
    this.#totalDisplay.textContent = '';
    this.#totalDisplay.classList.remove('crit', 'fumble');
  }

  startRolling(roll) {
    // Clear any pending result display
    if (this.#rollTimeout) {
      clearTimeout(this.#rollTimeout);
    }

    // Show rolling state
    this.#container.classList.remove('has-result');
    this.#container.classList.add('rolling');

    // After animation, show the result
    this.#rollTimeout = setTimeout(() => {
      this.showResult(roll);
    }, this.#rollingDuration);
  }

  showResult(roll) {
    // Switch from rolling to result
    this.#container.classList.remove('rolling');
    this.#container.classList.add('has-result');

    // Clear previous dice
    this.#diceContainer.innerHTML = '';

    // Render dice
    if (roll.diceResults) {
      roll.diceResults.forEach((d, i) => {
        if (i > 0) {
          const plus = document.createElement('span');
          plus.className = 'roll-operator';
          plus.textContent = '+';
          this.#diceContainer.appendChild(plus);
        }

        const die = document.createElement('die-shape');
        die.setAttribute('sides', d.sides);
        die.setAttribute('result', d.result);
        if (d.colorIndex !== undefined) {
          die.setAttribute('color', d.colorIndex);
        }
        die.style.setProperty('--die-size', '48px');
        this.#diceContainer.appendChild(die);
      });

      // Show modifier if present
      if (roll.modifier && roll.modifier !== 0) {
        const mod = document.createElement('span');
        mod.className = 'roll-modifier';
        mod.textContent = roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier;
        this.#diceContainer.appendChild(mod);
      }
    }

    // Update total
    this.#totalDisplay.textContent = roll.total;
    this.#totalDisplay.classList.toggle('crit', roll.isCrit);
    this.#totalDisplay.classList.toggle('fumble', roll.isFumble);

    // Re-trigger result animation
    this.#container.classList.remove('has-result');
    void this.#container.offsetHeight;
    this.#container.classList.add('has-result');
  }
}

customElements.define('dice-result-display', DiceResultDisplay);
