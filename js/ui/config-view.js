// Configuration screens: templates, platforms, workspace settings, and the guide.

import { el, download } from './dom.js';
import * as M from '../model.js';
import * as W from '../workflow.js';
import { makePlatform, makeFormat, verificationAge, outputLabel } from '../content.js';
import { exampleWorkspace, exampleWorkflows, exampleStories, examplePlatforms } from '../seed.js';
import { HOWTOS, FAQS, MENTAL_MODEL, FEATURES, guideMatches } from '../guide.js';
import { store, ws as currentWs, commitWs, commitApp } from './store.js';
import { button, card, emptyState, confirmDialog, textField, linesField, checkbox, badge, recordLink, infoDialog, timelineBar } from './forms.js';
import { go } from './records.js';

const adv = () => store.ui.level !== 'simple';
const expert = () => store.ui.level === 'expert';

/* -------------------------------------------------------------- templates */

const tplList = (kind) => (kind === 'wf' ? 'workflows' : 'stories');
const isDefault = (ws, kind, id) => ws.config.preferences[kind === 'wf' ? 'defaultWorkflowId' : 'defaultStoryId'] === id;

function setTpl(kind, id, fn, render = true) {
  commitWs((w) => ({ ...w, modified: M.nowIso(), [tplList(kind)]: w[tplList(kind)].map((t) => (t.id === id ? fn(t) : t)) }), { render });
}

export function templatesModule() {
  const ws = currentWs();
  const list = (kind, items, make, examples) => card(kind === 'wf' ? 'Workflow templates' : 'Storytelling templates', [
    el('p', { class: 'muted small', text: kind === 'wf'
      ? 'Reusable processes. A content item copies one when it starts, so editing here is always safe.'
      : 'Reusable narrative structures. Blocks can be added, removed, reordered and repeated.' }),
    items.length ? el('div', { class: 'rows' }, items.map((t) => el('a', { class: 'rowcard', href: `#/templates/${kind}/${t.id}` }, [
      el('span', { class: 'rowcard__title', text: t.name }),
      el('span', { class: 'rowcard__meta small muted' }, [`v${t.version} · ${(t.steps || t.blocks).length} ${kind === 'wf' ? 'steps' : 'blocks'}`,
        kind === 'story' && W.timeline(t.blocks).total ? ` · ${W.formatSeconds(W.timeline(t.blocks).total)}` : '',
        isDefault(ws, kind, t.id) ? ' ' : null, isDefault(ws, kind, t.id) ? badge('default', 'ok') : null])])))
      : el('p', { class: 'muted', text: 'None yet.' }),
    el('div', { class: 'row' }, [
      button('New', () => { const t = make(); commitWs((w) => ({ ...w, [tplList(kind)]: [...w[tplList(kind)], t] }), { render: false }); go(`#/templates/${kind}/${t.id}`); }, 'primary'),
      button('Add the examples', () => commitWs((w) => ({ ...w, [tplList(kind)]: [...w[tplList(kind)], ...examples()] }))),
    ]),
  ]);
  return el('div', { class: 'stack' }, [
    list('wf', ws.workflows, () => W.makeWorkflowTemplate({ name: 'New workflow', steps: ['First step'] }), exampleWorkflows),
    list('story', ws.stories, () => W.makeStoryTemplate({ name: 'New structure', blocks: ['Opening'] }), exampleStories),
    card('Also planned', [el('p', { class: 'muted small', text: 'Content templates (pre-filled briefs per content type) and stand-alone publishing templates are planned for a later phase. Today, production checklists live on workflow steps and publishing checklists on platforms and formats.' })]),
  ]);
}

