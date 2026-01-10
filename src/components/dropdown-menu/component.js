import ExtendedHtmlElement from '../extended-html-element.js';

class DropdownMenu extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #trigger;
  #content;
  #isOpen = false;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#trigger = this.shadowRoot.querySelector('.dropdown-trigger');
    this.#content = this.shadowRoot.querySelector('.dropdown-content');

    // Toggle dropdown on trigger click
    this.#trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Prevent closing when clicking inside dropdown content
    this.#content.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      if (this.#isOpen) {
        this.closeDropdown();
      }
    });

    // Handle slot changes to position content
    const slot = this.shadowRoot.querySelector('slot[name="content"]');
    if (slot) {
      slot.addEventListener('slotchange', () => {
        this.positionContent();
      });
    }
  }

  toggleDropdown() {
    if (this.#isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    this.#isOpen = true;
    this.setAttribute('open', '');
    this.positionContent();
  }

  closeDropdown() {
    this.#isOpen = false;
    this.removeAttribute('open');
  }

  positionContent() {
    // Ensure dropdown content is positioned relative to trigger
    // This happens automatically via CSS, but we could add dynamic positioning here if needed
  }
}

customElements.define('dropdown-menu', DropdownMenu);
