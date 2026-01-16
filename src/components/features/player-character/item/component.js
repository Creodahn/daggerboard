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

  #container;
  #character = null;
  stylesPath = './styles.css';
  templatePath = './template.html';

  get character() {
    return this.#character;
  }

  set character(value) {
    this.#character = value;
    if (this.isSetup) {
      this.render();
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
    this.#container = this.$('.character-content');
    if (this.#character) {
      this.render();
    }
  }

  render() {
    if (!this.#character || !this.#container) return;

    const c = this.#character;
    const classInfo = [c.class, c.subclass].filter(Boolean).join(' - ') || 'No class';
    const domainInfo = c.domain ? `(${c.domain})` : '';

    this.#container.innerHTML = `
      <flex-row class="character-header" justify="space-between" align="center" gap="md">
        <flex-row align="center" gap="sm">
          <collapse-toggle size="small" ${this.expanded ? 'expanded' : ''}></collapse-toggle>
          <span class="character-name">${this.escapeHtml(c.name)}</span>
          <span class="character-level">Lv ${c.level}</span>
        </flex-row>
        <span class="character-class">${this.escapeHtml(classInfo)} ${this.escapeHtml(domainInfo)}</span>
      </flex-row>

      <div class="quick-info">
        <span class="quick-stat">
          <span class="quick-stat-label">HP:</span>
          <span class="quick-stat-value">${c.hp_current}/${c.hp_max}</span>
        </span>
        <span class="quick-stat">
          <span class="quick-stat-label">Hope:</span>
          <span class="quick-stat-value">${c.hope}</span>
        </span>
        <span class="quick-stat">
          <span class="quick-stat-label">Stress:</span>
          <span class="quick-stat-value">${c.stress_current}/${c.stress_max}</span>
        </span>
        <span class="quick-stat">
          <span class="quick-stat-label">Armor:</span>
          <span class="quick-stat-value">${c.armor_current}/${c.armor_max}</span>
        </span>
      </div>

      <div class="character-details">
        <div class="stats-section">
          <div class="section-label">Attributes</div>
          <div class="stats-grid">
            ${this.renderStat('AGI', c.attr_agility)}
            ${this.renderStat('STR', c.attr_strength)}
            ${this.renderStat('FIN', c.attr_finesse)}
            ${this.renderStat('INS', c.attr_instinct)}
            ${this.renderStat('PRE', c.attr_presence)}
            ${this.renderStat('KNO', c.attr_knowledge)}
          </div>
        </div>

        <div class="hp-section">
          <div class="section-label">Hit Points</div>
          <hp-bar
            current="${c.hp_current}"
            max="${c.hp_max}"
            threshold-minor="${c.threshold_minor}"
            threshold-major="${c.threshold_major}"
            threshold-severe="${c.threshold_severe}"
          ></hp-bar>
        </div>

        <div class="resources-section">
          <div class="section-label">Resources</div>
          <div class="resources-grid">
            ${this.renderResource('Hope', 'hope', c.hope)}
            ${this.renderResource('Stress', 'stress', c.stress_current, c.stress_max)}
            ${this.renderResource('Armor', 'armor', c.armor_current, c.armor_max)}
            ${this.renderResource('Evasion', 'evasion', c.evasion, null, true)}
          </div>
        </div>

        <flex-row class="character-actions" justify="flex-end" gap="sm">
          <action-button class="edit-btn" variant="ghost" size="small">Edit</action-button>
          <delete-trigger class="delete-btn" message="Delete ${this.escapeHtml(c.name)}?"></delete-trigger>
        </flex-row>
      </div>
    `;

    // Setup event listeners
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
        this.emit(`character-${resource}-change`, { id: c.id, amount });
      });
    });

    // Edit button
    this.$('.edit-btn').addEventListener('action-click', () => {
      this.emit('character-edit', { id: c.id });
    });

    // Delete button
    this.$('.delete-btn').addEventListener('confirm-delete', () => {
      this.emit('character-delete', { id: c.id });
    });
  }

  renderStat(label, value) {
    const valueClass = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
    return `
      <div class="stat-item">
        <span class="stat-label">${label}</span>
        <span class="stat-value ${valueClass}">${value}</span>
      </div>
    `;
  }

  renderResource(label, type, current, max = null, readonly = false) {
    const valueDisplay = max !== null ? `${current}/${max}` : current;

    if (readonly) {
      return `
        <div class="resource-item">
          <span class="resource-label">${label}</span>
          <span class="resource-value">${valueDisplay}</span>
        </div>
      `;
    }

    return `
      <div class="resource-item">
        <span class="resource-label">${label}</span>
        <div class="resource-controls">
          <button class="resource-btn danger" data-resource="${type}" data-amount="-1">−</button>
          <span class="resource-value">${valueDisplay}</span>
          <button class="resource-btn success" data-resource="${type}" data-amount="1">+</button>
        </div>
      </div>
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

customElements.define('player-character-item', PlayerCharacterItem);
