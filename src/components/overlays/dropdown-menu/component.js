import ExtendedHtmlElement from '../../base/extended-html-element.js';
import { animateOverlayOpen, animateOverlayClose } from '../../../helpers/overlay-animation.js';

class DropdownMenu extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  #trigger;
  #content;
  #isOpen = false;
  #boundHandleDocumentClick;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#trigger = this.$('.dropdown-trigger');
    this.#content = this.$('.dropdown-content');
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

    animateOverlayOpen(this.#content, () => {
      document.addEventListener('click', this.#boundHandleDocumentClick);
    });
  }

  closeDropdown() {
    if (!this.#isOpen) return;

    this.#isOpen = false;
    this.removeAttribute('open');
    document.removeEventListener('click', this.#boundHandleDocumentClick);

    animateOverlayClose(this.#content, () => {
      if (this.#content.matches(':popover-open')) {
        this.#content.hidePopover();
      }
    });
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

  cleanup() {
    document.removeEventListener('click', this.#boundHandleDocumentClick);
  }
}

customElements.define('dropdown-menu', DropdownMenu);
