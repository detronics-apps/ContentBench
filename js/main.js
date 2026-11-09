// Chrome, routing and the sidebar. Routes live in the URL hash, so the browser's own
// back button walks back through records and every page has a link of its own.

import { el, toast, download } from './ui/dom.js';
import { captureFocus, restoreFocus, renderNotices } from './ui/patterns.js';
import { store, ws as currentWs, onChange, saveUi, commitApp, commitWs, refresh } from './ui/store.js';
import { rollForward } from './releases.js';
import * as M from './model.js';
import { EXPLAIN, ONBOARDING } from './guide.js';
import { LEGAL, CHANGES } from './legal.js';
import { contentPackage, assistantBrief, productBrief, slug } from './exporter.js';
import { EXTRA_TYPES } from './extras.js';
import { extrasModule } from './ui/extras-view.js';
import { zip } from './zip.js';
import { outputLabel } from './content.js';
import * as R from './ui/records.js';
import { contentEditor, outputEditor } from './ui/content-view.js';
import { templatesModule, templateEditor, platformsModule, platformEditor, settingsModule, guideModule, processEditor } from './ui/config-view.js';
import * as Pl from './ui/planning.js';
import { sync, onSync, restoreFolder, reconnectFolder, useFolderCopy, useBrowserCopy, connectFolder } from './ui/folder.js';
import { infoDialog, button, copyText } from './ui/forms.js';

export const APP_VERSION = '0.11.3';

const LEVEL_TEXT = {
  simple: 'Simple - the essentials of each record. Nothing hidden is cleared.',
  advanced: 'Advanced - categories, audiences, research fields and the full template editors.',
  expert: 'Expert - everything, including AI fields, record ids and step dependencies.',
};

const THEMES = ['system', 'light', 'dark'];
const THEME_ICON = { system: '◐', light: '☀', dark: '☾' };

const dom = {};

