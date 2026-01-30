import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { formatRelativeDate } from '../../../../helpers/date-utils.js';
import { safeJsonParse } from '../../../../helpers/string-utils.js';
import '../shape/component.js';
import '../history-item/component.js';
import '../../../ui/input-group/component.js';
import '../../../ui/toggle-switch/component.js';
import '../../../ui/action-button/component.js';
import '../../../ui/collapsible-section/component.js';
import '../../../layout/flex-row/component.js';
import '../../../layout/split-panel/component.js';
import { emit, safeInvoke } from '../../../../helpers/tauri.js';

/**
 * Dice bag component with history and custom roll notation support.
 * Supports standard dice notation: NdX+M (e.g., 2d6+3, 1d20, 3d8-2)
 * Persists rolls to the database organized by date.
 */
class DiceRoller extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  stylesPath = './styles.css';
  templatePath = './template.html';

  #historyList;
  #rollInput;
  #dropZone;
  #dropZoneDice;
  #shareCheckbox;
  #rollsByDate = []; // Array of { date, rolls, expanded }
  #campaignId = null;
  #draggingSides = null;
  #dragGhost = null;
  #isDragging = false;
  #droppedDice = []; // Array of { sides, colorIndex } for dice in drop zone
  #nextColorIndex = 0;
  #maxColors = 10;

  async setup() {
    this.#historyList = this.$('.history-list');
    this.#rollInput = this.$('.roll-input-group');
    this.#dropZone = this.$('.drop-zone');
    this.#dropZoneDice = this.$('.drop-zone-dice');
    this.#shareCheckbox = this.$('.share-toggle');

    // Get current campaign and load rolls
    await this.loadCampaignAndRolls();

    // Listen for campaign changes
    this.listenTauri('current-campaign-changed', () => this.loadCampaignAndRolls());

    // Listen for rolls saved from this or other windows
    this.listenTauri('dice-roll-saved', () => this.loadRolls({ expandFirst: true }));

    // Roll dropped dice button
    this.$('.roll-dropped-btn').addEventListener('action-click', () => {
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

        // Create drag ghost using die-shape component
        this.#dragGhost = document.createElement('die-shape');
        this.#dragGhost.setAttribute('sides', sides);
        Object.assign(this.#dragGhost.style, {
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: '9999',
          '--die-size': '52px',
          transform: 'translate(-50%, -50%)',
          opacity: '0',
          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
        });
        this.#dragGhost._hidden = true;
        this.#dragGhost._startX = e.clientX;
        this.#dragGhost._startY = e.clientY;

        document.body.appendChild(this.#dragGhost);
        this.updateGhostPosition(e.clientX, e.clientY);

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
    this.#rollInput.addEventListener('action-submit', (e) => {
      const notation = e.detail.value.trim();
      if (notation) {
        this.roll(notation);
      }
    });

    // When share toggle is enabled, share the most recent roll from today
    // When disabled, hide the result from the player view
    this.#shareCheckbox.addEventListener('toggle-change', (e) => {
      if (e.detail.checked) {
        this.shareLatestRoll();
      } else {
        emit('dice-roll-hidden');
      }
    });
  }

  /**
   * Share the most recent roll from today with players (if any exists)
   */
  shareLatestRoll() {
    if (this.#rollsByDate.length === 0) return;

    // Check if the first group is today
    const firstGroup = this.#rollsByDate[0];
    const today = new Date().toISOString().split('T')[0];

    if (firstGroup.date === today && firstGroup.rolls.length > 0) {
      const latestRoll = firstGroup.rolls[0];

      // Parse dice_data if it's a string
      const diceResults = safeJsonParse(latestRoll.dice_data, []);

      // Emit in the format expected by the player view
      emit('dice-roll-shared', {
        notation: latestRoll.notation,
        diceResults,
        total: latestRoll.total,
        modifier: latestRoll.modifier || 0,
        isCrit: latestRoll.is_crit,
        isFumble: latestRoll.is_fumble
      });
    }
  }

  async loadCampaignAndRolls() {
    const campaign = await safeInvoke('get_current_campaign', {}, {
      errorMessage: 'Failed to load campaign'
    });
    this.#campaignId = campaign?.id;
    await this.loadRolls();
  }

  async loadRolls({ expandFirst = false } = {}) {
    if (!this.#campaignId) {
      this.#rollsByDate = [];
      this.renderHistory();
      return;
    }

    const rollsByDate = await safeInvoke('get_dice_rolls_by_date', {
      campaignId: this.#campaignId,
      limit: 100
    }, { errorMessage: 'Failed to load rolls' });

    if (!rollsByDate) return;

    // Preserve expanded state from existing groups, or default to first expanded
    const existingState = new Map(
      this.#rollsByDate.map(g => [g.date, g.expanded])
    );

    this.#rollsByDate = rollsByDate.map((group, index) => {
      // If expandFirst is true, always expand the first group (new roll just added)
      if (index === 0 && expandFirst) {
        return { ...group, expanded: true, animateOpen: true };
      }
      // Otherwise preserve existing state or default to first expanded
      const wasExpanded = existingState.get(group.date);
      return {
        ...group,
        expanded: wasExpanded !== undefined ? wasExpanded : index === 0,
        animateOpen: false
      };
    });

    this.renderHistory();
  }

  async saveRoll(rollResult) {
    if (!this.#campaignId) return;

    await safeInvoke('save_dice_roll', {
      campaignId: this.#campaignId,
      notation: rollResult.notation,
      diceData: JSON.stringify(rollResult.diceResults || []),
      modifier: rollResult.modifier || 0,
      total: rollResult.total,
      isCrit: rollResult.isCrit || false,
      isFumble: rollResult.isFumble || false,
      sharedWithPlayers: this.#shareCheckbox.checked
    }, { errorMessage: 'Failed to save roll' });
    // The dice-roll-saved event will trigger a reload
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
    const colorIndex = this.#nextColorIndex;
    this.#nextColorIndex = (this.#nextColorIndex + 1) % this.#maxColors;
    this.#droppedDice.push({ sides, colorIndex });
    this.renderDropZone();
  }

  removeFromDropZone(index) {
    this.#droppedDice.splice(index, 1);
    this.renderDropZone();
  }

  renderDropZone() {
    // Update has-dice class
    this.#dropZone.classList.toggle('has-dice', this.#droppedDice.length > 0);

    // Clear and re-render dice
    this.#dropZoneDice.innerHTML = '';

    this.#droppedDice.forEach((die, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'dropped-die';
      wrapper.dataset.index = index;

      const dieShape = document.createElement('die-shape');
      dieShape.setAttribute('sides', die.sides);
      dieShape.setAttribute('color', die.colorIndex);
      dieShape.style.setProperty('--die-size', '36px');

      wrapper.appendChild(dieShape);
      this.#dropZoneDice.appendChild(wrapper);

      // Click to remove
      wrapper.addEventListener('click', () => {
        this.removeFromDropZone(index);
      });
    });
  }

  rollDroppedDice() {
    if (this.#droppedDice.length === 0) return;

    // Roll each die individually and track results with color
    const diceResults = this.#droppedDice.map(die => ({
      sides: die.sides,
      colorIndex: die.colorIndex,
      result: this.rollDie(die.sides)
    }));

    // Group for notation display (e.g., "2d6 + 1d4")
    const groupedNotation = [];
    const diceGroups = {};
    this.#droppedDice.forEach(die => {
      diceGroups[die.sides] = (diceGroups[die.sides] || 0) + 1;
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
                   this.#droppedDice[0].sides === 20 &&
                   diceResults[0].result === 20;
    const isFumble = this.#droppedDice.length === 1 &&
                     this.#droppedDice[0].sides === 20 &&
                     diceResults[0].result === 1;

    const rollResult = {
      notation,
      isMultiDice: true,
      diceResults,
      breakdown,
      total,
      isCrit,
      isFumble,
      modifier: 0
    };

    // Save to database (will trigger reload via event)
    this.saveRoll(rollResult);
    this.maybeShareRoll(rollResult);

    // Clear drop zone and reset color index
    this.#droppedDice = [];
    this.#nextColorIndex = 0;
    this.renderDropZone();
  }

  /**
   * Share roll with players if sharing is enabled
   */
  maybeShareRoll(rollResult) {
    if (this.#shareCheckbox.checked) {
      emit('dice-roll-shared', rollResult);
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

    // Create diceResults for consistent format
    const diceResults = individualRolls.map(result => ({
      sides,
      result
    }));

    const rollResult = {
      notation,
      count,
      sides,
      modifier,
      individualRolls,
      diceResults,
      total,
      isCrit,
      isFumble
    };

    // Save to database (will trigger reload via event)
    this.saveRoll(rollResult);
    this.maybeShareRoll(rollResult);
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
    // Clear
    this.#historyList.innerHTML = '';

    if (this.#rollsByDate.length === 0) {
      this.#historyList.innerHTML = '<div class="empty-history">No rolls yet. Click a die or enter a roll notation.</div>';
      return;
    }

    // Render each date section using collapsible-section
    this.#rollsByDate.forEach((group, groupIndex) => {
      // Parse date string as local date (YYYY-MM-DD format)
      const dateObj = new Date(group.date + 'T00:00:00');
      const dateLabel = formatRelativeDate(dateObj);

      const section = document.createElement('collapsible-section');
      section.className = 'date-section';
      section.setAttribute('label', dateLabel);
      section.setAttribute('size', 'small');

      // Set initial expanded state (animate if needed)
      if (group.animateOpen) {
        // Start collapsed, then expand after a frame to trigger animation
        section.expanded = false;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            section.expanded = true;
            group.animateOpen = false;
          });
        });
      } else {
        section.expanded = group.expanded;
      }

      // Track expand/collapse state
      section.addEventListener('section-toggle', (e) => {
        group.expanded = e.detail.expanded;
      });

      // Add rolls to section
      const rollsContainer = document.createElement('div');
      rollsContainer.className = 'date-rolls-content';

      group.rolls.forEach((roll, rollIndex) => {
        const isFirst = groupIndex === 0 && rollIndex === 0;
        const item = document.createElement('dice-history-item');
        item.roll = roll;
        item.latest = isFirst;
        item.addEventListener('delete-roll', (e) => this.deleteRoll(e.detail.id));
        rollsContainer.appendChild(item);
      });

      section.appendChild(rollsContainer);
      this.#historyList.appendChild(section);
    });
  }

  async deleteRoll(rollId) {
    const result = await safeInvoke('delete_dice_roll', { id: rollId }, {
      errorMessage: 'Failed to delete roll'
    });
    if (result !== null) {
      await this.loadRolls();
    }
  }

}

customElements.define('dice-roller', DiceRoller);