function itemRow(kind, tpl, item, i, len) {
  const isWf = kind === 'wf';
  const ops = isWf
    ? { update: W.updateStep, move: W.moveStep, dup: W.duplicateStep, remove: W.removeStep }
    : { update: W.updateBlock, move: W.moveBlock, dup: W.repeatBlock, remove: W.removeBlock };
  const set = (patch, render = false) => setTpl(kind, tpl.id, (t) => ops.update(t, item.id, patch), render);
  const ta = (k, label) => textField(label, item[k], (v) => set({ [k]: v }), { key: `tpl.${item.id}.${k}`, multiline: true, rows: 2 });
  return el('div', { class: 'block' }, [
    el('div', { class: 'row' }, [
      el('span', { class: 'block__n', text: String(i + 1) }),
      el('input', { class: 'input block__name', value: item.name, 'aria-label': 'Name', 'data-field': `tpl.${item.id}.name`, on: { change: (e) => set({ name: e.target.value }) } }),
      isWf ? el('label', { class: 'small muted' }, ['days ', el('input', { class: 'input input--inline input--dur', type: 'number', min: 0, value: W.stepDays(item), 'data-field': `tpl.${item.id}.days`,
        title: 'How many days this step takes. Used to date steps backwards from a due date.', on: { change: (e) => set({ days: e.target.value === '' ? '' : Number(e.target.value) }, true) } })])
        : el('input', { class: 'input input--inline input--dur', value: item.duration || '', placeholder: '0:15', 'aria-label': 'Duration (m:ss)', 'data-field': `tpl.${item.id}.duration`,
          on: { change: (e) => set({ duration: e.target.value }, true) } }),
      button('↑', () => setTpl(kind, tpl.id, (t) => ops.move(t, item.id, -1)), 'ghost', { 'aria-label': 'Move up', disabled: i === 0 }),
      button('↓', () => setTpl(kind, tpl.id, (t) => ops.move(t, item.id, 1)), 'ghost', { 'aria-label': 'Move down', disabled: i === len - 1 }),
      button(isWf ? 'Duplicate' : 'Repeat', () => setTpl(kind, tpl.id, (t) => ops.dup(t, item.id)), 'ghost'),
      button('×', () => setTpl(kind, tpl.id, (t) => ops.remove(t, item.id)), 'ghost', { 'aria-label': `Remove ${item.name}` }),
    ]),
    isWf ? el('div', { class: 'row' }, [
      checkbox('Optional', item.optional, (v) => set({ optional: v }, true), `tpl.${item.id}.optional`),
      checkbox('Can be skipped', item.skippable, (v) => set({ skippable: v }, true), `tpl.${item.id}.skippable`),
    ]) : null,
    isWf ? ta('instructions', 'Purpose / instructions') : ta('purpose', 'Purpose'),
    isWf && adv() ? linesField('Checklist', item.checklist, (v) => set({ checklist: v }), { key: `tpl.${item.id}.checklist`, rows: 2 }) : null,
    isWf && adv() ? el('div', { class: 'two' }, [ta('inputs', 'Input fields'), ta('expectedOutput', 'Expected output')]) : null,
    !isWf && adv() ? ta('prompt', 'Prompt / instruction') : null,
    isWf && expert() ? el('div', { class: 'two' }, [textField('Estimated effort', item.effort, (v) => set({ effort: v }), { key: `tpl.${item.id}.effort` }), ta('aiPrompt', 'AI prompt for this step')]) : null,
    isWf && expert() && i > 0 ? el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Depends on' }),
      el('select', { class: 'input', multiple: true, size: Math.min(4, i), 'data-field': `tpl.${item.id}.deps`,
        on: { change: (e) => set({ dependsOn: [...e.target.selectedOptions].map((o) => o.value) }, true) } },
      tpl.steps.slice(0, i).map((s) => el('option', { value: s.id, text: s.name, selected: item.dependsOn.includes(s.id) })))]) : null,
  ]);
}

