import ExtendedHtmlElement from '../extended-html-element.js';

class DropdownMenu extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #trigger;
  #content;
  #isOpen = false;
  #boundHandleDocumentClick;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#trigger = this.shadowRoot.querySelector('.dropdown-trigger');
    this.#content = this.shadowRoot.querySelector('.dropdown-content');
    this.#boundHandleDocumentClick = this.#handleDocumentClick.bind(this);

    // Toggle dropdown on trigger click
    this.#trigger.addEventListener('click', e => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Close when menu-item-click is dispatched (from non-keep-open items)
    this.addEventListener('menu-item-click', () => {
      setTimeout(() => this.closeDropdown(), 0);
    });
  }

  #isClickInsidePopover(e) {
    const rect = this.#content.getBoundingClientRect();
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
  }

  #isClickOnTrigger(e) {
    const rect = this.#trigger.getBoundingClientRect();
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
  }

  #handleDocumentClick(e) {
    if (this.#isClickInsidePopover(e) || this.#isClickOnTrigger(e)) {
      return;
    }
    this.closeDropdown();
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
    this.#content.showPopover();
    this.positionContent();

    // Listen for clicks to close - delay to avoid immediate trigger
    requestAnimationFrame(() => {
      document.addEventListener('click', this.#boundHandleDocumentClick);
    });
  }

  closeDropdown() {
    if (!this.#isOpen) return;

    this.#isOpen = false;
    this.removeAttribute('open');
    this.#content.hidePopover();

    document.removeEventListener('click', this.#boundHandleDocumentClick);
  }

  positionContent() {
    const triggerRect = this.#trigger.getBoundingClientRect();

    this.#content.style.position = 'fixed';
    this.#content.style.top = `${triggerRect.bottom + 4}px`;
    this.#content.style.left = 'auto';
    this.#content.style.right = `${window.innerWidth - triggerRect.right}px`;

    const contentRect = this.#content.getBoundingClientRect();
    if (contentRect.bottom > window.innerHeight) {
      this.#content.style.top = `${triggerRect.top - contentRect.height - 4}px`;
    }

    if (contentRect.left < 0) {
      this.#content.style.right = 'auto';
      this.#content.style.left = `${triggerRect.left}px`;
    }
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.#boundHandleDocumentClick);
  }
}

customElements.define('dropdown-menu', DropdownMenu);
