import ExtendedHtmlElement from '../../extended-html-element.js';

class EntityItem extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #entity = null;
  #nameUpdateTimeout = null;
  #isReady = false;
  stylesPath = './styles.css';
  templatePath = './template.html';

  set entity(value) {
    this.#entity = value;
    if (this.#isReady) {
      this.render();
    }
  }

  get entity() {
    return this.#entity;
  }

  async setup() {
    this.#isReady = true;
    // Render now that template is ready (if entity was already set)
    if (this.#entity) {
      this.render();
    }
  }

  getHealthPercentage(current, max) {
    return (current / max) * 100;
  }

  getHealthClass(percentage) {
    if (percentage <= 0) return 'dead';
    if (percentage <= 25) return 'critical';
    if (percentage <= 50) return 'low';
    if (percentage <= 75) return 'medium';
    return 'healthy';
  }

  render() {
    if (!this.#entity) return;

    const entity = this.#entity;
    const healthPercent = this.getHealthPercentage(entity.hp_current, entity.hp_max);
    const healthClass = this.getHealthClass(healthPercent);
    const massiveThreshold = entity.thresholds.severe * 2;

    const container = this.shadowRoot.querySelector('.entity-container');
    if (!container) return;

    container.innerHTML = `
      <div class="entity-header">
        <div class="entity-name-section">
          <button class="collapse-toggle" aria-label="Toggle entity details">
            <svg class="caret-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 6l4 4 4-4z"/>
            </svg>
          </button>
          <span class="entity-type-badge ${entity.entity_type}">${entity.entity_type === 'enemy' ? 'Enemy' : 'NPC'}</span>
          <input type="text" class="entity-name-input" value="${entity.name}">
        </div>
        <dropdown-menu class="hp-dropdown">
          <div slot="trigger" class="hp-bar-container">
            <div class="hp-bar ${healthClass}" style="width: ${healthPercent}%"></div>
            <span class="hp-text">${entity.hp_current} / ${entity.hp_max} HP</span>
          </div>
          <div slot="content" class="hp-menu-content">
            <div class="hp-menu-section damage-section">
              <span class="section-label">⚔️ Damage</span>
              <div class="threshold-buttons">
                <button class="threshold minor" data-hp-loss="1" data-threshold="minor">
                  Minor: ${entity.thresholds.minor}
                </button>
                <button class="threshold major" data-hp-loss="2" data-threshold="major">
                  Major: ${entity.thresholds.major}
                </button>
                <button class="threshold severe" data-hp-loss="3" data-threshold="severe">
                  Severe: ${entity.thresholds.severe}
                </button>
                <button class="threshold massive" data-hp-loss="4" data-threshold="massive">
                  Massive: ${massiveThreshold}
                </button>
              </div>
            </div>
            <div class="hp-menu-section heal-section">
              <span class="section-label">💚 Heal</span>
              <div class="healing-controls">
                <input type="number" min="1" placeholder="Amount" class="heal-input">
                <button class="apply-heal">Heal</button>
              </div>
            </div>
          </div>
        </dropdown-menu>
        <dropdown-menu>
          <dropdown-menu-item slot="content">
            <label class="visibility-toggle">
              <input type="checkbox" ${entity.visible_to_players ? 'checked' : ''}>
              <span>👁️ Visible to Players</span>
            </label>
          </dropdown-menu-item>
          <dropdown-menu-item slot="content" variant="delete">
            <span>🗑️ Delete Entity</span>
          </dropdown-menu-item>
        </dropdown-menu>
      </div>

      <div class="delete-backdrop hidden"></div>
      <div class="delete-confirmation hidden">
        <p class="delete-message">Are you sure you want to delete?</p>
        <div class="delete-actions">
          <button class="delete-yes">Yes</button>
          <button class="delete-no">No</button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const container = this.shadowRoot.querySelector('.entity-container');

    // Collapse toggle
    const collapseToggle = container.querySelector('.collapse-toggle');
    collapseToggle.addEventListener('click', () => {
      container.classList.toggle('collapsed');
    });

    // Threshold buttons
    container.querySelectorAll('.threshold').forEach(btn => {
      btn.addEventListener('click', () => {
        const hpLoss = parseInt(btn.dataset.hpLoss);
        const threshold = btn.dataset.threshold;
        this.dispatchEvent(new CustomEvent('threshold-damage', {
          bubbles: true,
          composed: true,
          detail: { id: this.#entity.id, hpLoss, threshold }
        }));
      });
    });

    // Heal button
    const healInput = container.querySelector('.heal-input');
    container.querySelector('.apply-heal').addEventListener('click', () => {
      const amount = parseInt(healInput.value);
      if (!isNaN(amount) && amount > 0) {
        this.dispatchEvent(new CustomEvent('heal', {
          bubbles: true,
          composed: true,
          detail: { id: this.#entity.id, amount }
        }));
        healInput.value = '';
      }
    });

    // Name input
    container.querySelector('.entity-name-input').addEventListener('input', e => {
      if (this.#nameUpdateTimeout) {
        clearTimeout(this.#nameUpdateTimeout);
      }
      this.#nameUpdateTimeout = setTimeout(() => {
        this.dispatchEvent(new CustomEvent('name-change', {
          bubbles: true,
          composed: true,
          detail: { id: this.#entity.id, name: e.target.value }
        }));
      }, 500);
    });

    // Visibility checkbox
    container.querySelector('input[type="checkbox"]').addEventListener('change', e => {
      this.dispatchEvent(new CustomEvent('visibility-change', {
        bubbles: true,
        composed: true,
        detail: { id: this.#entity.id, visible: e.target.checked }
      }));
    });

    // Delete menu item
    const deleteMenuItem = container.querySelector('dropdown-menu-item[variant="delete"]');
    const deleteConfirmation = container.querySelector('.delete-confirmation');
    const deleteBackdrop = container.querySelector('.delete-backdrop');
    const deleteYesBtn = container.querySelector('.delete-yes');
    const deleteNoBtn = container.querySelector('.delete-no');

    deleteMenuItem.addEventListener('menu-item-click', () => {
      deleteBackdrop.classList.remove('hidden');
      deleteConfirmation.classList.remove('hidden');
      deleteConfirmation.classList.remove('slide-up');
    });

    deleteNoBtn.addEventListener('click', () => {
      deleteConfirmation.classList.add('slide-up');
      deleteBackdrop.classList.add('fade-out');
      setTimeout(() => {
        deleteConfirmation.classList.add('hidden');
        deleteBackdrop.classList.add('hidden');
        deleteConfirmation.classList.remove('slide-up');
        deleteBackdrop.classList.remove('fade-out');
      }, 300);
    });

    deleteYesBtn.addEventListener('click', () => {
      deleteYesBtn.disabled = true;
      deleteYesBtn.textContent = 'Deleting...';
      container.classList.add('fade-out');

      setTimeout(() => {
        this.dispatchEvent(new CustomEvent('delete', {
          bubbles: true,
          composed: true,
          detail: { id: this.#entity.id, name: this.#entity.name }
        }));
      }, 300);
    });
  }
}

customElements.define('entity-item', EntityItem);
