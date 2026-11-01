// The content item editor (its twelve sections) and the platform output editor.

import { el, toast } from './dom.js';
import * as M from '../model.js';
import { CONTENT_SECTIONS } from '../schema.js';
import * as W from '../workflow.js';
import { createOutput, outputLabel, masterDrift, pullFromMaster, keepOutputVersion, INHERITS, scheduleContent } from '../content.js';
import { store, ws as currentWs, commitWs } from './store.js';
import { recordForm, linkEditor, button, card, emptyState, confirmDialog, badge, recordLink, href, checkbox, timelineBar } from './forms.js';
import { detailHeader, recordActions, backlinks, go, createAndOpen } from './records.js';
import { assistantPanel } from './assistant.js';
import { examplePlatforms, exampleStories, exampleWorkflows } from '../seed.js';

const patch = (type, id) => (p, render) => commitWs((w) => M.updateRecord(w, type, id, p), { render });
const link = (type, id) => (field, target, on) => commitWs((w) => M.setLink(w, type, id, field, target, on));
// text edits pass render=false so the field being typed in is not rebuilt under the reader
const titleOfRec = (r) => M.titleOf(r);
const editRec = (type, id, fn, render = true) => commitWs((w) => M.updateRecord(w, type, id, fn(M.getRecord(w, type, id))), { render });

/* ------------------------------------------------------------ story editor */

