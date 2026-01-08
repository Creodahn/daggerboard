import ExtendedHtmlElement from '../../extended-html-element.js';
import createWindow from '../../../helpers/create-window.js';

const { WebviewWindow } = window.__TAURI__.webviewWindow;

class TogglePlayerViewButton extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #button;
  #buttonText;
  #isOpen = false;
  #playerWindow = null;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#button = this.shadowRoot.querySelector('button');
    this.#buttonText = this.shadowRoot.querySelector('.button-text');

    if (!this.#button) return;

    // Check if player view is already open
    await this.checkWindowState();

    this.#button.addEventListener('click', () => this.togglePlayerView());

    // Poll for window state changes
    setInterval(() => this.checkWindowState(), 1000);
  }

  async checkWindowState() {
    try {
      const existing = await WebviewWindow.getByLabel('player-view');
      const wasOpen = this.#isOpen;
      this.#isOpen = !!existing;
      
      if (wasOpen !== this.#isOpen) {
        this.updateButtonText();
      }
      
      if (this.#isOpen && !this.#playerWindow) {
        this.#playerWindow = existing;
      } else if (!this.#isOpen) {
        this.#playerWindow = null;
      }
    } catch (error) {
      this.#isOpen = false;
      this.#playerWindow = null;
      this.updateButtonText();
    }
  }

  updateButtonText() {
    if (this.#buttonText) {
      this.#buttonText.textContent = this.#isOpen ? 'Close Player View' : 'Open Player View';
    }
  }

  async togglePlayerView() {
    if (this.#isOpen && this.#playerWindow) {
      await this.#playerWindow.close();
      this.#isOpen = false;
      this.#playerWindow = null;
      this.updateButtonText();
    } else {
      await createWindow('player-view', {
        title: 'Player View',
        width: 400,
        height: 600,
        resizable: true,
        url: '/player-view.html',
      });
      // State will be updated by checkWindowState interval
    }
  }
}

customElements.define('toggle-player-view-button', TogglePlayerViewButton);
