import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import '../../../layout/card-container/component.js';
import '../../../layout/flex-row/component.js';
import '../../../ui/collapse-toggle/component.js';
import '../../../ui/action-button/component.js';
import '../../../ui/hp-bar/component.js';
import '../../../overlays/delete-trigger/component.js';

class PlayerCharacterItem extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['expanded'];

  #character = null;
  stylesPath = './styles.css';
  templatePath = './template.html';

  get character() {
    return this.#character;
  }

  set character(value) {
    this.#character = value;
    if (this.isSetup) {
      this.updateDisplay();
    }
  }

  get expanded() {
    return this.getBoolAttr('expanded');
  }

  set expanded(value) {
    if (value) {
      this.setAttribute('expanded', '');
    } else {
      this.removeAttribute('expanded');
    }
  }

  async setup() {
    // Setup collapse toggle
    this.$('collapse-toggle').addEventListener('collapse-toggle', (e) => {
      this.expanded = e.detail.expanded;
    });

    // Header click to toggle
    this.$('.character-header').addEventListener('click', (e) => {
      if (e.target.closest('collapse-toggle')) return;
      this.expanded = !this.expanded;
      this.$('collapse-toggle').expanded = this.expanded;
    });

    // Resource buttons
    this.$$('.resource-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const resource = btn.dataset.resource;
        const amount = parseInt(btn.dataset.amount, 10);
        this.emit(`character-${resource}-change`, { id: this.#character?.id, amount });
      });
    });

    // Edit button
    this.$('.edit-btn').addEventListener('action-click', () => {
      this.emit('character-edit', { id: this.#character?.id });
    });

    // Delete button
    this.$('.delete-btn').addEventListener('confirm-delete', () => {
      this.emit('character-delete', { id: this.#character?.id });
    });

    if (this.#character) {
      this.updateDisplay();
    }
  }

  updateDisplay() {
    if (!this.#character) return;

    const c = this.#character;

    // Header info
    this.$('.character-name').textContent = c.name;
    this.$('.character-level').textContent = `Lv ${c.level}`;

    const classInfo = [c.class, c.subclass].filter(Boolean).join(' - ') || 'No class';
    const domainInfo = c.domain ? `(${c.domain})` : '';
    this.$('.character-class').textContent = `${classInfo} ${domainInfo}`.trim();

    // Delete trigger message
    this.$('.delete-btn').setAttribute('message', `Delete ${c.name}?`);

    // Quick info
    this.$('.quick-hp .quick-stat-value').textContent = `${c.hp_current}/${c.hp_max}`;
    this.$('.quick-hope .quick-stat-value').textContent = c.hope;
    this.$('.quick-stress .quick-stat-value').textContent = `${c.stress_current}/${c.stress_max}`;
    this.$('.quick-armor .quick-stat-value').textContent = `${c.armor_current}/${c.armor_max}`;

    // Collapse toggle state
    this.$('collapse-toggle').expanded = this.expanded;

    // Attributes
    this.updateStat('.stat-agility', c.attr_agility);
    this.updateStat('.stat-strength', c.attr_strength);
    this.updateStat('.stat-finesse', c.attr_finesse);
    this.updateStat('.stat-instinct', c.attr_instinct);
    this.updateStat('.stat-presence', c.attr_presence);
    this.updateStat('.stat-knowledge', c.attr_knowledge);

    // HP bar
    const hpBar = this.$('hp-bar');
    hpBar.setAttribute('current', c.hp_current);
    hpBar.setAttribute('max', c.hp_max);
    hpBar.setAttribute('threshold-minor', c.threshold_minor);
    hpBar.setAttribute('threshold-major', c.threshold_major);
    hpBar.setAttribute('threshold-severe', c.threshold_severe);

    // Resources
    this.$('.resource-hope .resource-value').textContent = c.hope;
    this.$('.resource-stress .resource-value').textContent = `${c.stress_current}/${c.stress_max}`;
    this.$('.resource-armor .resource-value').textContent = `${c.armor_current}/${c.armor_max}`;
    this.$('.resource-evasion .resource-value').textContent = c.evasion;
  }

  updateStat(selector, value) {
    const statEl = this.$(selector);
    if (!statEl) return;

    const valueEl = statEl.querySelector('.stat-value');
    valueEl.textContent = value;
    valueEl.classList.remove('positive', 'negative');

    if (value > 0) {
      valueEl.classList.add('positive');
    } else if (value < 0) {
      valueEl.classList.add('negative');
    }
  }
}

customElements.define('player-character-item', PlayerCharacterItem);
