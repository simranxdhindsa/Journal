/**
 * Notes Manager - Handles multiple notes per date (iPhone Notes style)
 */

class NotesManager {
	constructor(container) {
		this.container = container;
		this.currentDate = null;
		this.notes = []; // Array of { id, title, html, editor: RichEditor }
		this.autosaveTimers = new Map();
		this.onChangeCallback = null;
	}

	setOnChange(callback) {
		this.onChangeCallback = callback;
	}

	async loadDate(date) {
		this.currentDate = date;
		this.notes = [];
		this.container.innerHTML = '';

		// Load all notes for this date from backend
		const dateNotes = await window.journal.loadDateNotes(date);

		if (dateNotes && dateNotes.length > 0) {
			// Load existing notes
			for (const noteData of dateNotes) {
				this.createNoteCard(noteData.id, noteData.title, noteData.html);
			}
		} else {
			// Create first note for new date
			this.addNewNote();
		}
	}

	addNewNote() {
		const id = this.generateNoteId();
		const title = 'Untitled Note';
		const html = '';
		this.createNoteCard(id, title, html);

		// Auto-save the new note
		this.saveNote(id);
	}

	createNoteCard(id, title, html) {
		const card = document.createElement('div');
		card.className = 'note-card';
		card.dataset.noteId = id;

		const header = document.createElement('div');
		header.className = 'note-card-header';

		const titleInput = document.createElement('input');
		titleInput.type = 'text';
		titleInput.className = 'note-card-title';
		titleInput.value = title || 'Untitled Note';
		titleInput.placeholder = 'Note title...';

		const actions = document.createElement('div');
		actions.className = 'note-card-actions';

		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'note-action-btn delete';
		deleteBtn.innerHTML = `
			<svg width="16" height="16" viewBox="0 0 16 16">
				<path fill="currentColor" d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
				<path fill="currentColor" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
			</svg>
		`;
		deleteBtn.title = 'Delete note';
		deleteBtn.addEventListener('click', () => this.deleteNote(id));

		actions.appendChild(deleteBtn);
		header.appendChild(titleInput);
		header.appendChild(actions);

		const editorContainer = document.createElement('div');
		editorContainer.className = 'rich-editor-wrapper';

		card.appendChild(header);
		card.appendChild(editorContainer);
		this.container.appendChild(card);

		// Initialize rich editor
		const editor = new RichEditor(editorContainer, () => {
			this.scheduleAutoSave(id);
		});

		editor.setHTML(html);

		// Track this note
		this.notes.push({ id, title, html, editor, card, titleInput });

		// Handle title changes
		titleInput.addEventListener('input', () => {
			const note = this.notes.find(n => n.id === id);
			if (note) {
				note.title = titleInput.value;
				this.scheduleAutoSave(id);
			}
		});

		// Focus management
		editorContainer.addEventListener('focusin', () => {
			card.classList.add('focused');
		});

		editorContainer.addEventListener('focusout', () => {
			card.classList.remove('focused');
		});

		// Focus the new editor
		setTimeout(() => editor.focus(), 50);
	}

	scheduleAutoSave(noteId) {
		if (this.autosaveTimers.has(noteId)) {
			clearTimeout(this.autosaveTimers.get(noteId));
		}

		const timer = setTimeout(() => {
			this.saveNote(noteId);
		}, 800);

		this.autosaveTimers.set(noteId, timer);
	}

	async saveNote(noteId) {
		const note = this.notes.find(n => n.id === noteId);
		if (!note) return;

		const html = note.editor.getHTML();
		const title = note.titleInput.value || 'Untitled Note';

		// Update local state
		note.html = html;
		note.title = title;

		// Save to backend
		await window.journal.saveDateNote({
			date: this.currentDate,
			noteId: noteId,
			title: title,
			html: html
		});

		if (this.onChangeCallback) {
			this.onChangeCallback();
		}
	}

	async deleteNote(noteId) {
		// Confirm deletion
		if (this.notes.length === 1) {
			// Don't delete the last note, just clear it
			const note = this.notes.find(n => n.id === noteId);
			if (note) {
				note.editor.clear();
				note.titleInput.value = 'Untitled Note';
				this.saveNote(noteId);
			}
			return;
		}

		const confirmed = confirm('Delete this note?');
		if (!confirmed) return;

		// Remove from backend
		await window.journal.deleteDateNote(this.currentDate, noteId);

		// Remove from UI
		const noteIndex = this.notes.findIndex(n => n.id === noteId);
		if (noteIndex !== -1) {
			const note = this.notes[noteIndex];
			note.card.remove();
			this.notes.splice(noteIndex, 1);
		}

		// Clear autosave timer
		if (this.autosaveTimers.has(noteId)) {
			clearTimeout(this.autosaveTimers.get(noteId));
			this.autosaveTimers.delete(noteId);
		}

		if (this.onChangeCallback) {
			this.onChangeCallback();
		}
	}

	generateNoteId() {
		return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	async saveAll() {
		for (const note of this.notes) {
			await this.saveNote(note.id);
		}
	}

	clear() {
		this.notes = [];
		this.container.innerHTML = '';
		this.autosaveTimers.forEach(timer => clearTimeout(timer));
		this.autosaveTimers.clear();
	}
}

window.NotesManager = NotesManager;
