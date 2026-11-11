// Lists and detail pages for records, plus the overview modules (dashboard, production,
// planner, performance). Content items and outputs have their own editor in content-view.js.

import { el } from './dom.js';
import * as M from '../model.js';
import { plannerEntries, PLAN_KINDS, outputLabel, agenda, contentSchedule, seriesLabel } from '../content.js';
import { progress, addDays, instantiateWorkflow, instantiateStory } from '../workflow.js';
import { projectForecast } from '../process.js';
import { calendarItems, placeOnCalendar, releasePlan, backlogHealth, fillSlots, slotDates, WEEKDAYS, releaseQueue, markReleased, planAtPace } from '../releases.js';
import { weekProgress, achievements, logStats, setWeeklyTarget } from '../goals.js';
import { readiness } from '../readiness.js';
import { lessonsOf, addLesson, updateLesson, removeLesson, LESSON_STEPS } from '../lessons.js';
import { captureProgress } from '../capture.js';
import { thoughtCapture, nextTaskCard } from './planning.js';
import { store, ws as currentWs, commitWs, saveUi, refresh } from './store.js';
import { recordForm, linkEditor, button, card, emptyState, confirmDialog, badge, catDot, recordLink, href } from './forms.js';
import { assistantPanel } from './assistant.js';

export const go = (hash) => { location.hash = hash; };

/** Creates a record and opens it. */
export function createAndOpen(type, fields = {}) {
  let made;
  commitWs((w) => {
    const status = w.config.statuses[type]?.[0];
    const r = M.createRecord(w, type, { ...(status ? { status } : {}), ...fields });
    made = r.record;
    return r.ws;
  }, { render: false });
  go(href(type, made.id));
}

const patcher = (type, id) => (patch, render) => commitWs((w) => M.updateRecord(w, type, id, patch), { render });
const linker = (type, id) => (field, target, on) => commitWs((w) => M.setLink(w, type, id, field, target, on));

/* ------------------------------------------------------------------ lists */

