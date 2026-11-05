// The workspace model: records, links between them, and every edit helper.
// Pure - no DOM, no storage. Every helper returns a new object; nothing is mutated,
// so the UI can keep the previous version and a test can compare before and after.

import { DEFAULT_STAGES, DEFAULT_SCORECARD, DEFAULT_CAPTURE_KINDS, DEFAULT_THOUGHT_SOURCES, DEFAULT_PRODUCE } from './process-data.js';

export const SCHEMA_VERSION = 1;

/** Every kind of record a workspace holds, in the order the app presents them. */
export const RECORD_TYPES = ['thoughts', 'ideas', 'projects', 'content', 'outputs', 'references', 'assets',
  'tasks', 'publications', 'feedback'];

export const TYPE_LABEL = {
  thoughts: ['Thought', 'Thoughts'], ideas: ['Idea', 'Ideas'], projects: ['Project', 'Projects'], content: ['Content item', 'Content'],
  outputs: ['Platform output', 'Platform outputs'], references: ['Reference', 'References'],
  assets: ['Asset', 'Assets'], tasks: ['Task', 'Tasks'], publications: ['Publishing record', 'Publishing records'],
  feedback: ['Feedback', 'Feedback'],
};

/**
 * The one place a relationship is decided. Each link is stored on exactly one side;
 * the other side is found by `related()` as a backlink, so nothing is copied twice.
 * field -> target type. Fields ending in `Ids` are lists, the rest single ids.
 */
export const LINKS = {
  thoughts: {},
  ideas: { thoughtIds: 'thoughts', relatedIdeaIds: 'ideas', referenceIds: 'references', assetIds: 'assets' },
  projects: { thoughtIds: 'thoughts', ideaIds: 'ideas', referenceIds: 'references', assetIds: 'assets' },
  content: { thoughtIds: 'thoughts', ideaIds: 'ideas', projectIds: 'projects', referenceIds: 'references', assetIds: 'assets' },
  outputs: { contentId: 'content', referenceIds: 'references', assetIds: 'assets' },
  references: {},
  assets: {},
  tasks: { contentId: 'content', outputId: 'outputs', projectId: 'projects' },
  publications: { outputId: 'outputs' },
  feedback: { contentId: 'content', outputId: 'outputs' },
};

/** Children that cannot exist without their parent, deleted with it. */
const CASCADE = {
  content: [['outputs', 'contentId'], ['tasks', 'contentId'], ['feedback', 'contentId']],
  outputs: [['publications', 'outputId'], ['tasks', 'outputId'], ['feedback', 'outputId']],
};

const PREFIX = { thoughts: 'th', ideas: 'idea', projects: 'proj', content: 'cont', outputs: 'out', references: 'ref',
  assets: 'asset', tasks: 'task', publications: 'pub', feedback: 'fb', workspace: 'ws' };

export const nowIso = () => new Date().toISOString();

