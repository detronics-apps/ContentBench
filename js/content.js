// Content-specific rules on top of the generic model: platform profiles, platform
// outputs and what they inherit from the master, AI suggestions, and the planner.

import { newId, nowIso, createRecord, getRecord, updateRecord } from './model.js';
import { instantiateStory, scheduleBackwards, addDays } from './workflow.js';

/* ------------------------------------------------------------- platforms */

/** Specs change; every value here is editable and carries the date it was last checked. */
export function makeFormat(fields = {}) {
  return {
    id: newId('fmt'), name: 'New format', aspectRatio: '', resolution: '', duration: '',
    fileSize: '', frameRate: '', fileFormat: '', safeZones: '', cover: '', checklist: [],
    ...fields,
  };
}

export function makePlatform(fields = {}) {
  const { formats = [], ...rest } = fields;
  return {
    id: newId('plat'), name: 'New platform', notes: '', verifiedOn: '',
    metadataFields: ['Title', 'Caption', 'Tags'], disclosure: '', checklist: [],
    ...rest,
    formats: formats.map(makeFormat),
  };
}

/** Days since the platform's specs were last verified, or null when never. */
export function verificationAge(platform, today = nowIso().slice(0, 10)) {
  if (!platform.verifiedOn) return null;
  return Math.round((Date.parse(today) - Date.parse(platform.verifiedOn)) / 86400000);
}

/* --------------------------------------------------------------- outputs */

/** Output field <- the master content field it starts from. One owner for this mapping. */
export const INHERITS = { title: 'workingTitle', angle: 'centralMessage', viewerPromise: 'viewerPromise', script: 'script' };

/**
 * A platform-specific adaptation of one content item. It starts as a copy of the
 * master, remembers what it copied, and from then on is its own: the master can
 * change without touching it, and the output can be rewritten without touching the master.
 */
export function createOutput(ws, contentId, { platformId = '', formatId = '', storyId = '' } = {}, now = nowIso()) {
  const content = getRecord(ws, 'content', contentId);
  if (!content) throw new Error(`createOutput: no content "${contentId}"`);
  const platform = ws.platforms.find((p) => p.id === platformId) || null;
  const format = platform?.formats.find((f) => f.id === formatId) || null;
  const story = ws.stories.find((s) => s.id === storyId) || null;
  const inherited = Object.fromEntries(Object.values(INHERITS).map((f) => [f, content[f] || '']));
  const fields = {
    contentId, platformId, formatId,
    ...Object.fromEntries(Object.entries(INHERITS).map(([o, c]) => [o, content[c] || ''])),
    inherited,
    status: ws.config.statuses.outputs[0] || '',
    durationTarget: format?.duration || '',
    aspectRatio: format?.aspectRatio || '',
    technical: [format?.resolution, format?.frameRate, format?.fileFormat, format?.fileSize].filter(Boolean).join(' · '),
    coverRequirements: format?.cover || '',
    caption: '', hashtags: '', links: '', scheduledDate: '', publishedDate: '', publishedUrl: '',
    checklist: [...(platform?.checklist || []), ...(format?.checklist || [])].map((text) => ({ text, done: false })),
    story: story ? instantiateStory(story, now) : null,
  };
  return createRecord(ws, 'outputs', fields, now);
}

export function outputLabel(ws, output) {
  const platform = ws.platforms.find((p) => p.id === output.platformId);
  const format = platform?.formats.find((f) => f.id === output.formatId);
  return [platform?.name, format?.name].filter(Boolean).join(' · ') || 'No platform chosen';
}

/**
 * Master fields that changed since the output copied them. `customised` says the
 * output had already been rewritten, so pulling would replace the creator's adaptation.
 */
export function masterDrift(output, content) {
  const out = [];
  for (const [field, source] of Object.entries(INHERITS)) {
    const was = output.inherited?.[source] ?? '';
    const now = content[source] || '';
    if (now === was) continue;
    out.push({ field, source, master: now, current: output[field] || '', customised: (output[field] || '') !== was });
  }
  return out;
}

/** Takes the master's new value for one field. Only ever done on request. */
export function pullFromMaster(ws, outputId, field, now = nowIso()) {
  const output = getRecord(ws, 'outputs', outputId);
  const content = output && getRecord(ws, 'content', output.contentId);
  if (!content || !(field in INHERITS)) return ws;
  const source = INHERITS[field];
  return updateRecord(ws, 'outputs', outputId,
    { [field]: content[source] || '', inherited: { ...output.inherited, [source]: content[source] || '' } }, now);
}

/** Keeps the output's own value and stops reporting this master change. */
export function keepOutputVersion(ws, outputId, field, now = nowIso()) {
  const output = getRecord(ws, 'outputs', outputId);
  const content = output && getRecord(ws, 'content', output.contentId);
  if (!content || !(field in INHERITS)) return ws;
  const source = INHERITS[field];
  return updateRecord(ws, 'outputs', outputId, { inherited: { ...output.inherited, [source]: content[source] || '' } }, now);
}

/* ------------------------------------------------------- AI suggestions */

/**
 * A suggestion pasted back from an assistant. It lives beside the creator's text,
 * never in it, until the creator accepts it.
 */
export function addSuggestion(record, { action = '', field = '', text = '' }, now = nowIso()) {
  const s = { id: newId('sug'), action, field, text, status: 'pending', created: now };
  return { ...record, aiSuggestions: [...(record.aiSuggestions || []), s] };
}