/** Edits the blocks of one story instance stored at `record.story`. */
export function storyEditor(type, record, ws) {
  const story = record.story;
  const setStory = (fn, render = true) => editRec(type, record.id, (r) => ({ story: fn(r.story) }), render);
  const pick = el('select', { class: 'input input--inline', 'data-field': `${type}.story.pick` },
    ws.stories.map((s) => el('option', { value: s.id, text: `${s.name} (v${s.version})` })));
  const use = async () => {
    const tpl = ws.stories.find((s) => s.id === pick.value);
    if (!tpl) return;
    if (story?.blocks.some((b) => b.script || b.notes || b.visual)) {
      const ok = await confirmDialog({ title: 'Replace this structure?', removes: `the ${story.blocks.length} blocks here and what you wrote in them`, keeps: 'everything else on this item', confirm: 'Replace' });
      if (!ok) return;
    }
    editRec(type, record.id, () => ({ story: W.instantiateStory(tpl) }));
  };
  const chooser = ws.stories.length
    ? el('div', { class: 'row' }, [pick, button(story ? 'Replace structure' : 'Use this structure', use, story ? '' : 'primary')])
    : emptyState('No storytelling templates', 'Create one under Templates, or add the examples.', [
      button('Add example structures', () => commitWs((w) => ({ ...w, stories: [...w.stories, ...exampleStories()] }))),
      button('Templates', () => go('#/templates'))]);
  if (!story) return card('Story and structure', [el('p', { class: 'muted', text: 'Pick a structure to fill in. It is copied here, so editing the template later never changes this item.' }), chooser]);
  const adv = store.ui.level !== 'simple';
  const tpl = ws.stories.find((s) => s.id === story.templateId);
  const tplTotal = tpl ? W.timeline(tpl.blocks).total : null;
  const starts = new Map(W.timeline(story.blocks).segments.map((s) => [s.id, s]));
  const saveVariant = () => {
    const name = `${story.templateName} - variant`;
    const t = W.makeStoryTemplate({ name, description: `Made from "${titleOfRec(record)}" to test a different structure.`,
      blocks: story.blocks.map(({ name: n, purpose, prompt, duration, transition }) => ({ name: n, purpose, prompt, duration, transition })) });
    commitWs((w) => ({ ...w, stories: [...w.stories, t] }), { render: false });
    toast(`Saved as template "${name}". Rename or edit it under Templates.`);
  };
  return card('Story and structure', [
    el('p', { class: 'small muted', text: `From "${story.templateName}" v${story.templateVersion}. These blocks are this item's own - add, remove, reorder or repeat them freely; the template stays as it is.` }),
    timelineBar(story.blocks, { label: 'This video', against: tplTotal || null }),
    tpl ? timelineBar(tpl.blocks, { label: `Template "${tpl.name}" v${tpl.version}${ws.config.preferences.defaultStoryId === tpl.id ? ' (default)' : ''}` }) : null,
    ...story.blocks.map((b, i) => {
      const upd = (k) => (e) => setStory((s) => W.instanceBlocks.update(s, b.id, { [k]: e.target.value }), false);
      const ta = (k, label, rows = 3) => el('label', { class: 'field' }, [el('span', { class: 'field__label', text: label }),
        el('textarea', { class: 'input', rows, value: b[k] || '', 'data-field': `${type}.blk.${b.id}.${k}`, on: { change: upd(k) } })]);
      return el('div', { class: 'block' }, [
        el('div', { class: 'row' }, [
          el('span', { class: 'block__n', text: String(i + 1) }),
          el('input', { class: 'input block__name', value: b.name, 'aria-label': 'Block name', 'data-field': `${type}.blk.${b.id}.name`, on: { change: upd('name') } }),
          el('input', { class: 'input input--inline input--dur', value: b.duration || '', placeholder: '0:15', 'aria-label': 'Duration (m:ss)', 'data-field': `${type}.blk.${b.id}.duration`,
            on: { change: (e) => setStory((s) => W.instanceBlocks.update(s, b.id, { duration: e.target.value })) } }),
          starts.has(b.id) ? el('span', { class: 'block__time', text: `${W.formatSeconds(starts.get(b.id).start)}–${W.formatSeconds(starts.get(b.id).start + starts.get(b.id).seconds)}` }) : null,
          button('↑', () => setStory((s) => W.instanceBlocks.move(s, b.id, -1)), 'ghost', { 'aria-label': 'Move up', disabled: i === 0 }),
          button('↓', () => setStory((s) => W.instanceBlocks.move(s, b.id, 1)), 'ghost', { 'aria-label': 'Move down', disabled: i === story.blocks.length - 1 }),
          button('Repeat', () => setStory((s) => W.instanceBlocks.repeat(s, b.id)), 'ghost'),
          button('×', () => setStory((s) => W.instanceBlocks.remove(s, b.id)), 'ghost', { 'aria-label': `Remove ${b.name}` }),
        ]),
        b.purpose ? el('p', { class: 'small muted', text: b.purpose }) : null,
        ta('script', 'Talking points or script'),
        adv ? el('div', { class: 'two' }, [ta('visual', 'Visual requirements', 2), ta('transition', 'Transition', 2)]) : null,
        adv ? el('div', { class: 'two' }, [ta('assets', 'Supporting assets', 2), ta('references', 'References', 2)]) : null,
        adv ? ta('notes', 'Recording / editing notes', 2) : null,
      ]);
    }),
    el('div', { class: 'row' }, [button('Add block', () => setStory((s) => W.instanceBlocks.add(s, {}))),
      button('Save as a new template (variant)', saveVariant, '', { title: 'Keep this structure to test it on other videos. The original template is untouched.' })]),
    el('details', { class: 'more' }, [el('summary', { text: 'Use a different structure' }), chooser]),
  ]);
}

/* --------------------------------------------------------- workflow panel */