/** Stable unique id. The prefix is only for humans reading an export. */
export function newId(kind = 'rec') {
  return `${PREFIX[kind] || kind}_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
}

const isList = (field) => field.endsWith('Ids');

/** A file-safe name: letters, digits, underscores. */
export function slug(text, max = 40) {
  return String(text || 'Untitled').normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
    .replace(/[\s-]+/g, '_').slice(0, max) || 'Untitled';
}


/* ---------------------------------------------------------------- config */

/** Generic defaults - nothing here belongs to any one creator. */
export function blankConfig() {
  return {
    identity: { channelName: '', tagline: '', philosophy: '', principles: '', editorialGuidelines: '' },
    categories: [],            // [{ id, name, color }]
    tags: [],
    series: [],
    audiences: [],
    brand: { colors: '', fonts: '', visualNotes: '' },
    voice: { tone: '', communication: '', hookStyles: '' },
    aiInstructions: '',
    statuses: {
      ideas: ['Inbox', 'Exploring', 'Ready for Planning', 'Planned', 'In Production', 'Published', 'Parked', 'Rejected'],
      projects: ['Proposed', 'Active', 'On hold', 'Completed', 'Abandoned'],
      content: ['Concept', 'Planning', 'Scripting', 'Capturing', 'Editing', 'Review', 'Ready', 'Published', 'Parked'],
      outputs: ['Draft', 'Adapting', 'Ready', 'Scheduled', 'Published'],
      references: ['Unverified', 'Verified', 'Disputed'],
      assets: ['Needed', 'In progress', 'Ready'],
      tasks: ['To do', 'Doing', 'Done'],
    },
    ideaTypes: ['Topic', 'Question', 'Story', 'Experiment', 'Opinion', 'Tutorial'],
    projectTypes: ['Investigation', 'Build', 'Experiment', 'Series', 'Journey'],
    contentTypes: ['Quick video', 'Short-form video', 'Long-form video', 'Standalone discussion', 'Tutorial',
      'Documentary', 'Article', 'Carousel', 'Reference sheet'],
    preferences: { defaultWorkflowId: '', defaultStoryId: '' },
    thoughtSources: [...DEFAULT_THOUGHT_SOURCES],
    produce: [...DEFAULT_PRODUCE],
    captureKinds: structuredClone(DEFAULT_CAPTURE_KINDS),
  };
}

const emptyRecords = () => Object.fromEntries(RECORD_TYPES.map((t) => [t, []]));

export function blankWorkspace({ name = 'My workspace', description = '' } = {}, now = nowIso()) {
  return {
    id: newId('workspace'), name, description, created: now, modified: now,
    config: blankConfig(),
    workflows: [],             // workflow templates (workflow.js)
    stories: [],               // storytelling templates
    platforms: [],             // platform profiles with their formats
    process: { stages: structuredClone(DEFAULT_STAGES), scorecard: structuredClone(DEFAULT_SCORECARD) },
    records: emptyRecords(),
  };
}

/** The whole app's persisted shape: several workspaces, one current. */
export function blankApp(ws = blankWorkspace()) {
  return { v: SCHEMA_VERSION, currentId: ws.id, workspaces: [ws] };
}

export const currentWorkspace = (app) =>
  app.workspaces.find((w) => w.id === app.currentId) || app.workspaces[0] || null;

export function replaceWorkspace(app, ws) {
  return { ...app, workspaces: app.workspaces.map((w) => (w.id === ws.id ? ws : w)) };
}

export function addWorkspace(app, ws) {
  return { ...app, currentId: ws.id, workspaces: [...app.workspaces, ws] };
}

/** Removes one workspace and nothing else. The app always keeps at least one. */
export function deleteWorkspace(app, id) {
  const left = app.workspaces.filter((w) => w.id !== id);
  const workspaces = left.length ? left : [blankWorkspace()];
  const currentId = workspaces.some((w) => w.id === app.currentId) ? app.currentId : workspaces[0].id;
  return { ...app, currentId, workspaces };
}

/** Clears content records, keeps configuration and templates. */
export function resetWorkspaceData(ws, now = nowIso()) {
  return { ...ws, modified: now, records: emptyRecords() };
}

/** Restores configuration and templates to blank, keeps the records. */
export function resetWorkspaceConfig(ws, now = nowIso()) {
  return { ...ws, modified: now, config: blankConfig(), workflows: [], stories: [], platforms: [], process: blankWorkspace().process };
}

/** Plain-language list of exactly what an action will remove, for the confirm dialog. */
export function describeRemoval(ws, kind) {
  const counts = RECORD_TYPES
    .map((t) => [t, ws.records[t].length])
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} ${n === 1 ? TYPE_LABEL[t][0].toLowerCase() : TYPE_LABEL[t][1].toLowerCase()}`);
  const records = counts.length ? counts.join(', ') : 'no records';
  const config = `its configuration, ${ws.workflows.length} workflow template(s), ${ws.stories.length} storytelling template(s) and ${ws.platforms.length} platform profile(s)`;
  if (kind === 'data') return { removes: `${records} in "${ws.name}"`, keeps: config };
  if (kind === 'config') return { removes: `${config} in "${ws.name}"`, keeps: records };
  if (kind === 'workspace') return { removes: `the whole "${ws.name}" workspace: ${records}, and ${config}`, keeps: 'every other workspace' };
  throw new Error(`describeRemoval: unknown kind "${kind}"`);
}

/** Strips every record marked as a sample, and the links that pointed at them. */
export function removeSamples(ws, now = nowIso()) {
  let out = ws;
  for (const type of RECORD_TYPES) {
    for (const r of out.records[type]) if (r.sample) out = deleteRecord(out, type, r.id, now);
  }
  return out;
}

/* --------------------------------------------------------------- records */

const touch = (ws, now) => ({ ...ws, modified: now });

export function getRecord(ws, type, id) {
  return ws.records[type]?.find((r) => r.id === id) || null;
}

/** Every link field starts empty so a lookup never meets `undefined`. */
function linkDefaults(type) {
  return Object.fromEntries(Object.keys(LINKS[type]).map((f) => [f, isList(f) ? [] : '']));
}

export function createRecord(ws, type, fields = {}, now = nowIso()) {
  if (!RECORD_TYPES.includes(type)) throw new Error(`createRecord: unknown type "${type}"`);
  const record = { ...linkDefaults(type), ...fields, id: fields.id || newId(type), created: now, modified: now, archived: false };
  return { ws: touch({ ...ws, records: { ...ws.records, [type]: [...ws.records[type], record] } }, now), record };
}

