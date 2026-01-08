import ExtendedHtmlElement from '../extended-html-element.js';
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

class FearTracker extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #addButton;
  #fearDisplay;
  #subtractButton;
  fearLevel = 0;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#addButton = this.shadowRoot.querySelector('button.add');
    this.#fearDisplay = this.shadowRoot.querySelector('h3.value');
    this.#subtractButton = this.shadowRoot.querySelector('button.subtract');

    // Load initial state from Rust
    this.fearLevel = await invoke('get_fear_level');
    this.#fearDisplay.textContent = this.fearLevel;

    this.#addButton.addEventListener('click', () => {
      this.changeFearLevel(1);
    });

    this.#subtractButton.addEventListener('click', () => {
      this.changeFearLevel(-1);
    });

    await listen('fear-level-updated', event => {
      console.log(event);
      this.fearLevel = event.payload.level;
      this.#fearDisplay.textContent = this.fearLevel;
    });
  }

  changeFearLevel(amount) {
    invoke('set_fear_level', { amount });
  }
}

customElements.define('fear-tracker', FearTracker);
