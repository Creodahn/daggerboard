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
    this.#trigger.addEventListener('click', e => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Handle popover toggle events (for when user clicks outside)
    this.#content.addEventListener('toggle', e => {
      this.#isOpen = e.newState === 'open';
      if (this.#isOpen) {
        this.setAttribute('open', '');
      } else {
        this.removeAttribute('open');
      }
    });

    // Prevent closing when clicking inside dropdown content
    this.#content.addEventListener('click', e => {
      e.stopPropagation();
    });
  }

  toggleDropdown() {
    if (this.#isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    this.#content.showPopover();
    this.positionContent();
  }

  closeDropdown() {
    this.#content.hidePopover();
  }

  positionContent() {
    // Position the popover relative to the trigger
    const triggerRect = this.#trigger.getBoundingClientRect();

    // Position below the trigger, aligned to the right edge
    this.#content.style.position = 'fixed';
    this.#content.style.top = `${triggerRect.bottom + 4}px`;
    this.#content.style.left = 'auto';
    this.#content.style.right = `${window.innerWidth - triggerRect.right}px`;

    // Check if it would go off the bottom of the screen
    const contentRect = this.#content.getBoundingClientRect();
    if (contentRect.bottom > window.innerHeight) {
      // Position above the trigger instead
      this.#content.style.top = `${triggerRect.top - contentRect.height - 4}px`;
    }

    // Check if it would go off the left of the screen
    if (contentRect.left < 0) {
      this.#content.style.right = 'auto';
      this.#content.style.left = `${triggerRect.left}px`;
    }
  }
}

customElements.define('dropdown-menu', DropdownMenu);