export function templateEditor(kind, id) {
  const ws = currentWs();
  const tpl = ws[tplList(kind)].find((t) => t.id === id);
  if (!tpl) return emptyState('Not found', 'This template no longer exists.', [button('Templates', () => go('#/templates'))]);
  const items = tpl.steps || tpl.blocks;
  const inUse = M.RECORD_TYPES.flatMap((t) => ws.records[t]).filter((r) => (kind === 'wf' ? r.workflow : r.story)?.templateId === id).length;
  return el('div', { class: 'detail' }, [
    el('nav', { class: 'crumbs' }, [el('a', { href: '#/templates', text: 'Templates' })]),
    el('h1', { class: 'detail__title', text: tpl.name }),
    el('p', { class: 'muted small', text: `Version ${tpl.version} · used by ${inUse} item${inUse === 1 ? '' : 's'} - they keep the version they started with.` }),
    card('', [
      textField('Name', tpl.name, (v) => setTpl(kind, id, (t) => W.editTemplate(t, { name: v }), false), { key: 'tpl.name' }),
      textField('Description', tpl.description, (v) => setTpl(kind, id, (t) => W.editTemplate(t, { description: v }), false), { key: 'tpl.desc', multiline: true }),
    ]),
    kind === 'story' ? card('Timeline', [timelineBar(tpl.blocks, { label: tpl.name }),
      el('p', { class: 'small muted', text: 'Widths are each block\'s share of the running time. To test a change (an extra re-hook, a shorter middle), duplicate this template and edit the copy - then compare them on a video\'s Story section.' })]) : null,
    kind === 'wf' ? card('', [el('p', { class: 'small muted', text: `Total ${tpl.steps.reduce((n, s) => n + W.stepDays(s), 0)} days. When a video is put on the Planner calendar, its steps are dated backwards from the due date using these days.` })]) : null,
    card(kind === 'wf' ? 'Steps' : 'Blocks', [
      ...items.map((it, i) => itemRow(kind, tpl, it, i, items.length)),
      button(kind === 'wf' ? 'Add step' : 'Add block', () => setTpl(kind, id, (t) => (kind === 'wf' ? W.addStep(t, {}) : W.addBlock(t, {}))), 'primary'),
    ]),
    card('', [el('div', { class: 'row' }, [
      isDefault(ws, kind, id) ? badge('Default for new content', 'ok')
        : button('Make this the default', () => commitWs((w) => ({ ...w, config: { ...w.config, preferences: { ...w.config.preferences, [kind === 'wf' ? 'defaultWorkflowId' : 'defaultStoryId']: id } } })),
          '', { title: 'New content items start with a copy of this.' }),
      button('Duplicate template', () => { const d = W.duplicateTemplate(tpl); commitWs((w) => ({ ...w, [tplList(kind)]: [...w[tplList(kind)], d] }), { render: false }); go(`#/templates/${kind}/${d.id}`); }),
      button('Delete…', async () => {
        const ok = await confirmDialog({ title: `Delete "${tpl.name}"?`, removes: 'this template', keeps: `the ${inUse} item(s) already using it - each has its own copy` });
        if (!ok) return;
        commitWs((w) => ({ ...w, [tplList(kind)]: w[tplList(kind)].filter((t) => t.id !== id) }), { render: false });
        go('#/templates');
      }, 'danger'),
    ])]),
  ]);
}

/* -------------------------------------------------------------- platforms */

const setPlatform = (id, patch, render = false) =>
  commitWs((w) => ({ ...w, modified: M.nowIso(), platforms: w.platforms.map((p) => (p.id === id ? { ...p, ...patch } : p)) }), { render });

export function platformsModule() {
  const ws = currentWs();
  const outs = ws.records.outputs.filter((o) => !o.archived);
  return el('div', { class: 'stack' }, [
    card('Platform profiles', [
      el('p', { class: 'muted small', text: 'A platform and its formats are separate: YouTube can hold long-form and Shorts, each with its own requirements. Every value is editable - specs change, so record when you last checked.' }),
      ws.platforms.length ? el('div', { class: 'rows' }, ws.platforms.map((p) => {
        const age = verificationAge(p);
        return el('a', { class: 'rowcard', href: `#/platforms/${p.id}` }, [el('span', { class: 'rowcard__title', text: p.name }),
          el('span', { class: 'rowcard__meta' }, [el('span', { class: 'small muted', text: `${p.formats.length} format${p.formats.length === 1 ? '' : 's'}` }),
            age === null ? badge('never verified', 'warn') : badge(`verified ${age} day${age === 1 ? '' : 's'} ago`, age > 180 ? 'warn' : 'ok')])]);
      })) : emptyState('No platforms yet', 'Add the ones you publish to.'),
      el('div', { class: 'row' }, [
        button('New platform', () => { const p = makePlatform({ formats: [{ name: 'Default' }] }); commitWs((w) => ({ ...w, platforms: [...w.platforms, p] }), { render: false }); go(`#/platforms/${p.id}`); }, 'primary'),
        button('Add example platforms', () => commitWs((w) => ({ ...w, platforms: [...w.platforms, ...examplePlatforms()] }))),
      ]),
    ]),
    card('Platform outputs and publishing packages', [outs.length ? el('div', { class: 'rows' }, outs.map((o) => el('a', { class: 'rowcard', href: `#/outputs/${o.id}` }, [
      el('span', { class: 'rowcard__title', text: o.title || '(untitled)' }),
      el('span', { class: 'rowcard__meta' }, [el('span', { class: 'small muted', text: outputLabel(ws, o) }), badge(o.status || '', 'status'),
        o.scheduledDate ? el('span', { class: 'small muted', text: `scheduled ${o.scheduledDate}` }) : null,
        o.publishedUrl ? el('span', { class: 'small muted', text: 'published' }) : null])]))) : el('p', { class: 'muted', text: 'No outputs yet. Create them from a content item\'s Outputs section.' })]),
    card('Planned', [el('p', { class: 'muted small', text: 'Automatic publishing to platforms is not part of this phase. Publishing is recorded by hand: the date, URL and notes per output.' })]),
  ]);
}

