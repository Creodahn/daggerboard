import ExtendedHtmlElement from '../../extended-html-element.js';

class DropdownMenuItem extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;

  #isKeepOpen = false;
  stylesPath = './styles.css';
  templatePath = './template.html';

  setup() {
    this.#isKeepOpen = this.hasAttribute('keep-open');

    // If keep-open is set, replace button with div
    if (this.#isKeepOpen) {
      const button = this.shadowRoot.querySelector('button');
      const div = document.createElement('div');
      div.className = button.className;
      div.setAttribute('part', button.getAttribute('part'));
      div.innerHTML = '<slot></slot>';
      button.replaceWith(div);
    } else {
      // Only dispatch menu-item-click for button items (not keep-open items)
      const item = this.shadowRoot.querySelector('.menu-item');
      item.addEventListener('click', e => {
        this.dispatchEvent(
          new CustomEvent('menu-item-click', {
            bubbles: true,
            composed: true,
            detail: { originalEvent: e },
          })
        );
      });
    }
  }
}

customElements.define('dropdown-menu-item', DropdownMenuItem);