export function updateRecord(ws, type, id, patch, now = nowIso()) {
  let found = false;
  const list = ws.records[type].map((r) => {
    if (r.id !== id) return r;
    found = true;
    return { ...r, ...patch, id, modified: now };
  });
  if (!found) return ws;
  return touch({ ...ws, records: { ...ws.records, [type]: list } }, now);
}

export const archiveRecord = (ws, type, id, now) => updateRecord(ws, type, id, { archived: true }, now);
export const restoreRecord = (ws, type, id, now) => updateRecord(ws, type, id, { archived: false }, now);

/** What else goes when this record is deleted (its children), for the confirm dialog. */
export function cascadeOf(ws, type, id) {
  const out = [];
  for (const [childType, field] of CASCADE[type] || []) {
    for (const child of ws.records[childType]) {
      if (child[field] === id) out.push({ type: childType, record: child }, ...cascadeOf(ws, childType, child.id));
    }
  }
  return out;
}

/** Deletes the record and its children, and strips the id from every link that held it. */
export function deleteRecord(ws, type, id, now = nowIso()) {
  const doomed = [{ type, id }, ...cascadeOf(ws, type, id).map((c) => ({ type: c.type, id: c.record.id }))];
  const gone = new Set(doomed.map((d) => `${d.type}:${d.id}`));
  const records = {};
  for (const t of RECORD_TYPES) {
    records[t] = ws.records[t]
      .filter((r) => !gone.has(`${t}:${r.id}`))
      .map((r) => unlink(r, t, gone));
  }
  return touch({ ...ws, records }, now);
}

function unlink(record, type, gone) {
  let changed = null;
  for (const [field, target] of Object.entries(LINKS[type])) {
    const v = record[field];
    if (isList(field)) {
      const kept = (v || []).filter((x) => !gone.has(`${target}:${x}`));
      if (kept.length !== (v || []).length) (changed ||= { ...record })[field] = kept;
    } else if (v && gone.has(`${target}:${v}`)) {
      (changed ||= { ...record })[field] = '';
    }
  }
  return changed || record;
}

/** Adds or removes one link. Single-id fields are replaced; list fields toggle. */
export function setLink(ws, type, id, field, targetId, on = true, now = nowIso()) {
  if (!(field in LINKS[type])) throw new Error(`setLink: ${type} has no link "${field}"`);
  const r = getRecord(ws, type, id);
  if (!r) return ws;
  if (!isList(field)) return updateRecord(ws, type, id, { [field]: on ? targetId : '' }, now);
  const list = (r[field] || []).filter((x) => x !== targetId);
  if (on) list.push(targetId);
  return updateRecord(ws, type, id, { [field]: list }, now);
}

/**
 * Everything connected to one record, both directions:
 * outgoing = links this record stores, incoming = records that link to it.
 */
export function related(ws, type, id) {
  const r = getRecord(ws, type, id);
  if (!r) return { outgoing: [], incoming: [] };
  const outgoing = [];
  for (const [field, target] of Object.entries(LINKS[type])) {
    const ids = isList(field) ? r[field] || [] : r[field] ? [r[field]] : [];
    for (const x of ids) {
      const rec = getRecord(ws, target, x);
      if (rec) outgoing.push({ field, type: target, record: rec });
    }
  }
  const incoming = [];
  for (const t of RECORD_TYPES) {
    for (const [field, target] of Object.entries(LINKS[t])) {
      if (target !== type) continue;
      for (const rec of ws.records[t]) {
        if (rec.id === id && t === type) continue;
        const v = rec[field];
        if (isList(field) ? (v || []).includes(id) : v === id) incoming.push({ field, type: t, record: rec });
      }
    }
  }
  return { outgoing, incoming };
}

/** The human name of a record, whatever its type calls it. */
export function titleOf(record) {
  if (!record) return '';
  return record.title || record.name || record.workingTitle || record.text?.slice(0, 80) || record.rawInput?.slice(0, 60) || '(untitled)';
}

/* ---------------------------------------------------------------- search */

/**
 * Filter one record type. Every word of `q` must appear somewhere in the record's
 * text (AND, so a longer query narrows). Archived records only when asked for.
 */
