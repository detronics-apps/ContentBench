// The Planning side - thoughts, ideas, projects - and the hub that opens the app.
// The levels differ by time: a thought takes seconds, an idea about an hour, a project
// days. Every prompt here is a suggestion; nothing has to be answered to move on.

import { el } from './dom.js';
import * as M from '../model.js';
import * as P from '../process.js';
import { plannerEntries, agenda, PLAN_KINDS } from '../content.js';
import { backlogHealth } from '../releases.js';
import { captureProgress } from '../capture.js';
import { store, ws as currentWs, commitWs } from './store.js';
import { button, card, emptyState, badge, catDot, recordLink, href } from './forms.js';
import { recordDetail, go, createAndOpenContent } from './records.js';
import { sync } from './folder.js';

const today = () => M.todayIso();
const longDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* -------------------------------------------------------------- promoting */

function startProject(fields, stage) {
  let made;
  commitWs((w) => {
    const st = stage || P.sortedStages(w.process)[0];
    const r = M.createRecord(w, 'projects', { status: w.config.statuses.projects[1] || 'Active', startDate: today(), ...fields });
    const moved = st ? P.moveStage(r.record, st.id, { today: today() }) : r.record;
    const f = P.projectForecast(moved, w.process, r.ws.records.projects, today());
    const stamped = f && !f.past ? P.stampForecast(moved, f.date) : moved;
    made = r.record;
    return M.updateRecord(r.ws, 'projects', made.id, { stageId: stamped.stageId || '', stageLog: stamped.stageLog || [] });
  }, { render: false });
  go(href('projects', made.id));
}

export function newProject() { startProject({ title: 'New project' }); }

export function thoughtTo(kind, id) {
  const ws = currentWs();
  const t = M.getRecord(ws, 'thoughts', id);
  const title = (t.text || '').split('\n')[0].slice(0, 80);
  if (!t.decision) commitWs((w) => M.updateRecord(w, 'thoughts', id, { decision: 'Develop' }), { render: false });
  if (kind === 'idea') {
    let made;
    commitWs((w) => { const r = M.createRecord(w, 'ideas', { title, rawInput: t.text, thoughtIds: [id], categoryId: t.categoryId || '', status: w.config.statuses.ideas[0] || '' }); made = r.record; return r.ws; }, { render: false });
    go(href('ideas', made.id));
  } else if (kind === 'project') startProject({ title, thoughtIds: [id], categoryId: t.categoryId || '' }, P.firstPlanStage(ws.process));
  else createAndOpenContent({ workingTitle: title, thoughtIds: [id], categoryId: t.categoryId || '' });
}

export function ideaTo(kind, id) {
  const ws = currentWs();
  const i = M.getRecord(ws, 'ideas', id);
  if (kind === 'project') {
    startProject({ title: i.title, ideaIds: [id], thoughtIds: i.thoughtIds || [], categoryId: i.categoryId || '', problem: i.problem || '', produce: i.produce || [] }, P.firstPlanStage(ws.process));
  } else {
    createAndOpenContent({ workingTitle: i.title || M.titleOf(i), ideaIds: [id], thoughtIds: i.thoughtIds || [], brief: i.cleanedSummary || i.problem || '',
      centralMessage: i.angle || '', categoryId: i.categoryId || '', series: i.series || '', audience: i.audience || '', tags: i.tags || [] });
  }
}

const promoteRow = (buttons, note) => card('', [el('div', { class: 'row' }, [...buttons, note ? el('span', { class: 'small muted', text: note }) : null])]);

/* --------------------------------------------------------------- thoughts */