function parseRoute() {
  const [mod = 'home', a = '', b = ''] = location.hash.replace(/^#\/?/, '').split('/');
  return { mod: mod || 'home', a, b };
}

function page(route) {
  const { mod, a, b } = route;
  switch (mod) {
    case 'home': return Pl.hub();
    case 'section': return Pl.sectionPage(a);
    case 'dashboard': return R.dashboard();
    case 'thoughts': return a ? Pl.thoughtDetail(a) : Pl.thoughtsModule();
    case 'ideas': return a ? Pl.ideaDetail(a) : R.recordList('ideas', { title: 'Ideas', newFields: { title: 'New idea' },
      intro: 'About an hour each: is there something behind it? Develop a thought into one, or start one directly. An idea can become a project, a video, or be parked.' });
    case 'projects': return a ? Pl.projectDetail(a) : Pl.projectsModule();
    case 'plan': case 'create': case 'production': return R.videos();
    case 'extras': return extrasModule();
    case 'releases': case 'planner': return R.releases();
    case 'library': return R.library();
    case 'content': return contentEditor(a, b);
    case 'outputs': return outputEditor(a);
    case 'platforms': return a ? platformEditor(a) : platformsModule();
    case 'performance': return R.performance();
    case 'templates': return a === 'process' ? processEditor() : a ? templateEditor(a, b) : templatesModule();
    case 'settings': return settingsModule();
    case 'assets': return a ? R.recordDetail('assets', a) : R.assetsModule();
    case 'guide': return guideModule(openOnboarding);
    case 'references': case 'tasks': case 'feedback': case 'publications': return R.recordDetail(mod, a);
    default: return Pl.hub();
  }
}

/* ----------------------------------------------------------------- header */

const coffeeIcon = () => {
  const svg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<path d="M6.5 8 H15.5 V13 A4.5 4.5 0 0 1 6.5 13 Z"/><path d="M15.5 9.5 h1.8 a2.6 2.6 0 0 1 0 5.2 h-1.8"/><path d="M4 19.5 Q 11 21.8 18 19.5"/>
<path d="M9.3 5.2 q -1.4 -1.1 0 -2.2 q 1.4 -1.1 0 -2.2"/><path d="M12.7 5.2 q 1.4 -1.1 0 -2.2 q -1.4 -1.1 0 -2.2"/></svg>`, 'image/svg+xml').documentElement;
  return document.importNode(svg, true);
};

function applyTheme() {
  if (store.ui.theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', store.ui.theme);
}

function buildHeader() {
  dom.wsName = el('a', { class: 'ws-chip', href: '#/settings', title: 'Current workspace - open its settings' });
  dom.saved = el('span', { class: 'saved small muted', role: 'status' });
  dom.theme = el('button', { class: 'btn btn-icon', type: 'button', on: { click: () => {
    store.ui.theme = THEMES[(THEMES.indexOf(store.ui.theme) + 1) % THEMES.length];
    saveUi(); applyTheme(); paintChrome();
  } } });
  return el('header', { class: 'app-header' }, [
    el('div', { class: 'brand' }, [
      el('a', { class: 'brand__home', href: 'https://www.detronics.co.za/', target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Detronics website (opens in a new tab)' },
        [el('img', { class: 'brand__logo', src: 'assets/logo.png', alt: 'Detronics' })]),
      el('span', { class: 'brand__sep', 'aria-hidden': 'true' }),
      el('a', { class: 'brand__tool', href: '#/home', text: 'ContentBench', title: 'Home', 'aria-label': 'ContentBench - home' }),
    ]),
    dom.wsName,
    el('div', { class: 'header-actions' }, [dom.saved,
      el('a', { class: 'btn btn-icon', href: 'https://buymeacoffee.com/detronics', target: '_blank', rel: 'noopener noreferrer',
        'aria-label': 'Buy me a coffee (opens in a new tab)', title: 'Buy me a coffee' }, [coffeeIcon()]),
      dom.theme]),
  ]);
}

function buildModebar() {
  dom.modebar = el('div', { class: 'modebar' });
  return dom.modebar;
}

function paintChrome() {
  const ws = currentWs();
  dom.wsName.textContent = ws.name;
  const at = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  dom.saved.textContent = store.saveError ? 'Not saved' : sync.status === 'connected' && sync.savedAt ? `Saved to ${sync.name || 'your folder'} ${at(sync.savedAt)}`
    : store.savedAt ? `Saved in this browser ${at(store.savedAt)}` : '';
  dom.theme.textContent = THEME_ICON[store.ui.theme];
  dom.theme.setAttribute('aria-label', `Theme: ${store.ui.theme} - click to change`);
  dom.theme.title = dom.theme.getAttribute('aria-label');
  dom.modebar.replaceChildren(
    el('div', { class: 'chipset', role: 'group', 'aria-label': 'Detail level' }, ['simple', 'advanced', 'expert'].map((l) => el('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(store.ui.level === l), text: l[0].toUpperCase() + l.slice(1), 'data-field': `level.${l}`,
      on: { click: () => { store.ui.level = l; saveUi(); refresh(); } } }))),
    el('span', { class: 'modebar__text small muted', text: LEVEL_TEXT[store.ui.level] }),
  );
}

/* ---------------------------------------------------------------- sidebar */

/** An accordion section with a padlock: a locked section stays open when a sibling opens. */
function sideSection(id, title, kids) {
  const remembered = store.ui.sections[id];
  const open = remembered === undefined ? id === 'capture' || id === 'explain' : remembered;
  const locked = !!store.ui.locks[id];
  const lock = el('button', { class: `lock ${locked ? 'lock--on' : ''}`, type: 'button', 'aria-pressed': String(locked),
    'aria-label': locked ? `Unlock ${title}` : `Keep ${title} open`, title: locked ? 'Locked open' : 'Lock open',
    on: { click: (e) => { e.preventDefault(); e.stopPropagation(); store.ui.locks[id] = !locked; saveUi(); refresh(); } } });
  lock.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="'
    + (locked ? 'M8 11V8a4 4 0 0 1 8 0v3' : 'M8 11V8a4 4 0 0 1 7.5-1.9') + '"/></svg>';
  const node = el('details', { class: 'side', open, dataset: { section: id } }, [el('summary', { class: 'side__head' }, [el('span', { text: title }), lock]), el('div', { class: 'side__body' }, kids)]);
  node.addEventListener('toggle', () => {
    store.ui.sections[id] = node.open;
    if (node.open) {
      for (const other of dom.sidebar.querySelectorAll('details.side[open]')) {
        if (other !== node && !store.ui.locks[other.dataset.section]) { other.open = false; store.ui.sections[other.dataset.section] = false; }
      }
    }
    saveUi();
  });
  return node;
}

function currentRecord(route) {
  const ws = currentWs();
  const type = { thoughts: 'thoughts', ideas: 'ideas', projects: 'projects', content: 'content', outputs: 'outputs', assets: 'assets', references: 'references',
    tasks: 'tasks', feedback: 'feedback', publications: 'publications' }[route.mod];
  const record = type && route.a ? M.getRecord(ws, type, route.a) : null;
  return record ? { type, record } : null;
}

function explainPanel(route, cur) {
  const ws = currentWs();
  const key = EXPLAIN[route.mod] ? route.mod : 'dashboard';
  const [title, plain] = EXPLAIN[key];
  let worked = '';
  const n = (t) => ws.records[t].filter((r) => !r.archived).length;
  if (cur?.type === 'content') {
    const outs = ws.records.outputs.filter((o) => o.contentId === cur.record.id);
    worked = `This item came from ${cur.record.ideaIds.length} idea(s), belongs to ${cur.record.projectIds.length || 'no'} project(s), and has ${outs.length} output(s)${outs.length ? `: ${outs.map((o) => outputLabel(ws, o)).join(', ')}` : ''}.`;
  } else if (cur?.type === 'outputs') {
    const c = M.getRecord(ws, 'content', cur.record.contentId);
    worked = c ? `Copied from "${c.workingTitle}" on ${cur.record.created.slice(0, 10)}.` : '';
  } else if (cur?.type === 'ideas') {
    const made = M.related(ws, 'ideas', cur.record.id).incoming.filter((x) => x.type === 'content').length;
    worked = `This idea has fed ${made} content item(s).`;
  } else {
    worked = `This workspace holds ${n('ideas')} ideas, ${n('projects')} projects, ${n('content')} content items and ${n('outputs')} platform outputs.`;
  }
  return sideSection('explain', 'How this works', [el('strong', { text: title }), el('p', { class: 'small', text: plain }), el('p', { class: 'small muted', text: worked })]);
}

function relatedPanel(cur) {
  if (!cur) return null;
  const ws = currentWs();
  const { outgoing, incoming } = M.related(ws, cur.type, cur.record.id);
  const all = [...outgoing, ...incoming];
  const item = (x) => el('li', {}, [el('span', { class: 'small muted', text: `${M.TYPE_LABEL[x.type][0]}: ` }),
    el('a', { href: x.type === 'content' ? `#/content/${x.record.id}/overview` : `#/${x.type}/${x.record.id}`, text: M.titleOf(x.record) })]);
  return sideSection('related', `Related (${all.length})`, [all.length ? el('ul', { class: 'plain small' }, all.map(item))
    : el('p', { class: 'small muted', text: 'Not linked to anything - standalone is fine.' })]);
}

function exportPanel(cur) {
  const ws = currentWs();
  const contentId = cur?.type === 'content' ? cur.record.id : cur?.type === 'outputs' ? cur.record.contentId : '';
  const c = contentId && M.getRecord(ws, 'content', contentId);
  return sideSection('export', 'Export', [
    c ? el('p', { class: 'small', text: `Content package for "${c.workingTitle}": brief, concept, story, script, references, visuals, production notes, AI instructions, asset manifest, and a folder per platform output.` }) : el('p', { class: 'small muted', text: 'Open a content item to export its package.' }),
    c ? el('div', { class: 'row' }, [
      button('Download package (.zip)', () => {
        const pkg = contentPackage(ws, c.id);
        download(new Blob([zip(pkg.files)], { type: 'application/zip' }), `${pkg.root}.zip`);
      }, 'primary', { 'data-field': 'export.zip' }),
      button('Copy assistant brief', () => copyText(assistantBrief(ws, c.id), 'Brief copied'), '', { 'data-field': 'export.brief' }),
      EXTRA_TYPES.includes(c.contentType) ? button('Brief for Claude to make it (.md)', () => download(new Blob([productBrief(ws, c.id)], { type: 'text/markdown' }), `${slug(c.workingTitle)}_make-it.md`), 'primary', { 'data-field': 'export.product', title: 'Upload to Claude: the job, the rules, the structure, your content and sources, the design and the graphics - it makes the product' }) : null,
      button('Download brief (.md)', () => download(new Blob([assistantBrief(ws, c.id)], { type: 'text/markdown' }), `${slug(c.workingTitle)}_brief.md`), '', { 'data-field': 'export.md', title: 'Everything about this video in one Markdown file - to paste into another chat or AI' }),
    ]) : null,
    el('div', { class: 'row' }, [button('Export workspace (.json)', () => download(new Blob([M.exportWorkspace(ws)], { type: 'application/json' }),
      `ContentBench_${slug(ws.name)}_${M.todayIso()}.json`), '', { 'data-field': 'export.ws' })]),
    el('p', { class: 'small muted', text: 'Files download to this device. Nothing is uploaded.' }),
  ]);
}

function workspacePanel() {
  const sel = el('select', { class: 'input', 'data-field': 'side.ws', 'aria-label': 'Switch workspace',
    on: { change: (e) => { commitApp((app) => ({ ...app, currentId: e.target.value })); location.hash = '#/home'; } } },
  store.app.workspaces.map((w) => el('option', { value: w.id, text: w.name, selected: w.id === store.app.currentId })));
  return sideSection('workspace', 'Workspace', [sel, el('p', { class: 'small muted', text: currentWs().description || '' }), el('a', { href: '#/settings', class: 'small', text: 'Workspace settings' })]);
}

function buildSidebar(route) {
  const cur = currentRecord(route);
  dom.sidebar.replaceChildren(...[
    sideSection('capture', 'Drop a thought', [R.quickCapture('side')]),
    relatedPanel(cur),
    explainPanel(route, cur),
    workspacePanel(),
    exportPanel(cur),
  ].filter(Boolean));
}

/* ----------------------------------------------------------------- render */

/** The folder states that must be settled from anywhere in the app, not just Settings. */
function paintSync() {
  const s = sync.status;
  const bar = (text, kids, level = 'warn') => el('div', { class: `banner banner--${level} syncbar`, role: 'status' }, [el('span', { class: 'banner__text', text }), ...kids]);
  const btn = (t, fn, kind = '') => button(t, fn, `small ${kind}`);
  dom.syncbar.replaceChildren(...[
    s === 'reconnect' ? bar(`Your folder "${sync.name}" needs one click to reconnect.`, [btn('Reconnect', reconnectFolder, 'primary')], 'info') : null,
    s === 'choose' ? bar(`"${sync.name}" already holds ContentBench data. Which copy should be used?`, [
      btn('Use the folder\'s data', useFolderCopy, 'primary'), btn('Replace it with this browser\'s data', useBrowserCopy)]) : null,
    s === 'conflict' ? bar('The data file changed somewhere else while you were also editing here.', [
      btn('Load the file\'s version', useFolderCopy, 'primary'), btn('Keep mine (overwrite the file)', useBrowserCopy)]) : null,
    s === 'error' ? bar(`Folder problem: ${sync.error}`, [btn('Choose folder again', connectFolder)]) : null,
  ].filter(Boolean));
  dom.syncbar.hidden = !dom.syncbar.childElementCount;
}

function notices() {
  const ws = currentWs();
  const items = [];
  if (store.saveError) items.push({ id: 'save', level: 'danger', text: store.saveError });
  const samples = M.RECORD_TYPES.some((t) => ws.records[t].some((r) => r.sample));
  if (samples) items.push({ id: `samples:${ws.id}`, level: 'info', text: 'This workspace holds example records, marked "Example". Remove them in Settings, or create a blank workspace, whenever you are ready.' });
  return items;
}

let lastPath = '';
export function render() {
  // plans move on: a release day that passed moves its platform's whole line on (releases.js rollForward)
  if (rollForward(currentWs()) !== currentWs()) { commitWs((w) => rollForward(w), { render: false }); }
  const route = parseRoute();
  const path = `${route.mod}/${route.a}/${route.b}`;
  const moved = path !== lastPath;
  lastPath = path;
  const snap = captureFocus({ viewport: dom.viewport, sidebar: dom.sidebar });
  const winY = window.scrollY;

  // Home is the grid of sections; inside one, a breadcrumb home and only that section's tabs.
  const sec = route.mod === 'section' ? Pl.SECTIONS.find((x) => x.id === route.a) : Pl.sectionOf(route.mod);
  const current = sec?.tabs.find(([id]) => id === route.mod)?.[0] || (sec && route.mod !== 'section' ? Pl.tabFor(route.mod) : null);
  dom.tabs.hidden = route.mod === 'home';
  dom.tabs.replaceChildren(...(route.mod === 'home' ? [] : [
    el('nav', { class: 'crumbs crumbs--top', 'aria-label': 'You are here' }, [
      el('a', { href: '#/home', text: 'Home', 'data-field': 'nav.home' }),
      sec ? ' › ' : null,
      sec ? (sec.tabs.length > 1 ? el('a', { href: `#/section/${sec.id}`, text: sec.name }) : el('span', { text: sec.name })) : null,
    ]),
    sec && sec.tabs.length > 1 ? el('div', { class: 'segmented', role: 'navigation', 'aria-label': sec.name }, sec.tabs.map(([id, label]) =>
      el('a', { class: 'segmented__btn', href: `#/${id}`, text: label, 'aria-current': id === current ? 'page' : null }))) : null,
  ]));
  paintSync();
  renderNotices(dom.notices, notices(), render);
  dom.page.replaceChildren(page(route));
  // Big buttons at the bottom: one step back, and home. The breadcrumb up top only shows where you are.
  const back = Pl.backFor(route);
  dom.pagenav.hidden = route.mod === 'home';
  dom.pagenav.replaceChildren(...(route.mod === 'home' ? [] : [
    back ? el('a', { class: 'btn pagenav__btn pagenav__back', href: back.href, 'data-field': 'nav.back', 'aria-label': `Back to ${back.label}` }, [el('span', { 'aria-hidden': 'true', text: '← ' }), back.label]) : null,
    el('a', { class: 'btn pagenav__btn', href: '#/home', 'data-field': 'nav.homeBottom' }, [el('span', { 'aria-hidden': 'true', text: '⌂ ' }), 'Home']),
  ]));
  dom.tagList.replaceChildren(...currentWs().config.tags.map((t) => el('option', { value: t })));
  buildSidebar(route);
  paintChrome();

  if (moved) {
    dom.viewport.scrollTop = 0;
    window.scrollTo(0, 0);
    if (snap.key?.startsWith('capture') || snap.key?.startsWith('side')) restoreFocus({ ...snap, scroll: {} }, {});
  } else {
    restoreFocus(snap, { viewport: dom.viewport, sidebar: dom.sidebar });
    window.scrollTo(0, winY);
  }
}

/* ------------------------------------------------------- footer & welcome */

function openOnboarding() {
  const close = () => { store.ui.onboardedAt = M.nowIso(); saveUi(); overlay.remove(); };
  const overlay = el('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'welcome-title' }, [
    el('div', { class: 'welcome' }, [
      el('h2', { id: 'welcome-title', text: 'Welcome to ContentBench' }),
      el('p', { text: 'From a passing thought to an idea, a project, and the videos it becomes - planned, captured, released. Your process, as help, never as rules. Your data stays on your own computer.' }),
      el('ol', { class: 'welcome__steps' }, ONBOARDING.map((s) => el('li', {}, [
        el('a', { href: s.href, on: { click: close } }, [el('strong', { text: s.title })]),
        el('p', { class: 'small muted', text: s.text })]))),
      el('div', { class: 'row row--end' }, [
        button('Open the guide', () => { close(); location.hash = '#/guide'; }),
        button('Start', () => close(), 'primary', { 'data-field': 'welcome.start' })]),
    ]),
  ]);
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.body.appendChild(overlay);
  overlay.querySelector('[data-field="welcome.start"]').focus();
}

