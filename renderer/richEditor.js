/**
 * Rich Text Editor with Asana-style formatting and Slack-like shortcuts
 * No external WYSIWYG library - pure contenteditable with execCommand
 */

class RichEditor {
	constructor(container, onChange) {
		this.container = container;
		this.onChange = onChange;
		this.editor = null;
		this.toolbar = null;
		this.init();
	}

	init() {
		// Create toolbar
		this.toolbar = document.createElement('div');
		this.toolbar.className = 'rich-toolbar';
		this.toolbar.innerHTML = `
			<div class="toolbar-group">
				<button data-command="bold" title="Bold (Ctrl+B)" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2h5a3 3 0 0 1 2 5.5A3.5 3.5 0 0 1 9 14H4V2zm1 5h4a2 2 0 1 0 0-4H5v4zm0 1v5h4a2.5 2.5 0 1 0 0-5H5z"/></svg>
				</button>
				<button data-command="italic" title="Italic (Ctrl+I)" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 2h6v1H9.5l-2 10H10v1H4v-1h2.5l2-10H6V2z"/></svg>
				</button>
				<button data-command="underline" title="Underline (Ctrl+U)" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2v6a4 4 0 0 0 8 0V2h-1v6a3 3 0 0 1-6 0V2H4zm0 12h8v1H4v-1z"/></svg>
				</button>
				<button data-command="strikeThrough" title="Strikethrough (Ctrl+Shift+X)" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 8h12v1H2V8zm3-4h6a2 2 0 0 1 1.5 3.3L11 8.7V10a2 2 0 0 1-4 0h1a1 1 0 0 0 2 0V9H5a2 2 0 0 1 0-4h1a1 1 0 0 0 0 2z"/></svg>
				</button>
			</div>
			<div class="toolbar-divider"></div>
			<div class="toolbar-group">
				<button data-command="insertUnorderedList" title="Bullet List (Ctrl+Shift+8)" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="2" cy="3" r="1"/><circle cx="2" cy="8" r="1"/><circle cx="2" cy="13" r="1"/><path d="M5 2h9v2H5V2zm0 5h9v2H5V7zm0 5h9v2H5v-2z"/></svg>
				</button>
				<button data-command="insertOrderedList" title="Numbered List (Ctrl+Shift+7)" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><path d="M5 2h9v2H5V2zm0 5h9v2H5V7zm0 5h9v2H5v-2zM2 3V2h1v4H2V5h.5V3H2zm0 5v1h1v1H2v1h2V9H3v1h-.5V9H2zm1 5v1H2v1h2v-4H3v1h.5v1H3z"/></svg>
				</button>
			</div>
			<div class="toolbar-divider"></div>
			<div class="toolbar-group">
				<button data-command="formatBlock:blockquote" title="Blockquote (Ctrl+Shift+>)" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 3h5v5H4l-1 2V8H2V3zm7 0h5v5h-3l-1 2V8H9V3z"/></svg>
				</button>
				<button data-command="code" title="Inline Code (Ctrl+Shift+C)" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><path d="M5 5L2 8l3 3v-2l-2-1 2-1V5zm6 0v2l2 1-2 1v2l3-3-3-3zM7 3L6 13h1L8 3H7z"/></svg>
				</button>
				<button data-command="formatBlock:pre" title="Code Block (Ctrl+Alt+Shift+C)" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="3" width="14" height="10" rx="1" fill="none" stroke="currentColor"/><path d="M4 6l2 2-2 2M8 10h3"/></svg>
				</button>
			</div>
			<div class="toolbar-divider"></div>
			<div class="toolbar-group">
				<button data-command="createLink" title="Insert Link (Ctrl+K)" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><path d="M7 9L5 11a2 2 0 1 1-3-3l2-2m8 0l2 2a2 2 0 1 1-3 3l-2-2m-3-5l4 4"/></svg>
				</button>
				<button data-command="removeFormat" title="Clear Formatting" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 2l10 12M6 2h6v2H9l-1 2m4 8v-2l-2-3"/></svg>
				</button>
			</div>
			<div class="toolbar-divider"></div>
			<div class="toolbar-group">
				<button data-command="undo" title="Undo (Ctrl+Z)" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h8a3 3 0 0 1 0 6H8v-1h3a2 2 0 0 0 0-4H3V6L1 8l2 2V8z"/></svg>
				</button>
				<button data-command="redo" title="Redo (Ctrl+Y)" class="toolbar-btn">
					<svg width="16" height="16" viewBox="0 0 16 16"><path d="M13 8H5a3 3 0 0 0 0 6h3v-1H5a2 2 0 0 1 0-4h8V6l2 2-2 2V8z"/></svg>
				</button>
			</div>
		`;

		// Create editor
		this.editor = document.createElement('div');
		this.editor.className = 'rich-editor-content';
		this.editor.contentEditable = 'true';
		this.editor.setAttribute('spellcheck', 'true');

		// Append to container
		this.container.innerHTML = '';
		this.container.appendChild(this.toolbar);
		this.container.appendChild(this.editor);

		// Bind events
		this.bindToolbarEvents();
		this.bindEditorEvents();
		this.bindKeyboardShortcuts();
	}

