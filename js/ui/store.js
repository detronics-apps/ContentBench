// The app's one source of truth in the browser: the workspaces (localStorage) and the
// reader's own UI preferences (a separate key, so a workspace export never carries them).

import { blankApp, currentWorkspace, migrateApp, replaceWorkspace, nowIso } from '../model.js';
import { exampleWorkspace } from '../seed.js';

const KEY = 'content-bench';
const UI_KEY = 'content-bench-ui';

const UI_DEFAULTS = { theme: 'system', level: 'simple', onboardedAt: '', sections: {}, locks: {}, libraryView: 'list', showArchived: false };

function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

/** First visit opens on the labelled example, so the first screen is a working one. */
export const store = {
  app: migrateApp(read(KEY)) || blankApp(exampleWorkspace()),
  ui: { ...UI_DEFAULTS, ...(read(UI_KEY) || {}) },
  savedAt: '',
  saveError: '',
};

const listeners = new Set();
const savedHooks = new Set();
/** Called after every save - the folder sync uses it to write the private data file. */
export const onSaved = (fn) => savedHooks.add(fn);
export const onChange = (fn) => listeners.add(fn);
/** Redraw after a view-only change (a filter, a view toggle) - nothing is saved. */
export const refresh = () => { for (const l of listeners) l({ render: true }); };

/** Saved straight away: every commit is a deliberate act, and losing one is losing work. */
function persist({ fromFile = false } = {}) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store.app));
    store.savedAt = nowIso();
    store.saveError = '';
  } catch (e) {
    store.saveError = `Could not save (${e.name}). Export your workspace now so nothing is lost.`;
  }
  if (!fromFile) for (const h of savedHooks) h();
}

/** Takes the whole app from the data file. Not written back - it came from there. */
export function replaceApp(app) {
  store.app = app;
  persist({ fromFile: true });
  for (const l of listeners) l({ render: true });
}

export function saveUi() {
  try { localStorage.setItem(UI_KEY, JSON.stringify(store.ui)); } catch { /* preferences only */ }
}

export const ws = () => currentWorkspace(store.app);

/**
 * Apply an edit. `fn` receives the current workspace and returns the next one.
 * `render: false` for text edits, so the field being typed in is not rebuilt.
 */
export function commitWs(fn, { render = true } = {}) {
  const next = fn(ws());
  if (!next || next === ws()) return;
  store.app = replaceWorkspace(store.app, next);
  persist();
  for (const l of listeners) l({ render });
}

/** Same, for edits to the whole app (switching, adding, deleting workspaces). */
export function commitApp(fn) {
  store.app = fn(store.app);
  persist();
  for (const l of listeners) l({ render: true });
}

persist({ fromFile: true });