function buildFooter() {
  const link = (text, fn) => el('button', { class: 'linkish', type: 'button', text, on: { click: fn } });
  return el('footer', { class: 'app-footer' }, [
    el('span', { text: 'Runs entirely in your browser - nothing is uploaded.' }),
    el('nav', {}, [
      link("What's new", () => infoDialog("What's new", CHANGES.map(([v, t]) => `${v} - ${t}`))),
      link(LEGAL.licence.title, () => infoDialog(LEGAL.licence.title, LEGAL.licence.paras)),
      link(LEGAL.imprint.title, () => infoDialog(LEGAL.imprint.title, LEGAL.imprint.paras)),
      el('button', { class: 'btn btn--small', type: 'button', text: 'I am new here', on: { click: openOnboarding } }),
      el('a', { class: 'linkish', href: 'https://buymeacoffee.com/detronics', target: '_blank', rel: 'noopener noreferrer', text: 'Buy me a coffee' }),
      el('span', { class: 'muted', text: `v${APP_VERSION}` }),
    ]),
  ]);
}

function init() {
  applyTheme();
  dom.tabs = el('div', { class: 'sectionbar' });
  dom.notices = el('div', { class: 'notices-host' });
  dom.syncbar = el('div', { class: 'syncbar-host', hidden: true });
  dom.page = el('div', { class: 'page' });
  dom.pagenav = el('nav', { class: 'pagenav', 'aria-label': 'Back and home' });
  dom.viewport = el('section', { class: 'viewport' }, [dom.tabs, dom.syncbar, dom.notices, dom.page, dom.pagenav]);
  dom.sidebar = el('aside', { class: 'sidebar', 'aria-label': 'Tools' });
  dom.tagList = el('datalist', { id: 'dl-tags' });
  document.body.append(buildHeader(), buildModebar(), el('main', { class: 'app-main' }, [dom.viewport, dom.sidebar]), buildFooter(), dom.tagList);
  onChange(({ render: full }) => (full ? render() : paintChrome()));
  window.addEventListener('hashchange', render);
  onSync(() => { paintSync(); paintChrome(); });
  render();
  restoreFolder();
  if (!store.ui.onboardedAt) openOnboarding();
  if (store.saveError) toast(store.saveError);
}

init();
