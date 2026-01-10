import ExtendedHtmlElement from '../extended-html-element.js';
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

class FearTracker extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #counter;
  fearLevel = 0;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#counter = this.shadowRoot.querySelector('counter-control');

    // If no-controls mode, set counter to display-only
    if (this.hasAttribute('no-controls')) {
      this.#counter.setAttribute('display-only', '');
    }

    // Load initial state from Rust
    this.fearLevel = await invoke('get_fear_level');
    this.#counter.value = this.fearLevel;

    // Listen for counter changes (only if controls are enabled)
    if (!this.hasAttribute('no-controls')) {
      this.#counter.addEventListener('counter-change', e => {
        this.changeFearLevel(e.detail.delta);
      });
    }

    // Listen for backend updates
    await listen('fear-level-updated', event => {
      this.fearLevel = event.payload.level;
      this.#counter.value = this.fearLevel;
    });
  }

  changeFearLevel(amount) {
    invoke('set_fear_level', { amount });
  }
}

customElements.define('fear-tracker', FearTracker);
