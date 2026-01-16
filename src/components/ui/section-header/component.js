import ExtendedHtmlElement from '../../base/extended-html-element.js';
import '../../layout/flex-row/component.js';

class SectionHeader extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['title'];

  #titleEl;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#titleEl = this.$('.section-title');
    this.updateTitle();

    // Listen for action button clicks
    this.$('.action-slot').addEventListener('click', e => {
      if (e.target.closest('[slot="action"]')) {
        this.emit('action-click');
      }
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.isSetup && name === 'title' && oldValue !== newValue) {
      this.updateTitle();
    }
  }

  updateTitle() {
    if (this.#titleEl) {
      this.#titleEl.textContent = this.getStringAttr('title');
    }
  }
}

customElements.define('section-header', SectionHeader);