export function thoughtCapture(key = 'main') {
  const input = el('input', { class: 'input', placeholder: 'A thought, as it comes…', 'data-field': `capture.${key}`, 'aria-label': 'Drop a thought' });
  const add = () => {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    commitWs((w) => M.createRecord(w, 'thoughts', { text }).ws);
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  return el('div', { class: 'capture' }, [input, button('Drop it', add, 'primary', { 'data-field': `capture.${key}.add` })]);
}

const DECISIONS = ['Develop', 'Park', 'Drop'];

function thoughtRow(t, ws) {
  const set = (d) => commitWs((w) => M.updateRecord(w, 'thoughts', t.id, { decision: t.decision === d ? '' : d }));
  const became = M.related(ws, 'thoughts', t.id).incoming.length;
  return el('div', { class: 'thought' }, [
    el('a', { class: 'thought__text', href: href('thoughts', t.id), text: t.text || '(empty)' }),
    el('div', { class: 'row' }, [
      el('span', { class: 'small muted', text: `${t.created.slice(0, 10)}${t.source ? ` · ${t.source}` : ''}` }),
      t.sample ? badge('Example', 'sample') : null, catDot(ws, t.categoryId),
      became ? badge(`became ${became}`, 'ok') : null,
      el('span', { class: 'row__push' }),
      el('span', { class: 'chipset' }, DECISIONS.map((d) => el('button', { class: 'chip chip--small', type: 'button', 'aria-pressed': String(t.decision === d), text: d,
        'data-field': `th.${t.id}.${d}`, on: { click: () => set(d) } }))),
      button('→ Idea', () => thoughtTo('idea', t.id), 'small ghost', { title: 'Spend about an hour on it' }),
      button('→ Project', () => thoughtTo('project', t.id), 'small ghost', { title: 'Days of work: start at the first Plan stage' }),
      button('→ Video', () => thoughtTo('content', t.id), 'small ghost', { title: 'Any thought can become content straight away' }),
    ]),
  ]);
}

export function thoughtsModule() {
  const ws = currentWs();
  const live = ws.records.thoughts.filter((t) => !t.archived).sort((a, b) => (a.created < b.created ? 1 : -1));
  const group = (title, list, open = true) => (list.length ? el('details', { class: 'more group', open }, [
    el('summary', { text: `${title} (${list.length})` }), el('div', { class: 'stack stack--tight' }, list.map((t) => thoughtRow(t, ws)))]) : null);
  return el('div', { class: 'stack' }, [
    card('Thoughts', [
      el('p', { class: 'muted small', text: 'Seconds each, no limit. Drop them in as they come - not all of them have merit, and that is fine. Later, weigh some up and develop the good ones into ideas.' }),
      thoughtCapture('thoughts'),
    ]),
    live.length ? el('div', { class: 'stack' }, [
      group('Not looked at yet', live.filter((t) => !t.decision)),
      group('Worth developing', live.filter((t) => t.decision === 'Develop')),
      group('Parked', live.filter((t) => t.decision === 'Park'), false),
      group('Dropped', live.filter((t) => t.decision === 'Drop'), false),
    ]) : emptyState('No thoughts yet', 'Type one above and press Enter. That is all a thought needs.'),
  ]);
}

/** The Passport prompts as optional questions - answer any, skip any. */
function passportCard(t, ws) {
  const prompts = P.passportPrompts(ws.process);
  if (!prompts.length) return null;
  const answers = t.passport || {};
  const set = (i, v) => commitWs((w) => M.updateRecord(w, 'thoughts', t.id, { passport: { ...(M.getRecord(w, 'thoughts', t.id).passport || {}), [i]: v } }), { render: false });
  return card('Passport: is this worth developing?', [
    el('p', { class: 'small muted', text: `Have you thought of these? Answer the ones that help, skip the rest. ${P.answeredCount(answers, prompts)} of ${prompts.length} answered.` }),
    ...prompts.map((q, i) => el('label', { class: 'field' }, [el('span', { class: 'field__label', text: q }),
      el('textarea', { class: 'input', rows: 2, value: answers[i] || '', 'data-field': `pp.${t.id}.${i}`, on: { change: (e) => set(i, e.target.value) } })])),
  ]);
}

export function thoughtDetail(id) {
  const ws = currentWs();
  const t = M.getRecord(ws, 'thoughts', id);
  if (!t) return recordDetail('thoughts', id);
  return recordDetail('thoughts', id, { top: [promoteRow([
    button('Develop into an idea', () => thoughtTo('idea', id), 'primary', { 'data-field': 'th.toIdea' }),
    button('Start a project', () => thoughtTo('project', id)),
    button('Make a video', () => thoughtTo('content', id)),
  ], 'A thought can become any of these, as many times as you like.')], extras: [passportCard(t, ws)] });
}

/* ------------------------------------------------------------------ ideas */

function stagePrompts(ws, group) {
  const stages = P.stagesIn(ws.process, group);
  if (!stages.length) return null;
  return el('details', { class: 'more' }, [el('summary', { text: `Have you thought of… (${stages.map((s) => s.name).join(', ')})` }),
    ...stages.map((s) => el('div', { class: 'prompts' }, [el('strong', { text: `${s.name}: ${s.question}` }), el('p', { class: 'small muted', text: s.does }),
      el('ul', { class: 'small' }, s.prompts.map((q) => el('li', { text: q })))]))]);
}

/** The scorecard: every score optional, the wording for the score picked shown beside it. */
export function scorecard(type, r, ws) {
  const crit = ws.process?.scorecard || [];
  if (!crit.length) return null;
  const scores = r.scores || {};
  const sum = P.scoreSummary(scores, crit);
  const set = (cid, v) => commitWs((w) => M.updateRecord(w, type, r.id, { scores: { ...(M.getRecord(w, type, r.id).scores || {}), [cid]: v === '' ? '' : Number(v) } }));
  return card('Scorecard: worth taking to a plan?', [
    el('p', { class: 'small muted', text: `Score only what applies - a blank never counts against it. ${sum.answered} of ${sum.total} scored${sum.average !== null ? ` · average ${sum.average} / 10` : ''}.` }),
    el('details', { class: 'more', open: sum.answered > 0 }, [el('summary', { text: sum.answered ? 'Scores' : 'Open the scorecard' }),
      el('div', { class: 'scores' }, crit.map((c) => {
        const v = scores[c.id];
        return el('div', { class: 'score' }, [
          el('span', { class: 'score__name', text: c.name }),
          el('select', { class: 'input input--inline', 'data-field': `sc.${r.id}.${c.id}`, 'aria-label': `${c.name} score`, on: { change: (e) => set(c.id, e.target.value) } },
            [el('option', { value: '', text: '—' }), ...c.anchors.map((a, i) => el('option', { value: String(i + 1), text: `${i + 1} · ${a}`, selected: Number(v) === i + 1 }))]),
          v ? el('span', { class: 'small muted score__anchor', text: c.anchors[Number(v) - 1] || '' }) : null,
        ]);
      }))]),
  ]);
}

export function ideaDetail(id) {
  const ws = currentWs();
  const i = M.getRecord(ws, 'ideas', id);
  if (!i) return recordDetail('ideas', id);
  const made = M.related(ws, 'ideas', id).incoming;
  return recordDetail('ideas', id, {
    top: [promoteRow([
      button('Take it to a project', () => ideaTo('project', id), 'primary', { 'data-field': 'idea.toProject' }),
      button('Make a video', () => ideaTo('content', id), '', { 'data-field': 'idea.develop' }),
    ], made.length ? `Already led to ${plural(made.length, 'record')}.` : 'About an hour of thinking: is there something behind it?'),
    card('', [stagePrompts(ws, 'Idea')])],
    extras: [scorecard('ideas', i, ws)],
  });
}

/* --------------------------------------------------------------- projects */

function stageTrack(p, ws) {
  const stages = P.sortedStages(ws.process);
  const cur = stages.findIndex((s) => s.id === p.stageId);
  const reason = el('input', { class: 'input input--inline', placeholder: 'Why? (optional)', 'data-field': `pj.${p.id}.reason`, 'aria-label': 'Reason for the move' });
  const move = (s) => commitWs((w) => {
    const pr = M.getRecord(w, 'projects', p.id);
    const moved = P.moveStage(pr, s.id, { reason: reason.value.trim(), today: today() });
    const f = P.projectForecast(moved, w.process, w.records.projects, today());
    const stamped = f && !f.past ? P.stampForecast(moved, f.date) : moved;
    return M.updateRecord(w, 'projects', p.id, { stageId: stamped.stageId, stageLog: stamped.stageLog });
  });
  return el('div', { class: 'track' }, [
    el('ol', { class: 'track__list' }, P.GROUPS.map((g) => {
      const inGroup = stages.filter((s) => s.group === g);
      return inGroup.length ? el('li', { class: 'track__group' }, [el('span', { class: 'track__label', text: g }),
        el('div', { class: 'track__stages' }, inGroup.map((s) => {
          const i = stages.indexOf(s);
          return el('button', { class: `stage ${i === cur ? 'stage--current' : i < cur ? 'stage--past' : ''}`, type: 'button', 'aria-pressed': String(i === cur),
            title: `${s.n}. ${s.name}: ${s.question}`, 'data-field': `pj.stage.${s.id}`, on: { click: () => move(s) } }, [el('span', { class: 'stage__n', text: String(s.n) }), s.name]);
        }))]) : null;
    })),
    el('div', { class: 'row' }, [el('span', { class: 'small muted', text: 'Click any stage to move there - forwards or back. Going back is part of the process, not a failure.' }), reason]),
  ]);
}

function forecastCard(p, ws) {
  const f = P.projectForecast(p, ws.process, ws.records.projects, today());
  if (!f) return null;
  if (f.past) return card('Done-by forecast', [el('p', { class: 'muted', text: 'Past the finish stage - this project is in its educate / evaluate phase.' })]);
  const drift = P.forecastDrift(p, f.date);
  return card('Done-by forecast', [
    el('p', {}, [el('strong', { text: `About ${longDate(f.date)}` }), ` - ${plural(f.remaining, 'day')} of work left to "${f.finishStage.name}", if the process is followed.`]),
    drift && drift.days ? el('p', { class: 'small', text: `When this stage began it said ${longDate(drift.was)}; it has moved ${Math.abs(drift.days)} day${Math.abs(drift.days) === 1 ? '' : 's'} ${drift.days > 0 ? 'out' : 'in'}. That is just the current best guess - no catching up needed.` }) : null,
    el('p', { class: 'small muted', text: 'Counted forwards from today, so unfinished work simply moves out. Estimates are placeholders until a stage has been done twice; then your own average is used.' }),
    el('table', { class: 'table small' }, [el('tbody', {}, f.stages.map((r) => el('tr', {}, [
      el('td', { text: `${r.stage.n}. ${r.stage.name}` }),
      el('td', { text: `${r.left} of ${plural(r.days, 'day')}` }),
      el('td', { class: 'muted', text: r.source === 'yours' ? `your average (${r.samples})` : 'placeholder' })])))]),
  ]);
}

function currentStageCard(p, ws) {
  const s = P.stageById(ws.process, p.stageId);
  if (!s) return card('Stage', [el('p', { class: 'muted', text: 'Not on a stage yet - pick one above.' })]);
  return card(`Now: ${s.n}. ${s.name}`, [
    el('p', {}, [el('strong', { text: s.question })]),
    el('p', { class: 'small', text: s.does }),
    s.goal ? el('p', { class: 'small muted', text: `Aim: ${s.goal}` }) : null,
    s.prompts.length ? el('details', { class: 'more' }, [el('summary', { text: 'Have you thought of…' }), el('ul', { class: 'small' }, s.prompts.map((q) => el('li', { text: q })))]) : null,
    s.loopsTo ? el('p', { class: 'small muted', text: `Can loop back: ${s.loopsTo}` }) : null,
  ]);
}

function historyCard(p, ws) {
  const log = p.stageLog || [];
  if (!log.length) return null;
  return el('details', { class: 'more card' }, [el('summary', { text: `Stage history (${log.length})` }),
    el('ul', { class: 'plain small' }, [...log].reverse().map((e) => {
      const s = P.stageById(ws.process, e.stageId);
      return el('li', { text: `${e.entered}${e.left ? ` → ${e.left} (${P.daysBetween(e.entered, e.left)} d)` : ' → now'} · ${s ? s.name : e.stageId}${e.reason ? ` · ${e.reason}` : ''}` });
    }))]);
}

/** Everything that fills this project's folder, from both directions. */
function folderCard(p, ws) {
  const { outgoing, incoming } = M.related(ws, 'projects', p.id);
  const all = [...outgoing, ...incoming];
  const of = (t) => all.filter((x) => x.type === t).map((x) => x.record);
  const videos = of('content');
  const series = ws.config.series || [];
  const pick = el('select', { class: 'input input--inline', 'data-field': `pj.${p.id}.series`, 'aria-label': 'Series for the new video' },
    [el('option', { value: '', text: 'No series' }), ...series.map((s) => el('option', { value: s, text: s }))]);
  const section = (label, list, type) => (list.length ? el('div', { class: 'folder__row' }, [el('span', { class: 'folder__label', text: label }),
    el('span', { class: 'chips' }, list.map((r) => el('span', { class: 'chip chip--link' }, [recordLink(type, r)])))]) : null);
  return card('Project folder', [
    el('p', { class: 'small muted', text: 'Everything linked to this project. Link thoughts, ideas, references and assets below; videos can come from it at any stage, even if it fails.' }),
    section('Thoughts', of('thoughts'), 'thoughts'), section('Ideas', of('ideas'), 'ideas'),
    section('References', of('references'), 'references'), section('Assets', of('assets'), 'assets'), section('Tasks', of('tasks'), 'tasks'),
    el('div', { class: 'folder__row' }, [el('span', { class: 'folder__label', text: `Videos (${videos.length})` }),
      videos.length ? el('ul', { class: 'plain' }, videos.map((c) => el('li', {}, [el('a', { href: `#/content/${c.id}/overview`, text: c.workingTitle }),
        el('span', { class: 'small muted', text: ` · ${[c.series, c.status].filter(Boolean).join(' · ')}` })]))) : el('span', { class: 'muted small', text: 'None yet.' })]),
    el('div', { class: 'row' }, [pick, button('New video from this project', () => createAndOpenContent({ workingTitle: `${p.title} - ${pick.value || 'new video'}`,
      projectIds: [p.id], series: pick.value, categoryId: p.categoryId || '' }), 'primary', { 'data-field': 'pj.newVideo' })]),
  ]);
}

export function projectDetail(id) {
  const ws = currentWs();
  const p = M.getRecord(ws, 'projects', id);
  if (!p) return recordDetail('projects', id);
  const ms = p.milestones || [];
  const setMs = (list, render = true) => commitWs((w) => M.updateRecord(w, 'projects', id, { milestones: list }), { render });
  return recordDetail('projects', id, {
    top: [card('Stages', [stageTrack(p, ws)]), el('div', { class: 'two' }, [currentStageCard(p, ws), forecastCard(p, ws)]), folderCard(p, ws)],
    extras: [
      scorecard('projects', p, ws),
      card('Milestones', [...ms.map((m) => el('div', { class: 'row row--item' }, [
        el('input', { type: 'checkbox', checked: !!m.done, 'aria-label': 'Done', 'data-field': `ms.${m.id}.done`, on: { change: (e) => setMs(M.patchItem(ms, m.id, { done: e.target.checked })) } }),
        el('input', { class: 'input', value: m.name, 'data-field': `ms.${m.id}.name`, on: { change: (e) => setMs(M.patchItem(ms, m.id, { name: e.target.value }), false) } }),
        el('input', { class: 'input input--inline', type: 'date', value: m.date || '', 'data-field': `ms.${m.id}.date`, on: { change: (e) => setMs(M.patchItem(ms, m.id, { date: e.target.value })) } }),
        button('×', () => setMs(M.removeItem(ms, m.id)), 'ghost', { 'aria-label': 'Remove milestone' })])),
      button('Add milestone', () => setMs([...ms, { id: M.newId('ms'), name: 'Milestone', date: '', done: false }]))]),
      historyCard(p, ws),
    ],
  });
}

export function projectsModule() {
  const ws = currentWs();
  const live = ws.records.projects.filter((p) => !p.archived);
  const stages = P.sortedStages(ws.process);
  return el('div', { class: 'stack' }, [
    card('Projects', [
      el('p', { class: 'muted small', text: 'Days of work: look at the problem from every side, build, test, evaluate. A project can produce many videos, at any stage.' }),
      el('div', { class: 'row' }, [button('New project', newProject, 'primary', { 'data-field': 'pj.new' })]),
    ]),
    live.length ? el('div', { class: 'board' }, P.GROUPS.map((g) => {
      const inG = live.filter((p) => (P.stageById(ws.process, p.stageId)?.group || 'Thought') === g);
      if (!inG.length) return null;
      return el('div', { class: 'board__col' }, [el('h3', { class: 'board__head', text: `${g} (${inG.length})` }), ...inG.map((p) => {
        const s = P.stageById(ws.process, p.stageId);
        const f = P.projectForecast(p, ws.process, ws.records.projects, today());
        return el('a', { class: 'rowcard', href: href('projects', p.id) }, [el('span', { class: 'rowcard__title', text: p.title }),
          el('span', { class: 'rowcard__meta' }, [p.sample ? badge('Example', 'sample') : null, s ? badge(`${s.n}. ${s.name}`, 'status') : null,
            p.status ? el('span', { class: 'small muted', text: p.status }) : null,
            f && !f.past ? el('span', { class: 'small muted', text: `done ~${f.date.slice(5)}` }) : null])]);
      })]);
    })) : emptyState('No projects yet', `Start one here, or grow one from a thought or an idea. Stages: ${stages.map((s) => s.name).join(' → ')}.`),
  ]);
}

/* ------------------------------------------------------------------- hub */

export function nextTaskCard(ws) {
  const a = agenda(plannerEntries(ws, today()), today());
  const n = a.next;
  return card('Your next task', [
    n ? el('div', { class: 'next' }, [
      el('a', { class: 'next__title', href: n.kind === 'step' ? `#/content/${n.id}/production` : href(n.type, n.id), text: n.title }),
      el('span', { class: 'small muted', text: `${PLAN_KINDS[n.kind]} · ${n.carried ? 'carried over - just carry on' : n.date === today() ? 'today' : longDate(n.date)}` }),
    ]) : el('p', { class: 'muted', text: 'Nothing lined up. Pick a video or a project and its next step shows here.' }),
    el('p', { class: 'small muted', text: 'Only this one. Anything not finished simply moves out - the dates are counted from today, every day.' }),
  ]);
}


/**
 * The app's sections. Home shows one big block each; inside a section only its own
 * tabs show. `owns` is every route that belongs to it, so the breadcrumb always knows.
 */
export const SECTIONS = [
  { id: 'dashboard', name: 'Dashboard', purpose: 'Your next task, today, the week ahead and what is ready to release.',
    tabs: [['dashboard', 'Dashboard']], owns: ['dashboard'] },
  { id: 'planning', name: 'Planning', purpose: 'The inputs: thoughts (seconds), ideas (an hour), projects (days).',
    tabs: [['thoughts', 'Thoughts'], ['ideas', 'Ideas'], ['projects', 'Projects']], owns: ['thoughts', 'ideas', 'projects'] },
  { id: 'content', name: 'Content', purpose: 'Plan each video, go and make it, release it on a rhythm.',
    tabs: [['plan', 'Content plan'], ['production', 'Production'], ['releases', 'Releases'], ['performance', 'Performance'], ['extras', 'Beyond video']],
    owns: ['extras', 'plan', 'create', 'content', 'production', 'tasks', 'releases', 'planner', 'outputs', 'performance', 'feedback', 'publications'] },
  { id: 'library', name: 'Library', purpose: 'Every video, references and assets, templates and platforms.',
    tabs: [['library', 'All videos'], ['assets', 'References & assets'], ['templates', 'Templates'], ['platforms', 'Platforms']],
    owns: ['library', 'assets', 'references', 'templates', 'platforms'] },
  { id: 'settings', name: 'Settings', purpose: 'Your private folder, workspaces, categories, voice and capture kinds.',
    tabs: [['settings', 'Settings']], owns: ['settings'] },
  { id: 'guide', name: 'How to use', purpose: 'Search in your own words: how-tos, questions and what is worth knowing.',
    tabs: [['guide', 'How to use']], owns: ['guide'] },
];

export const sectionOf = (mod) => SECTIONS.find((s) => s.owns.includes(mod)) || null;

/** Which tab lights up for a page that is not a tab itself (a video, an output, a task). */
const TAB_FOR = { content: 'plan', create: 'plan', tasks: 'production', outputs: 'releases', planner: 'releases', publications: 'releases', feedback: 'performance', references: 'assets' };
export const tabFor = (mod) => TAB_FOR[mod] || mod;

const tabLabel = (id) => SECTIONS.flatMap((s) => s.tabs).find(([t]) => t === id)?.[1] || null;
const MAKING = ['Capturing', 'Editing', 'Review', 'In Production'];

/** The logical page one step up from here, for the bottom Back button; null when that is Home. */
export function backFor(route) {
  if (route.mod === 'home' || route.mod === 'section') return null;
  if (route.a) {
    const ws = currentWs();
    if (route.mod === 'outputs') {
      const o = ws.records.outputs.find((x) => x.id === route.a);
      if (o?.contentId) return { href: `#/content/${o.contentId}/outputs`, label: 'The video' };
    }
    if (route.mod === 'content') {
      const c = ws.records.content.find((x) => x.id === route.a);
      const tab = c && MAKING.includes(c.status) ? 'production' : c?.status === 'Ready' ? 'releases' : 'plan';
      return { href: `#/${tab}`, label: tabLabel(tab) };
    }
    const tab = tabFor(route.mod);
    if (tabLabel(tab)) return { href: `#/${tab}`, label: tabLabel(tab) };
  }
  const sec = sectionOf(route.mod);
  return sec && sec.tabs.length > 1 ? { href: `#/section/${sec.id}`, label: sec.name } : null;
}

/** One line per section saying what is waiting there right now. */
function sectionNote(id, ws) {
  const live = (t) => ws.records[t].filter((r) => !r.archived);
  const content = live('content');
  if (id === 'dashboard') {
    const n = agenda(plannerEntries(ws, today()), today()).next;
    return n ? `Next: ${n.title}` : 'Nothing lined up yet';
  }
  if (id === 'planning') {
    const fresh = live('thoughts').filter((t) => !t.decision).length;
    const active = live('projects').filter((p) => !['Completed', 'Abandoned'].includes(p.status)).length;
    return `${plural(live('thoughts').length, 'thought')}${fresh ? ` (${fresh} new)` : ''} · ${plural(live('ideas').length, 'idea')} · ${plural(active, 'project')} under way`;
  }
  if (id === 'content') {
    const planned = content.filter((c) => ['Concept', 'Planning', 'Scripting', ''].includes(c.status || '')).length;
    const making = content.filter((c) => ['Capturing', 'Editing', 'Review', 'In Production'].includes(c.status)).length;
    const health = backlogHealth(ws, today());
    return `${planned} being planned · ${making} being made${health.length ? ` · ${health.map((h) => `${h.platform.name}: ${h.ready} ready`).join(', ')}` : ''}`;
  }
  if (id === 'library') return `${plural(content.length, 'video')} · ${plural(ws.workflows.length + ws.stories.length, 'template')} · ${plural(ws.platforms.length, 'platform')}`;
  if (id === 'settings') return sync.status === 'connected' ? `Saving to your folder "${sync.name || 'folder'}"` : 'Data kept in this browser - connect your folder';
  return 'Start here if something is unclear';
}

/** Home: one big block per section, then the next task and a place to drop a thought. */
export function hub() {
  const ws = currentWs();
  return el('div', { class: 'stack' }, [
    el('div', { class: 'navtiles' }, SECTIONS.map((s) => el('a', { class: `navtile navtile--${s.id}`, href: s.tabs.length > 1 ? `#/section/${s.id}` : `#/${s.tabs[0][0]}`, 'data-field': `hub.${s.id}` }, [
      el('span', { class: 'navtile__name', text: s.name }),
      el('span', { class: 'navtile__purpose', text: s.purpose }),
      el('span', { class: 'navtile__meta', text: sectionNote(s.id, ws) }),
    ]))),
    el('div', { class: 'two' }, [nextTaskCard(ws), card('Drop a thought', [thoughtCapture('hub'),
      el('p', { class: 'small muted', text: 'No form, no decision. Weigh it up later in Planning → Thoughts.' })])]),
  ]);
}

/** A section's own page: a big block for each of its parts. */
export function sectionPage(id) {
  const s = SECTIONS.find((x) => x.id === id);
  if (!s) return hub();
  const ws = currentWs();
  const live = (t) => ws.records[t].filter((r) => !r.archived);
  const PURPOSE = {
    thoughts: ['Seconds each, no limit.', `${live('thoughts').filter((t) => !t.decision).length} not looked at yet`],
    ideas: ['About an hour each: is there something behind it?', plural(live('ideas').length, 'idea')],
    projects: ['Days each: stages, a forecast, a folder that fills up.', plural(live('projects').length, 'project')],
    plan: ['Story and timeline, script, shots and sound, platforms.', `${live('content').filter((c) => ['Concept', 'Planning', 'Scripting', ''].includes(c.status || '')).length} being planned`],
    production: ['Capture each file into its folder, work the steps, mark it ready.', `${live('content').reduce((n, c) => n + captureProgress(c.captures).needed, 0)} captures still needed`],
    releases: ['A rhythm per platform; ready videos fill the open slots.', backlogHealth(ws, today()).map((h) => `${h.platform.name}: ${h.ready} ready`).join(' · ') || 'No rhythm set yet'],
    performance: ['What happened after publishing, and what you learned.', plural(live('feedback').length, 'feedback record')],
    library: ['Every video, whatever its status.', plural(live('content').length, 'video')],
    assets: ['Sources and files, entered once, linked anywhere.', `${plural(live('references').length, 'reference')} · ${plural(live('assets').length, 'asset')}`],
    templates: ['Workflows, story structures and the stage process.', plural(ws.workflows.length + ws.stories.length, 'template')],
    platforms: ['Formats, sizes, no-go zones and release days.', plural(ws.platforms.length, 'platform')],
  };
  return el('div', { class: 'stack' }, [
    el('p', { class: 'muted', text: s.purpose }),
    el('div', { class: 'navtiles' }, s.tabs.map(([to, label]) => el('a', { class: 'navtile', href: `#/${to}`, 'data-field': `section.${to}` }, [
      el('span', { class: 'navtile__name', text: label }),
      el('span', { class: 'navtile__purpose', text: PURPOSE[to]?.[0] || '' }),
      el('span', { class: 'navtile__meta', text: PURPOSE[to]?.[1] || '' }),
    ]))),
  ]);
}