export function searchRecords(ws, type, { q = '', status = '', category = '', archived = false, sample } = {}) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return ws.records[type].filter((r) => {
    if (!!r.archived !== !!archived) return false;
    if (status && r.status !== status) return false;
    if (category && r.categoryId !== category) return false;
    if (sample !== undefined && !!r.sample !== sample) return false;
    if (!words.length) return true;
    const hay = Object.values(r).filter((v) => typeof v === 'string' || Array.isArray(v)).flat()
      .filter((v) => typeof v === 'string').join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** The most recently edited records across every type, newest first. */
export function recentlyEdited(ws, limit = 8) {
  return RECORD_TYPES.flatMap((type) => ws.records[type].filter((r) => !r.archived).map((record) => ({ type, record })))
    .sort((a, b) => (a.record.modified < b.record.modified ? 1 : -1))
    .slice(0, limit);
}

/* ------------------------------------------------------- lists in records */

/** Small helpers for ordered lists of `{ id, ... }` - steps, blocks, formats, milestones. */
export function moveItem(list, id, delta) {
  const i = list.findIndex((x) => x.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export const removeItem = (list, id) => list.filter((x) => x.id !== id);
export const patchItem = (list, id, patch) => list.map((x) => (x.id === id ? { ...x, ...patch, id } : x));

/** A copy placed straight after the original, with a fresh id. */
export function duplicateItem(list, id, kind = 'item') {
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return list;
  const copy = { ...structuredClone(list[i]), id: newId(kind) };
  return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)];
}

/* ------------------------------------------------------- import / migrate */

export const EXPORT_KIND = 'content-bench-workspace';

/**
 * Brings a stored or imported workspace up to the current shape. Old files outlive
 * the code, so anything missing is filled from the blank defaults rather than left
 * undefined (pitfalls.md #8).
 */
export function migrateWorkspace(raw) {
  const blank = blankWorkspace();
  const ws = { ...blank, ...raw };
  ws.name = raw.name || 'Imported workspace';
  ws.config = { ...blank.config, ...(raw.config || {}) };
  ws.config.statuses = { ...blank.config.statuses, ...(raw.config?.statuses || {}) };
  ws.config.identity = { ...blank.config.identity, ...(raw.config?.identity || {}) };
  ws.config.preferences = { ...blank.config.preferences, ...(raw.config?.preferences || {}) };
  for (const k of ['workflows', 'stories', 'platforms']) ws[k] = Array.isArray(raw[k]) ? raw[k] : [];
  ws.platforms = ws.platforms.map((p) => ({ ...p, rhythm: { enabled: false, days: [], target: 2, ...(p.rhythm || {}) } }));
  ws.process = Array.isArray(raw.process?.stages) && raw.process.stages.length
    ? { stages: raw.process.stages, scorecard: Array.isArray(raw.process.scorecard) ? raw.process.scorecard : blank.process.scorecard }
    : blank.process;
  ws.records = {};
  for (const t of RECORD_TYPES) {
    const list = Array.isArray(raw.records?.[t]) ? raw.records[t] : [];
    ws.records[t] = list.filter((r) => r && typeof r.id === 'string').map((r) => ({ ...linkDefaults(t), ...r }));
  }
  return ws;
}

/**
 * Checks an imported package before anything is applied. Returns the migrated
 * workspace on success; never throws on bad input.
 */
export function validateImport(text) {
  let data;
  try { data = JSON.parse(text); } catch { return { ok: false, errors: ['The file is not valid JSON.'] }; }
  const errors = [];
  if (!data || typeof data !== 'object') return { ok: false, errors: ['The file holds no workspace.'] };
  if (data.kind !== EXPORT_KIND) errors.push(`This is not a ContentBench workspace export (expected kind "${EXPORT_KIND}").`);
  if (typeof data.v !== 'number' || data.v > SCHEMA_VERSION) errors.push(`Unsupported format version ${data.v}; this app reads up to ${SCHEMA_VERSION}.`);
  const raw = data.workspace;
  if (!raw || typeof raw !== 'object') errors.push('The file has no "workspace" section.');
  else if (raw.records && typeof raw.records !== 'object') errors.push('"records" must be an object of lists.');
  if (errors.length) return { ok: false, errors };
  const ws = migrateWorkspace(raw);
  const ids = RECORD_TYPES.flatMap((t) => ws.records[t].map((r) => r.id));
  if (new Set(ids).size !== ids.length) return { ok: false, errors: ['Two records share one id; the file is damaged.'] };
  return { ok: true, errors: [], workspace: ws };
}

/** An imported workspace never replaces another: a clashing id gets a fresh one. */
export function importWorkspace(app, ws) {
  const clash = app.workspaces.some((w) => w.id === ws.id);
  return addWorkspace(app, clash ? { ...ws, id: newId('workspace'), name: `${ws.name} (imported)` } : ws);
}

export function exportWorkspace(ws, now = nowIso()) {
  return JSON.stringify({ kind: EXPORT_KIND, v: SCHEMA_VERSION, exported: now, workspace: ws }, null, 2);
}

/** The persisted app blob from localStorage; anything unreadable becomes a fresh app. */
export function migrateApp(raw) {
  if (!raw || !Array.isArray(raw.workspaces) || !raw.workspaces.length) return null;
  const workspaces = raw.workspaces.filter((w) => w && typeof w === 'object').map(migrateWorkspace);
  if (!workspaces.length) return null;
  const currentId = workspaces.some((w) => w.id === raw.currentId) ? raw.currentId : workspaces[0].id;
  return { v: SCHEMA_VERSION, currentId, workspaces };
}
