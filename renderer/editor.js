function initEditor(onChange) {
	tinymce.init({
		selector: '#editor',
		menubar: false,
		plugins: 'lists link code codesample advlist autolink paste wordcount table',
		toolbar: 'undo redo | bold italic underline strikethrough | blocks | bullist numlist | blockquote | code codesample | link | removeformat',
		branding: false,
		min_height: 540,
		convert_urls: false,
		content_css: false,
		content_style: `body { color: inherit; background: transparent; font-size: 16px; line-height: 1.6; }
			code { background: rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; }
			pre { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); border-left: 3px solid rgba(99, 102, 241, 0.6); padding: 12px; border-radius: 6px; overflow-x: auto; }
			pre code { background: transparent; padding: 0; }`,
		setup: (editor) => {
			editor.on('change keyup paste input', () => {
				onChange && onChange();
			});

			function formatCurrentLine(format) {
				const selection = editor.selection;
				const selectedText = selection.getContent({ format: 'text' });
				if (selectedText) {
					editor.execCommand('mceToggleFormat', false, format);
				} else {
					const node = selection.getNode();
					const block = editor.dom.getParent(node, editor.dom.isBlock) || node;
					selection.select(block);
					editor.execCommand('mceToggleFormat', false, format);
					selection.collapse(false);
				}
			}

			// Slack-style keyboard shortcuts - Windows compatible
			editor.addShortcut('ctrl+b', 'Bold', () => {
				formatCurrentLine('bold');
			});
			editor.addShortcut('meta+b', 'Bold', () => {
				formatCurrentLine('bold');
			});

			editor.addShortcut('ctrl+i', 'Italic', () => {
				formatCurrentLine('italic');
			});
			editor.addShortcut('meta+i', 'Italic', () => {
				formatCurrentLine('italic');
			});

			editor.addShortcut('ctrl+shift+x', 'Strikethrough', () => {
				formatCurrentLine('strikethrough');
			});
			editor.addShortcut('meta+shift+x', 'Strikethrough', () => {
				formatCurrentLine('strikethrough');
			});

			editor.addShortcut('ctrl+shift+c', 'Inline Code', () => {
				const selectedText = editor.selection.getContent({ format: 'text' });
				if (selectedText) {
					editor.execCommand('mceToggleFormat', false, 'code');
				}
			});
			editor.addShortcut('meta+shift+c', 'Inline Code', () => {
				const selectedText = editor.selection.getContent({ format: 'text' });
				if (selectedText) {
					editor.execCommand('mceToggleFormat', false, 'code');
				}
			});

			editor.addShortcut('ctrl+alt+shift+c', 'Code Block', () => {
				const selectedText = editor.selection.getContent({ format: 'text' });
				if (selectedText) {
					editor.selection.setContent('<pre><code>' + selectedText + '</code></pre>');
				}
			});
			editor.addShortcut('meta+alt+shift+c', 'Code Block', () => {
				const selectedText = editor.selection.getContent({ format: 'text' });
				if (selectedText) {
					editor.selection.setContent('<pre><code>' + selectedText + '</code></pre>');
				}
			});

			editor.addShortcut('ctrl+shift+>', 'Blockquote', () => {
				formatCurrentLine('blockquote');
			});
			editor.addShortcut('meta+shift+>', 'Blockquote', () => {
				formatCurrentLine('blockquote');
			});

			editor.addShortcut('ctrl+shift+8', 'Bullet List', () => {
				editor.execCommand('InsertUnorderedList');
			});
			editor.addShortcut('meta+shift+8', 'Bullet List', () => {
				editor.execCommand('InsertUnorderedList');
			});

			editor.addShortcut('ctrl+shift+7', 'Numbered List', () => {
				editor.execCommand('InsertOrderedList');
			});
			editor.addShortcut('meta+shift+7', 'Numbered List', () => {
				editor.execCommand('InsertOrderedList');
			});

			editor.addShortcut('ctrl+shift+u', 'Insert Link', () => {
				editor.execCommand('mceLink');
			});
			editor.addShortcut('meta+shift+u', 'Insert Link', () => {
				editor.execCommand('mceLink');
			});

			editor.addShortcut('ctrl+shift+\\', 'Insert Emoji', () => {
				editor.insertContent('😊');
			});
			editor.addShortcut('meta+shift+\\', 'Insert Emoji', () => {
				editor.insertContent('😊');
			});

			editor.addShortcut('ctrl+/', 'Show Shortcuts', () => {
				alert('Keyboard Shortcuts:\n\nBold: Ctrl/Cmd + B\nItalic: Ctrl/Cmd + I\nStrikethrough: Ctrl/Cmd + Shift + X\nInline Code: Ctrl/Cmd + Shift + C\nCode Block: Ctrl/Cmd + Alt + Shift + C\nBlockquote: Ctrl/Cmd + Shift + >\nBullet List: Ctrl/Cmd + Shift + 8\nNumbered List: Ctrl/Cmd + Shift + 7\nInsert Link: Ctrl/Cmd + Shift + U\nInsert Emoji: Ctrl/Cmd + Shift + \\');
			});
			editor.addShortcut('meta+/', 'Show Shortcuts', () => {
				alert('Keyboard Shortcuts:\n\nBold: Ctrl/Cmd + B\nItalic: Ctrl/Cmd + I\nStrikethrough: Ctrl/Cmd + Shift + X\nInline Code: Ctrl/Cmd + Shift + C\nCode Block: Ctrl/Cmd + Alt + Shift + C\nBlockquote: Ctrl/Cmd + Shift + >\nBullet List: Ctrl/Cmd + Shift + 8\nNumbered List: Ctrl/Cmd + Shift + 7\nInsert Link: Ctrl/Cmd + Shift + U\nInsert Emoji: Ctrl/Cmd + Shift + \\');
			});

			// Shift+Enter for new line without paragraph break
			editor.on('keydown', (e) => {
				if (e.keyCode === 13 && e.shiftKey) {
					e.preventDefault();
					editor.execCommand('InsertLineBreak');
					return false;
				}
			});
		}
	});
}

function editorSetHTML(html) {
	const e = tinymce.activeEditor;
	if (!e) return;
	e.setContent(html || '');
}

function editorGetHTML() {
	const e = tinymce.activeEditor;
	return e ? e.getContent({ format: 'html' }) : '';
}

window.initEditor = initEditor;
window.editorSetHTML = editorSetHTML;
window.editorGetHTML = editorGetHTML;


