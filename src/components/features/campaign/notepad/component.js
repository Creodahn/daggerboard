import ExtendedHtmlElement from '../../../base/extended-html-element.js';
import { debounce } from '../../../../helpers/debounce.js';
import ToastMessage from '../../../feedback/toast-message/component.js';
import createWindow from '../../../../helpers/create-window.js';
import { invoke, listen, emitTo, getCurrentWindow, getAllWindows } from '../../../../helpers/tauri.js';
import '../../../ui/action-button/component.js';

/**
 * Campaign notepad component with multi-note support and auto-save.
 *
 * Usage:
 *   <campaign-notepad note-id="abc123"></campaign-notepad>
 *
 * Or pass note-id via URL: ?noteId=abc123
 */
class CampaignNotepad extends ExtendedHtmlElement {
  static moduleUrl = import.meta.url;
  stylesPath = './styles.css';
  templatePath = './template.html';

  #textarea;
  #titleInput;
  #saveIndicator;
  #saveText;
  #notesList;
  #noteTriggerTitle;
  #dropdown;
  #currentCampaign = null;
  #currentNote = null;
  #notes = [];
  #unlisteners = [];
  #debouncedSave;
  #hideTimeout = null;

  async setup() {
    this.#textarea = this.$('.notepad-content');
    this.#titleInput = this.$('.note-title-input');
    this.#saveIndicator = this.$('.save-indicator');
    this.#saveText = this.$('.save-text');
    this.#notesList = this.$('.notes-list');
    this.#noteTriggerTitle = this.$('.note-trigger-title');
    this.#dropdown = this.$('dropdown-menu');

    // Create debounced save function (500ms delay after typing stops)
    this.#debouncedSave = debounce(() => this.save(), 500);

    // Get note ID from attribute or URL
    const urlParams = new URLSearchParams(window.location.search);
    const noteId = this.getAttribute('note-id') || urlParams.get('noteId');

    // Load initial data
    await this.loadCampaign();
    await this.loadNotes();

    if (noteId) {
      await this.loadNote(noteId);
    } else if (this.#notes.length > 0) {
      // Load the most recent note
      await this.loadNote(this.#notes[0].id);
    }

    // Setup event listeners
    this.#textarea.addEventListener('input', () => {
      this.showPending();
      this.#debouncedSave();
    });

