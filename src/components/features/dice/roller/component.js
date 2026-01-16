import ExtendedHtmlElement from '../../../base/extended-html-element.js';

/**
 * Dice bag component with history and custom roll notation support.
 * Supports standard dice notation: NdX+M (e.g., 2d6+3, 1d20, 3d8-2)
 */
class DiceRoller extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  stylesPath = './styles.css';
  templatePath = './template.html';

  #historyList;
  #rollInput;
  #dropZone;
  #dropZoneDice;
  #rolls = [];
  #maxHistory = 50;
  #draggingSides = null;
  #dragGhost = null;
  #isDragging = false;
  #droppedDice = []; // Array of sides values for dice in drop zone

  async setup() {
    this.#historyList = this.$('.history-list');
    this.#rollInput = this.$('.roll-input');
    this.#dropZone = this.$('.drop-zone');
    this.#dropZoneDice = this.$('.drop-zone-dice');

    // Roll dropped dice button
    this.$('.roll-dropped-btn').addEventListener('click', () => {
      this.rollDroppedDice();
    });

    // Setup dice button handlers (click and custom drag)
    this.$$('.dice-btn').forEach(btn => {
      const sides = parseInt(btn.dataset.sides, 10);

      // Track if this is a drag or click
      let startX, startY, hasMoved;

      btn.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startY = e.clientY;
        hasMoved = false;
        this.#draggingSides = sides;

        // Create drag ghost with inline styles (since it's outside shadow DOM)
        const shape = btn.querySelector('.die-shape');
        const computedStyle = getComputedStyle(shape);

        this.#dragGhost = shape.cloneNode(true);
        Object.assign(this.#dragGhost.style, {
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: '9999',
          width: '44px',
          height: '44px',
          transform: 'translate(-50%, -50%) scale(1.2)',
          opacity: '0.9',
          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
          // Copy visual styles from computed
          background: computedStyle.background,
          clipPath: computedStyle.clipPath,
          borderRadius: computedStyle.borderRadius,
          // Flexbox for centering label
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        });

        // Hide initially with opacity (not display, since we need flex)
        this.#dragGhost.style.opacity = '0';
        this.#dragGhost._hidden = true;

        // Style the label inside the ghost
        const label = this.#dragGhost.querySelector('.die-label');
        if (label) {
          Object.assign(label.style, {
            position: 'relative',
            zIndex: '1',
            fontSize: '11px',
            fontWeight: 'bold',
            color: sides === 8 ? '#1a1a1a' : 'white',
            textShadow: sides === 8 ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.3)'
          });
        }

        // Add padding for triangle shapes to position label correctly
        if (sides === 4) {
          this.#dragGhost.style.paddingTop = '12px';
        }

        document.body.appendChild(this.#dragGhost);
        this.updateGhostPosition(e.clientX, e.clientY);
        this.#dragGhost._startX = e.clientX;
        this.#dragGhost._startY = e.clientY;

        this.#isDragging = true;
        btn.classList.add('dragging');
        e.preventDefault();
      });
    });

    // Global mouse move handler
    document.addEventListener('mousemove', (e) => {
      if (this.#isDragging && this.#dragGhost) {
        // Show ghost once moved a bit
        const dx = Math.abs(e.clientX - this.#dragGhost._startX);
        const dy = Math.abs(e.clientY - this.#dragGhost._startY);
        if (dx > 5 || dy > 5) {
          this.#dragGhost.style.opacity = '0.9';
          this.#dragGhost._hidden = false;
        }

        this.updateGhostPosition(e.clientX, e.clientY);

        // Check if over drop zone
        if (this.isOverDropZone(e.clientX, e.clientY)) {
          this.#dropZone.classList.add('drag-over');
        } else {
          this.#dropZone.classList.remove('drag-over');
        }
      }
    });

    // Global mouse up handler
    document.addEventListener('mouseup', (e) => {
      if (this.#isDragging) {
        const wasOverDropZone = this.isOverDropZone(e.clientX, e.clientY);
        const wasDragged = this.#dragGhost && !this.#dragGhost._hidden;

        // Cleanup
        this.#dropZone.classList.remove('drag-over');
        this.$$('.dice-btn').forEach(b => b.classList.remove('dragging'));

        if (this.#dragGhost) {
          this.#dragGhost.remove();
          this.#dragGhost = null;
        }

        // Add to drop zone if dropped there (and was actually dragged)
        if (wasOverDropZone && wasDragged && this.#draggingSides) {
          this.addToDropZone(this.#draggingSides);
        } else if (!wasDragged && this.#draggingSides) {
          // It was a click, not a drag - roll immediately
          this.roll(`1d${this.#draggingSides}`);
        }

        this.#isDragging = false;
        this.#draggingSides = null;
      }
    });

    // Setup custom roll input
    this.$('.roll-btn').addEventListener('click', () => {
      this.rollFromInput();
    });

    this.#rollInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.rollFromInput();
      }
    });

    this.renderHistory();
  }

  updateGhostPosition(x, y) {
    if (this.#dragGhost) {
      this.#dragGhost.style.left = `${x}px`;
      this.#dragGhost.style.top = `${y}px`;
    }
  }

  isOverDropZone(x, y) {
    const rect = this.#dropZone.getBoundingClientRect();
    return (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  }

  addToDropZone(sides) {
    this.#droppedDice.push(sides);
    this.renderDropZone();
  }

  removeFromDropZone(index) {
    this.#droppedDice.splice(index, 1);
    this.renderDropZone();
  }

  renderDropZone() {
    // Update has-dice class
    this.#dropZone.classList.toggle('has-dice', this.#droppedDice.length > 0);

    // Render dice
    this.#dropZoneDice.innerHTML = this.#droppedDice.map((sides, index) => {
      const colors = {
        4: '#e74c3c',
        6: '#e67e22',
        8: '#f1c40f',
        10: '#27ae60',
        12: '#3498db',
        20: '#9b59b6',
        100: '#e91e63'
      };
      const clipPaths = {
        4: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        6: 'polygon(10% 10%, 90% 10%, 90% 90%, 10% 90%)',
        8: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        10: 'polygon(50% 0%, 100% 35%, 80% 100%, 20% 100%, 0% 35%)',
        12: 'polygon(50% 0%, 98% 35%, 79% 91%, 21% 91%, 2% 35%)',
        20: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        100: 'none'
      };
      const label = sides === 100 ? '%' : sides;
      const isD8 = sides === 8;
      const borderRadius = sides === 100 ? '50%' : '0';
      const paddingTop = sides === 4 ? '8px' : '0';

      return `
        <div class="dropped-die ${isD8 ? 'd8' : ''}"
             data-index="${index}"
             style="background: ${colors[sides]};
                    clip-path: ${clipPaths[sides]};
                    border-radius: ${borderRadius};
                    padding-top: ${paddingTop};">
          <span class="die-label">${label}</span>
        </div>
      `;
    }).join('');

    // Add click handlers to remove dice
    this.#dropZoneDice.querySelectorAll('.dropped-die').forEach(die => {
      die.addEventListener('click', () => {
        const index = parseInt(die.dataset.index, 10);
        this.removeFromDropZone(index);
      });
    });
  }

  rollDroppedDice() {
    if (this.#droppedDice.length === 0) return;

    // Roll each die individually and track results
    const diceResults = this.#droppedDice.map(sides => ({
      sides,
      result: this.rollDie(sides)
    }));

    // Group for notation display (e.g., "2d6 + 1d4")
    const groupedNotation = [];
    const diceGroups = {};
    this.#droppedDice.forEach(sides => {
      diceGroups[sides] = (diceGroups[sides] || 0) + 1;
    });

    // Sort by sides for consistent display
    const sortedSides = Object.keys(diceGroups).sort((a, b) => parseInt(b) - parseInt(a));
    sortedSides.forEach(sides => {
      const count = diceGroups[sides];
      groupedNotation.push(`${count}d${sides}`);
    });

    const notation = groupedNotation.join(' + ');
    const total = diceResults.reduce((sum, d) => sum + d.result, 0);

    // Build breakdown string showing each roll
    const breakdownParts = diceResults.map(d => d.result);
    const breakdown = breakdownParts.join(' + ');

    // Check for crits/fumbles (only if single d20)
    const isCrit = this.#droppedDice.length === 1 &&
                   this.#droppedDice[0] === 20 &&
                   diceResults[0].result === 20;
    const isFumble = this.#droppedDice.length === 1 &&
                     this.#droppedDice[0] === 20 &&
                     diceResults[0].result === 1;

    const rollResult = {
      notation,
      isMultiDice: true,
      diceResults,
      breakdown,
      total,
      isCrit,
      isFumble,
      timestamp: Date.now()
    };

    this.#rolls.unshift(rollResult);

    if (this.#rolls.length > this.#maxHistory) {
      this.#rolls = this.#rolls.slice(0, this.#maxHistory);
    }

    this.renderHistory();

    // Clear drop zone
    this.#droppedDice = [];
    this.renderDropZone();
  }

  rollFromInput() {
    const notation = this.#rollInput.value.trim();
    if (notation) {
      this.roll(notation);
    }
  }

  /**
   * Parse and roll dice notation
   * @param {string} notation - Dice notation (e.g., "2d6+3", "1d20", "3d8-2")
   */
  roll(notation) {
    const parsed = this.parseNotation(notation);
    if (!parsed) {
      console.error('Invalid dice notation:', notation);
      return;
    }

    const { count, sides, modifier } = parsed;
    const individualRolls = [];

    for (let i = 0; i < count; i++) {
      individualRolls.push(this.rollDie(sides));
    }

    const diceTotal = individualRolls.reduce((sum, r) => sum + r, 0);
    const total = diceTotal + modifier;

    // Check for crits/fumbles on d20
    const isCrit = sides === 20 && count === 1 && individualRolls[0] === 20;
    const isFumble = sides === 20 && count === 1 && individualRolls[0] === 1;

    const rollResult = {
      notation,
      count,
      sides,
      modifier,
      individualRolls,
      total,
      isCrit,
      isFumble,
      timestamp: Date.now()
    };

    this.#rolls.unshift(rollResult);

    // Trim history if needed
    if (this.#rolls.length > this.#maxHistory) {
      this.#rolls = this.#rolls.slice(0, this.#maxHistory);
    }

    this.renderHistory();
  }

  /**
   * Parse dice notation string
   * @param {string} notation - e.g., "2d6+3", "1d20", "d8", "3d6-1"
   * @returns {{ count: number, sides: number, modifier: number } | null}
   */
  parseNotation(notation) {
    // Match patterns like: 2d6, d20, 3d8+2, 1d6-1
    const match = notation.toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
    if (!match) return null;

    const count = match[1] ? parseInt(match[1], 10) : 1;
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    if (count < 1 || count > 100 || sides < 2 || sides > 1000) {
      return null;
    }

    return { count, sides, modifier };
  }

  /**
   * Roll a single die
   * @param {number} sides - Number of sides
   * @returns {number}
   */
  rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  renderHistory() {
    if (this.#rolls.length === 0) {
      this.#historyList.innerHTML = '<div class="empty-history">No rolls yet. Click a die or enter a roll notation.</div>';
      return;
    }

    this.#historyList.innerHTML = this.#rolls.map((roll, index) => {
      let breakdown = '';

      if (roll.isMultiDice) {
        // Multi-dice roll from drop zone
        breakdown = `(${roll.breakdown})`;
      } else {
        // Standard single notation roll
        const modifierStr = roll.modifier > 0
          ? `+${roll.modifier}`
          : roll.modifier < 0
            ? roll.modifier.toString()
            : '';

        breakdown = roll.count > 1 || roll.modifier !== 0
          ? `[${roll.individualRolls.join('+')}]${modifierStr}`
          : '';
      }

      let resultClass = 'roll-result';
      if (roll.isCrit) resultClass += ' crit';
      if (roll.isFumble) resultClass += ' fumble';

      return `
        <div class="history-item${index === 0 ? ' latest' : ''}">
          <div>
            <span class="roll-notation">${roll.notation}</span>
            ${breakdown ? `<span class="roll-breakdown">${breakdown}</span>` : ''}
          </div>
          <span class="${resultClass}">${roll.total}</span>
        </div>
      `;
    }).join('');
  }
}

customElements.define('dice-roller', DiceRoller);
