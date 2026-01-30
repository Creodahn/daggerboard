import ExtendedHtmlElement from '../../../../base/extended-html-element.js';

/**
 * A single note item in the notes list dropdown.
 *
 * Usage:
 *   <note-list-item title="My Note" date="Jan 30" current></note-list-item>
 *
 * Attributes:
 *   - title: The note title to display
 *   - date: The date string to display
 *   - note-id: The note's unique identifier
 *   - current: Whether this is the currently selected note
 *
 * Events:
 *   - note-select: { noteId } - Emitted when the item is clicked
 */
class NoteListItem extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  static observedAttributes = ['title', 'date', 'current'];

  stylesPath = './styles.css';
  templatePath = './template.html';

  get noteId() {
    return this.getAttribute('note-id');
  }

  get isCurrent() {
    return this.hasAttribute('current');
  }

  async setup() {
    this.updateDisplay();

    this.addEventListener('click', () => {
      this.emit('note-select', { noteId: this.noteId });
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.isSetup && oldValue !== newValue) {
      this.updateDisplay();
    }
  }

  updateDisplay() {
    const titleEl = this.$('.note-title');
    const dateEl = this.$('.note-date');

    if (titleEl) {
      titleEl.textContent = this.getAttribute('title') || 'Untitled';
    }
    if (dateEl) {
      dateEl.textContent = this.getAttribute('date') || '';
    }

    // Update current state
    const container = this.$('.note-list-item');
    if (container) {
      container.classList.toggle('current', this.isCurrent);
    }
  }
}

customElements.define('note-list-item', NoteListItem);
