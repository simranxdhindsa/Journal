(() => {
	const dateDisplay = document.getElementById('date-display');
	const saveIndicator = document.getElementById('save-indicator');
	const btnToday = document.getElementById('btn-today');
	const btnExport = document.getElementById('btn-export');
	const btnImport = document.getElementById('btn-import');
	const btnOpenFolder = document.getElementById('btn-open-folder');
	const btnTheme = document.getElementById('btn-theme');
	const btnNewEntry = document.getElementById('btn-new-entry');
	const entriesList = document.getElementById('entries-list');

	let currentDate = null; // ISO YYYY-MM-DD or null
	let currentTitledId = null; // ID of current titled entry or null
	let autosaveTimer = null;
	let isSaving = false;
	let currentTheme = localStorage.getItem('journal-theme') || 'system';
	let currentMode = 'date'; // 'date' or 'titled'

	function applyTheme(theme) {
		currentTheme = theme;
		localStorage.setItem('journal-theme', theme);
		const html = document.documentElement;
		if (theme === 'dark') {
			html.classList.add('theme-dark');
			html.classList.remove('theme-light');
		} else if (theme === 'light') {
			html.classList.add('theme-light');
			html.classList.remove('theme-dark');
		} else {
			html.classList.remove('theme-dark', 'theme-light');
		}
		btnTheme.textContent = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌓';
	}

	function toggleTheme() {
		if (currentTheme === 'system') {
			applyTheme('dark');
		} else if (currentTheme === 'dark') {
			applyTheme('light');
		} else {
			applyTheme('system');
		}
	}

	function setSaving(state) {
		isSaving = state;
		saveIndicator.textContent = state ? 'Saving…' : 'Saved';
	}

	async function loadDate(date) {
		currentDate = date;
		currentTitledId = null;
		currentMode = 'date';
		const [y, m, d] = date.split('-').map(Number);
		const dateObj = new Date(y, m - 1, d);
		dateDisplay.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
		const entry = await window.journal.loadEntry(date);
		window.editorSetHTML(entry?.html || '');
		if (window.setCalendarDate) window.setCalendarDate(date);
		window.refreshCalendar && window.refreshCalendar();
		updateEntriesList();
	}

	async function loadTitledEntry(id) {
		currentTitledId = id;
		currentDate = null;
		currentMode = 'titled';
		const entry = await window.journal.loadTitledEntry(id);
		if (entry) {
			dateDisplay.textContent = entry.title || 'Untitled Entry';
			window.editorSetHTML(entry.html || '');
		}
		updateEntriesList();
	}

	async function updateEntriesList() {
		const entries = await window.journal.listTitledEntries();
		entriesList.innerHTML = '';
		entries.forEach(entry => {
			const item = document.createElement('div');
			item.className = 'entry-item' + (entry.id === currentTitledId ? ' active' : '');
			item.textContent = entry.title || 'Untitled Entry';
			item.addEventListener('click', () => loadTitledEntry(entry.id));
			entriesList.appendChild(item);
		});
	}

	async function createNewEntry() {
		const title = prompt('Enter entry title:', 'Untitled Entry');
		if (title === null) return;
		const entry = await window.journal.createTitledEntry(title || 'Untitled Entry');
		await loadTitledEntry(entry.id);
		await updateEntriesList();
	}

	async function init() {
		applyTheme(currentTheme);
		if (btnTheme) btnTheme.addEventListener('click', toggleTheme);
		if (btnNewEntry) btnNewEntry.addEventListener('click', createNewEntry);
		await updateEntriesList();
		const today = await window.journal.getToday();
		await loadDate(today);
		initCalendar(async (picked) => {
			await loadDate(picked);
		});
		initEditor(onEditorChanged);
		btnToday.addEventListener('click', async () => {
			const t = await window.journal.getToday();
			await loadDate(t);
		});
		btnExport.addEventListener('click', async () => {
			await window.journal.exportAll('');
		});
		btnImport.addEventListener('click', async () => {
			await window.journal.importFrom('');
			window.refreshCalendar && window.refreshCalendar();
		});
		btnOpenFolder.addEventListener('click', async () => {
			await window.journal.openDataFolder();
		});
	}

	function onEditorChanged() {
		if (autosaveTimer) clearTimeout(autosaveTimer);
		autosaveTimer = setTimeout(async () => {
			setSaving(true);
			const html = window.editorGetHTML();
			const wordCount = (html.replace(/<[^>]*>/g, ' ').match(/\S+/g) || []).length;
			if (currentMode === 'date' && currentDate) {
				await window.journal.saveEntry({ date: currentDate, html, wordCount });
			} else if (currentMode === 'titled' && currentTitledId) {
				const entry = await window.journal.loadTitledEntry(currentTitledId);
				await window.journal.saveTitledEntry({ id: currentTitledId, title: entry?.title || 'Untitled Entry', html, wordCount });
				await updateEntriesList();
			}
			setSaving(false);
		}, 800);
	}

	window.addEventListener('DOMContentLoaded', init);
})();