function workflowPanel(type, record, ws) {
  const inst = record.workflow;
  const setWf = (fn) => editRec(type, record.id, (r) => ({ workflow: fn(r.workflow) }));
  const pick = el('select', { class: 'input input--inline', 'data-field': `${type}.wf.pick` },
    ws.workflows.map((t) => el('option', { value: t.id, text: `${t.name} (v${t.version}, ${t.steps.length} steps)`, selected: t.id === ws.config.preferences.defaultWorkflowId })));
  const start = async () => {
    const tpl = ws.workflows.find((t) => t.id === pick.value);
    if (!tpl) return;
    if (inst && W.progress(inst).done) {
      const ok = await confirmDialog({ title: 'Start a different workflow?', removes: 'the progress recorded on the current one', keeps: 'tasks already made from it', confirm: 'Replace' });
      if (!ok) return;
    }
    editRec(type, record.id, () => ({ workflow: W.scheduleBackwards(W.instantiateWorkflow(tpl), record.targetDate) }));
  };
  const setDays = (stepId, days) => setWf((w) => W.scheduleBackwards({ ...w, steps: w.steps.map((s) => (s.id === stepId ? { ...s, days } : s)) }, record.targetDate));
  const chooser = ws.workflows.length ? el('div', { class: 'row' }, [pick, button(inst ? 'Switch workflow' : 'Start this workflow', start, inst ? '' : 'primary')])
    : emptyState('No workflow templates', 'Create one under Templates, or add the examples.', [
      button('Add example workflows', () => commitWs((w) => ({ ...w, workflows: [...w.workflows, ...exampleWorkflows()] })))]);
  if (!inst) return card('Workflow', [el('p', { class: 'muted', text: 'Choose the process for this item. A light one is fine - not everything needs every step.' }), chooser]);
  const p = W.progress(inst);
  const blocked = new Set(W.blockedSteps(inst));
  const drift = W.templateDrift(inst, ws.workflows.find((t) => t.id === inst.templateId));
  return card('Workflow', [
    el('p', { class: 'small muted', text: `"${inst.templateName}" v${inst.templateVersion} · ${p.done} done, ${p.skipped} skipped of ${p.total}${p.requiredLeft ? ` · ${p.requiredLeft} required left` : ''}` }),
    drift ? el('p', { class: 'small text-warn', text: `The template is now v${drift.to}. This item keeps v${drift.from} - switch workflow below if you want the new one.` }) : null,
    type === 'content' ? el('p', { class: 'small' }, record.targetDate
      ? [el('strong', { text: `Due ${record.targetDate}` }), ` · start by ${W.startDate(inst) || record.targetDate}. Steps are dated backwards from the due date - move it on the `, el('a', { href: '#/planner', text: 'Planner calendar' }), '.']
      : ['No due date yet. Drag this item onto a day in the ', el('a', { href: '#/planner', text: 'Planner calendar' }), ' and every step gets a date.']) : null,
    el('ol', { class: 'steps' }, inst.steps.map((s) => el('li', { class: `step step--${s.status}` }, [
      el('div', { class: 'row' }, [
        s.due && s.status !== 'skipped' ? el('span', { class: 'step__due', text: s.due.slice(5) }) : null,
        el('span', { class: 'step__name', text: s.name }),
        s.optional ? badge('optional') : null, !W.canSkip(s) ? badge('required') : null,
        blocked.has(s.id) ? badge('waiting on another step', 'warn') : null,
        el('span', { class: 'row__push' }),
        type === 'content' && store.ui.level !== 'simple' ? el('label', { class: 'small muted' }, ['days ',
          el('input', { class: 'input input--inline input--dur', type: 'number', min: 0, value: W.stepDays(s), 'data-field': `step.${s.id}.days`,
            on: { change: (e) => setDays(s.id, e.target.value === '' ? '' : Number(e.target.value)) } })]) : null,
        s.status === 'todo' ? button('Done', () => setWf((w) => W.setStepStatus(w, s.id, 'done')), 'small', { 'data-field': `step.${s.id}.done` }) : button('Reopen', () => setWf((w) => W.setStepStatus(w, s.id, 'todo')), 'small'),
        s.status === 'todo' && W.canSkip(s) ? button('Skip', () => setWf((w) => W.setStepStatus(w, s.id, 'skipped')), 'small') : null,
        type === 'content' ? button('Make task', () => createAndOpen('tasks', { title: s.name, contentId: record.id, stepId: s.id }), 'small ghost') : null,
      ]),
      s.instructions ? el('p', { class: 'small muted', text: s.instructions }) : null,
      ...s.checklist.map((c, i) => checkbox(c, !!s.checks[i], () => setWf((w) => W.toggleCheck(w, s.id, i)), `step.${s.id}.chk.${i}`)),
    ]))),
    el('details', { class: 'more' }, [el('summary', { text: 'Use a different workflow' }), chooser]),
  ]);
}

