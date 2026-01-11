import ExtendedHtmlElement from '../extended-html-element.js';
import createWindow from '../../helpers/create-window.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { WebviewWindow } = window.__TAURI__.webviewWindow;

/**
 * Campaign menu component for the sticky header.
 * Allows creating, selecting, managing campaigns, and toggling player view.
 */
class CampaignMenu extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #currentCampaign = null;
  #campaigns = [];
  #dropdown;
  #campaignName;
  #playerViewBtn;
  #playerViewText;
  #isPlayerViewOpen = false;
  #playerWindow = null;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#dropdown = this.$('dropdown-menu');
    this.#campaignName = this.$('.campaign-name');
    this.#playerViewBtn = this.$('.player-view-btn');
    this.#playerViewText = this.$('.player-view-text');

    // Load initial data - current campaign first so list renders correctly
    await this.loadCurrentCampaign();
    await this.loadCampaigns();
    await this.checkPlayerViewState();

    // Setup create campaign form
    const createInput = this.$('.create-campaign-input');
    const createBtn = this.$('.create-campaign-btn');

    createBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.handleCreateCampaign();
    });

    createInput.addEventListener('keydown', (e) => {
      e.stopPropagation(); // Prevent dropdown from handling keypresses
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleCreateCampaign();
      }
    });

    createInput.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent dropdown from closing
    });

    // Setup player view toggle
    this.#playerViewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlayerView();
    });

    // Setup delete campaign modal
    const deleteInput = this.$('.delete-confirm-input');
    const deleteBtn = this.$('.delete-confirm-btn');
    const cancelBtn = this.$('.delete-cancel-btn');

    deleteInput.addEventListener('input', (e) => this.handleDeleteInputChange(e));
    deleteBtn.addEventListener('action-click', () => this.confirmDeleteCampaign());
    cancelBtn.addEventListener('action-click', () => this.closeDeleteModal());

    // Poll for player view window state
    setInterval(() => this.checkPlayerViewState(), 1000);

    // Listen for campaign updates
    await listen('campaigns-updated', event => {
      this.#campaigns = event.payload.campaigns;
      this.renderCampaignList();
    });

    await listen('current-campaign-changed', event => {
      this.#currentCampaign = event.payload.campaign;
      this.updateCurrentCampaignDisplay();
      this.renderCampaignList(); // Re-render list to update current indicator
    });

    // Listen for campaign switch to reload data
    await listen('campaign-switched', () => {
      // Emit event for other components to reload their data
      window.dispatchEvent(new CustomEvent('campaign-changed'));
    });
  }

  async loadCampaigns() {
    try {
      this.#campaigns = await invoke('get_campaigns');
      this.renderCampaignList();
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  }

  async loadCurrentCampaign() {
    try {
      this.#currentCampaign = await invoke('get_current_campaign');
      this.updateCurrentCampaignDisplay();
    } catch (error) {
      console.error('Failed to load current campaign:', error);
    }
  }

  updateCurrentCampaignDisplay() {
    if (this.#currentCampaign) {
      this.#campaignName.textContent = this.#currentCampaign.name;
    } else {
      this.#campaignName.textContent = 'No Campaign';
    }
  }

  renderCampaignList() {
    const list = this.$('.campaign-list');
    list.innerHTML = '';

    if (this.#campaigns.length === 0) {
      list.innerHTML = '<div class="no-campaigns">No campaigns yet</div>';
      return;
    }

    this.#campaigns.forEach(campaign => {
      const isCurrent = this.#currentCampaign?.id === campaign.id;
      const item = document.createElement('div');
      item.className = `campaign-item ${isCurrent ? 'current' : ''}`;
      item.innerHTML = `
        <span class="campaign-item-name">${campaign.name}</span>
        ${isCurrent ? '<span class="current-indicator">Current</span>' : `
          <button class="delete-campaign-btn" data-id="${campaign.id}" data-name="${campaign.name}" title="Delete campaign">🗑️</button>
        `}
      `;

      if (!isCurrent) {
        const nameSpan = item.querySelector('.campaign-item-name');
        nameSpan.addEventListener('click', () => this.selectCampaign(campaign.id));

        const deleteBtn = item.querySelector('.delete-campaign-btn');
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showDeleteConfirmation(campaign.id, campaign.name);
        });
      }

      list.appendChild(item);
    });
  }

  showDeleteConfirmation(id, name) {
    const modal = this.$('.delete-campaign-modal');
    const nameDisplay = this.$('.delete-campaign-name');
    const input = this.$('.delete-confirm-input');
    const deleteBtn = this.$('.delete-confirm-btn');

    nameDisplay.textContent = name;
    input.value = '';
    deleteBtn.disabled = true;
    modal.dataset.campaignId = id;
    modal.dataset.campaignName = name;

    modal.open();
    // Focus after a tick to ensure modal is fully rendered
    setTimeout(() => input.focus(), 50);
  }

  handleDeleteInputChange(e) {
    const modal = this.$('.delete-campaign-modal');
    const expectedName = modal.dataset.campaignName;
    const deleteBtn = this.$('.delete-confirm-btn');

    deleteBtn.disabled = e.target.value !== expectedName;
  }

  async confirmDeleteCampaign() {
    const modal = this.$('.delete-campaign-modal');
    const id = modal.dataset.campaignId;

    try {
      await invoke('delete_campaign', { id });
      modal.close();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      alert(`Failed to delete campaign: ${error}`);
    }
  }

  closeDeleteModal() {
    this.$('.delete-campaign-modal').close();
  }

  async selectCampaign(id) {
    try {
      await invoke('set_current_campaign', { id });
      // Close dropdown after selection
      this.#dropdown.closeDropdown();
    } catch (error) {
      console.error('Failed to select campaign:', error);
      alert(`Failed to switch campaign: ${error}`);
    }
  }

  handleCreateCampaign() {
    const input = this.$('.create-campaign-input');
    const name = input.value.trim();

    if (name) {
      this.createCampaign(name);
      input.value = '';
    }
  }

  async createCampaign(name) {
    try {
      const campaign = await invoke('create_campaign', { name });
      // Automatically switch to the new campaign
      await invoke('set_current_campaign', { id: campaign.id });
      this.#dropdown.closeDropdown();
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert(`Failed to create campaign: ${error}`);
    }
  }

  // Player View Methods
  async checkPlayerViewState() {
    try {
      const existing = await WebviewWindow.getByLabel('player-view');
      const wasOpen = this.#isPlayerViewOpen;
      this.#isPlayerViewOpen = !!existing;

      if (wasOpen !== this.#isPlayerViewOpen) {
        this.updatePlayerViewButton();
      }

      if (this.#isPlayerViewOpen && !this.#playerWindow) {
        this.#playerWindow = existing;
      } else if (!this.#isPlayerViewOpen) {
        this.#playerWindow = null;
      }
    } catch (error) {
      this.#isPlayerViewOpen = false;
      this.#playerWindow = null;
      this.updatePlayerViewButton();
    }
  }

  updatePlayerViewButton() {
    if (this.#playerViewText) {
      this.#playerViewText.textContent = this.#isPlayerViewOpen
        ? 'Close Player View'
        : 'Open Player View';
    }
    if (this.#playerViewBtn) {
      this.#playerViewBtn.classList.toggle('active', this.#isPlayerViewOpen);
    }
  }

  async togglePlayerView() {
    if (this.#isPlayerViewOpen && this.#playerWindow) {
      await this.#playerWindow.close();
      this.#isPlayerViewOpen = false;
      this.#playerWindow = null;
      this.updatePlayerViewButton();
    } else {
      await createWindow('player-view', {
        title: 'Player View',
        width: 400,
        height: 600,
        resizable: true,
        url: '/player-view.html',
      });
      // State will be updated by checkPlayerViewState interval
    }
    this.#dropdown.closeDropdown();
  }
}

customElements.define('campaign-menu', CampaignMenu);