    this.#titleInput.addEventListener('input', () => {
      this.showPending();
      this.#debouncedSave();
    });

    this.#titleInput.addEventListener('blur', () => {
      // Immediate save on blur
      this.#debouncedSave.cancel();
      this.save();
    });

    // New note button
    this.$('.new-note-btn').addEventListener('action-click', () => {
      this.createNewNote();
    });

    // Delete note button
    this.$('.delete-note-btn').addEventListener('action-click', () => {
      this.confirmDeleteNote();
    });

    // Listen for note updates
    this.#unlisteners.push(
      await listen('campaign-note-updated', (event) => {
        if (event.payload.note.id === this.#currentNote?.id) {
          // Only update if content differs (to avoid cursor jump)
          if (this.#textarea.value !== event.payload.note.content) {
            this.#textarea.value = event.payload.note.content;
          }
          if (this.#titleInput.value !== (event.payload.note.title || '')) {
            this.#titleInput.value = event.payload.note.title || '';
          }
        }
      })
    );

    // Listen for notes list updates
    this.#unlisteners.push(
      await listen('campaign-notes-list-updated', (event) => {
        if (event.payload.campaign_id === this.#currentCampaign?.id) {
          this.#notes = event.payload.notes;
          this.renderNotesList();
        }
      })
    );

    // Listen for note deletion
    this.#unlisteners.push(
      await listen('campaign-note-deleted', (event) => {
        if (event.payload.note_id === this.#currentNote?.id) {
          // Current note was deleted, load another or clear
          if (this.#notes.length > 0) {
            const remainingNotes = this.#notes.filter(n => n.id !== event.payload.note_id);
            if (remainingNotes.length > 0) {
              this.loadNote(remainingNotes[0].id);
            } else {
              this.#currentNote = null;
              this.updateDisplay();
            }
          }
        }
      })
    );

    // Listen for toast messages from other windows
    this.#unlisteners.push(
      await listen('show-toast', (event) => {
        const { type, message } = event.payload;
        if (type === 'success') {
          ToastMessage.success(message);
        } else if (type === 'error') {
          ToastMessage.error(message);
        } else {
          ToastMessage.show(message);
        }
      })
    );
  }

  async loadCampaign() {
    try {
      this.#currentCampaign = await invoke('get_current_campaign');
      if (!this.#currentCampaign) {
        this.#textarea.disabled = true;
        this.#textarea.placeholder = 'No campaign selected';
      }
    } catch (error) {
      console.error('Failed to load campaign:', error);
    }
  }

  async loadNotes() {
    if (!this.#currentCampaign) return;

    try {
      this.#notes = await invoke('get_campaign_notes', {
        campaignId: this.#currentCampaign.id
      });
      this.renderNotesList();
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }

  async loadNote(noteId) {
    try {
      this.#currentNote = await invoke('get_note', { noteId });
      this.updateDisplay();
    } catch (error) {
      console.error('Failed to load note:', error);
      ToastMessage.error('Failed to load note');
    }
  }

  updateDisplay() {
    if (this.#currentNote) {
      this.$('.notepad').classList.remove('no-note');
      this.#titleInput.value = this.#currentNote.title || '';
      this.#titleInput.placeholder = this.getDefaultTitle(this.#currentNote);
      this.#textarea.value = this.#currentNote.content;
      this.#textarea.disabled = false;
      this.#noteTriggerTitle.textContent = this.getNoteDisplayTitle(this.#currentNote);

      // Update window title
      this.updateWindowTitle();
    } else {
      this.$('.notepad').classList.add('no-note');
      this.#noteTriggerTitle.textContent = 'Select Note';
    }
    this.renderNotesList();
  }

  async updateWindowTitle() {
    if (!this.#currentNote) return;
    const title = `${this.getNoteDisplayTitle(this.#currentNote)} - Notepad`;
    document.title = title;
    try {
      await getCurrentWindow().setTitle(title);
    } catch (e) {
      console.error('Failed to update window title:', e);
    }
  }

  getNoteDisplayTitle(note) {
    return note.title || this.getDefaultTitle(note);
  }

  getDefaultTitle(note) {
    // SQLite stores datetime in UTC without timezone indicator
    // Append 'Z' to parse as UTC, then format in local timezone
    const dateStr = note.created_at.endsWith('Z') ? note.created_at : note.created_at + 'Z';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  renderNotesList() {
    if (this.#notes.length === 0) {
      this.#notesList.innerHTML = '<div class="empty-notes">No notes yet</div>';
      return;
    }

    this.#notesList.innerHTML = this.#notes.map(note => {
      const isCurrent = note.id === this.#currentNote?.id;
      const title = this.getNoteDisplayTitle(note);
      const date = new Date(note.updated_at);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      return `
        <div class="note-list-item ${isCurrent ? 'current' : ''}" data-note-id="${note.id}">
          <span class="note-list-item-title">${this.escapeHtml(title)}</span>
          <span class="note-list-item-date">${dateStr}</span>
        </div>
      `;
    }).join('');

    // Add click listeners - open each note in its own window
    this.#notesList.querySelectorAll('.note-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const noteId = item.dataset.noteId;
        const isCurrent = item.classList.contains('current');

        if (isCurrent) {
          // Already viewing this note, just close dropdown
          this.#dropdown.closeDropdown();
        } else {
          // Open in new window
          this.openNoteInNewWindow(noteId);
          this.#dropdown.closeDropdown();
        }
      });
    });
  }

  async openNoteInNewWindow(noteId, noteTitle = null) {
    // Try to find the note in our cached list, or use provided title
    const note = this.#notes.find(n => n.id === noteId);
    const title = noteTitle || (note ? this.getNoteDisplayTitle(note) : 'Note');

    await createWindow(`notepad-${noteId}`, {
      title: `${title} - Notepad`,
      width: 500,
      height: 600,
      resizable: true,
      url: `/pages/notepad-view/index.html?noteId=${noteId}`,
    }, { focusIfExists: true });
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async createNewNote() {
    if (!this.#currentCampaign) return;

    try {
      const note = await invoke('create_note', {
        campaignId: this.#currentCampaign.id,
        title: null
      });

      this.#dropdown.closeDropdown();

      // Open the new note in a new window
      const title = this.getNoteDisplayTitle(note);
      await this.openNoteInNewWindow(note.id, title);
    } catch (error) {
      console.error('Failed to create note:', error);
      ToastMessage.error('Failed to create note');
    }
  }

  async confirmDeleteNote() {
    if (!this.#currentNote) return;

    const confirmDialog = this.$('.delete-confirm');
    const noteTitle = this.getNoteDisplayTitle(this.#currentNote);

    const confirmed = await confirmDialog.show({
      message: `Are you sure you want to delete "${noteTitle}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      await this.deleteNote();
    }
  }

  async deleteNote() {
    if (!this.#currentNote) return;

    const deletedTitle = this.getNoteDisplayTitle(this.#currentNote);
    const deletedNoteId = this.#currentNote.id;
    const currentWindow = getCurrentWindow();
    const currentLabel = currentWindow.label;

    try {
      await invoke('delete_note', { noteId: deletedNoteId });

      // Refresh notes list
      await this.loadNotes();

      // Check if there's another notepad window already open
      const allWindows = await getAllWindows();
      const otherNotepadWindow = allWindows.find(win =>
        win.label.startsWith('notepad-') && win.label !== currentLabel
      );

      if (otherNotepadWindow) {
        // Send toast message to the other window, then focus it and close this one
        await emitTo(otherNotepadWindow.label, 'show-toast', {
          type: 'success',
          message: `Deleted "${deletedTitle}"`
        });
        await otherNotepadWindow.unminimize();
        await otherNotepadWindow.show();
        await otherNotepadWindow.setFocus();
        await currentWindow.close();
      } else if (this.#notes.length > 0) {
        // No other window open - load the most recent remaining note
        await this.loadNote(this.#notes[0].id);
        ToastMessage.success(`Deleted "${deletedTitle}"`);
      } else {
        // No notes left - create a new one
        const newNote = await invoke('create_note', {
          campaignId: this.#currentCampaign.id,
          title: null
        });
        await this.loadNote(newNote.id);
        ToastMessage.success(`Deleted "${deletedTitle}"`);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      ToastMessage.error('Failed to delete note');
    }
  }

  showPending() {
    if (this.#hideTimeout) {
      clearTimeout(this.#hideTimeout);
      this.#hideTimeout = null;
    }

    this.#saveIndicator.classList.remove('saved');
    this.#saveIndicator.classList.add('pending', 'visible');
    this.#saveText.textContent = 'Saving...';
  }

  showSaved() {
    this.#saveIndicator.classList.remove('pending');
    this.#saveIndicator.classList.add('saved');
    this.#saveText.textContent = 'Saved';

    this.#hideTimeout = setTimeout(() => {
      this.#saveIndicator.classList.remove('visible', 'saved');
      this.#hideTimeout = null;
    }, 2000);
  }

  showError() {
    this.#saveIndicator.classList.remove('pending', 'saved');
    this.#saveText.textContent = 'Save failed';

    this.#hideTimeout = setTimeout(() => {
      this.#saveIndicator.classList.remove('visible');
      this.#hideTimeout = null;
    }, 3000);
  }

  async save() {
    if (!this.#currentNote) return;

    try {
      const title = this.#titleInput.value.trim() || null;
      const content = this.#textarea.value;

      await invoke('update_note', {
        noteId: this.#currentNote.id,
        title,
        content
      });

      // Update local state
      this.#currentNote.title = title;
      this.#currentNote.content = content;

      // Update display title
      this.#noteTriggerTitle.textContent = this.getNoteDisplayTitle(this.#currentNote);
      this.updateWindowTitle();

      this.showSaved();
    } catch (error) {
      console.error('Failed to save note:', error);
      this.showError();
      ToastMessage.error('Failed to save note');
    }
  }

  cleanup() {
    for (const unlisten of this.#unlisteners) {
      unlisten();
    }
    if (this.#debouncedSave) {
      this.#debouncedSave.cancel();
    }
    if (this.#hideTimeout) {
      clearTimeout(this.#hideTimeout);
    }
  }
}

customElements.define('campaign-notepad', CampaignNotepad);