/* ------------------------------------------------------- outputs section */

function outputsSection(c, ws) {
  const outs = ws.records.outputs.filter((o) => o.contentId === c.id);
  let platformId = ws.platforms[0]?.id || '';
  const fmt = el('select', { class: 'input input--inline', 'data-field': 'newout.format' });
  const fillFormats = () => fmt.replaceChildren(...(ws.platforms.find((p) => p.id === platformId)?.formats || []).map((f) => el('option', { value: f.id, text: f.name })));
  fillFormats();
  const plat = el('select', { class: 'input input--inline', 'data-field': 'newout.platform', on: { change: (e) => { platformId = e.target.value; fillFormats(); } } },
    ws.platforms.map((p) => el('option', { value: p.id, text: p.name })));
  const story = el('select', { class: 'input input--inline', 'data-field': 'newout.story' },
    [el('option', { value: '', text: 'No structure yet' }), ...ws.stories.map((s) => el('option', { value: s.id, text: s.name }))]);
  const create = () => {
    let made;
    commitWs((w) => { const r = createOutput(w, c.id, { platformId, formatId: fmt.value, storyId: story.value }); made = r.record; return r.ws; }, { render: false });
    go(href('outputs', made.id));
  };
  return card('Platform outputs', [
    el('p', { class: 'muted small', text: 'Each output is one version of this piece for one platform and format. It starts from the master and can then be rewritten without touching it.' }),
    outs.length ? el('div', { class: 'rows' }, outs.map((o) => el('a', { class: 'rowcard', href: href('outputs', o.id) }, [
      el('span', { class: 'rowcard__title', text: o.title || '(untitled)' }),
      el('span', { class: 'rowcard__meta' }, [el('span', { class: 'small muted', text: outputLabel(ws, o) }), badge(o.status || 'no status', 'status'),
        o.archived ? badge('Archived') : null, masterDrift(o, c).length ? badge('master changed', 'warn') : null]),
    ]))) : el('p', { class: 'muted', text: 'No outputs yet - and none are needed until you are ready.' }),
    ws.platforms.length
      ? el('div', { class: 'newout' }, [el('strong', { text: 'New output' }), el('div', { class: 'row' }, [plat, fmt, story, button('Create output', create, 'primary', { 'data-field': 'newout.create' })])])
      : emptyState('No platforms set up', 'Outputs need a platform profile. Add your own, or start from editable examples.', [
        button('Add example platforms', () => commitWs((w) => ({ ...w, platforms: [...w.platforms, ...examplePlatforms()] })), 'primary'),
        button('Platforms', () => go('#/platforms'))]),
  ]);
}

function publishingSection(c, ws) {
  const outs = ws.records.outputs.filter((o) => o.contentId === c.id && !o.archived);
  if (!outs.length) return card('Publishing', [el('p', { class: 'muted', text: 'Publishing happens per output. Create an output first.' })]);
  return card('Publishing', outs.map((o) => {
    const pubs = ws.records.publications.filter((p) => p.outputId === o.id);
    const checked = (o.checklist || []).filter((x) => x.done).length;
    return el('div', { class: 'block' }, [
      el('div', { class: 'row' }, [recordLink('outputs', o), el('span', { class: 'small muted', text: outputLabel(ws, o) }), badge(o.status || '', 'status')]),
      el('p', { class: 'small muted', text: `Checklist ${checked}/${(o.checklist || []).length} · scheduled ${o.scheduledDate || '-'} · published ${o.publishedDate || '-'}` }),
      ...pubs.map((p) => el('div', { class: 'small' }, [recordLink('publications', p), p.url ? ` · ${p.url}` : ''])),
      button('Log a publication', () => createAndOpen('publications', { title: `${outputLabel(ws, o)} - ${o.title}`, outputId: o.id, date: M.nowIso().slice(0, 10), url: o.publishedUrl || '' }), 'small'),
    ]);
  }));
}

