import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { CampaignAwareMixin } from '../../../../helpers/campaign-aware-mixin.js';

const { invoke } = window.__TAURI__.core;

class SettingsPanel extends CampaignAwareMixin(ExtendedHtmlElement) {
  static moduleUrl = import.meta.url;
  stylesPath = './styles.css';
  templatePath = './template.html';

  #currentCampaign = null;
  #settings = null;

  async setup() {
    // Setup delete modal event listeners (these are in the static template)
    this.setupDeleteModal();

    await this.setupCampaignAwareness({
      loadData: () => this.loadSettings(),
      events: {
        'campaign-settings-updated': (payload) => {
          this.#settings = payload.settings;
          this.updateToggles();
        }
      }
    });
  }

  setupDeleteModal() {
    const deleteInput = this.$('.delete-confirm-input');
    const deleteBtn = this.$('.delete-confirm-btn');
    const cancelBtn = this.$('.delete-cancel-btn');

    deleteInput.addEventListener('input', (e) => this.handleDeleteInputChange(e));
    deleteBtn.addEventListener('action-click', () => this.confirmDeleteCampaign());
    cancelBtn.addEventListener('action-click', () => this.closeDeleteModal());
  }

  async loadSettings() {
    try {
      this.#currentCampaign = await invoke('get_current_campaign');
      if (this.#currentCampaign) {
        this.#settings = await invoke('get_campaign_settings', {
          campaignId: this.#currentCampaign.id
        });
        this.render();
      }
    } catch (error) {
      console.error('Failed to load campaign settings:', error);
    }
  }

  render() {
    const content = this.$('.settings-content');
    if (!content) return;

    if (!this.#currentCampaign || !this.#settings) {
      content.innerHTML = '<p class="loading">Loading settings...</p>';
      return;
    }

    content.innerHTML = `
      <section-header>Campaign Settings</section-header>

      <card-container>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Campaign Name</span>
            <span class="setting-description">The name used to identify this campaign.</span>
          </div>
          <input-group
            id="campaign-name"
            type="text"
            value="${this.#currentCampaign.name}"
            button-text="Save"
            button-variant="primary"
          ></input-group>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Allow Massive Damage</span>
            <span class="setting-description">When enabled, entities will have a massive damage threshold available for dealing 4× their normal threshold damage.</span>
          </div>
          <toggle-switch
            id="allow-massive-damage"
            ${this.#settings.allow_massive_damage ? 'checked' : ''}
          ></toggle-switch>
        </div>
      </card-container>

      <section-header>Danger Zone</section-header>

      <card-container class="danger-zone">
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Delete Campaign</span>
            <span class="setting-description">Permanently delete this campaign and all its data including entities, trackers, and fear level. This action cannot be undone.</span>
          </div>
          <action-button id="delete-campaign-btn" variant="danger">Delete Campaign</action-button>
        </div>
      </card-container>
    `;

    this.attachEventListeners();
  }

  updateToggles() {
    const toggle = this.$('#allow-massive-damage');
    if (toggle) {
      if (this.#settings.allow_massive_damage) {
        toggle.setAttribute('checked', '');
      } else {
        toggle.removeAttribute('checked');
      }
    }
  }

  attachEventListeners() {
    // Campaign name rename
    const nameInput = this.$('#campaign-name');
    if (nameInput) {
      nameInput.addEventListener('action-submit', async (e) => {
        const newName = e.detail.value.trim();
        if (!newName) return;

        try {
          const updated = await invoke('rename_campaign', {
            id: this.#currentCampaign.id,
            name: newName
          });
          this.#currentCampaign = updated;
        } catch (error) {
          console.error('Failed to rename campaign:', error);
          // Revert to original name
          nameInput.value = this.#currentCampaign.name;
        }
      });
    }

    // Massive damage toggle
    const massiveDamageToggle = this.$('#allow-massive-damage');
    if (massiveDamageToggle) {
      massiveDamageToggle.addEventListener('toggle-change', async (e) => {
        try {
          await invoke('update_campaign_settings', {
            campaignId: this.#currentCampaign.id,
            settings: {
              allow_massive_damage: e.detail.checked
            }
          });
        } catch (error) {
          console.error('Failed to update settings:', error);
          // Revert toggle on error
          this.updateToggles();
        }
      });
    }

    // Delete campaign button
    const deleteBtn = this.$('#delete-campaign-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('action-click', () => this.showDeleteConfirmation());
    }
  }

  showDeleteConfirmation() {
    const modal = this.$('.delete-campaign-modal');
    const nameDisplay = this.$('.delete-campaign-name');
    const input = this.$('.delete-confirm-input');
    const deleteBtn = this.$('.delete-confirm-btn');

    nameDisplay.textContent = this.#currentCampaign.name;
    input.value = '';
    deleteBtn.disabled = true;

    modal.openAndFocus(input);
  }

  handleDeleteInputChange(e) {
    const deleteBtn = this.$('.delete-confirm-btn');
    deleteBtn.disabled = e.target.value !== this.#currentCampaign.name;
  }

  async confirmDeleteCampaign() {
    try {
      await invoke('delete_campaign', { id: this.#currentCampaign.id });
      this.$('.delete-campaign-modal').close();
      // Close the settings window after deletion
      window.close();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      alert(`Failed to delete campaign: ${error}`);
    }
  }

  closeDeleteModal() {
    this.$('.delete-campaign-modal').close();
  }
}

customElements.define('settings-panel', SettingsPanel);
