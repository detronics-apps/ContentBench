// Lists and detail pages for records, plus the overview modules (dashboard, production,
// planner, performance). Content items and outputs have their own editor in content-view.js.

import { el } from './dom.js';
import * as M from '../model.js';
import { plannerEntries, PLAN_KINDS, outputLabel, agenda, contentSchedule, seriesLabel } from '../content.js';
import { progress, addDays, instantiateWorkflow, instantiateStory } from '../workflow.js';
import { projectForecast } from '../process.js';
import { calendarItems, placeOnCalendar, releasePlan, backlogHealth, fillSlots, slotDates, WEEKDAYS } from '../releases.js';
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
  const entry = (e) => el('li', {}, [el('span', { class: 'small muted', text: `${e.carried ? 'carried over' : e.date.slice(5)} ` }),
    el('a', { href: e.kind === 'step' ? `#/content/${e.id}/production` : href(e.type, e.id), text: e.title }),
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

/* ------------------------------------------------------- content plan */

const PLAN_STATUSES = ['Concept', 'Planning', 'Scripting'];

export function contentPlan() {
  const ws = currentWs();
  const live = ws.records.content.filter((c) => !c.archived && (PLAN_STATUSES.includes(c.status) || !c.status));
  const quick = ws.workflows.find((w) => /quick/i.test(w.name));
  return el('div', { class: 'stack' }, [
    card('Content plan', [
      el('p', { class: 'muted small', text: 'The inputs for each video: story and timeline, script, shots and sound, platforms. When it is planned, move it to Capturing and it shows under Production.' }),
      el('div', { class: 'row' }, [
        button('New video', () => createAndOpenContent({ workingTitle: 'Untitled video' }), 'primary', { 'data-field': 'plan.new' }),
        button('New quick video (1-2 days)', () => createAndOpenContent({ workingTitle: 'Quick video', contentType: 'Quick video', ...(quick ? { workflow: instantiateWorkflow(quick) } : {}) }), '', { 'data-field': 'plan.quick' }),
      ]),
    ]),
    card(`Being planned (${live.length})`, [live.length ? el('div', { class: 'rows' }, live.map((c) => rowFor('content', c, ws)))
      : emptyState('Nothing being planned', 'Start a video here, or from any thought, idea or project.')]),
    el('p', { class: 'small muted' }, ['Every video, whatever its status: ', el('a', { href: '#/library', text: 'Library' }), '.']),
  ]);
}

/* ------------------------------------------------------------ production */

const MAKE_STATUSES = ['Capturing', 'Editing', 'Review', 'In Production'];

export function production() {
  const ws = currentWs();
  const today = M.todayIso();
  const live = ws.records.content.filter((c) => !c.archived && MAKE_STATUSES.includes(c.status));
  const sched = contentSchedule(ws, today);
  const tasks = ws.records.tasks.filter((t) => !t.archived && t.status !== 'Done');
  const doneStatus = ws.config.statuses.tasks.at(-1);
  return el('div', { class: 'stack' }, [
    card('Production', [
      el('p', { class: 'muted small', text: 'Go out and make it. Each video shows what is still needed, where every file goes, and when it can be ready if you keep going.' }),
      live.length ? el('div', { class: 'rows' }, live.map((c) => {
        const p = progress(c.workflow);
        const cp = captureProgress(c.captures);
        const f = sched.get(c.id) || null;
        return el('a', { class: 'rowcard', href: `#/content/${c.id}/production` }, [
          el('span', { class: 'rowcard__title', text: c.workingTitle }),
          el('span', { class: 'rowcard__meta' }, [badge(c.status, 'status'),
            cp.total ? badge(`${cp.saved}/${cp.total} captured`, cp.needed ? 'warn' : 'ok') : null,
            el('span', { class: 'small muted', text: c.workflow ? `${p.next ? `next: ${p.next.name}` : 'all steps done'}${f ? ` · ready ~${f.ready.slice(5)}` : ''}` : 'no workflow' })]),
        ]);
      })) : emptyState('Nothing in production', 'Set a planned video\'s status to Capturing and it shows here.', [button('Content plan', () => go('#/plan'))]),
    ]),
    card('Open tasks', [tasks.length ? el('div', { class: 'rows' }, tasks.map((t) => el('div', { class: 'rowcard' }, [
      el('label', { class: 'check' }, [el('input', { type: 'checkbox', 'data-field': `task.${t.id}.done`,
        on: { change: () => commitWs((w) => M.updateRecord(w, 'tasks', t.id, { status: doneStatus })) } }), recordLink('tasks', t)]),
      el('span', { class: 'rowcard__meta' }, [t.due ? el('span', { class: 'small muted', text: t.due < today ? 'carried over' : `for ${t.due}` }) : null,
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
  el('a', { href: e.kind === 'step' ? `#/content/${e.id}/production` : href(e.type, e.id), text: e.title }),
  el('span', { class: 'small muted', text: PLAN_KINDS[e.kind] }),
  e.carried ? badge('carried over') : null, e.done ? badge('Done', 'ok') : null,
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

/* ----------------------------------------------------------- performance */

export function performance() {
  const ws = currentWs();
  const published = ws.records.outputs.filter((o) => !o.archived && (o.publishedDate || o.status === 'Published'));
  return el('div', { class: 'stack' }, [
    recordList('feedback', { title: 'Feedback and performance', intro: 'What happened after publishing: numbers if you have them, comments, and lessons. Advanced analytics are planned for a later phase.', newFields: { title: 'New feedback' } }),
    card('Published outputs', [published.length ? el('ul', { class: 'plain' }, published.map((o) => el('li', {}, [recordLink('outputs', o),
      el('span', { class: 'small muted', text: ` · ${outputLabel(ws, o)} · ${o.publishedDate || ''}` }),
      ' ', button('Add feedback', () => createAndOpen('feedback', { title: `Feedback: ${o.title}`, outputId: o.id, contentId: o.contentId, date: M.todayIso() }), 'small')])))
      : el('p', { class: 'muted', text: 'Nothing published yet.' })]),
  ]);
}