export function platformEditor(id) {
  const ws = currentWs();
  const p = ws.platforms.find((x) => x.id === id);
  if (!p) return emptyState('Not found', 'This platform no longer exists.', [button('Platforms', () => go('#/platforms'))]);
  const used = ws.records.outputs.filter((o) => o.platformId === id);
  const setFormats = (formats, render = true) => setPlatform(id, { formats }, render);
  const fmtField = (f, k, label) => textField(label, f[k], (v) => setFormats(M.patchItem(p.formats, f.id, { [k]: v }), false), { key: `fmt.${f.id}.${k}` });
  return el('div', { class: 'detail' }, [
    el('nav', { class: 'crumbs' }, [el('a', { href: '#/platforms', text: 'Platforms & Publishing' })]),
    el('h1', { class: 'detail__title', text: p.name }),
    card('', [
      textField('Platform name', p.name, (v) => setPlatform(id, { name: v }), { key: 'plat.name' }),
      el('div', { class: 'row' }, [
        textField('Specs last verified', p.verifiedOn, (v) => setPlatform(id, { verifiedOn: v }, true), { key: 'plat.verified', type: 'date' }),
        button('Verified today', () => setPlatform(id, { verifiedOn: M.nowIso().slice(0, 10) }, true)),
      ]),
      textField('Notes', p.notes, (v) => setPlatform(id, { notes: v }), { key: 'plat.notes', multiline: true }),
      linesField('Metadata fields', p.metadataFields, (v) => setPlatform(id, { metadataFields: v }), { key: 'plat.meta', hint: 'Title, caption, description, tags, chapters, links… one per line.' }),
      adv() ? textField('Disclosure and reference requirements', p.disclosure, (v) => setPlatform(id, { disclosure: v }), { key: 'plat.disclosure', multiline: true }) : null,
      linesField('Publishing checklist', p.checklist, (v) => setPlatform(id, { checklist: v }), { key: 'plat.checklist', hint: 'Copied into each new output for this platform.' }),
    ]),
    card('Formats', [
      ...p.formats.map((f, i) => el('div', { class: 'block' }, [
        el('div', { class: 'row' }, [
          el('input', { class: 'input block__name', value: f.name, 'aria-label': 'Format name', 'data-field': `fmt.${f.id}.name`, on: { change: (e) => setFormats(M.patchItem(p.formats, f.id, { name: e.target.value })) } }),
          button('↑', () => setFormats(M.moveItem(p.formats, f.id, -1)), 'ghost', { disabled: i === 0, 'aria-label': 'Move up' }),
          button('×', async () => {
            if (used.some((o) => o.formatId === f.id) && !(await confirmDialog({ title: `Remove format "${f.name}"?`, removes: 'the format definition', keeps: 'existing outputs, with the specs they already copied' }))) return;
            setFormats(M.removeItem(p.formats, f.id));
          }, 'ghost', { 'aria-label': `Remove ${f.name}` }),
        ]),
        el('div', { class: 'two' }, [fmtField(f, 'aspectRatio', 'Aspect ratio'), fmtField(f, 'resolution', 'Resolution')]),
        el('div', { class: 'two' }, [fmtField(f, 'duration', 'Duration constraints'), fmtField(f, 'cover', 'Thumbnail / cover')]),
        adv() ? el('div', { class: 'two' }, [fmtField(f, 'frameRate', 'Frame rate'), fmtField(f, 'fileFormat', 'File format')]) : null,
        adv() ? el('div', { class: 'two' }, [fmtField(f, 'fileSize', 'File size / export'), fmtField(f, 'safeZones', 'Safe zones and overlays')]) : null,
        adv() ? linesField('Format checklist', f.checklist, (v) => setFormats(M.patchItem(p.formats, f.id, { checklist: v }), false), { key: `fmt.${f.id}.chk`, rows: 2 }) : null,
      ])),
      button('Add format', () => setFormats([...p.formats, makeFormat()]), 'primary'),
    ]),
    card('Outputs on this platform', [used.length ? el('ul', { class: 'plain' }, used.map((o) => el('li', {}, [recordLink('outputs', o)]))) : el('p', { class: 'muted', text: 'None yet.' })]),
    card('', [button('Delete platform…', async () => {
      const ok = await confirmDialog({ title: `Delete "${p.name}"?`, removes: 'this platform profile and its formats', keeps: `the ${used.length} output(s) made for it, with the specs they copied` });
      if (!ok) return;
      commitWs((w) => ({ ...w, platforms: w.platforms.filter((x) => x.id !== id) }), { render: false });
      go('#/platforms');
    }, 'danger')]),
  ]);
}

