// Lists and detail pages for records, plus the overview modules (dashboard, production,
// planner, performance). Content items and outputs have their own editor in content-view.js.

import { el } from './dom.js';
import * as M from '../model.js';
import { plannerEntries, PLAN_KINDS, outputLabel } from '../content.js';
import { progress } from '../workflow.js';
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
  const list = { ideas: 'ideas', projects: 'projects', references: 'assets', assets: 'assets', tasks: 'production', feedback: 'performance', publications: 'platforms' }[type];
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

/* ------------------------------------------------------------------ ideas */

export function developIdea(ideaId) {
  const ws = currentWs();
  const idea = M.getRecord(ws, 'ideas', ideaId);
  createAndOpenContent({
    workingTitle: idea.title || M.titleOf(idea), ideaIds: [idea.id], brief: idea.cleanedSummary || '',
    centralMessage: idea.angle || '', categoryId: idea.categoryId || '', series: idea.series || '',
    audience: idea.audience || '', tags: idea.tags || [],
  });
}

export function createAndOpenContent(fields = {}) {
  let made;
  commitWs((w) => {
    const r = M.createRecord(w, 'content', { status: w.config.statuses.content[0] || '', contentType: '', ...fields });
    made = r.record;
    return r.ws;
  }, { render: false });
  go(`#/content/${made.id}/overview`);
}

export function ideaDetail(id) {
  const ws = currentWs();
  const made = M.related(ws, 'ideas', id).incoming.filter((x) => x.type === 'content');
  return recordDetail('ideas', id, { top: [card('', [
    el('div', { class: 'row' }, [button('Develop into content', () => developIdea(id), 'primary', { 'data-field': 'idea.develop' }),
      el('span', { class: 'muted small', text: made.length ? `Already developed into ${made.length} content item${made.length === 1 ? '' : 's'} - one idea can feed several.` : 'Creates a content item linked back to this idea.' })]),
  ])] });
}

/* --------------------------------------------------------------- projects */

export function projectDetail(id) {
  const ws = currentWs();
  const p = M.getRecord(ws, 'projects', id);
  if (!p) return recordDetail('projects', id);
  const ms = p.milestones || [];
  const setMs = (list, render = true) => commitWs((w) => M.updateRecord(w, 'projects', id, { milestones: list }), { render });
  const msRows = ms.map((m) => el('div', { class: 'row row--item' }, [
    el('input', { type: 'checkbox', checked: !!m.done, 'aria-label': 'Done', 'data-field': `ms.${m.id}.done`, on: { change: (e) => setMs(M.patchItem(ms, m.id, { done: e.target.checked })) } }),
    el('input', { class: 'input', value: m.name, 'data-field': `ms.${m.id}.name`, on: { change: (e) => setMs(M.patchItem(ms, m.id, { name: e.target.value }), false) } }),
    el('input', { class: 'input input--inline', type: 'date', value: m.date || '', 'data-field': `ms.${m.id}.date`, on: { change: (e) => setMs(M.patchItem(ms, m.id, { date: e.target.value })) } }),
    button('×', () => setMs(M.removeItem(ms, m.id)), 'ghost', { 'aria-label': 'Remove milestone' }),
  ]));
  const content = M.related(ws, 'projects', id).incoming.filter((x) => x.type === 'content');
  return recordDetail('projects', id, { extras: [
    card('Milestones', [...msRows, button('Add milestone', () => setMs([...ms, { id: M.newId('ms'), name: 'Milestone', date: '', done: false }]))]),
    card('Content in this project', [
      content.length ? el('ul', { class: 'plain' }, content.map((x) => el('li', {}, [recordLink('content', x.record)])))
        : el('p', { class: 'muted', text: 'None - a project without content is perfectly valid.' }),
      button('New content in this project', () => createAndOpenContent({ workingTitle: `${p.title} - new piece`, projectIds: [id] })),
    ]),
  ] });
}

/* -------------------------------------------------------------- dashboard */

