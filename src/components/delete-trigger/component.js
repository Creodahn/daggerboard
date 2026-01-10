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
  #triggerEl;
  stylesPath = './styles.css';
  templatePath = './template.html';

  async setup() {
    this.#confirmDialog = this.shadowRoot.querySelector('confirm-dialog');
    this.#triggerEl = this.shadowRoot.querySelector('.delete-trigger');

    // Handle click on trigger (either slotted or default)
    this.#triggerEl.addEventListener('click', async e => {
      // Don't trigger if clicking inside the confirm dialog
      if (e.target.closest('confirm-dialog')) return;

      await this.showConfirmation();
    });

    // Also listen for clicks on slotted content
    this.shadowRoot.querySelector('slot[name="trigger"]').addEventListener('slotchange', () => {
      const slottedElements = this.shadowRoot.querySelector('slot[name="trigger"]').assignedElements();
      slottedElements.forEach(el => {
        el.addEventListener('click', async e => {
          e.stopPropagation();
          await this.showConfirmation();
        });
      });
    });
  }

  async showConfirmation() {
    const itemName = this.getAttribute('item-name') || 'this item';
    const itemId = this.getAttribute('item-id');
    const customMessage = this.getAttribute('message');
    const confirmText = this.getAttribute('confirm-text') || 'Delete';
    const cancelText = this.getAttribute('cancel-text') || 'Cancel';

    const message = customMessage || `Are you sure you want to delete "${itemName}"?`;

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