function performanceSection(c, ws) {
  const outIds = new Set(ws.records.outputs.filter((o) => o.contentId === c.id).map((o) => o.id));
  const fb = ws.records.feedback.filter((f) => f.contentId === c.id || outIds.has(f.outputId));
  return card('Performance and feedback', [
    fb.length ? el('ul', { class: 'plain' }, fb.map((f) => el('li', {}, [recordLink('feedback', f), el('span', { class: 'small muted', text: f.date ? ` · ${f.date}` : '' })])))
      : el('p', { class: 'muted', text: 'No feedback recorded yet.' }),
    button('Add feedback', () => createAndOpen('feedback', { title: `Feedback: ${c.workingTitle}`, contentId: c.id, date: M.nowIso().slice(0, 10) })),
  ]);
}

function historySection(c) {
  const sug = c.aiSuggestions || [];
  return card('History', [
    el('p', { class: 'small muted', text: `Created ${c.created.slice(0, 16).replace('T', ' ')} · last edited ${c.modified.slice(0, 16).replace('T', ' ')}` }),
    c.workflow ? el('p', { class: 'small muted', text: `Workflow: ${c.workflow.templateName} v${c.workflow.templateVersion}, started ${c.workflow.created.slice(0, 10)}` }) : null,
    c.story ? el('p', { class: 'small muted', text: `Structure: ${c.story.templateName} v${c.story.templateVersion}` }) : null,
    sug.length ? el('ul', { class: 'plain small' }, sug.map((s) => el('li', { text: `${s.created.slice(0, 10)} · ${s.status} · ${s.text.slice(0, 80)}${s.text.length > 80 ? '…' : ''}` }))) : null,
  ]);
}

/* ----------------------------------------------------------- content page */

export function contentEditor(id, section = 'overview') {
  const ws = currentWs();
  const c = M.getRecord(ws, 'content', id);
  if (!c) return emptyState('Not found', 'This content item no longer exists.', [button('Content library', () => go('#/library'))]);
  if (!CONTENT_SECTIONS.some(([s]) => s === section)) section = 'overview';
  const base = patch('content', id);
  const p = (pt, render) => ('targetDate' in pt ? commitWs((w) => scheduleContent(w, id, pt.targetDate), { render }) : base(pt, render));
  const form = recordForm('content', c, ws, p, { section });
  const hasFields = form.querySelector('.field');
  const extra = {
    overview: () => card('Links', [linkEditor('content', c, ws, link('content', id), { only: ['ideaIds', 'projectIds'] }),
      el('p', { class: 'small muted', text: 'No project linked means standalone - that is valid.' })]),
    story: () => storyEditor('content', c, ws),
    research: () => card('References', [linkEditor('content', c, ws, link('content', id), { only: ['referenceIds'] }),
      button('New reference', () => { let made; commitWs((w) => { const r = M.createRecord(w, 'references', { title: 'New reference', status: w.config.statuses.references[0] }); made = r.record; return M.setLink(r.ws, 'content', id, 'referenceIds', made.id, true); }, { render: false }); go(href('references', made.id)); })]),
    visuals: () => card('Assets', [linkEditor('content', c, ws, link('content', id), { only: ['assetIds'] }),
      button('New asset', () => { let made; commitWs((w) => { const r = M.createRecord(w, 'assets', { name: 'New asset', status: w.config.statuses.assets[0] }); made = r.record; return M.setLink(r.ws, 'content', id, 'assetIds', made.id, true); }, { render: false }); go(href('assets', made.id)); })]),
    outputs: () => outputsSection(c, ws),
    production: () => workflowPanel('content', c, ws),
    publishing: () => publishingSection(c, ws),
    performance: () => performanceSection(c, ws),
    history: () => historySection(c),
  }[section];
  return el('div', { class: 'detail' }, [
    detailHeader('content', c, [el('a', { href: '#/library', text: 'Content library' })]),
    el('nav', { class: 'subtabs', 'aria-label': 'Content sections' }, CONTENT_SECTIONS.map(([s, label]) =>
      el('a', { class: `subtab ${s === section ? 'subtab--active' : ''}`, href: `#/content/${id}/${s}`, text: label, 'aria-current': s === section ? 'page' : null }))),
    hasFields ? card('', [form]) : null,
    extra ? extra() : null,
    ['overview', 'history'].includes(section) ? backlinks('content', id, ws) : null,
    ['concept', 'script', 'hooks', 'research', 'overview'].includes(section) ? assistantPanel('content', c, ws) : null,
    section === 'history' || section === 'overview' ? card('', [recordActions('content', c, '#/library')]) : null,
  ]);
}

