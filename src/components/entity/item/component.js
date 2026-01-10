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

  render() {
    if (!this.#entity) return;

    const entity = this.#entity;
    const massiveThreshold = entity.thresholds.severe * 2;

    const container = this.shadowRoot.querySelector('card-container');
    if (!container) return;

    container.innerHTML = `
      <div class="entity-header">
        <div class="entity-name-section">
          <collapse-toggle expanded></collapse-toggle>
          <type-badge type="${entity.entity_type}" label="${entity.entity_type === 'enemy' ? 'Enemy' : 'NPC'}" variant="pill"></type-badge>
          <input type="text" class="entity-name-input" value="${entity.name}">
        </div>
        <dropdown-menu class="hp-dropdown">
          <hp-bar slot="trigger" current="${entity.hp_current}" max="${entity.hp_max}" show-text></hp-bar>
          <div slot="content" class="hp-menu-content">
            <div class="hp-menu-section damage-section">
              <section-label icon="⚔️">Damage</section-label>
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
              <section-label icon="💚">Heal</section-label>
              <input-group
                type="number"
                min="1"
                placeholder="Amount"
                button-text="Heal"
                button-variant="success"
                class="heal-input-group"
              ></input-group>
            </div>
          </div>
        </dropdown-menu>
        <dropdown-menu>
          <dropdown-menu-item slot="content">
            <visibility-toggle entity-id="${entity.id}" ${entity.visible_to_players ? 'checked' : ''} compact></visibility-toggle>
          </dropdown-menu-item>
          <dropdown-menu-item slot="content" variant="delete">
            <delete-trigger item-name="${entity.name}" item-id="${entity.id}">
              <span slot="trigger">🗑️ Delete Entity</span>
            </delete-trigger>
          </dropdown-menu-item>
        </dropdown-menu>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const container = this.shadowRoot.querySelector('card-container');

    // Collapse toggle
    container.querySelector('collapse-toggle').addEventListener('collapse-toggle', e => {
      container.classList.toggle('collapsed', !e.detail.expanded);
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

    // Heal input-group
    const healInputGroup = container.querySelector('.heal-input-group');
    healInputGroup.addEventListener('action-submit', e => {
      const amount = parseInt(e.detail.value);
      if (!isNaN(amount) && amount > 0) {
        this.dispatchEvent(new CustomEvent('heal', {
          bubbles: true,
          composed: true,
          detail: { id: this.#entity.id, amount }
        }));
        healInputGroup.clear();
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

    // Visibility toggle - event bubbles up from visibility-toggle component
    // The visibility-change event is already dispatched by the component with entityId

    // Delete trigger - bubbles up from delete-trigger component
    container.querySelector('delete-trigger').addEventListener('delete-confirmed', async e => {
      await container.fadeOut();
      this.dispatchEvent(new CustomEvent('delete', {
        bubbles: true,
        composed: true,
        detail: { id: e.detail.id, name: e.detail.name }
      }));
    });
  }
}

customElements.define('entity-item', EntityItem);