	bindToolbarEvents() {
		this.toolbar.addEventListener('click', (e) => {
			const btn = e.target.closest('.toolbar-btn');
			if (!btn) return;

			e.preventDefault();
			const command = btn.getAttribute('data-command');

			if (command.startsWith('formatBlock:')) {
				const tag = command.split(':')[1];
				this.formatBlock(tag);
			} else if (command === 'createLink') {
				this.insertLink();
			} else if (command === 'code') {
				this.toggleInlineCode();
			} else {
				this.executeCommand(command);
			}

			this.editor.focus();
		});
	}

	bindEditorEvents() {
		this.editor.addEventListener('input', () => {
			this.updateToolbarState();
			if (this.onChange) this.onChange();
		});

		this.editor.addEventListener('keyup', () => {
			this.updateToolbarState();
		});

		this.editor.addEventListener('mouseup', () => {
			this.updateToolbarState();
		});

		// Handle paste to clean up HTML
		this.editor.addEventListener('paste', (e) => {
			e.preventDefault();
			const text = e.clipboardData.getData('text/plain');
			document.execCommand('insertText', false, text);
		});
	}

	bindKeyboardShortcuts() {
		this.editor.addEventListener('keydown', (e) => {
			const ctrl = e.ctrlKey || e.metaKey;
			const shift = e.shiftKey;
			const alt = e.altKey;

			// Bold: Ctrl+B
			if (ctrl && !shift && e.key === 'b') {
				e.preventDefault();
				this.applyFormatToSelection('bold');
			}
			// Italic: Ctrl+I
			else if (ctrl && !shift && e.key === 'i') {
				e.preventDefault();
				this.applyFormatToSelection('italic');
			}
			// Underline: Ctrl+U
			else if (ctrl && !shift && e.key === 'u') {
				e.preventDefault();
				this.applyFormatToSelection('underline');
			}
			// Strikethrough: Ctrl+Shift+X
			else if (ctrl && shift && e.key.toLowerCase() === 'x') {
				e.preventDefault();
				this.applyFormatToSelection('strikeThrough');
			}
			// Inline Code: Ctrl+Shift+C
			else if (ctrl && shift && !alt && e.key.toLowerCase() === 'c') {
				e.preventDefault();
				this.toggleInlineCode();
			}
			// Code Block: Ctrl+Alt+Shift+C
			else if (ctrl && shift && alt && e.key.toLowerCase() === 'c') {
				e.preventDefault();
				this.formatBlock('pre');
			}
			// Bullet List: Ctrl+Shift+8
			else if (ctrl && shift && (e.key === '8' || e.key === '*')) {
				e.preventDefault();
				this.executeCommand('insertUnorderedList');
			}
			// Numbered List: Ctrl+Shift+7
			else if (ctrl && shift && (e.key === '7' || e.key === '&')) {
				e.preventDefault();
				this.executeCommand('insertOrderedList');
			}
			// Blockquote: Ctrl+Shift+>
			else if (ctrl && shift && (e.key === '>' || e.key === '.')) {
				e.preventDefault();
				this.formatBlock('blockquote');
			}
			// Link: Ctrl+K
			else if (ctrl && !shift && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				this.insertLink();
			}
			// Shift+Enter for line break
			else if (shift && e.key === 'Enter') {
				e.preventDefault();
				document.execCommand('insertLineBreak');
			}
		});
	}

	executeCommand(command, value = null) {
		document.execCommand(command, false, value);
		this.updateToolbarState();
	}

