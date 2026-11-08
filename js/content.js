// Content-specific rules on top of the generic model: platform profiles, platform
// outputs and what they inherit from the master, AI suggestions, and the planner.

import { newId, nowIso, todayIso, createRecord, getRecord, updateRecord } from './model.js';
import { instantiateStory, forecast, addDays } from './workflow.js';
import { projectForecast, stageById } from './process.js';

/* ------------------------------------------------------------- platforms */

/** Specs change; every value here is editable and carries the date it was last checked. */
export function makeFormat(fields = {}) {
  return {
    id: newId('fmt'), name: 'New format', aspectRatio: '', resolution: '', duration: '',
    fileSize: '', frameRate: '', fileFormat: '', safeZones: '', cover: '', checklist: [],
    ...fields,
    safe: { top: 0, bottom: 0, left: 0, right: 0, ...(fields.safe || {}) },  // % of the frame kept clear
  };
}

export function makePlatform(fields = {}) {
  const { formats = [], ...rest } = fields;
  return {
    id: newId('plat'), name: 'New platform', notes: '', verifiedOn: '',
    metadataFields: ['Title', 'Caption', 'Tags'], disclosure: '', checklist: [],
    ...rest,
    rhythm: { enabled: false, days: [], target: 2, ...(rest.rhythm || {}) },
    formats: formats.map(makeFormat),
  };
}

/** Days since the platform's specs were last verified, or null when never. */
export function verificationAge(platform, today = todayIso()) {
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
  milestone: 'Project milestone', project: 'Project done by', production: 'Content ready by', step: 'Workflow step',
  publishing: 'Release', task: 'Task',
};

const contentDone = (c) => ['Ready', 'Published', 'Parked'].includes(c.status);

/**
 * One video at a time: videos still being worked on are queued - soonest release first,
 * then the one furthest along, then the oldest - and each is forecast to start when the
 * one before it is ready. So today holds one real task, not every video's first step.
 * ponytail: a single lane; add a "parallel videos" setting if two are ever made at once.
 */
export function contentSchedule(ws, today = todayIso()) {
  const order = ws.config.statuses.content;
  const release = (c) => ws.records.outputs.filter((o) => o.contentId === c.id && !o.archived && o.scheduledDate && !o.publishedDate)
    .map((o) => o.scheduledDate).sort()[0] || c.targetDate || '9999';
  const queue = ws.records.content.filter((c) => !c.archived && c.workflow && !contentDone(c))
    .sort((a, b) => release(a).localeCompare(release(b)) || order.indexOf(b.status) - order.indexOf(a.status) || (a.created < b.created ? -1 : 1));
  const out = new Map();
  let cursor = today;
  for (const c of queue) {
    const f = forecast(c.workflow, today, cursor);
    out.set(c.id, f);
    cursor = f.ready;
  }
  return out;
}

/**
 * Everything with a date, kept in separate kinds. Forecast dates are counted forwards
 * from today. Ideas and thoughts never appear: they are not commitments, so never overdue.
 */