/* --------------------------------------------------------------- settings */

const setCfg = (patch, render = false) => commitWs((w) => ({ ...w, modified: M.nowIso(), config: { ...w.config, ...patch } }), { render });
const setNested = (key, patch) => commitWs((w) => ({ ...w, modified: M.nowIso(), config: { ...w.config, [key]: { ...w.config[key], ...patch } } }), { render: false });

function categoriesEditor(ws) {
  const cats = ws.config.categories;
  const set = (list, render = true) => setCfg({ categories: list }, render);
  return el('div', { class: 'field' }, [
    el('span', { class: 'field__label', text: 'Categories and colours' }),
    ...cats.map((c) => el('div', { class: 'row row--item' }, [
      el('input', { type: 'color', value: c.color || '#7fabc7', 'aria-label': `${c.name} colour`, 'data-field': `cat.${c.id}.color`, on: { change: (e) => set(M.patchItem(cats, c.id, { color: e.target.value })) } }),
      el('input', { class: 'input', value: c.name, 'aria-label': 'Category name', 'data-field': `cat.${c.id}.name`, on: { change: (e) => set(M.patchItem(cats, c.id, { name: e.target.value }), false) } }),
      button('×', () => set(M.removeItem(cats, c.id)), 'ghost', { 'aria-label': `Remove ${c.name}` }),
    ])),
    button('Add category', () => set([...cats, { id: M.newId('cat'), name: 'New category', color: '#7fabc7' }])),
    el('span', { class: 'field__hint', text: 'These colours belong to this workspace only; the app\'s own theme never changes.' }),
  ]);
}