export function quickCapture(idSuffix = 'main') {
  const input = el('input', { class: 'input', placeholder: 'An idea, in a few words…', 'data-field': `capture.${idSuffix}`, 'aria-label': 'Quick capture an idea' });
  const add = () => {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    commitWs((w) => M.createRecord(w, 'ideas', { title: text.slice(0, 80), rawInput: text, status: w.config.statuses.ideas[0] || '' }).ws);
    input.value = '';
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  return el('div', { class: 'capture' }, [input, button('Add idea', add, 'primary', { 'data-field': `capture.${idSuffix}.add` })]);
}

const done = (r) => ['Published', 'Parked', 'Completed', 'Abandoned', 'Rejected'].includes(r.status);

export function dashboard() {
  const ws = currentWs();
  const live = (t) => ws.records[t].filter((r) => !r.archived);
  const total = M.RECORD_TYPES.reduce((n, t) => n + ws.records[t].length, 0);
  const today = M.nowIso().slice(0, 10);
  const soon = plannerEntries(ws, today).filter((e) => !e.done && e.date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).slice(0, 8);
  const list = (items, empty) => (items.length ? el('ul', { class: 'plain' }, items) : el('p', { class: 'muted small', text: empty }));
  return el('div', { class: 'grid' }, [
    card('Quick capture', [el('p', { class: 'muted small', text: 'No form - just the thought. Shape it later in Ideas.' }), quickCapture('dash')], { class: 'card grid__wide' }),
    total ? null : card('Getting started', [emptyState('This workspace is empty', 'Capture an idea above, set up your workspace, or explore the example workspace.', [
      button('Workspace settings', () => go('#/settings')), button('How to use', () => go('#/guide'))])], { class: 'card grid__wide' }),
    card('Active work', [list(live('content').filter((c) => !done(c)).map((c) => {
      const p = progress(c.workflow);
      return el('li', {}, [recordLink('content', c), el('span', { class: 'small muted', text: ` · ${c.status || 'no status'}${p.next ? ` · next: ${p.next.name}` : ''}` })]);
    }), 'Nothing in progress.')]),
    card('Upcoming dates', [list(soon.map((e) => el('li', {}, [
      el('span', { class: `small ${e.overdue ? 'text-warn' : 'muted'}`, text: `${e.date} ` }), el('a', { href: href(e.type, e.id), text: e.title }),
      el('span', { class: 'small muted', text: ` · ${PLAN_KINDS[e.kind]}` })])), 'Nothing dated in the next 30 days.')]),
    card('Recent ideas', [list(live('ideas').slice(-6).reverse().map((i) => el('li', {}, [recordLink('ideas', i), el('span', { class: 'small muted', text: ` · ${i.status || ''}` })])), 'No ideas yet.')]),
    card('Active projects', [list(live('projects').filter((p) => p.status === 'Active').map((p) => el('li', {}, [recordLink('projects', p), el('span', { class: 'small muted', text: p.stage ? ` · ${p.stage}` : '' })])), 'No active projects.')]),
    card('Recently edited', [list(M.recentlyEdited(ws, 8).map((x) => el('li', {}, [
      el('span', { class: 'small muted', text: `${M.TYPE_LABEL[x.type][0]}: ` }), recordLink(x.type, x.record)])), 'Nothing yet.')], { class: 'card grid__wide' }),
    card('Shortcuts', [el('div', { class: 'row' }, [
      button('New content', () => createAndOpenContent({ workingTitle: 'Untitled content' })),
      button('New project', () => createAndOpen('projects', { title: 'Untitled project' })),
      button('Planner', () => go('#/planner')), button('Templates', () => go('#/templates'))])], { class: 'card grid__wide' }),
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

/* ------------------------------------------------------------ production */

export function production() {
  const ws = currentWs();
  const live = ws.records.content.filter((c) => !c.archived && !done(c));
  const tasks = ws.records.tasks.filter((t) => !t.archived && t.status !== 'Done');
  const doneStatus = ws.config.statuses.tasks.at(-1);
  return el('div', { class: 'stack' }, [
    card('Production pipeline', [live.length ? el('div', { class: 'rows' }, live.map((c) => {
      const p = progress(c.workflow);
      return el('a', { class: 'rowcard', href: `#/content/${c.id}/production` }, [
        el('span', { class: 'rowcard__title', text: c.workingTitle }),
        el('span', { class: 'rowcard__meta' }, [badge(c.status || 'no status', 'status'),
          el('span', { class: 'small muted', text: c.workflow ? `${p.done}/${p.total} steps · ${p.next ? `next: ${p.next.name}` : 'all done'}` : 'no workflow chosen' }),
          c.reviewStatus ? badge(c.reviewStatus) : null]),
      ]);
    })) : emptyState('Nothing in production', 'Content that is not published or parked shows here with its workflow progress.')]),
    card('Open tasks', [tasks.length ? el('div', { class: 'rows' }, tasks.map((t) => el('div', { class: 'rowcard' }, [
      el('label', { class: 'check' }, [el('input', { type: 'checkbox', 'data-field': `task.${t.id}.done`,
        on: { change: () => commitWs((w) => M.updateRecord(w, 'tasks', t.id, { status: doneStatus })) } }), recordLink('tasks', t)]),
      el('span', { class: 'rowcard__meta' }, [t.due ? el('span', { class: 'small muted', text: `due ${t.due}` }) : null,
        t.contentId && M.getRecord(ws, 'content', t.contentId) ? recordLink('content', M.getRecord(ws, 'content', t.contentId)) : null]),
    ]))) : el('p', { class: 'muted', text: 'No open tasks. Make one from any workflow step, or add one here.' }),
    button('New task', () => createAndOpen('tasks', { title: 'New task' }))]),
  ]);
}

/* --------------------------------------------------------------- planner */

const planFilter = { kind: '' };
export function planner() {
  const ws = currentWs();
  const today = M.nowIso().slice(0, 10);
  const all = plannerEntries(ws, today);
  const entries = all.filter((e) => !planFilter.kind || e.kind === planFilter.kind);
  const months = new Map();
  for (const e of entries) {
    const m = e.date.slice(0, 7);
    if (!months.has(m)) months.set(m, []);
    months.get(m).push(e);
  }
  const chip = (k, label) => el('button', { class: 'chip', type: 'button', 'aria-pressed': String(planFilter.kind === k), text: label,
    on: { click: () => { planFilter.kind = k; refresh(); } } });
  return card('Content planner', [
    el('p', { class: 'muted small', text: 'Project milestones, production dates and publishing dates are kept apart. Ideas never appear here - an idea is not a commitment, so it cannot be overdue.' }),
    el('div', { class: 'chipset' }, [chip('', 'Everything'), ...Object.entries(PLAN_KINDS).map(([k, l]) => chip(k, l))]),
    entries.length ? el('div', {}, [...months].map(([m, list]) => el('div', { class: 'month' }, [
      el('h3', { class: 'month__head', text: new Date(`${m}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }),
      ...list.map((e) => el('div', { class: `plan plan--${e.kind} ${e.done ? 'plan--done' : ''}` }, [
        el('span', { class: 'plan__date', text: e.date.slice(5) }),
        el('a', { href: href(e.type, e.id), text: e.title }),
        el('span', { class: 'small muted', text: PLAN_KINDS[e.kind] }),
        e.overdue ? badge('Overdue', 'warn') : null, e.done ? badge('Done', 'ok') : null,
      ])),
    ]))) : emptyState('Nothing dated yet', 'Give a project a milestone, a content item a target date, or an output a scheduled date.'),
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
      ' ', button('Add feedback', () => createAndOpen('feedback', { title: `Feedback: ${o.title}`, outputId: o.id, contentId: o.contentId, date: M.nowIso().slice(0, 10) }), 'small')])))
      : el('p', { class: 'muted', text: 'Nothing published yet.' })]),
  ]);
}

