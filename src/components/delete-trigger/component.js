import ExtendedHtmlElement from '../extended-html-element.js';

/**
 * A delete trigger component that handles confirmation and deletion workflow.
 * Wraps confirm-dialog and provides consistent delete UX.
 *
 * Usage:
 *   <delete-trigger item-name="Goblin" item-id="123">
 *     <button slot="trigger">Delete</button>
 *   </delete-trigger>
 *
 * Or with default trigger:
 *   <delete-trigger item-name="Goblin" item-id="123"></delete-trigger>
 *
 * Attributes:
 *   - item-name: Name of the item being deleted (for confirmation message)
 *   - item-id: ID of the item (included in delete event)
 *   - message: Custom confirmation message (optional)
 *   - confirm-text: Custom confirm button text (default: "Delete")
 *   - cancel-text: Custom cancel button text (default: "Cancel")
 *
 * Events:
 *   - delete-confirmed: { id: string, name: string } - Fired when deletion is confirmed
 */
class DeleteTrigger extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;

  #confirmDialog;
  stylesPath = './styles.css';
  templatePath = './template.html';

  constructor() {
    super();

    // Register click handler in constructor - before ANY async operations
    this._clickHandler = async e => {
      const path = e.composedPath();

      // Check if this delete-trigger is in the click path
      if (!path.includes(this)) return;

      // Get the dialog element (might not be ready yet on first call)
      const dialog = this.#confirmDialog || this.shadowRoot?.querySelector('confirm-dialog');

      // IMPORTANT: Don't intercept clicks on the confirm-dialog or its contents
      const clickedOnDialog = dialog && path.some(el =>
        el === dialog ||
        (el instanceof Element && el.closest?.('confirm-dialog'))
      );

      if (clickedOnDialog) {
        // Let the dialog handle its own clicks
        return;
      }

      // This is a click on the trigger - show confirmation
      e.stopPropagation();
      e.preventDefault();
      await this.showConfirmation();
    };

    document.addEventListener('click', this._clickHandler, true);
  }

  async setup() {
    // Get reference to confirm-dialog after template is loaded
    this.#confirmDialog = this.shadowRoot.querySelector('confirm-dialog');
    // Wait for confirm-dialog to be ready
    await this.#confirmDialog.ready;
  }

  disconnectedCallback() {
    if (this._clickHandler) {
      document.removeEventListener('click', this._clickHandler, true);
    }
  }

  async showConfirmation() {
    const itemName = this.getAttribute('item-name') || 'this item';
    const itemId = this.getAttribute('item-id');
    const customMessage = this.getAttribute('message');
    const confirmText = this.getAttribute('confirm-text') || 'Delete';
    const cancelText = this.getAttribute('cancel-text') || 'Cancel';

    const message = customMessage || `Are you sure you want to delete "${itemName}"?`;

    // Wait for dialog to be ready if it isn't yet
    if (!this.#confirmDialog) {
      this.#confirmDialog = this.shadowRoot.querySelector('confirm-dialog');
    }
    await this.#confirmDialog.ready;

    const confirmed = await this.#confirmDialog.show({
      message,
      confirmText,
      cancelText,
      variant: 'danger'
    });

    if (confirmed) {
      this.dispatchEvent(new CustomEvent('delete-confirmed', {
        bubbles: true,
        composed: true,
        detail: {
          id: itemId,
          name: itemName
        }
      }));
    }
  }
}

customElements.define('delete-trigger', DeleteTrigger);