function filterBar(type, ws, f, rerender) {
  const statuses = ws.config.statuses[type] || [];
  const set = (k) => (e) => { f[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; rerender(); };
  return el('div', { class: 'filters' }, [
    el('input', { class: 'input', type: 'search', placeholder: 'Search…', value: f.q, 'data-field': `${type}.search`, on: { input: set('q') } }),
    statuses.length ? el('select', { class: 'input input--inline', 'data-field': `${type}.status`, on: { change: set('status') } },
      [el('option', { value: '', text: 'Any status' }), ...statuses.map((s) => el('option', { value: s, text: s, selected: s === f.status }))]) : null,
    ws.config.categories.length && ['ideas', 'projects', 'content'].includes(type)
      ? el('select', { class: 'input input--inline', 'data-field': `${type}.category`, on: { change: set('category') } },
        [el('option', { value: '', text: 'Any category' }), ...ws.config.categories.map((c) => el('option', { value: c.id, text: c.name, selected: c.id === f.category }))])
      : null,
    el('label', { class: 'check' }, [el('input', { type: 'checkbox', checked: f.archived, 'data-field': `${type}.archived`, on: { change: set('archived') } }), 'Show archived']),
  ]);
}

const filters = {};
export function filterState(type) {
  return (filters[type] ||= { q: '', status: '', category: '', archived: false });
}

function rowFor(type, r, ws) {
  const out = type === 'content' ? ws.records.outputs.filter((o) => o.contentId === r.id && !o.archived).length : null;
  return el('a', { class: 'rowcard', href: href(type, r.id) }, [
    el('span', { class: 'rowcard__title', text: M.titleOf(r) }),
    el('span', { class: 'rowcard__meta' }, [
      r.sample ? badge('Example', 'sample') : null,
      r.archived ? badge('Archived') : null,
      r.status ? badge(r.status, 'status') : null,
      catDot(ws, r.categoryId),
      type === 'content' && seriesLabel(ws, r) ? el('span', { class: 'small series-tag', text: seriesLabel(ws, r) }) : null,
      out !== null ? el('span', { class: 'small muted', text: `${out} output${out === 1 ? '' : 's'}` }) : null,
      r.contentType ? el('span', { class: 'small muted', text: r.contentType }) : null,
      r.assetType ? el('span', { class: 'small muted', text: r.assetType }) : null,
    ]),
  ]);
}

/** A searchable, filterable list of one record type. The results area redraws on its own while typing. */
export function recordList(type, { title, intro, newLabel, empty, newFields } = {}) {
  const ws = currentWs();
  const f = filterState(type);
  const results = el('div', { class: 'rows' });
  const draw = () => {
    results.replaceChildren();
    const found = M.searchRecords(ws, type, f).sort((a, b) => (a.modified < b.modified ? 1 : -1));
    if (!ws.records[type].length) results.append(empty || emptyState(`No ${M.TYPE_LABEL[type][1].toLowerCase()} yet`, intro || ''));
    else if (!found.length) results.append(el('p', { class: 'muted', text: 'Nothing matches those filters.' }));
    for (const r of found) results.append(rowFor(type, r, ws));
  };
  draw();
  return card(title || M.TYPE_LABEL[type][1], [
    intro ? el('p', { class: 'muted', text: intro }) : null,
    el('div', { class: 'row' }, [button(newLabel || `New ${M.TYPE_LABEL[type][0].toLowerCase()}`, () => createAndOpen(type, newFields), 'primary')]),
    filterBar(type, ws, f, draw),
    results,
  ]);
}

/* ----------------------------------------------------------------- detail */

export function detailHeader(type, r, crumbs = []) {
  return el('div', { class: 'detail__head' }, [
    el('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, crumbs.flatMap((c, i) => [i ? ' › ' : null, c])),
    el('h1', { class: 'detail__title', text: M.titleOf(r) }),
    el('div', { class: 'row' }, [
      badge(M.TYPE_LABEL[type][0]), r.sample ? badge('Example - sample data', 'sample') : null,
      r.archived ? badge('Archived') : null,
      store.ui.level === 'expert' ? el('code', { class: 'small muted', text: r.id }) : null,
      el('span', { class: 'small muted', text: `Edited ${r.modified.slice(0, 16).replace('T', ' ')}` }),
    ]),
  ]);
}

export function recordActions(type, r, after = '#/dashboard') {
  return el('div', { class: 'row' }, [
    r.archived
      ? button('Restore', () => commitWs((w) => M.restoreRecord(w, type, r.id)), '', { 'data-field': 'record.restore' })
      : button('Archive', () => commitWs((w) => M.archiveRecord(w, type, r.id)), '', { 'data-field': 'record.archive', title: 'Hide from lists without deleting' }),
    button('Delete…', async () => {
      const ws = currentWs();
      const cascade = M.cascadeOf(ws, type, r.id);
      const ok = await confirmDialog({ title: `Delete "${M.titleOf(r)}"?`,
        removes: [`this ${M.TYPE_LABEL[type][0].toLowerCase()}`, ...cascade.map((c) => `${M.TYPE_LABEL[c.type][0].toLowerCase()} "${M.titleOf(c.record)}"`)].join(', '),
        keeps: 'every other record. Links to it are removed; the records that held them stay.' });
      if (!ok) return;
      commitWs((w) => M.deleteRecord(w, type, r.id), { render: false });
      go(after);
    }, 'danger', { 'data-field': 'record.delete' }),
  ]);
}

/** Records that point at this one, grouped by type - the way back up the chain. */
export function backlinks(type, id, ws) {
  const { incoming } = M.related(ws, type, id);
  if (!incoming.length) return null;
  return card('Linked from', [el('ul', { class: 'plain' }, incoming.map((x) => el('li', {}, [
    el('span', { class: 'small muted', text: `${M.TYPE_LABEL[x.type][0]}: ` }), recordLink(x.type, x.record)])))]);
}

/** The detail page for any record type without a dedicated editor. */
export function recordDetail(type, id, { crumbs, extras = [], top = [] } = {}) {
  const ws = currentWs();
  const r = M.getRecord(ws, type, id);
  if (!r) return emptyState('Not found', 'This record no longer exists - it may have been deleted.', [button('Dashboard', () => go('#/dashboard'))]);
  const list = { thoughts: 'thoughts', ideas: 'ideas', projects: 'projects', references: 'assets', assets: 'assets', tasks: 'production', feedback: 'performance', publications: 'platforms' }[type];
  const links = linkEditor(type, r, ws, linker(type, id));
  return el('div', { class: 'detail' }, [
    detailHeader(type, r, crumbs || [el('a', { href: `#/${list}`, text: M.TYPE_LABEL[type][1] })]),
    ...top,
    card('', [recordForm(type, r, ws, patcher(type, id))]),
    ...extras,
    links ? card('Links', [links]) : null,
    backlinks(type, id, ws),
    assistantPanel(type, r, ws),
    card('', [recordActions(type, r, `#/${list}`)]),
  ]);
}

/* ------------------------------------------------------------- new content */

export function createAndOpenContent(fields = {}) {
  let made;
  commitWs((w) => {
    const prefs = w.config.preferences;
    const wf = w.workflows.find((t) => t.id === prefs.defaultWorkflowId);
    const story = w.stories.find((t) => t.id === prefs.defaultStoryId);
    const r = M.createRecord(w, 'content', { status: w.config.statuses.content[0] || '', contentType: '',
      workflow: wf ? instantiateWorkflow(wf) : null, story: story ? instantiateStory(story) : null, captures: [], ...fields });
    made = r.record;
    return r.ws;
  }, { render: false });
  go(`#/content/${made.id}/overview`);
}

/* -------------------------------------------------------------- dashboard */

/** The sidebar's capture box drops a thought - the lightest thing there is. */
export const quickCapture = (key = 'side') => thoughtCapture(key);

const done = (r) => ['Published', 'Parked', 'Completed', 'Abandoned', 'Rejected', 'Ready'].includes(r.status);

export function dashboard() {
  const ws = currentWs();
  const live = (t) => ws.records[t].filter((r) => !r.archived);
  const today = M.todayIso();
  const a = agenda(plannerEntries(ws, today), today);
  const list = (items, empty) => (items.length ? el('ul', { class: 'plain' }, items) : el('p', { class: 'muted small', text: empty }));
  const entry = (e) => el('li', {}, [el('span', { class: 'small muted', text: `${e.carried ? 'now' : e.date.slice(5)} ` }),
    el('a', { href: e.kind === 'step' ? `#/content/${e.id}` : href(e.type, e.id), text: e.title }),
    el('span', { class: 'small muted', text: ` · ${PLAN_KINDS[e.kind]}` })]);
  const health = backlogHealth(ws, today);
  const fresh = live('thoughts').filter((t) => !t.decision);
  return el('div', { class: 'grid' }, [
    el('div', { class: 'grid__wide' }, [nextTaskCard(ws)]),
    card('Today', [list(a.today.map(entry), 'Nothing for today - the next task above is the one to pick up.')]),
    card('The week ahead', [list(a.week.map(entry), 'Nothing forecast for the next six days.')]),
    card('Ready to release', [health.length ? list(health.map((h) => el('li', {}, [el('strong', { text: h.platform.name }),
      ` · ${h.ready} ready · ${h.empty} open slot${h.empty === 1 ? '' : 's'} in 4 weeks`, h.short ? badge('make a quick one', 'warn') : badge('enough waiting', 'ok')])), '')
      : el('p', { class: 'muted small', text: 'Switch on a release rhythm for a platform (Platforms → TikTok) to see this.' }), button('Releases', () => go('#/releases'), 'small')]),
    card('Projects: done by', [list(live('projects').filter((p) => !['Completed', 'Abandoned'].includes(p.status)).map((p) => {
      const f = projectForecast(p, ws.process, ws.records.projects, today);
      return el('li', {}, [recordLink('projects', p), el('span', { class: 'small muted', text: f && !f.past ? ` · about ${f.date}` : '' })]);
    }), 'No projects under way.')]),
    card(`Thoughts not looked at (${fresh.length})`, [list(fresh.slice(0, 6).map((t) => el('li', {}, [recordLink('thoughts', t)])), 'All weighed up.'),
      button('Thoughts', () => go('#/thoughts'), 'small')]),
    card('Recently edited', [list(M.recentlyEdited(ws, 8).map((x) => el('li', {}, [
      el('span', { class: 'small muted', text: `${M.TYPE_LABEL[x.type][0]}: ` }), recordLink(x.type, x.record)])), 'Nothing yet.')], { class: 'card grid__wide' }),
  ]);
}

/* --------------------------------------------------------------- library */

export function library() {
  const ws = currentWs();
  const view = store.ui.libraryView;
  const setView = (v) => { store.ui.libraryView = v; saveUi(); refresh(); };
  const tabs = el('div', { class: 'segmented', role: 'group', 'aria-label': 'View' }, ['list', 'board'].map((v) =>
    el('button', { class: 'segmented__btn', type: 'button', 'aria-pressed': String(view === v), text: v === 'list' ? 'List' : 'Board', on: { click: () => setView(v) } })));
  if (view === 'list') {
    return el('div', {}, [tabs, recordList('content', { title: 'Content library', newLabel: 'New content',
      intro: 'Every content item, independent of the platforms it ends up on.', newFields: { workingTitle: 'Untitled content' } })]);
  }
  const f = filterState('content');
  const items = M.searchRecords(ws, 'content', f);
  const cols = [...ws.config.statuses.content, ''];
  return el('div', {}, [tabs, card('Content board', [
    el('div', { class: 'board' }, cols.map((s) => {
      const inCol = items.filter((c) => (s ? c.status === s : !ws.config.statuses.content.includes(c.status)));
      if (!s && !inCol.length) return null;
      return el('div', { class: 'board__col' }, [el('h3', { class: 'board__head', text: `${s || 'No status'} (${inCol.length})` }),
        ...inCol.map((c) => rowFor('content', c, ws))]);
    })),
  ])]);
}

/* ------------------------------------------------------- assets & refs */

export const assetsModule = () => el('div', { class: 'stack' }, [
  recordList('references', { title: 'Reference library', intro: 'Sources as reusable records - link one to any number of ideas, projects, content items or outputs.', newFields: { title: 'New reference' } }),
  recordList('assets', { title: 'Assets', intro: 'Images, diagrams, footage, audio and other files - by location or URL. Files themselves stay where they are.', newFields: { name: 'New asset' } }),
]);

/* ---------------------------------------------------------------- videos */

const PLAN_STATUSES = ['Concept', 'Planning', 'Scripting'];
const OUT_STATUSES = ['Published'];
const SHELF_STATUSES = ['Parked'];

/** Where a video's work is: its next to-do step (or the first step), so a click lands on the work. */
const workHref = (ws, c) => `#/content/${c.id}/${readiness(ws, c).next?.step || 'idea'}`;

function videoRow(ws, c, extra = []) {
  const next = readiness(ws, c).next;
  return el('a', { class: 'rowcard', href: workHref(ws, c), 'data-search': `${c.workingTitle} ${c.series || ''}`.toLowerCase() }, [
    el('span', { class: 'rowcard__title', text: c.workingTitle }),
    el('span', { class: 'rowcard__meta' }, [
      c.status ? badge(c.status, 'status') : null,
      catDot(ws, c.categoryId),
      seriesLabel(ws, c) ? el('span', { class: 'small series-tag', text: seriesLabel(ws, c) }) : null,
      ...extra,
      next ? el('span', { class: 'small muted', text: `next: ${next.text}` }) : null,
    ]),
  ]);
}

const dayLabel = (iso, today) => (iso === today ? 'today' : iso === addDays(today, 1) ? 'tomorrow' : longDate(iso));

/** Every video in one place, in the order the work runs: what goes out next, what is being made, planned, out. */
export function videos() {
  const ws = currentWs();
  const today = M.todayIso();
  const all = ws.records.content.filter((c) => !c.archived);
  const queue = releaseQueue(ws);
  const queued = new Set(queue.map((x) => x.content.id));
  const outIds = new Set(all.filter((c) => OUT_STATUSES.includes(c.status)).map((c) => c.id));
  const making = all.filter((c) => !queued.has(c.id) && !outIds.has(c.id) && !SHELF_STATUSES.includes(c.status) && !PLAN_STATUSES.includes(c.status) && c.status);
  const planned = all.filter((c) => !queued.has(c.id) && (PLAN_STATUSES.includes(c.status) || !c.status));
  const lastOut = (c) => ws.records.outputs.filter((o) => o.contentId === c.id && o.publishedDate).map((o) => o.publishedDate).sort().at(-1) || '';
  const out = all.filter((c) => outIds.has(c.id) && !queued.has(c.id)).sort((a, b) => (lastOut(a) < lastOut(b) ? 1 : -1));
  const shelf = all.filter((c) => SHELF_STATUSES.includes(c.status) && !queued.has(c.id));
  const quick = ws.workflows.find((w) => /quick/i.test(w.name));

  const releaseRow = ({ output: o, content: c, platform: p }) => {
    const next = readiness(ws, c).next;
    const ready = !next || ['publish', 'results'].includes(next.step);
    return el('div', { class: 'rowcard release-row', 'data-search': `${c.workingTitle} ${o.title || ''} ${c.series || ''}`.toLowerCase() }, [
      el('span', { class: `release-row__day${o.scheduledDate <= today ? ' is-now' : ''}`, text: dayLabel(o.scheduledDate, today) }),
      el('a', { class: 'rowcard__title', href: workHref(ws, c), text: o.title || c.workingTitle }),
      el('span', { class: 'rowcard__meta' }, [
        p ? el('strong', { class: 'small', text: p.name }) : null,
        catDot(ws, c.categoryId),
        ready ? badge('ready to go out', 'ok') : el('span', { class: 'small', text: `to do: ${next.text}` }),
        o.scheduledDate <= today ? button('Released ✓', () => commitWs((w) => markReleased(w, o.id, today)), 'small', { 'data-field': `rel.done.${o.id}`, title: 'It went out today - record it on today\'s date' }) : null,
      ]),
    ]);
  };
  const soon = queue.slice(0, 8), later = queue.slice(8);
  const lists = el('div', { class: 'stack' }, [
    card(`Next to release (${queue.length})`, [
      el('p', { class: 'small muted', text: 'In the order they go out. Missed a day? The whole line moves on by itself - the next one is simply today, and everything after keeps its spacing. Press Released ✓ when it is out.' }),
      queue.length ? el('div', { class: 'rows' }, soon.map(releaseRow)) : emptyState('Nothing booked', 'Give a finished video a release date in its Publish step, or book the ready ones under Releases.'),
      later.length ? el('details', { class: 'more' }, [el('summary', { text: `${later.length} more after that` }), el('div', { class: 'rows' }, later.map(releaseRow))]) : null,
    ]),
    card(`In the making (${making.length})`, [making.length ? el('div', { class: 'rows' }, making.map((c) => videoRow(ws, c)))
      : el('p', { class: 'muted small', text: 'Nothing being recorded or edited right now.' })]),
    card(`Being planned (${planned.length})`, [
      el('div', { class: 'row' }, [
        button('New video', () => createAndOpenContent({ workingTitle: 'Untitled video' }), 'primary', { 'data-field': 'plan.new' }),
        button('New quick video (1-2 days)', () => createAndOpenContent({ workingTitle: 'Quick video', contentType: 'Quick video', ...(quick ? { workflow: instantiateWorkflow(quick) } : {}) }), '', { 'data-field': 'plan.quick' }),
      ]),
      planned.length ? el('div', { class: 'rows' }, planned.map((c) => videoRow(ws, c))) : el('p', { class: 'muted small', text: 'Start a video here, or from any thought, idea or project.' }),
    ]),
    el('details', { class: 'more more--card' }, [el('summary', { text: `Released (${out.length})` }),
      out.length ? el('div', { class: 'rows' }, out.map((c) => videoRow(ws, c, [lastOut(c) ? el('span', { class: 'small muted', text: `out ${longDate(lastOut(c))}` }) : null]))) : el('p', { class: 'muted small', text: 'Nothing out yet.' })]),
    shelf.length ? el('details', { class: 'more more--card' }, [el('summary', { text: `Parked (${shelf.length})` }), el('div', { class: 'rows' }, shelf.map((c) => videoRow(ws, c)))]) : null,
    tasksCard(ws, today),
  ]);
  const search = el('input', { class: 'input', type: 'search', placeholder: 'Find any video - planned, in the making or already out', 'aria-label': 'Find a video', 'data-field': 'videos.search',
    on: { input: (e) => {
      const q = e.target.value.trim().toLowerCase();
      lists.querySelectorAll('[data-search]').forEach((r) => { r.hidden = !!q && !r.dataset.search.includes(q); });
      lists.querySelectorAll('details').forEach((d) => { if (q) d.open = true; });
    } } });
  const note = store.ui.level === 'expert' ? el('p', { class: 'expert-note small', text: 'Every list here is worked out from the videos themselves: their status, their platform versions\' dates and what each step still needs - nothing is kept twice, so change a video and it moves to the right list. The weekly aim and the achievements count released platform versions (and logged publications for earlier versions).' }) : null;
  return el('div', { class: 'stack' }, [note, weekCard(ws, today), achievementsCard(ws, today), card('', [search]), lists]);
}

/** This week against the weekly target - a goal, never a requirement - and planning the line at that pace. */
function weekCard(ws, today) {
  const p = weekProgress(ws, today);
  const target = p.target;
  const pct = target ? Math.min(100, Math.round(((p.released + p.booked) / target) * 100)) : 0;
  const done = target ? Math.min(100, Math.round((p.released / target) * 100)) : 0;
  const lines = ws.platforms.filter((pl) => releaseQueue(ws).some((x) => x.output.platformId === pl.id));
  return card('This week', [
    el('div', { class: 'row' }, [
      el('label', { class: 'small' }, ['Aim for ', el('input', { class: 'input input--inline input--num', type: 'number', min: 0, step: 1, value: target || '', placeholder: '10',
        'data-field': 'week.target', on: { change: (e) => commitWs((w) => setWeeklyTarget(w, e.target.value)) } }), ' a week']),
      el('span', { class: 'small muted', text: 'A goal to aim for, never a requirement. Each week starts fresh.' }),
    ]),
    target ? el('div', { class: 'weekbar', title: `${p.released} out, ${p.booked} booked, aiming for ${target}` }, [
      el('span', { class: 'weekbar__done', style: { width: `${done}%` } }), el('span', { class: 'weekbar__booked', style: { width: `${Math.max(0, pct - done)}%` } })]) : null,
    el('p', { class: 'small', text: target
      ? `${p.released} out this week${p.booked ? `, ${p.booked} more booked` : ''} - aiming for ${target}.`
      : `${p.released} out this week. Set a weekly aim to see how close you get.` }),
    target && lines.length ? el('div', { class: 'row' }, lines.map((pl) => button(`Plan ${pl.name} at ${target} a week from tomorrow`,
      () => commitWs((w) => planAtPace(w, pl.id, addDays(today, 1), target)), '', { 'data-field': `week.plan.${pl.id}`,
        title: 'Re-dates everything booked from tomorrow at this pace, in the order it already has. Today and earlier stay.' }))) : null,
  ]);
}

/** Milestones: earned ones with their date, the next ones with how close. */
function achievementsCard(ws, today) {
  const all = achievements(ws, today);
  const n = (x) => x.toLocaleString();
  return card(`Achievements: ${all.filter((a) => a.earned).length} of ${all.length}`, [
    el('div', { class: 'badges' }, all.map((a) => el('div', { class: `badge-card${a.earned ? ' is-earned' : ''}`, 'data-field': `ach.${a.id}` }, [
      el('span', { class: 'badge-card__icon', 'aria-hidden': 'true', text: a.earned ? '★' : '☆' }),
      el('strong', { text: a.title }),
      el('span', { class: 'small muted', text: a.earned ? `Earned ${longDate(a.earned)}` : a.progress ? `${n(Math.min(a.progress.n, a.progress.of))} of ${n(a.progress.of)}` : 'Ahead' }),
      el('span', { class: 'small', text: a.detail }),
    ]))),
    el('p', { class: 'small muted' }, ['Views, followers and monetisation come from the numbers you log under ', el('a', { href: '#/performance', text: 'Performance → Channel stats' }), '.']),
  ]);
}

/** The channel's own numbers, logged by hand from the platform - they feed the achievements and the weekly check-ins. */
function statsCard(ws) {
  const today = M.todayIso();
  const stats = [...(ws.config.channelStats || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const f = { date: today, followers: '', views: '', monetised: false };
  const inp = (key, type, ph) => el('input', { class: 'input input--inline', type, value: f[key], placeholder: ph, 'data-field': `stats.${key}`, on: { input: (e) => { f[key] = e.target.value; } } });
  return card('Channel stats', [
    el('p', { class: 'small muted', text: 'Copy the numbers from the platform now and then - once a week is plenty. They feed the achievements and the weekly progress check-ins.' }),
    el('div', { class: 'row' }, [
      el('label', { class: 'small' }, ['Date ', inp('date', 'date')]),
      el('label', { class: 'small' }, ['Followers ', inp('followers', 'number', 'e.g. 120')]),
      el('label', { class: 'small' }, ['Total views ', inp('views', 'number', 'e.g. 3400')]),
      el('label', { class: 'small check' }, [el('input', { type: 'checkbox', 'data-field': 'stats.monetised', on: { change: (e) => { f.monetised = e.target.checked; } } }), ' Monetised']),
      button('Log it', () => commitWs((w) => logStats(w, f)), 'primary', { 'data-field': 'stats.log' }),
    ]),
    stats.length ? el('table', { class: 'table small' }, [
      el('tr', {}, ['Date', 'Followers', 'Total views', 'Monetised'].map((h) => el('th', { text: h }))),
      ...stats.map((s) => el('tr', {}, [el('td', { text: s.date }), el('td', { text: String(s.followers ?? '') }), el('td', { text: String(s.views ?? '') }), el('td', { text: s.monetised ? 'yes' : '' })])),
    ]) : el('p', { class: 'small muted', text: 'Nothing logged yet.' }),
  ]);
}

function tasksCard(ws, today) {
  const tasks = ws.records.tasks.filter((t) => !t.archived && t.status !== 'Done');
  const doneStatus = ws.config.statuses.tasks.at(-1);
  return el('div', { class: 'stack' }, [
    card('Open tasks', [tasks.length ? el('div', { class: 'rows' }, tasks.map((t) => el('div', { class: 'rowcard' }, [
      el('label', { class: 'check' }, [el('input', { type: 'checkbox', 'data-field': `task.${t.id}.done`,
        on: { change: () => commitWs((w) => M.updateRecord(w, 'tasks', t.id, { status: doneStatus })) } }), recordLink('tasks', t)]),
      el('span', { class: 'rowcard__meta' }, [t.due ? el('span', { class: 'small muted', text: t.due <= today ? 'now' : `for ${t.due}` }) : null,
        t.contentId && M.getRecord(ws, 'content', t.contentId) ? recordLink('content', M.getRecord(ws, 'content', t.contentId)) : null]),
    ]))) : el('p', { class: 'muted', text: 'No open tasks. Make one from any workflow step, or add one here.' }),
    button('New task', () => createAndOpen('tasks', { title: 'New task' }))]),
  ]);
}

/* --------------------------------------------------------------- releases */

const planFilter = { kind: '', view: 'rhythm', month: '', show: '', picked: null };

const DAY_MS = 86400000;
const monthTitle = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const longDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function place(item, date) {
  planFilter.picked = null;
  commitWs((w) => placeOnCalendar(w, item.id, date));
}

function calChip(item) {
  const picked = planFilter.picked?.id === item.id;
  return el('button', {
    class: `calchip ${item.ready ? 'calchip--ready' : ''} ${item.done ? 'calchip--done' : ''}`, type: 'button', draggable: !item.done ? 'true' : null,
    style: item.color ? { '--cat': item.color } : null, 'aria-pressed': String(picked), 'data-field': `cal.${item.id}`,
    title: `${item.title} · ${item.label}${item.category ? ` · ${item.category}` : ''}${item.ready ? ' · ready' : ''}${item.done ? ' · published' : ''}`,
    on: {
      dragstart: (e) => { e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id })); e.dataTransfer.effectAllowed = 'move'; },
      click: (e) => { e.stopPropagation(); planFilter.picked = picked ? null : { id: item.id }; refresh(); },
      dblclick: (e) => { e.stopPropagation(); go(href('outputs', item.id)); },
    },
  }, [el('span', { class: 'calchip__title', text: item.title }), el('span', { class: 'calchip__label', text: item.label })]);
}

/** Native drag and drop, plus click-a-chip-then-click-a-day for touch screens and keyboards. */
function dropZone(node, date) {
  node.addEventListener('dragover', (e) => { e.preventDefault(); node.classList.add('is-over'); });
  node.addEventListener('dragleave', () => node.classList.remove('is-over'));
  node.addEventListener('drop', (e) => {
    e.preventDefault(); node.classList.remove('is-over');
    try { place(JSON.parse(e.dataTransfer.getData('text/plain')), date); } catch { /* not one of our chips */ }
  });
  return node;
}

function calendarView(ws, today) {
  const ym = planFilter.month || today.slice(0, 7);
  const all = calendarItems(ws);
  const show = planFilter.show;
  const items = all.filter((i) => !show || i.platformId === show);
  const byDate = new Map();
  for (const i of items.filter((x) => x.date)) {
    if (!byDate.has(i.date)) byDate.set(i.date, []);
    byDate.get(i.date).push(i);
  }
  const shelf = items.filter((i) => !i.date && !i.done).sort((a, b) => Number(b.ready) - Number(a.ready));
  const slots = new Map();
  for (const p of ws.platforms.filter((x) => x.rhythm?.enabled && (!show || x.id === show))) {
    for (const d of slotDates(p.rhythm, addDays(`${ym}-01`, -7), 50)) slots.set(d, [...(slots.get(d) || []), p.name]);
  }
  const ready = new Map();
  for (const [id, fc] of contentSchedule(ws, today)) {
    const c = M.getRecord(ws, 'content', id);
    const f = fc.ready;
    ready.set(f, [...(ready.get(f) || []), c.workingTitle]);
  }
  const first = new Date(`${ym}-01T00:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7;
  const start = new Date(first.getTime() - lead * DAY_MS);
  const days = [];
  for (let d = start; days.length < 42; d = new Date(d.getTime() + DAY_MS)) {
    const iso = d.toISOString().slice(0, 10);
    if (days.length >= 35 && iso.slice(0, 7) !== ym) break;
    days.push(iso);
  }
  const showChip = (k, label) => el('button', { class: 'chip', type: 'button', 'aria-pressed': String(show === k), text: label,
    on: { click: () => { planFilter.show = k; refresh(); } } });
  const picked = planFilter.picked;
  const cell = (iso) => {
    const chips = byDate.get(iso) || [];
    const slot = slots.get(iso);
    const node = el('div', { class: `calday ${iso.slice(0, 7) !== ym ? 'calday--out' : ''} ${iso === today ? 'calday--today' : ''} ${picked ? 'calday--target' : ''} ${slot && !chips.length && iso >= today ? 'calday--slot' : ''}`,
      on: { click: () => picked && place(picked, iso) } }, [
      el('button', { class: 'calday__n', type: 'button', text: String(Number(iso.slice(8))), 'aria-label': picked ? `Place on ${longDate(iso)}` : longDate(iso),
        on: { click: (e) => { e.stopPropagation(); if (picked) place(picked, iso); } } }),
      ...chips.map(calChip),
      slot && !chips.length && iso >= today ? el('span', { class: 'calday__slot', text: `${slot.join(', ')} slot` }) : null,
      ready.has(iso) ? el('span', { class: 'calday__ready', title: ready.get(iso).join(', '), text: `ready: ${ready.get(iso).join(', ')}` }) : null,
    ]);
    return dropZone(node, iso);
  };
  return el('div', { class: 'stack' }, [
    card('', [
      el('div', { class: 'row' }, [
        button('‹', () => { planFilter.month = shiftMonth(ym, -1); refresh(); }, 'ghost', { 'aria-label': 'Previous month' }),
        el('h2', { class: 'cal__title', text: monthTitle(ym) }),
        button('›', () => { planFilter.month = shiftMonth(ym, 1); refresh(); }, 'ghost', { 'aria-label': 'Next month' }),
        ym !== today.slice(0, 7) ? button('Today', () => { planFilter.month = ''; refresh(); }, 'small') : null,
      ]),
      el('div', { class: 'chipset' }, [showChip('', 'Every platform'), ...ws.platforms.map((p) => showChip(p.id, p.name))]),
      el('p', { class: 'small muted', text: picked
        ? 'Now click a day to place it - or the shelf to take its date off.'
        : 'Each chip is one release on one platform. Drag it to a day (or click it, then a day). Dashed days are open release slots; "ready:" marks when a video in progress can be done, counted from today. Colours are categories.' }),
    ]),
    el('div', { class: 'cal' }, [
      el('div', { class: 'cal__grid' }, [
        ...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => el('div', { class: 'cal__dow', text: d })),
        ...days.map(cell),
      ]),
      dropZone(el('div', { class: `cal__shelf ${picked ? 'calday--target' : ''}`, on: { click: () => picked && place(picked, '') } }, [
        el('h3', { class: 'cal__shelfhead', text: 'No release date yet' }),
        shelf.length ? el('div', { class: 'cal__shelfitems' }, shelf.map(calChip)) : el('p', { class: 'small muted', text: 'Everything has a date. Drop a chip here to take its date off.' }),
        ws.config.categories.length ? el('div', { class: 'cal__legend' }, ws.config.categories.map((c) => el('span', { class: 'cat' }, [el('span', { class: 'cat__dot', style: { background: c.color } }), c.name]))) : null,
      ]), ''),
    ]),
  ]);
}

function rhythmView(ws, today) {
  const on = ws.platforms.filter((p) => p.rhythm?.enabled);
  if (!on.length) return card('Release rhythm', [emptyState('No release rhythm yet', 'Pick the days you release on, per platform - for example TikTok every Saturday.', [button('Platforms', () => go('#/platforms'))])]);
  return el('div', { class: 'stack' }, on.map((p) => {
    const plan = releasePlan(ws, p.id, today, 28);
    return card(`${p.name}: ${p.rhythm.days.map((d) => WEEKDAYS[d]).join(', ')}`, [
      el('p', { class: 'small' }, [`${plan.backlog.length} ready and waiting, ${plan.empty} open slot${plan.empty === 1 ? '' : 's'} in the next 4 weeks.`,
        plan.backlog.length < (Number(p.rhythm.target) || 0) ? el('span', { class: 'text-warn', text: ` Fewer than ${p.rhythm.target} waiting - a quick 1-2 day video would top it up.` }) : null]),
      el('ul', { class: 'plain' }, plan.slots.map((s) => el('li', { class: 'slot' }, [
        el('span', { class: 'plan__date', text: longDate(s.date) }),
        s.output ? recordLink('outputs', s.output) : s.suggestion ? el('span', {}, [el('span', { class: 'muted', text: 'next in line: ' }), recordLink('outputs', s.suggestion)])
          : el('span', { class: 'muted', text: 'open - nothing ready yet' }),
      ]))),
      plan.slots.some((s) => s.suggestion) ? button('Book the next in line into the open slots', () => commitWs((w) => fillSlots(w, p.id, today, 28)), 'primary', { 'data-field': `rel.fill.${p.id}` }) : null,
      el('p', { class: 'small muted', text: 'Booking is always your click. Change any date by dragging on the calendar.' }),
    ]);
  }));
}

const planRow = (e, withDate = true) => el('div', { class: `plan plan--${e.kind} ${e.done ? 'plan--done' : ''}` }, [
  withDate ? el('span', { class: 'plan__date', text: e.date.slice(5) }) : null,
  el('a', { href: e.kind === 'step' ? `#/content/${e.id}` : href(e.type, e.id), text: e.title }),
  el('span', { class: 'small muted', text: PLAN_KINDS[e.kind] }),
  e.carried ? badge('now') : null, e.done ? badge('Done', 'ok') : null,
]);

function agendaView(ws, today) {
  const a = agenda(plannerEntries(ws, today), today);
  const days = new Map();
  for (const e of a.week) { if (!days.has(e.date)) days.set(e.date, []); days.get(e.date).push(e); }
  return el('div', { class: 'stack' }, [
    nextTaskCard(ws),
    card(`Today · ${longDate(today)}`, a.today.length ? a.today.map((e) => planRow(e, false))
      : [el('p', { class: 'muted', text: 'Nothing for today.' })]),
    card('The week ahead', days.size ? [...days].map(([d, list]) => el('div', {}, [el('h3', { class: 'month__head', text: longDate(d) }), ...list.map((e) => planRow(e, false))]))
      : [el('p', { class: 'muted', text: 'Nothing forecast for the next six days.' })]),
    el('p', { class: 'small muted', text: 'Forecasts are counted forwards from today. If something is not finished, it simply moves out with everything after it - nothing piles up.' }),
  ]);
}

function listView(ws, today) {
  const entries = plannerEntries(ws, today).filter((e) => !planFilter.kind || e.kind === planFilter.kind);
  const months = new Map();
  for (const e of entries) {
    const m = e.date.slice(0, 7);
    if (!months.has(m)) months.set(m, []);
    months.get(m).push(e);
  }
  const chip = (k, label) => el('button', { class: 'chip', type: 'button', 'aria-pressed': String(planFilter.kind === k), text: label,
    on: { click: () => { planFilter.kind = k; refresh(); } } });
  return card('Every date', [
    el('p', { class: 'muted small', text: 'Milestones, forecasts, workflow steps, releases and tasks, kept apart. Thoughts and ideas never get dates - they are not commitments.' }),
    el('div', { class: 'chipset' }, [chip('', 'Everything'), ...Object.entries(PLAN_KINDS).map(([k, l]) => chip(k, l))]),
    entries.length ? el('div', {}, [...months].map(([m, list]) => el('div', { class: 'month' }, [
      el('h3', { class: 'month__head', text: monthTitle(m) }), ...list.map((e) => planRow(e))])))
      : emptyState('Nothing dated yet', 'Start a workflow on a video, move a project onto a stage, or give an output a release date.'),
  ]);
}

export function releases() {
  const ws = currentWs();
  const today = M.todayIso();
  const tab = (v, label) => el('button', { class: 'segmented__btn', type: 'button', 'aria-pressed': String(planFilter.view === v), text: label, 'data-field': `plan.view.${v}`,
    on: { click: () => { planFilter.view = v; planFilter.picked = null; refresh(); } } });
  return el('div', { class: 'stack' }, [
    el('div', { class: 'segmented', role: 'group', 'aria-label': 'Releases view' }, [tab('rhythm', 'Release rhythm'), tab('calendar', 'Calendar'), tab('agenda', 'This week'), tab('list', 'All dates')]),
    { rhythm: rhythmView, calendar: calendarView, agenda: agendaView, list: listView }[planFilter.view](ws, today),
  ]);
}

/* --------------------------------------------------------------- lessons */

/** Every issue is a learning opportunity: what happened, how it was solved, and the check that keeps it from coming back. */
export function lessonsPage() {
  const ws = currentWs();
  const all = lessonsOf(ws);
  const set = (id, key) => (e) => commitWs((w) => updateLesson(w, id, { [key]: e.target.value.trim() }), { render: false });
  const field = (label, control) => el('label', { class: 'field' }, [el('span', { class: 'field__label', text: label }), control]);
  const stepSel = (value, onChange, key) => el('select', { class: 'input input--inline', 'data-field': key, on: { change: onChange } },
    LESSON_STEPS.map(([id, label]) => el('option', { value: id, text: label, selected: id === value })));
  const fresh = { step: 'card' };
  const check = el('input', { class: 'input', placeholder: 'The question to ask - e.g. Is the hook about the viewer\'s life, not mine?', 'data-field': 'lesson.new.check' });
  const issue = el('textarea', { class: 'input', rows: 2, placeholder: 'What happened?', 'data-field': 'lesson.new.issue' });
  const fix = el('textarea', { class: 'input', rows: 2, placeholder: 'How we solved it', 'data-field': 'lesson.new.fix' });
  const add = () => {
    if (!check.value.trim()) { check.focus(); return; }
    commitWs((w) => addLesson(w, { step: fresh.step, check: check.value, issue: issue.value, fix: fix.value }).ws);
  };
  return el('div', { class: 'stack' }, [
    card('Lessons', [
      el('p', { class: 'muted small', text: 'Every issue is a learning opportunity. Write down what happened, how it was solved, and the one question to ask at that step so it doesn\'t happen again. The questions show on every video\'s step under "Check before you move on" - optional ticks, never a gate.' }),
      store.ui.level === 'expert' ? el('p', { class: 'expert-note small', text: 'Lessons are kept in your workspace settings, so they travel with your data file and every workspace can have its own. Ticks are saved on each video; removing a lesson keeps those ticks.' }) : null,
      el('div', { class: 'two' }, [field('At which step?', stepSel(fresh.step, (e) => { fresh.step = e.target.value; }, 'lesson.new.step')), field('The check', check)]),
      el('div', { class: 'two' }, [field('What happened', issue), field('How we solved it', fix)]),
      button('Add lesson', add, 'primary', { 'data-field': 'lesson.add' }),
    ]),
    ...LESSON_STEPS.map(([step, label]) => {
      const list = all.filter((l) => l.step === step);
      return card(`${label} (${list.length})`, list.length ? list.map((l) => el('div', { class: 'block lesson' }, [
        el('div', { class: 'row' }, [
          el('input', { class: 'input lesson__check', value: l.check, 'aria-label': 'The check', 'data-field': `lesson.${l.id}.check`, on: { change: set(l.id, 'check') } }),
          stepSel(l.step, (e) => commitWs((w) => updateLesson(w, l.id, { step: e.target.value })), `lesson.${l.id}.step`),
          button('×', async () => {
            if (await confirmDialog({ title: 'Remove this lesson?', removes: `"${l.check}" - it stops showing on the videos.`, keeps: 'Every video and its notes.', confirm: 'Remove' })) commitWs((w) => removeLesson(w, l.id));
          }, 'ghost', { 'aria-label': 'Remove this lesson' }),
        ]),
        el('div', { class: 'two' }, [
          field('What happened', el('textarea', { class: 'input', rows: 2, value: l.issue || '', 'data-field': `lesson.${l.id}.issue`, on: { change: set(l.id, 'issue') } })),
          field('How we solved it', el('textarea', { class: 'input', rows: 2, value: l.fix || '', 'data-field': `lesson.${l.id}.fix`, on: { change: set(l.id, 'fix') } })),
        ]),
        el('p', { class: 'small muted', text: `Learned ${l.date}` }),
      ])) : [el('p', { class: 'small muted', text: 'Nothing learned at this step yet.' })]);
    }),
  ]);
}

/* ----------------------------------------------------------- performance */

export function performance() {
  const ws = currentWs();
  const published = ws.records.outputs.filter((o) => !o.archived && (o.publishedDate || o.status === 'Published'));
  return el('div', { class: 'stack' }, [
    statsCard(ws),
    recordList('feedback', { title: 'Feedback and performance', intro: 'What happened after publishing: numbers if you have them, comments, and lessons. Advanced analytics are planned for a later phase.', newFields: { title: 'New feedback' } }),
    card('Published outputs', [published.length ? el('ul', { class: 'plain' }, published.map((o) => el('li', {}, [recordLink('outputs', o),
      el('span', { class: 'small muted', text: ` · ${outputLabel(ws, o)} · ${o.publishedDate || ''}` }),
      ' ', button('Add feedback', () => createAndOpen('feedback', { title: `Feedback: ${o.title}`, outputId: o.id, contentId: o.contentId, date: M.todayIso() }), 'small')])))
      : el('p', { class: 'muted', text: 'Nothing published yet.' })]),
  ]);
}