/**
 * Accept appends to the target field - it never replaces what the creator wrote.
 * `editedText` lets the creator change the suggestion before accepting it.
 */
export function resolveSuggestion(record, id, decision, editedText, now = nowIso()) {
  if (!['accepted', 'rejected'].includes(decision)) throw new Error(`resolveSuggestion: "${decision}"`);
  const s = (record.aiSuggestions || []).find((x) => x.id === id);
  if (!s || s.status !== 'pending') return record;
  const text = editedText ?? s.text;
  const out = { ...record, aiSuggestions: record.aiSuggestions.map((x) => (x.id === id ? { ...x, text, status: decision, resolved: now } : x)) };
  if (decision === 'accepted' && s.field) {
    const existing = record[s.field] || '';
    out[s.field] = existing ? `${existing}\n\n${text}` : text;
  }
  return out;
}

/* --------------------------------------------------------------- planner */

export const PLAN_KINDS = {
  milestone: 'Project milestone', project: 'Project date', production: 'Content due', step: 'Workflow step',
  publishing: 'Publishing', task: 'Task',
};

/**
 * Everything with a date, kept in separate kinds. Ideas never appear: an uncommitted
 * idea has no deadline, so it can never be overdue.
 */
export function plannerEntries(ws, today = nowIso().slice(0, 10)) {
  const live = (t) => ws.records[t].filter((r) => !r.archived);
  const items = [];
  const push = (kind, date, title, type, id, done) => {
    if (!date) return;
    items.push({ kind, date, title, type, id, done, overdue: !done && date < today });
  };
  for (const p of live('projects')) {
    const finished = ['Completed', 'Abandoned'].includes(p.status);
    for (const m of p.milestones || []) push('milestone', m.date, `${p.title}: ${m.name}`, 'projects', p.id, !!m.done || finished);
    push('project', p.targetDate, `${p.title}: target`, 'projects', p.id, finished);
    push('project', p.reviewDate, `${p.title}: review`, 'projects', p.id, finished);
  }
  for (const c of live('content')) {
    const finished = c.status === 'Published';
    push('production', c.targetDate, c.workingTitle, 'content', c.id, finished);
    for (const s of c.workflow?.steps || []) {
      if (s.status !== 'skipped') push('step', s.due, `${c.workingTitle}: ${s.name}`, 'content', c.id, finished || s.status === 'done');
    }
  }
  for (const o of live('outputs')) {
    push('publishing', o.publishedDate || o.scheduledDate, o.title, 'outputs', o.id, !!o.publishedDate || o.status === 'Published');
  }
  for (const t of live('tasks')) push('task', t.due, t.title, 'tasks', t.id, t.status === 'Done');
  return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Overdue, today and the next six days - what to work on now. */
export function agenda(entries, today = nowIso().slice(0, 10)) {
  const weekEnd = addDays(today, 6);
  const open = entries.filter((e) => !e.done);
  return {
    overdue: open.filter((e) => e.date < today),
    today: open.filter((e) => e.date === today),
    week: open.filter((e) => e.date > today && e.date <= weekEnd),
  };
}

/** Drops a content item on a date: that is its due date, and its workflow is dated backwards from it. */
export function scheduleContent(ws, contentId, date, now = nowIso()) {
  const c = getRecord(ws, 'content', contentId);
  if (!c) return ws;
  const workflow = !c.workflow ? c.workflow : date ? scheduleBackwards(c.workflow, date)
    : { ...c.workflow, dueDate: '', steps: c.workflow.steps.map((s) => ({ ...s, due: '' })) };
  return updateRecord(ws, 'content', contentId, { targetDate: date, workflow }, now);
}

/**
 * Everything that sits on the calendar: each content item's final due date and each
 * platform release, so a Reel, a TikTok and a long-form upload keep their own dates.
 * Colour is the content's category - the creator's data, not the theme.
 */
export function calendarItems(ws) {
  const cat = (id) => ws.config.categories.find((x) => x.id === id) || null;
  const items = [];
  for (const c of ws.records.content.filter((r) => !r.archived)) {
    items.push({ type: 'content', id: c.id, title: c.workingTitle || '(untitled)', label: 'Due', platformId: '', date: c.targetDate || '',
      color: cat(c.categoryId)?.color || '', category: cat(c.categoryId)?.name || '', done: c.status === 'Published' });
  }
  for (const o of ws.records.outputs.filter((r) => !r.archived)) {
    const c = getRecord(ws, 'content', o.contentId);
    items.push({ type: 'outputs', id: o.id, title: o.title || c?.workingTitle || '(untitled)', label: outputLabel(ws, o),
      platformId: o.platformId, date: o.publishedDate || o.scheduledDate || '', color: cat(c?.categoryId)?.color || '',
      category: cat(c?.categoryId)?.name || '', done: !!o.publishedDate || o.status === 'Published' });
  }
  return items;
}

/** One drop on the calendar, whichever kind of chip it was. A published output keeps its date. */
export function placeOnCalendar(ws, type, id, date, now = nowIso()) {
  if (type === 'content') return scheduleContent(ws, id, date, now);
  const o = getRecord(ws, 'outputs', id);
  if (!o || o.publishedDate) return ws;
  return updateRecord(ws, 'outputs', id, { scheduledDate: date }, now);
}