export function settingsModule() {
  const ws = currentWs();
  const c = ws.config;
  const lines = (label, key, hint) => linesField(label, c[key], (v) => setCfg({ [key]: v }), { key: `cfg.${key}`, hint });
  const wsAction = (label, fn, kind = '') => button(label, fn, kind, { 'data-field': `ws.${label}` });
  const reset = (kind, title, apply) => async () => {
    const d = M.describeRemoval(currentWs(), kind);
    if (await confirmDialog({ title, ...d, confirm: 'Reset' })) apply();
  };
  const importInput = el('input', { type: 'file', accept: '.json,application/json', hidden: true, 'data-field': 'ws.import.file',
    on: { change: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const result = M.validateImport(await file.text());
      e.target.value = '';
      if (!result.ok) { infoDialog('That file cannot be imported', result.errors); return; }
      commitApp((app) => M.importWorkspace(app, result.workspace));
      infoDialog('Imported', [`"${currentWs().name}" was added as a new workspace and opened. Nothing existing was changed.`]);
    } } });
  return el('div', { class: 'stack' }, [
    card('Workspace', [
      el('p', { class: 'muted small', text: 'Everything below belongs to this workspace only. The application, and every other workspace, are never touched by these actions.' }),
      textField('Workspace name', ws.name, (v) => commitWs((w) => ({ ...w, name: v || 'Untitled workspace', modified: M.nowIso() })), { key: 'ws.name' }),
      textField('Description', ws.description, (v) => commitWs((w) => ({ ...w, description: v }), { render: false }), { key: 'ws.desc', multiline: true }),
      el('div', { class: 'row' }, [
        wsAction('Create blank workspace', () => commitApp((app) => M.addWorkspace(app, M.blankWorkspace({ name: 'New workspace' })))),
        wsAction('Load example workspace', () => commitApp((app) => M.addWorkspace(app, exampleWorkspace()))),
      ]),
      el('div', { class: 'row' }, [
        wsAction('Export workspace (.json)', () => download(new Blob([M.exportWorkspace(ws)], { type: 'application/json' }), `ContentBench_${ws.name.replace(/\W+/g, '_')}_${M.nowIso().slice(0, 10)}.json`)),
        wsAction('Import workspace…', () => importInput.click()), importInput,
      ]),
      el('div', { class: 'row' }, [
        wsAction('Remove example records', async () => {
          const n = M.RECORD_TYPES.reduce((k, t) => k + currentWs().records[t].filter((r) => r.sample).length, 0);
          if (!n) { infoDialog('No example records', ['This workspace holds none.']); return; }
          if (await confirmDialog({ title: 'Remove example records?', removes: `${n} record(s) marked as examples, and links to them`, keeps: 'your own records and all configuration and templates', confirm: 'Remove' })) commitWs((w) => M.removeSamples(w));
        }),
        wsAction('Reset data…', reset('data', `Clear the records in "${ws.name}"?`, () => commitWs((w) => M.resetWorkspaceData(w))), 'danger'),
        wsAction('Reset configuration…', reset('config', `Reset the configuration of "${ws.name}"?`, () => commitWs((w) => M.resetWorkspaceConfig(w))), 'danger'),
        wsAction('Delete workspace…', reset('workspace', `Delete the workspace "${ws.name}"?`, () => commitApp((app) => M.deleteWorkspace(app, ws.id))), 'danger'),
      ]),
    ]),
    card('Identity', [
      textField('Channel or brand name', c.identity.channelName, (v) => setNested('identity', { channelName: v }), { key: 'cfg.channel' }),
      textField('Tagline', c.identity.tagline, (v) => setNested('identity', { tagline: v }), { key: 'cfg.tagline' }),
      textField('Philosophy', c.identity.philosophy, (v) => setNested('identity', { philosophy: v }), { key: 'cfg.philosophy', multiline: true }),
      adv() ? textField('Principles', c.identity.principles, (v) => setNested('identity', { principles: v }), { key: 'cfg.principles', multiline: true }) : null,
      adv() ? textField('Editorial guidelines', c.identity.editorialGuidelines, (v) => setNested('identity', { editorialGuidelines: v }), { key: 'cfg.editorial', multiline: true }) : null,
    ]),
    card('Categories, series, audiences and tags', [
      categoriesEditor(ws),
      lines('Series', 'series'), lines('Audience profiles', 'audiences'), lines('Tags', 'tags', 'Suggested when tagging. One per line.'),
      adv() ? lines('Content types / formats', 'contentTypes') : null,
      adv() ? lines('Idea types', 'ideaTypes') : null,
      adv() ? lines('Project types', 'projectTypes') : null,
    ]),
    adv() ? card('Statuses', Object.entries(c.statuses).map(([type, list]) => linesField(M.TYPE_LABEL[type][1], list,
      (v) => setCfg({ statuses: { ...currentWs().config.statuses, [type]: v.length ? v : list } }), { key: `cfg.status.${type}`, hint: 'In order. Records keep their current status even if you remove it here.' }))) : null,
    card('Voice and branding', [
      textField('Voice and tone', c.voice.tone, (v) => setNested('voice', { tone: v }), { key: 'cfg.tone', multiline: true }),
      adv() ? textField('Communication preferences', c.voice.communication, (v) => setNested('voice', { communication: v }), { key: 'cfg.comm', multiline: true }) : null,
      adv() ? textField('Storytelling and hook styles', c.voice.hookStyles, (v) => setNested('voice', { hookStyles: v }), { key: 'cfg.hooks', multiline: true }) : null,
      adv() ? textField('Brand colours', c.brand.colors, (v) => setNested('brand', { colors: v }), { key: 'cfg.colors' }) : null,
      adv() ? textField('Fonts', c.brand.fonts, (v) => setNested('brand', { fonts: v }), { key: 'cfg.fonts' }) : null,
      adv() ? textField('Visual preferences and brand assets', c.brand.visualNotes, (v) => setNested('brand', { visualNotes: v }), { key: 'cfg.visual', multiline: true }) : null,
    ]),
    card('AI instructions', [textField('Standing instructions for any assistant', c.aiInstructions, (v) => setCfg({ aiInstructions: v }), { key: 'cfg.ai', multiline: true, rows: 5,
      hint: 'Included in every prompt this workspace builds, and in every content package export.' })]),
    adv() ? card('Defaults', [el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Default workflow' }),
      el('select', { class: 'input', 'data-field': 'cfg.defaultWf', on: { change: (e) => setNested('preferences', { defaultWorkflowId: e.target.value }) } },
        [el('option', { value: '', text: '—' }), ...ws.workflows.map((t) => el('option', { value: t.id, text: t.name, selected: t.id === c.preferences.defaultWorkflowId }))])]),
      el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Default structure (video timeline)' }),
        el('select', { class: 'input', 'data-field': 'cfg.defaultStory', on: { change: (e) => setNested('preferences', { defaultStoryId: e.target.value }) } },
          [el('option', { value: '', text: '—' }), ...ws.stories.map((t) => el('option', { value: t.id, text: t.name, selected: t.id === c.preferences.defaultStoryId }))])]),
      el('p', { class: 'small muted', text: 'New content items start with a copy of these.' })]) : null,
  ]);
}

