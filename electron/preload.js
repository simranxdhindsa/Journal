const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('journal', {
	getToday: () => ipcRenderer.invoke('journal:getToday'),
	loadEntry: (date) => ipcRenderer.invoke('journal:loadEntry', date),
	saveEntry: (entry) => ipcRenderer.invoke('journal:saveEntry', entry),
	listDates: () => ipcRenderer.invoke('journal:listDates'),
	rebuildIndex: () => ipcRenderer.invoke('journal:rebuildIndex'),
	exportAll: (targetDir) => ipcRenderer.invoke('journal:exportAll', targetDir),
	importFrom: (sourceDir) => ipcRenderer.invoke('journal:importFrom', sourceDir),
	openDataFolder: () => ipcRenderer.invoke('journal:openDataFolder'),

	// Standalone titled entries
	listTitledEntries: () => ipcRenderer.invoke('journal:listTitledEntries'),
	createTitledEntry: (title) => ipcRenderer.invoke('journal:createTitledEntry', title),
	loadTitledEntry: (id) => ipcRenderer.invoke('journal:loadTitledEntry', id),
	saveTitledEntry: (entry) => ipcRenderer.invoke('journal:saveTitledEntry', entry),
	deleteTitledEntry: (id) => ipcRenderer.invoke('journal:deleteTitledEntry', id),

	// Multiple notes per date
	loadDateNotes: (date) => ipcRenderer.invoke('journal:loadDateNotes', date),
	saveDateNote: (note) => ipcRenderer.invoke('journal:saveDateNote', note),
	deleteDateNote: (date, noteId) => ipcRenderer.invoke('journal:deleteDateNote', date, noteId)
});


