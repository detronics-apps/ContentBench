// Your private folder (Google Drive for Desktop, OneDrive or any local folder): the live
// data file, and every video's capture folders. The app writes files on this computer;
// Drive syncs them. Nothing here talks to a server. Chrome/Edge on a computer only.

import { toast, download } from './dom.js';
import { store, onSaved, replaceApp } from './store.js';
import { serializeData, parseData, DATA_FILE } from '../datafile.js';
import { zip } from '../zip.js';

export const folderSupported = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

/** status: off | connected | reconnect | choose | conflict | error */
export const sync = { status: 'off', name: '', error: '', savedAt: '', pending: null, pendingText: '' };
let root = null;
let lastText = '';
let timer = 0;
const subs = new Set();
export const onSync = (fn) => subs.add(fn);
const emit = () => { for (const f of subs) f(sync); };

const DIRTY = 'content-bench-unsynced';
const markDirty = () => { try { localStorage.setItem(DIRTY, '1'); } catch { /* best effort */ } };
const clearDirty = () => { try { localStorage.removeItem(DIRTY); } catch { /* best effort */ } };
const isDirty = () => { try { return localStorage.getItem(DIRTY) === '1'; } catch { return false; } };

/* ---- the folder handle survives reloads in IndexedDB (handles are structured-cloneable) */
function kv(mode, fn) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('content-bench', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('kv', mode);
      const req = fn(tx.objectStore('kv'));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    };
  });
}
const saveHandle = (h) => kv('readwrite', (s) => s.put(h, 'root'));
const loadHandle = () => kv('readonly', (s) => s.get('root'));
const forgetHandle = () => kv('readwrite', (s) => s.delete('root'));

async function readData() {
  try {
    const fh = await root.getFileHandle(DATA_FILE);
    return await (await fh.getFile()).text();
  } catch (e) {
    if (e.name === 'NotFoundError') return null;
    throw e;
  }
}

async function writeData(text) {
  const fh = await root.getFileHandle(DATA_FILE, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
  lastText = text;
  sync.savedAt = new Date().toISOString();
  clearDirty();
}

const fail = (e) => { sync.status = 'error'; sync.error = `${e.name || 'Error'}: ${e.message || e}`; emit(); };

/**
 * Reads the folder's file. A change made elsewhere (another computer, or an assistant
 * editing the file) is taken as it is when nothing here is waiting to be written;
 * when both sides changed, the reader chooses - never a silent overwrite.
 */
async function pull({ first = false } = {}) {
  const text = await readData();
  if (text === null || !text.trim()) { await writeData(serializeData(store.app)); sync.status = 'connected'; emit(); return; }
  if (text === lastText) { sync.status = 'connected'; emit(); return; }
  const r = parseData(text);
  if (!r.ok) { sync.status = 'error'; sync.error = r.errors.join(' '); emit(); return; }
  if (first === 'choose') { Object.assign(sync, { status: 'choose', pending: r.app, pendingText: text }); emit(); return; }
  if (!isDirty()) {
    lastText = text;
    sync.status = 'connected';
    replaceApp(r.app);
    if (!first) toast('Loaded the latest from your folder.');
    emit();
    return;
  }
  Object.assign(sync, { status: 'conflict', pending: r.app, pendingText: text });
  emit();
}

async function push() {
  if (sync.status !== 'connected' || !root) return;
  try {
    const now = await readData();
    if (now !== null && now !== lastText) { await pull(); return; }
    await writeData(serializeData(store.app));
    emit();
  } catch (e) { fail(e); }
}

onSaved(() => {
  if (!root) return;
  markDirty();
  clearTimeout(timer);
  timer = setTimeout(push, 800);
});

/** Pick (or create) the folder. An existing data file there asks which copy to keep. */
export async function connectFolder() {
  try {
    const h = await window.showDirectoryPicker({ id: 'contentbench', mode: 'readwrite' });
    root = h; sync.name = h.name; lastText = '';
    await saveHandle(h);
    await pull({ first: 'choose' });
  } catch (e) { if (e.name !== 'AbortError') fail(e); }
}

/** On start-up: reuse the remembered folder silently if the browser still allows it. */
export async function restoreFolder() {
  if (!folderSupported()) return;
  try {
    const h = await loadHandle();
    if (!h) return;
    root = h; sync.name = h.name;
    if (await h.queryPermission({ mode: 'readwrite' }) === 'granted') await pull({ first: true });
    else { sync.status = 'reconnect'; emit(); }
  } catch (e) { fail(e); }
}

/** Browsers ask again after a restart; this must run inside a click. */
export async function reconnectFolder() {
  try {
    if (await root.requestPermission({ mode: 'readwrite' }) === 'granted') await pull({ first: true });
  } catch (e) { fail(e); }
}

export async function useFolderCopy() {
  lastText = sync.pendingText;
  clearDirty();
  sync.status = 'connected';
  replaceApp(sync.pending);
  sync.pending = null;
  emit();
}

export async function useBrowserCopy() {
  try { sync.status = 'connected'; await writeData(serializeData(store.app)); sync.pending = null; emit(); } catch (e) { fail(e); }
}

export async function disconnectFolder() {
  root = null; lastText = '';
  Object.assign(sync, { status: 'off', name: '', error: '', pending: null });
  await forgetHandle().catch(() => {});
  emit();
}

if (typeof window !== 'undefined') {
  const recheck = () => { if (root && sync.status === 'connected' && document.visibilityState === 'visible') pull().catch(fail); };
  window.addEventListener('focus', recheck);
  document.addEventListener('visibilitychange', recheck);
}

/* ------------------------------------------------------- video folders */

async function dir(path, create) {
  let d = root;
  for (const part of path.split('/').filter(Boolean)) d = await d.getDirectoryHandle(part, { create });
  return d;
}

export const folderReady = () => !!root && sync.status === 'connected';

/** Creates the folders (an existing one is left as it is). */
export async function makeFolders(paths) {
  for (const p of paths) await dir(p, true);
}

/** { path: [file names] } for each folder; a missing folder lists as empty. */
export async function listFolders(paths) {
  const out = {};
  for (const p of paths) {
    out[p] = [];
    try {
      for await (const [name, h] of (await dir(p, false)).entries()) if (h.kind === 'file') out[p].push(name);
    } catch { /* not there yet */ }
  }
  return out;
}

/** Without folder access: the same tree as a zip, a note in each folder saying what goes there. */
export function downloadTree(name, paths, notes = {}) {
  download(new Blob([zip(paths.map((p) => ({ path: `${p}/_what-goes-here.txt`, text: notes[p] || `Put the files for ${p.split('/').pop()} here.\n` })))],
    { type: 'application/zip' }), `${name}-folders.zip`);
}