/* ------------------------------------------------------------------ guide */

const guideState = { q: '', howto: HOWTOS[0].id };

export function guideModule(openOnboarding) {
  const results = el('div');
  const draw = () => {
    const howtos = HOWTOS.filter((h) => guideMatches(`${h.category} ${h.title} ${h.steps.join(' ')}`, guideState.q));
    const faqs = FAQS.filter((f) => guideMatches(`${f.q} ${f.a}`, guideState.q));
    if (!howtos.some((h) => h.id === guideState.howto)) guideState.howto = howtos[0]?.id || '';
    const chosen = HOWTOS.find((h) => h.id === guideState.howto);
    results.replaceChildren(
      card('How do I…', [howtos.length ? el('select', { class: 'input', 'data-field': 'guide.howto', on: { change: (e) => { guideState.howto = e.target.value; draw(); } } },
        howtos.map((h) => el('option', { value: h.id, text: `${h.category} — ${h.title}`, selected: h.id === guideState.howto }))) : el('p', { class: 'muted', text: 'No how-to matches.' }),
      chosen && howtos.length ? el('ol', { class: 'howto-steps' }, chosen.steps.map((s) => el('li', { text: s }))) : null]),
      card('Questions', faqs.length ? faqs.map((f) => el('div', { class: 'faq' }, [el('strong', { text: f.q }), el('p', { text: f.a })])) : [el('p', { class: 'muted', text: 'No question matches.' })]),
    );
  };
  draw();
  const tiles = (items) => el('div', { class: 'tiles' }, items.map(([name, where, what]) => el('div', { class: 'tile' }, [
    el('strong', { text: name }), what ? el('span', { class: 'small muted', text: where }) : null, el('p', { class: 'small', text: what || where })])));
  return el('div', { class: 'stack' }, [
    card('How to use ContentBench', [
      el('input', { class: 'input', type: 'search', placeholder: 'Search in your own words - "tiktok version", "backup", "calendar"…', value: guideState.q, 'data-field': 'guide.search',
        on: { input: (e) => { guideState.q = e.target.value; draw(); } } }),
      el('div', { class: 'row' }, [button('Show me around again', openOnboarding)]),
    ]),
    results,
    card('The process in words', [el('ol', { class: 'lanes' }, [
      'Capture - an idea goes in with no form to fill.',
      'Develop - the idea becomes one or more content items with a brief, a message and a promise.',
      'Structure - choose a storytelling structure and a workflow; both are copied in.',
      'Adapt - make an output per platform and format, each rewritten as it needs.',
      'Produce and publish - work the steps and checklists, then record the date and URL.',
      'Learn - add feedback and lessons, and capture the follow-up ideas.',
    ].map((t) => el('li', { text: t })))]),
    card('The ideas it is built on', [tiles(MENTAL_MODEL)]),
    card('Features worth knowing', [tiles(FEATURES)]),
  ]);
}
