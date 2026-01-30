import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { CampaignAwareMixin } from '../../../../helpers/campaign-aware-mixin.js';
import ToastMessage from '../../../feedback/toast-message/component.js';
import { safeInvoke } from '../../../../helpers/tauri.js';
import '../../../layout/setting-row/component.js';

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
    this.#currentCampaign = await safeInvoke('get_current_campaign', {}, {
      errorMessage: 'Failed to load current campaign'
    });

    if (this.#currentCampaign) {
      this.#settings = await safeInvoke('get_campaign_settings', {
        campaignId: this.#currentCampaign.id
      }, { errorMessage: 'Failed to load campaign settings' });

      if (this.#settings) {
        this.render();
      }
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
        <setting-row
          label="Campaign Name"
          description="The name used to identify this campaign.">
          <input-group
            id="campaign-name"
            type="text"
            value="${this.#currentCampaign.name}"
            button-text="Save"
            button-variant="primary"
          ></input-group>
        </setting-row>

        <setting-row
          label="Allow Massive Damage"
          description="When enabled, entities will have a massive damage threshold available for dealing 4× their normal threshold damage.">
          <toggle-switch
            id="allow-massive-damage"
            ${this.#settings.allow_massive_damage ? 'checked' : ''}
          ></toggle-switch>
        </setting-row>
      </card-container>

      <section-header>Danger Zone</section-header>

      <card-container class="danger-zone">
        <setting-row
          label="Delete Campaign"
          description="Permanently delete this campaign and all its data including entities, trackers, and fear level. This action cannot be undone."
          no-separator>
          <action-button id="delete-campaign-btn" variant="danger">Delete Campaign</action-button>
        </setting-row>
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

        const updated = await safeInvoke('rename_campaign', {
          id: this.#currentCampaign.id,
          name: newName
        }, { errorMessage: 'Failed to rename campaign' });

        if (updated) {
          this.#currentCampaign = updated;
          this.showStatus('Campaign renamed successfully', 'success');
        } else {
          // Revert to original name
          nameInput.value = this.#currentCampaign.name;
          this.showStatus('Failed to rename campaign', 'error');
        }
      });
    }

    // Massive damage toggle
    const massiveDamageToggle = this.$('#allow-massive-damage');
    if (massiveDamageToggle) {
      massiveDamageToggle.addEventListener('toggle-change', async (e) => {
        const result = await safeInvoke('update_campaign_settings', {
          campaignId: this.#currentCampaign.id,
          settings: {
            allow_massive_damage: e.detail.checked
          }
        }, { errorMessage: 'Failed to update settings' });

        if (result === null) {
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
    const result = await safeInvoke('delete_campaign', { id: this.#currentCampaign.id }, {
      errorMessage: 'Failed to delete campaign'
    });

    if (result !== null) {
      this.$('.delete-campaign-modal').close();
      // Close the settings window after deletion
      window.close();
    }
  }

  closeDeleteModal() {
    this.$('.delete-campaign-modal').close();
  }

  showStatus(message, type = 'success') {
    // Use the appropriate convenience method based on type
    if (type === 'success') {
      ToastMessage.success(message);
    } else if (type === 'error') {
      ToastMessage.error(message);
    } else {
      ToastMessage.show(message, type);
    }
  }
}

customElements.define('settings-panel', SettingsPanel);