	applyFormatToSelection(command) {
		const selection = window.getSelection();
		const selectedText = selection.toString();

		if (selectedText) {
			// Apply to selection
			document.execCommand(command, false, null);
		} else {
			// Apply to current line/block
			const node = selection.anchorNode;
			const element = node.nodeType === 3 ? node.parentElement : node;
			const block = this.getBlockElement(element);

			if (block && block !== this.editor) {
				const range = document.createRange();
				range.selectNodeContents(block);
				selection.removeAllRanges();
				selection.addRange(range);
				document.execCommand(command, false, null);
				selection.collapse(block, 0);
			}
		}
		this.updateToolbarState();
	}

	toggleInlineCode() {
		const selection = window.getSelection();
		if (!selection.rangeCount) return;

		const selectedText = selection.toString();
		if (!selectedText) return;

		const range = selection.getRangeAt(0);
		const parentElement = range.commonAncestorContainer.parentElement;

		// Check if already in code
		if (parentElement.tagName === 'CODE') {
			// Remove code formatting
			const text = document.createTextNode(parentElement.textContent);
			parentElement.parentNode.replaceChild(text, parentElement);
		} else {
			// Apply code formatting
			const code = document.createElement('code');
			code.textContent = selectedText;
			range.deleteContents();
			range.insertNode(code);
		}

		this.updateToolbarState();
		if (this.onChange) this.onChange();
	}

	formatBlock(tag) {
		const selection = window.getSelection();
		if (!selection.rangeCount) return;

		const node = selection.anchorNode;
		const element = node.nodeType === 3 ? node.parentElement : node;
		const currentBlock = this.getBlockElement(element);

		if (currentBlock && currentBlock !== this.editor) {
			if (currentBlock.tagName.toLowerCase() === tag) {
				// Remove formatting - convert to paragraph
				const p = document.createElement('p');
				p.innerHTML = currentBlock.innerHTML;
				currentBlock.parentNode.replaceChild(p, currentBlock);
			} else {
				// Apply formatting
				const newBlock = document.createElement(tag);
				newBlock.innerHTML = currentBlock.innerHTML;
				currentBlock.parentNode.replaceChild(newBlock, currentBlock);
			}
		} else {
			// Fallback to execCommand for blockquote
			if (tag === 'blockquote') {
				document.execCommand('formatBlock', false, tag);
			} else if (tag === 'pre') {
				const selectedText = selection.toString();
				if (selectedText) {
					const pre = document.createElement('pre');
					const code = document.createElement('code');
					code.textContent = selectedText;
					pre.appendChild(code);

					const range = selection.getRangeAt(0);
					range.deleteContents();
					range.insertNode(pre);
				}
			}
		}

		this.updateToolbarState();
		if (this.onChange) this.onChange();
	}

	insertLink() {
		const url = prompt('Enter URL:', 'https://');
		if (url && url.trim()) {
			document.execCommand('createLink', false, url.trim());
		}
		this.updateToolbarState();
	}

	getBlockElement(element) {
		const blockTags = ['P', 'DIV', 'BLOCKQUOTE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'];
		let current = element;

		while (current && current !== this.editor) {
			if (blockTags.includes(current.tagName)) {
				return current;
			}
			current = current.parentElement;
		}

		return null;
	}

	updateToolbarState() {
		const buttons = this.toolbar.querySelectorAll('.toolbar-btn');
		buttons.forEach(btn => {
			const command = btn.getAttribute('data-command');
			let isActive = false;

			if (command.startsWith('formatBlock:')) {
				const tag = command.split(':')[1];
				const selection = window.getSelection();
				if (selection.rangeCount) {
					const node = selection.anchorNode;
					const element = node.nodeType === 3 ? node.parentElement : node;
					const block = this.getBlockElement(element);
					isActive = block && block.tagName.toLowerCase() === tag;
				}
			} else if (command === 'code') {
				const selection = window.getSelection();
				if (selection.rangeCount) {
					const node = selection.anchorNode;
					const element = node.nodeType === 3 ? node.parentElement : node;
					isActive = element.tagName === 'CODE' || element.closest('code');
				}
			} else if (['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'].includes(command)) {
				try {
					isActive = document.queryCommandState(command);
				} catch (e) {}
			}

			btn.classList.toggle('active', isActive);
		});
	}

	setHTML(html) {
		this.editor.innerHTML = html || '<p><br></p>';
	}

	getHTML() {
		let html = this.editor.innerHTML;
		// Clean up empty paragraphs
		if (html === '<p><br></p>' || html === '<div><br></div>') {
			return '';
		}
		return html;
	}

	focus() {
		this.editor.focus();
	}

	clear() {
		this.editor.innerHTML = '<p><br></p>';
	}
}

window.RichEditor = RichEditor;
