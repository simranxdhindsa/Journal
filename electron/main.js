const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;

const DATE_FMT = { timeZone: 'UTC' };

function getUserRoot() {
	return path.join(app.getPath('userData'), 'Journal');
}
function getEntriesDir() {
	return path.join(getUserRoot(), 'entries');
}
function getBackupsDir() {
	return path.join(getUserRoot(), 'backups');
}
function getTitledEntriesDir() {
	return path.join(getUserRoot(), 'titled');
}
function getTitledEntryPath(id) {
	const dir = getTitledEntriesDir();
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	return path.join(dir, `${id}.json`);
}
function sanitizeFilename(name) {
	return name.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 50);
}
function ensureDirs() {
	const dirs = [getUserRoot(), getEntriesDir(), getBackupsDir(), getTitledEntriesDir()];
	dirs.forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
}
function dateToParts(iso) {
	const [y, m, d] = iso.split('-');
	return { y, m, d };
}
function entryPathForDate(iso) {
	const { y, m, d } = dateToParts(iso);
	const dir = path.join(getEntriesDir(), y, m);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	return path.join(dir, `${d}.json`);
}
function backupPathForDate(iso, stamp) {
	const { y, m, d } = dateToParts(iso);
	const dir = path.join(getBackupsDir(), y, m, d);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	return path.join(dir, `${stamp}.json`);
}
function todayISO() {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}
async function readJSONSafe(file) {
	try {
		const txt = await fsp.readFile(file, 'utf8');
		return JSON.parse(txt);
	} catch (e) { return null; }
}
async function writeJSONAtomic(file, data) {
	const dir = path.dirname(file);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	const tmp = `${file}.tmp`;
	await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
	await fsp.rename(tmp, file);
}
async function backupEntry(iso, data) {
	const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
	const target = backupPathForDate(iso, stamp);
	await fsp.writeFile(target, JSON.stringify(data, null, 2), 'utf8');
}
async function rebuildIndexFile() {
	const root = getEntriesDir();
	const dates = [];
	if (fs.existsSync(root)) {
		const ys = fs.readdirSync(root);
		for (const y of ys) {
			const yPath = path.join(root, y);
			if (!fs.statSync(yPath).isDirectory()) continue;
			const ms = fs.readdirSync(yPath);
			for (const m of ms) {
				const mPath = path.join(yPath, m);
				if (!fs.statSync(mPath).isDirectory()) continue;
				const ds = fs.readdirSync(mPath).filter(f => f.endsWith('.json'));
				for (const f of ds) {
					const d = f.replace('.json', '');
					dates.push(`${y}-${m}-${d}`);
				}
			}
		}
	}
	const index = { dates: Array.from(new Set(dates)).sort(), prefs: { theme: 'system' }, version: 1 };
	await writeJSONAtomic(getIndexPath(), index);
	return index;
}
async function readIndex() {
	let idx = await readJSONSafe(getIndexPath());
	if (!idx) idx = await rebuildIndexFile();
	return idx;
}

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 980,
		minHeight: 640,
		webPreferences: {
			contextIsolation: true,
			preload: path.join(__dirname, 'preload.js')
		}
	});

	mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

app.whenReady().then(() => {
	createWindow();
	ensureDirs();
	// Recover from any lingering .tmp newer than final
	recoverFromTmp();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// Placeholder for later IPC wiring (implemented in subsequent steps)
ipcMain.handle('journal:getToday', async () => todayISO());

ipcMain.handle('journal:loadEntry', async (_e, iso) => {
	const file = entryPathForDate(iso);
	let entry = await readJSONSafe(file);
	if (!entry) {
		entry = { date: iso, html: '', updatedAt: new Date().toISOString(), wordCount: 0, tags: [], version: 1 };
		await writeJSONAtomic(file, entry);
		await touchIndexDate(iso);
	}
	return entry;
});

ipcMain.handle('journal:saveEntry', async (_e, entry) => {
	const iso = entry.date;
	const file = entryPathForDate(iso);
	const toWrite = {
		date: iso,
		html: entry.html || '',
		updatedAt: new Date().toISOString(),
		wordCount: entry.wordCount || 0,
		tags: Array.isArray(entry.tags) ? entry.tags : [],
		version: 1
	};
	await writeJSONAtomic(file, toWrite);
	await backupEntry(iso, toWrite);
	await touchIndexDate(iso);
	return true;
});

ipcMain.handle('journal:listDates', async () => {
	const idx = await readIndex();
	return idx.dates || [];
});

ipcMain.handle('journal:rebuildIndex', async () => { await rebuildIndexFile(); });

ipcMain.handle('journal:exportAll', async (_e, targetDir) => {
	const startDir = targetDir && String(targetDir).trim().length ? targetDir : (await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })).filePaths?.[0];
	if (!startDir) return;
	const outJsonRoot = path.join(startDir, 'journal-export-json');
	const outHtmlRoot = path.join(startDir, 'journal-export-html');
	if (!fs.existsSync(outJsonRoot)) fs.mkdirSync(outJsonRoot, { recursive: true });
	if (!fs.existsSync(outHtmlRoot)) fs.mkdirSync(outHtmlRoot, { recursive: true });
	const dates = await ipcMain.invoke ? (await readIndex()).dates : (await readIndex()).dates;
	for (const iso of dates) {
		const src = entryPathForDate(iso);
		const rel = iso.replace(/-/g, path.sep) + '.json';
		const dst = path.join(outJsonRoot, rel);
		const dstdir = path.dirname(dst);
		if (!fs.existsSync(dstdir)) fs.mkdirSync(dstdir, { recursive: true });
		if (fs.existsSync(src)) fs.copyFileSync(src, dst);
		// html
		const entry = await readJSONSafe(src);
		const html = `<!doctype html><html><head><meta charset="utf-8"><title>${iso}</title></head><body><h1>${iso}</h1>${entry?.html || ''}</body></html>`;
		const htmlDst = path.join(outHtmlRoot, iso.replace(/-/g, '-') + '.html');
		await fsp.writeFile(htmlDst, html, 'utf8');
	}
	return true;
});