export function plannerEntries(ws, today = todayIso()) {
  const live = (t) => ws.records[t].filter((r) => !r.archived);
  const items = [];
  const push = (kind, date, title, type, id, done, extra = {}) => {
    if (!date) return;
    items.push({ kind, date, title, type, id, done, passed: !done && date < today, ...extra });
  };
  const projects = live('projects');
  for (const p of projects) {
    const finished = ['Completed', 'Abandoned'].includes(p.status);
    for (const m of p.milestones || []) push('milestone', m.date, `${p.title}: ${m.name}`, 'projects', p.id, !!m.done || finished);
    if (!finished && p.stageId) {
      const f = projectForecast(p, ws.process, projects, today);
      if (f && !f.past) push('project', f.date, `${p.title}: done by (${f.finishStage.name})`, 'projects', p.id, false, { forecast: true });
    }
    push('project', p.targetDate, `${p.title}: target`, 'projects', p.id, finished);
  }
  const sched = contentSchedule(ws, today);
  for (const c of live('content')) {
    const finished = contentDone(c);
    if (sched.has(c.id)) {
      const f = sched.get(c.id);
      for (const s of c.workflow.steps) if (f.byStep[s.id]) push('step', f.byStep[s.id], `${c.workingTitle}: ${s.name}`, 'content', c.id, false, { forecast: true, stepId: s.id });
      push('production', f.ready, c.workingTitle, 'content', c.id, false, { forecast: true });
    }
    push('production', c.targetDate, `${c.workingTitle}: target`, 'content', c.id, finished);
  }
  for (const o of live('outputs')) {
    push('publishing', o.publishedDate || o.scheduledDate, o.title, 'outputs', o.id, !!o.publishedDate || o.status === 'Published');
  }
  for (const t of live('tasks')) push('task', t.due, t.title, 'tasks', t.id, t.status === 'Done');
  return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Today and the next six days. Nothing is ever "overdue": a date that passed is carried
 * into today, and forecasts are counted from today anyway, so unfinished work moves out
 * instead of piling up. `next` is the one thing to focus on.
 */
export function agenda(entries, today = todayIso()) {
  const weekEnd = addDays(today, 6);
  const open = entries.filter((e) => !e.done && e.kind !== 'production' && e.kind !== 'project');
  const now = open.filter((e) => e.date <= today).map((e) => (e.date < today ? { ...e, carried: true } : e));
  const week = open.filter((e) => e.date > today && e.date <= weekEnd);
  return { today: now, week, next: now.find((e) => e.kind === 'step' || e.kind === 'task') || week.find((e) => e.kind === 'step' || e.kind === 'task') || now[0] || week[0] || null };
}

/** The stage a project is on, by name, for lists. */
export const stageName = (ws, project) => stageById(ws.process, project.stageId)?.name || '';

/* ------------------------------------------------------- series and parts */

const liveContent = (ws) => ws.records.content.filter((c) => !c.archived);

/** The next free number in a series. */
export function nextEpisode(ws, series) {
  if (!series) return '';
  return Math.max(0, ...liveContent(ws).filter((c) => c.series === series).map((c) => Number(c.episode) || 0)) + 1;
}

/** Every part of the same video, in part order (just this one when it was never split). */
export function partsOf(ws, c) {
  if (!c.partGroup) return [c];
  return liveContent(ws).filter((x) => x.partGroup === c.partGroup).sort((a, b) => (Number(a.part) || 0) - (Number(b.part) || 0));
}

/** Videos cut from this one (they name it under "Built from"), in part order. */
export const madeFrom = (ws, c) => liveContent(ws).filter((x) => (x.sourceIds || []).includes(c.id))
  .sort((a, b) => (Number(a.part) || 0) - (Number(b.part) || 0));

/** "Grind my Gears #5 · Part 2 of 3", or '' for a standalone video. */
export function seriesLabel(ws, c) {
  const parts = partsOf(ws, c);
  const head = c.series ? `${c.series}${c.episode ? ` #${c.episode}` : ''}` : '';
  const part = parts.length > 1 && c.part ? `Part ${c.part} of ${parts.length}` : '';
  return [head, part].filter(Boolean).join(' · ');
}

/** Puts a video (and all its parts) in a series, taking the next free number. Clearing the series clears the number. */
export function setSeries(ws, id, series, now = nowIso()) {
  const c = getRecord(ws, 'content', id);
  if (!c) return ws;
  if (c.series === series && (c.episode || !series)) return ws;
  const episode = series ? nextEpisode(ws, series) : '';
  return partsOf(ws, c).reduce((w, p) => updateRecord(w, 'content', p.id, { series, episode }, now), ws);
}

/** Renumbers a video and its parts; numbers are the creator's to choose, duplicates allowed. */
export const setEpisode = (ws, id, episode, now = nowIso()) =>
  partsOf(ws, getRecord(ws, 'content', id)).reduce((w, p) => updateRecord(w, 'content', p.id, { episode }, now), ws);

/** Splits one content-plan line into another part: same series, number, category, audience and links. */
export function addPart(ws, id, now = nowIso()) {
  const c = getRecord(ws, 'content', id);
  if (!c) return { ws, record: null };
  let w = ws;
  const group = c.partGroup || c.id;
  if (!c.partGroup) w = updateRecord(w, 'content', c.id, { partGroup: group, part: 1 }, now);
  const n = Math.max(...partsOf(w, getRecord(w, 'content', c.id)).map((p) => Number(p.part) || 0)) + 1;
  const base = (c.workingTitle || '').replace(/\s*[-–·]\s*Part \d+$/i, '');
  const keep = ['contentType', 'categoryId', 'series', 'episode', 'audience', 'tags', 'centralMessage', 'ideaIds', 'projectIds', 'thoughtIds'];
  const fields = Object.fromEntries(keep.filter((k) => c[k] !== undefined).map((k) => [k, Array.isArray(c[k]) ? [...c[k]] : c[k]]));
  const status = ws.config.statuses.content[0] || '';
  return createRecord(w, 'content', { ...fields, workingTitle: `${base} - Part ${n}`, status, partGroup: group, part: n, captures: [] }, now);
}

/** Where a video sits in its category: the Nth (by creation) of how many. */
export function categoryPlace(ws, c) {
  if (!c.categoryId) return null;
  const list = liveContent(ws).filter((x) => x.categoryId === c.categoryId).sort((a, b) => (a.created < b.created ? -1 : 1));
  return { n: list.findIndex((x) => x.id === c.id) + 1, of: list.length };
}

/* -------------------------------------------------------- audience looks */

/** One look per audience: the same layout and type, its own two colours. */
export const DEFAULT_LOOK = { main: '#1f2d3d', accent: '#2f6e94' };
export const lookFor = (ws, audience) => (audience && ws.config.looks?.[audience]) || null;
