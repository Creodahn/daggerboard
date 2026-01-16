import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import createWindow from '../../../../helpers/create-window.js';
import { invoke, listen, WebviewWindow } from '../../../../helpers/tauri.js';

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
  #settingsBtn;
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

    // Setup notepad button
    const notepadBtn = this.$('.notepad-btn');
    notepadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openNotepad();
    });

    // Setup dice roller button
    const diceBtn = this.$('.dice-btn');
    diceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openDiceRoller();
    });

    // Setup settings button
    this.#settingsBtn = this.$('.settings-btn');
    this.#settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openSettings();
    });

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

    // Listen for events from campaign-list-item components
    list.addEventListener('campaign-select', (e) => {
      this.selectCampaign(e.detail.id);
    });

    this.#campaigns.forEach(campaign => {
      const isCurrent = this.#currentCampaign?.id === campaign.id;
      const item = document.createElement('campaign-list-item');
      item.setAttribute('campaign-id', campaign.id);
      item.setAttribute('name', campaign.name);
      if (isCurrent) {
        item.setAttribute('current', '');
      }
      list.appendChild(item);
    });
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
        url: '/pages/player-view/index.html',
      });
      // State will be updated by checkPlayerViewState interval
    }
    this.#dropdown.closeDropdown();
  }

  async openSettings() {
    await createWindow('settings-view', {
      title: 'Campaign Settings',
      width: 500,
      height: 400,
      resizable: true,
      url: '/pages/settings-view/index.html',
    });
    this.#dropdown.closeDropdown();
  }

  async openDiceRoller() {
    await createWindow('dice-view', {
      title: 'Dice Bag',
      width: 700,
      height: 380,
      resizable: true,
      url: '/pages/dice-view/index.html',
    }, { focusIfExists: true });
    this.#dropdown.closeDropdown();
  }

  async openNotepad(noteId = null) {
    const title = this.#currentCampaign
      ? `${this.#currentCampaign.name} Notepad`
      : 'Campaign Notepad';

    // If no specific note requested, try to get the most recent one
    let targetNoteId = noteId;
    if (!targetNoteId && this.#currentCampaign) {
      try {
        const notes = await invoke('get_campaign_notes', {
          campaignId: this.#currentCampaign.id
        });
        if (notes.length > 0) {
          targetNoteId = notes[0].id; // Most recent note
        }
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      }
    }

    // Use unique window label for each note, or generic for truly new notepad
    const windowLabel = targetNoteId ? `notepad-${targetNoteId}` : `notepad-new-${Date.now()}`;
    const url = targetNoteId
      ? `/pages/notepad-view/index.html?noteId=${targetNoteId}`
      : '/pages/notepad-view/index.html';

    await createWindow(windowLabel, {
      title,
      width: 500,
      height: 600,
      resizable: true,
      url,
    }, { focusIfExists: true });
    this.#dropdown.closeDropdown();
  }
}

customElements.define('campaign-menu', CampaignMenu);