ipcMain.handle('journal:importFrom', async (_e, sourceDir) => {
	const srcRoot = sourceDir && String(sourceDir).trim().length ? sourceDir : (await dialog.showOpenDialog({ properties: ['openDirectory'] })).filePaths?.[0];
	if (!srcRoot) return;
	// import JSON entries from a folder tree of entries/YYYY/MM/DD.json
	const walk = async (dir) => {
		const ents = await fsp.readdir(dir, { withFileTypes: true });
		for (const ent of ents) {
			const p = path.join(dir, ent.name);
			if (ent.isDirectory()) await walk(p);
			else if (ent.isFile() && ent.name.endsWith('.json')) await importEntryFile(p);
		}
	};
	async function importEntryFile(p) {
		const data = await readJSONSafe(p);
		if (!data?.date) return;
		let target = entryPathForDate(data.date);
		if (fs.existsSync(target)) {
			let i = 1;
			const dir = path.dirname(target);
			const base = path.basename(target, '.json');
			while (fs.existsSync(target)) {
				target = path.join(dir, `${base}.imported-${i++}.json`);
			}
		}
		await writeJSONAtomic(target, data);
		await touchIndexDate(data.date);
	}
	await walk(srcRoot);
	await rebuildIndexFile();
	return true;
});

ipcMain.handle('journal:listTitledEntries', async () => {
	const dir = getTitledEntriesDir();
	const entries = [];
	if (fs.existsSync(dir)) {
		const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
		for (const file of files) {
			const data = await readJSONSafe(path.join(dir, file));
			if (data && data.id && data.title) {
				entries.push({ id: data.id, title: data.title, updatedAt: data.updatedAt || '' });
			}
		}
	}
	return entries.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
});

ipcMain.handle('journal:createTitledEntry', async (_e, title) => {
	const id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
	const entry = {
		id,
		title: title || 'Untitled Entry',
		html: '',
		updatedAt: new Date().toISOString(),
		wordCount: 0,
		tags: [],
		version: 1
	};
	await writeJSONAtomic(getTitledEntryPath(id), entry);
	return entry;
});

ipcMain.handle('journal:loadTitledEntry', async (_e, id) => {
	const file = getTitledEntryPath(id);
	const entry = await readJSONSafe(file);
	return entry;
});

ipcMain.handle('journal:saveTitledEntry', async (_e, entry) => {
	const toWrite = {
		id: entry.id,
		title: entry.title || 'Untitled Entry',
		html: entry.html || '',
		updatedAt: new Date().toISOString(),
		wordCount: entry.wordCount || 0,
		tags: Array.isArray(entry.tags) ? entry.tags : [],
		version: 1
	};
	await writeJSONAtomic(getTitledEntryPath(entry.id), toWrite);
	return true;
});

ipcMain.handle('journal:deleteTitledEntry', async (_e, id) => {
	const file = getTitledEntryPath(id);
	if (fs.existsSync(file)) {
		await fsp.unlink(file);
	}
	return true;
});

async function touchIndexDate(iso) {
	const idx = await readIndex();
	const set = new Set(idx.dates || []);
	set.add(iso);
	idx.dates = Array.from(set).sort();
	await writeJSONAtomic(getIndexPath(), idx);
}

async function recoverFromTmp() {
	const base = getEntriesDir();
	if (!fs.existsSync(base)) return;
	const walk = async (dir) => {
		const ents = fs.readdirSync(dir, { withFileTypes: true });
		for (const ent of ents) {
			const p = path.join(dir, ent.name);
			if (ent.isDirectory()) await walk(p);
			else if (ent.isFile() && ent.name.endsWith('.json.tmp')) {
				const final = p.slice(0, -4);
				try {
					const tmpStat = fs.statSync(p);
					const finalStat = fs.existsSync(final) ? fs.statSync(final) : null;
					if (!finalStat || tmpStat.mtimeMs > finalStat.mtimeMs) {
						await fsp.rename(p, final);
					}
				} catch {}
			}
		}
	};
	await walk(base);
}