/* ------------------------------------------------------------ output page */

export function outputEditor(id) {
  const ws = currentWs();
  const o = M.getRecord(ws, 'outputs', id);
  if (!o) return emptyState('Not found', 'This output no longer exists.', [button('Content library', () => go('#/library'))]);
  const c = M.getRecord(ws, 'content', o.contentId);
  const drift = c ? masterDrift(o, c) : [];
  const label = Object.fromEntries(Object.keys(INHERITS).map((k) => [k, { title: 'Title', angle: 'Angle / central message', viewerPromise: 'Viewer promise', script: 'Script' }[k]]));
  const setChecklist = (list) => commitWs((w) => M.updateRecord(w, 'outputs', id, { checklist: list }));
  const list = o.checklist || [];
  const platform = ws.platforms.find((p) => p.id === o.platformId);
  return el('div', { class: 'detail' }, [
    detailHeader('outputs', o, [el('a', { href: '#/library', text: 'Content library' }), c ? el('a', { href: `#/content/${c.id}/outputs`, text: c.workingTitle }) : 'no parent']),
    el('p', { class: 'muted' }, [outputLabel(ws, o), platform && !platform.verifiedOn ? el('span', { class: 'text-warn', text: ' · platform specs never verified' }) : null]),
    drift.length ? card('The master has changed', [
      el('p', { class: 'small muted', text: 'These master fields changed after this output copied them. Nothing has been changed here - choose per field.' }),
      ...drift.map((d) => el('div', { class: 'drift' }, [
        el('strong', { text: label[d.field] }), d.customised ? badge('you adapted this', 'warn') : null,
        el('div', { class: 'compare' }, [
          el('div', {}, [el('div', { class: 'small muted', text: 'This output' }), el('pre', { class: 'compare__mine', text: d.current || '(empty)' })]),
          el('div', {}, [el('div', { class: 'small muted', text: 'Master now' }), el('pre', { class: 'compare__mine', text: d.master || '(empty)' })]),
        ]),
        el('div', { class: 'row' }, [button('Use master', () => commitWs((w) => pullFromMaster(w, id, d.field)), d.customised ? '' : 'primary', { 'data-field': `drift.${d.field}.pull` }),
          button('Keep mine', () => commitWs((w) => keepOutputVersion(w, id, d.field)), '', { 'data-field': `drift.${d.field}.keep` })]),
      ])),
    ]) : null,
    card('', [recordForm('outputs', o, ws, patch('outputs', id))]),
    storyEditor('outputs', o, ws),
    card('Publishing checklist', [
      ...list.map((x, i) => el('div', { class: 'row row--item' }, [
        checkbox(x.text, x.done, (v) => setChecklist(list.map((y, j) => (j === i ? { ...y, done: v } : y))), `out.chk.${i}`),
        el('span', { class: 'row__push' }),
        button('×', () => setChecklist(list.filter((_, j) => j !== i)), 'ghost', { 'aria-label': `Remove ${x.text}` })])),
      el('div', { class: 'row' }, [el('input', { class: 'input', placeholder: 'Add a checklist item', 'data-field': 'out.chk.new',
        on: { change: (e) => e.target.value.trim() && setChecklist([...list, { text: e.target.value.trim(), done: false }]) } })]),
    ]),
    card('Links', [linkEditor('outputs', o, ws, link('outputs', id), { only: ['referenceIds', 'assetIds'] })]),
    backlinks('outputs', id, ws),
    assistantPanel('outputs', o, ws),
    card('', [recordActions('outputs', o, c ? `#/content/${c.id}/outputs` : '#/library')]),
  ]);
}
