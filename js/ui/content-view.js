// The content item editor (its twelve sections) and the platform output editor.

import { el, toast, download } from './dom.js';
import * as M from '../model.js';
import { STEPS, stepOf, readiness, isRecorded, editPrompt, recordingFolder } from '../readiness.js';
import { contentPackage, assistantBrief, productBrief, slug } from '../exporter.js';
import { EXTRA_TYPES } from '../extras.js';
import { zip } from '../zip.js';
import * as W from '../workflow.js';
import { createOutput, outputLabel, masterDrift, pullFromMaster, keepOutputVersion, INHERITS, contentSchedule,
  setSeries, setEpisode, addPart, partsOf, seriesLabel, nextEpisode, categoryPlace, lookFor, madeFrom, familyOf, newVersion, REDO } from '../content.js';
import { openReview } from './review.js';
import { markReleased } from '../releases.js';
import * as K from '../capture.js';
import { sync, folderReady, folderSupported, makeFolders, listFolders, downloadTree } from './folder.js';
import { store, ws as currentWs, commitWs } from './store.js';
import { recordForm, linkEditor, button, card, emptyState, confirmDialog, badge, recordLink, href, checkbox, timelineBar, copyText } from './forms.js';
import { detailHeader, recordActions, backlinks, go, createAndOpen } from './records.js';
import { assistantPanel } from './assistant.js';
import { examplePlatforms, exampleStories, exampleWorkflows } from '../seed.js';
import { openPrompter } from './prompter.js';

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
  if (!story) return card('Blocks - the script', [el('p', { class: 'muted', text: 'Pick a structure to fill in. Its blocks are the script: talking points, what is on screen and why each block is there. It is copied here, so editing the template later never changes this item.' }), chooser]);
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
  return card('Blocks - the script', [
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
        ta('purpose', 'Purpose - why this block is here', 2),
        ta('script', 'Talking points (start a line with » to read it word for word, - to talk around it)', 5),
        ta('visual', 'On screen (and what the character does)', 2),
        adv ? ta('transition', 'Transition', 2) : null,
        adv ? el('div', { class: 'two' }, [ta('assets', 'Supporting assets', 2), ta('references', 'References', 2)]) : null,
        adv ? ta('notes', 'Recording / editing notes', 2) : null,
      ]);
    }),
    el('div', { class: 'row' }, [button('Teleprompter', () => openPrompter(type, M.getRecord(currentWs(), type, record.id)), 'primary', { 'data-field': `${type}.prompter`, title: 'Full screen: your notes, where you should be, what comes next' }),
      button('Add block', () => setStory((s) => W.instanceBlocks.add(s, {}))),
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
    editRec(type, record.id, () => ({ workflow: W.instantiateWorkflow(tpl) }));
  };
  const setDays = (stepId, days) => setWf((w) => ({ ...w, steps: w.steps.map((s) => (s.id === stepId ? { ...s, days } : s)) }));
  const chooser = ws.workflows.length ? el('div', { class: 'row' }, [pick, button(inst ? 'Switch workflow' : 'Start this workflow', start, inst ? '' : 'primary')])
    : emptyState('No workflow templates', 'Create one under Templates, or add the examples.', [
      button('Add example workflows', () => commitWs((w) => ({ ...w, workflows: [...w.workflows, ...exampleWorkflows()] })))]);
  if (!inst) return card('Workflow', [el('p', { class: 'muted', text: 'Choose the process for this item. A light one is fine - not everything needs every step.' }), chooser]);
  const p = W.progress(inst);
  const blocked = new Set(W.blockedSteps(inst));
  const drift = W.templateDrift(inst, ws.workflows.find((t) => t.id === inst.templateId));
  const today = M.todayIso();
  const fc = (type === 'content' && contentSchedule(ws, today).get(record.id)) || W.forecast(inst, today);
  return card('Workflow', [
    el('p', { class: 'small muted', text: `"${inst.templateName}" v${inst.templateVersion} · ${p.done} done, ${p.skipped} skipped of ${p.total}` }),
    drift ? el('p', { class: 'small text-warn', text: `The template is now v${drift.to}. This item keeps v${drift.from} - switch workflow below if you want the new one.` }) : null,
    p.next ? el('p', { class: 'small' }, [el('strong', { text: `Next: ${p.next.name}` }), ` · if you keep going, ready about ${fc.ready}${record.targetDate ? ` (your target: ${record.targetDate})` : ''}. Counted from today - anything unfinished just moves out.`]) : el('p', { class: 'small text-ok', text: 'Every step is done or skipped.' }),
    el('ol', { class: 'steps' }, inst.steps.map((s) => el('li', { class: `step step--${s.status}` }, [
      el('div', { class: 'row' }, [
        fc.byStep[s.id] ? el('span', { class: 'step__due', title: 'Forecast, counted from today', text: `~${fc.byStep[s.id].slice(5)}` }) : null,
        el('span', { class: 'step__name', text: s.name }),
        s.optional ? badge('optional') : null,
        blocked.has(s.id) ? badge('waiting on another step', 'warn') : null,
        el('span', { class: 'row__push' }),
        type === 'content' && store.ui.level !== 'simple' ? el('label', { class: 'small muted' }, ['days ',
          el('input', { class: 'input input--inline input--dur', type: 'number', min: 0, value: W.stepDays(s), 'data-field': `step.${s.id}.days`,
            on: { change: (e) => setDays(s.id, e.target.value === '' ? '' : Number(e.target.value)) } })]) : null,
        s.status === 'todo' ? button('Done', () => setWf((w) => W.setStepStatus(w, s.id, 'done')), 'small', { 'data-field': `step.${s.id}.done` }) : button('Reopen', () => setWf((w) => W.setStepStatus(w, s.id, 'todo')), 'small'),
        s.status === 'todo' ? button('Skip', () => setWf((w) => W.setStepStatus(w, s.id, 'skipped')), 'small') : null,
        type === 'content' ? button('Make task', () => createAndOpen('tasks', { title: s.name, contentId: record.id, stepId: s.id }), 'small ghost') : null,
      ]),
      s.instructions ? el('p', { class: 'small muted', text: s.instructions }) : null,
      ...s.checklist.map((c, i) => checkbox(c, !!s.checks[i], () => setWf((w) => W.toggleCheck(w, s.id, i)), `step.${s.id}.chk.${i}`)),
    ]))),
    el('details', { class: 'more' }, [el('summary', { text: 'Use a different workflow' }), chooser]),
  ]);
}

/* ------------------------------------------------------- shots & sound */

const capKinds = (ws) => ws.config.captureKinds || [];
const setCaps = (id, fn, render = true) => editRec('content', id, (r) => ({ captures: fn(r.captures || []) }), render);

/** The capture list: what has to be recorded or gathered, tied to the timeline where it belongs. */
function captureSection(c, ws) {
  const kinds = capKinds(ws);
  const blocks = c.story?.blocks || [];
  const caps = c.captures || [];
  const row = (cp) => {
    const path = K.capturePath(kinds, c, cp);
    return el('div', { class: 'capture-row' }, [
      el('div', { class: 'row' }, [
        el('span', { class: 'block__n', text: String(cp.n) }),
        el('select', { class: 'input input--inline', 'data-field': `cap.${cp.id}.kind`, 'aria-label': 'Kind',
          on: { change: (e) => setCaps(c.id, (l) => M.patchItem(l, cp.id, { kind: e.target.value })) } },
        kinds.map((k) => el('option', { value: k.id, text: k.name, selected: k.id === cp.kind }))),
        el('input', { class: 'input capture-row__what', value: cp.what, placeholder: 'What exactly? e.g. CAD walkthrough of the gear train', 'data-field': `cap.${cp.id}.what`,
          on: { change: (e) => setCaps(c.id, (l) => M.patchItem(l, cp.id, { what: e.target.value })) } }),
        blocks.length ? el('select', { class: 'input input--inline', 'data-field': `cap.${cp.id}.block`, 'aria-label': 'Timeline block',
          on: { change: (e) => setCaps(c.id, (l) => M.patchItem(l, cp.id, { blockId: e.target.value })) } },
        [el('option', { value: '', text: 'Whole video' }), ...blocks.map((b) => el('option', { value: b.id, text: b.name, selected: b.id === cp.blockId }))]) : null,
        button('×', () => setCaps(c.id, (l) => M.removeItem(l, cp.id)), 'ghost', { 'aria-label': `Remove capture ${cp.n}` }),
      ]),
      el('p', { class: 'small muted capture-row__path' }, ['Save as ', el('code', { text: `${path.full}.*` })]),
    ]);
  };
  const perBlock = () => setCaps(c.id, (l) => blocks.reduce((acc, b) => [...acc, K.makeCapture(acc, { kind: 'main', what: b.name, blockId: b.id })], l));
  return card('What to capture', [
    el('p', { class: 'small muted', text: 'Everything needed before editing: main footage, backup footage, screen recordings, screenshots, voice-over, music. Each one gets a fixed number and an exact place to save it - Production checks the folder for it.' }),
    caps.length ? el('div', { class: 'stack stack--tight' }, caps.map(row)) : el('p', { class: 'muted', text: 'Nothing listed yet.' }),
    el('div', { class: 'row' }, [
      button('Add a capture', () => setCaps(c.id, (l) => [...l, K.makeCapture(l, { kind: kinds[0]?.id || 'main' })]), 'primary', { 'data-field': 'cap.add' }),
      blocks.length ? button('One per timeline block', perBlock, '', { title: 'Adds a main-footage capture for every block of the story' }) : null,
    ]),
  ]);
}

/* ------------------------------------------------------------ production */

async function checkFolder(c, ws) {
  const kinds = capKinds(ws);
  const listing = await listFolders([...new Set((c.captures || []).map((cp) => K.capturePath(kinds, c, cp).dir))]);
  const next = K.checkCaptures(kinds, c, listing);
  setCaps(c.id, () => next);
  const p = K.captureProgress(next);
  toast(p.needed ? `${p.saved} of ${p.total} found. ${p.needed} still to go.` : `All ${p.total} captures are in their folders.`);
}

function productionCaptures(c, ws) {
  const kinds = capKinds(ws);
  const caps = c.captures || [];
  const prog = K.captureProgress(caps);
  const live = folderReady();
  const tree = K.folderTree(kinds, c);
  const mark = (cp, on) => setCaps(c.id, (l) => M.patchItem(l, cp.id, { status: on ? 'marked' : 'needed' }));
  return card(`Captures: ${prog.saved} of ${prog.total} saved`, [
    live ? el('p', { class: 'small muted', text: `Folder: ${sync.name}. Save each file where it says, then press Check folder - a file counts once it is there.` })
      : el('p', { class: 'small muted', text: folderSupported() ? 'Connect your folder (Settings → Your private folder) and the app makes these folders and checks for each file itself.'
        : 'This browser cannot open folders. Download the folder tree, save files into it, and tick each one by hand.' }),
    el('div', { class: 'row' }, [
      live ? button('Make the folders', async () => { await makeFolders(tree); toast(`Folders ready in ${sync.name}/${K.contentFolder(c)}`); }, '', { 'data-field': 'prod.mkdirs' }) : null,
      live ? button('Check folder', () => checkFolder(c, ws).catch((e) => toast(`Could not read the folder: ${e.message}`)), 'primary', { 'data-field': 'prod.check' }) : null,
      !live ? button('Download the folder tree (.zip)', () => downloadTree(K.contentFolder(c).split('/').pop(), tree), '', { 'data-field': 'prod.zip' }) : null,
    ]),
    caps.length ? el('ul', { class: 'plain captures' }, caps.map((cp) => {
      const path = K.capturePath(kinds, c, cp);
      const kind = kinds.find((k) => k.id === cp.kind)?.name || cp.kind;
      return el('li', { class: `cap cap--${cp.status}` }, [
        el('span', { class: 'cap__state', text: cp.status === 'needed' ? '○' : '●', 'aria-hidden': 'true' }),
        el('div', { class: 'cap__body' }, [
          el('strong', { text: `${cp.n}. ${cp.what || kind}` }), el('span', { class: 'small muted', text: ` · ${kind}` }),
          el('div', { class: 'small' }, [el('code', { text: `${path.full}.*` })]),
          cp.status === 'saved' ? el('div', { class: 'small text-ok', text: `Found: ${cp.file}` }) : null,
        ]),
        cp.status === 'saved' ? badge('found', 'ok')
          : checkbox('saved', cp.status === 'marked', (on) => mark(cp, on), `prod.${cp.id}.mark`),
      ]);
    })) : el('p', { class: 'muted' }, ['No captures listed. Add them under ', 'the capture list below.']),
  ]);
}

function prompterCard(c) {
  const blocks = c.story?.blocks || [];
  return card('Record', [
    el('p', { class: 'small muted', text: blocks.length
      ? `The teleprompter runs your ${blocks.length} story blocks full screen: the notes, the line the pace says you should be on, what comes next and what is on screen. Pause any time; it saves where each block began, for the edit.`
      : 'Fill in the blocks on the Card step first - the teleprompter reads those.' }),
    blocks.length ? button('Open the teleprompter', () => openPrompter('content', M.getRecord(currentWs(), 'content', c.id)), 'primary', { 'data-field': 'prod.prompter' })
      : button('Go to the Card', () => go(`#/content/${c.id}/card`)),
  ]);
}

function readyCard(c, ws) {
  const outs = ws.records.outputs.filter((o) => o.contentId === c.id && !o.archived);
  const ready = c.status === 'Ready';
  const markReady = () => commitWs((w) => outs.reduce((acc, o) => (o.publishedDate || o.scheduledDate ? acc : M.updateRecord(acc, 'outputs', o.id, { status: 'Ready' })),
    M.updateRecord(w, 'content', c.id, { status: 'Ready' })));
  return card(ready ? 'Ready to release' : 'Finished?', [
    el('p', { class: 'small muted', text: ready ? `In the release backlog with ${outs.length} platform output${outs.length === 1 ? '' : 's'}. Releases → Release rhythm books it into the next open slot.`
      : 'When the edit is done, move it to the release backlog. Its platform outputs wait there for the next open slot.' }),
    ready ? button('Releases', () => go('#/releases'), 'small') : button('Mark ready to release', markReady, 'primary', { 'data-field': 'prod.ready' }),
  ]);
}

/** Redo a finished (or published) video without losing it: the old file goes into the versions list. */
function versionCard(c) {
  const versions = c.versions || [];
  if (!c.finalVideo && !versions.length) return null;
  const what = el('select', { class: 'input input--inline', 'data-field': 'ver.what', 'aria-label': 'What you are redoing' },
    Object.entries(REDO).map(([k, r]) => el('option', { value: k, text: r.name })));
  const note = el('input', { class: 'input', placeholder: 'Why? e.g. a new opening that meets the viewer where they are', 'data-field': 'ver.note' });
  const start = () => {
    const r = REDO[what.value];
    commitWs((w) => newVersion(w, c.id, what.value, note.value), { render: false });
    toast(c.finalVideo ? `Version ${versions.length + 1} kept. ${r.name}: start in the ${r.step === 'edit' ? 'Edit' : 'Record'} step.` : `${r.name}: start in the ${r.step === 'edit' ? 'Edit' : 'Record'} step.`);
    go(`#/content/${c.id}/${r.step}`);
  };
  return card('Make a new version', [
    el('p', { class: 'small muted', text: 'Found something to improve - before or after release? Start a new version. The current finished file is kept in the list below (and what was published stays on record); only what you redo is cleared.' }),
    el('div', { class: 'row' }, [el('label', { class: 'small' }, ['Redo ', what])]),
    note,
    el('div', { class: 'row' }, [button('Start a new version', start, '', { 'data-field': 'ver.start' }),
      el('span', { class: 'small muted', text: 'A section redo: record just that section; Claude stitches it in.' })]),
    versions.length ? el('h3', { class: 'small', text: 'Earlier versions' }) : null,
    versions.length ? el('ol', { class: 'plain stack stack--tight' }, versions.map((v) => el('li', { class: 'small' }, [
      el('strong', { text: `v${v.n}` }), ` · ${v.status || '-'} until ${v.ended} · redo: ${REDO[v.redo]?.name.toLowerCase() || v.redo}${v.note ? ` - ${v.note}` : ''}`,
      el('div', {}, [el('code', { class: 'small', text: v.file })])]))) : null,
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
      button('Log a publication', () => createAndOpen('publications', { title: `${outputLabel(ws, o)} - ${o.title}`, outputId: o.id, date: M.todayIso(), url: o.publishedUrl || '' }), 'small'),
    ]);
  }));
}

function performanceSection(c, ws) {
  const outIds = new Set(ws.records.outputs.filter((o) => o.contentId === c.id).map((o) => o.id));
  const fb = ws.records.feedback.filter((f) => f.contentId === c.id || outIds.has(f.outputId));
  return card('Performance and feedback', [
    fb.length ? el('ul', { class: 'plain' }, fb.map((f) => el('li', {}, [recordLink('feedback', f), el('span', { class: 'small muted', text: f.date ? ` · ${f.date}` : '' })])))
      : el('p', { class: 'muted', text: 'No feedback recorded yet.' }),
    button('Add feedback', () => createAndOpen('feedback', { title: `Feedback: ${c.workingTitle}`, contentId: c.id, date: M.todayIso() })),
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

/** Every platform version on one page: title, caption, hashtags, date and status, edited in place. */
function publishOutputs(c, ws) {
  const outs = ws.records.outputs.filter((o) => o.contentId === c.id && !o.archived);
  const set = (o, k, render = false) => (e) => commitWs((w) => M.updateRecord(w, 'outputs', o.id, { [k]: e.target.value }), { render });
  const field = (label, control) => el('label', { class: 'field' }, [el('span', { class: 'field__label', text: label }), control]);
  const create = outputsSection(c, ws).querySelector('.newout, .empty');
  return card('Where it goes out', [
    el('p', { class: 'muted small', text: 'One version per platform and format. Each starts from this item and can be rewritten without touching it.' }),
    ...outs.map((o) => el('div', { class: 'block publish-out' }, [
      el('div', { class: 'row' }, [el('strong', { text: outputLabel(ws, o) }), badge(o.status || 'no status', 'status'),
        masterDrift(o, c).length ? badge('master changed', 'warn') : null, el('span', { class: 'row__push' }),
        o.publishedDate ? el('span', { class: 'small text-ok', text: `Out ${o.publishedDate}` })
          : button('Released ✓', () => commitWs((w) => markReleased(w, o.id, M.todayIso())), 'small', { 'data-field': `pub.${o.id}.released`, title: 'It went out today - record it on this date' }),
        el('a', { class: 'small', href: href('outputs', o.id), text: 'Open the full version page' })]),
      el('div', { class: 'two' }, [
        field('Title', el('input', { class: 'input', value: o.title || '', 'data-field': `pub.${o.id}.title`, on: { change: set(o, 'title') } })),
        el('div', { class: 'two' }, [
          field('Release date', el('input', { class: 'input', type: 'date', value: o.scheduledDate || '', 'data-field': `pub.${o.id}.date`, on: { change: set(o, 'scheduledDate', true) } })),
          field('Status', el('select', { class: 'input', 'data-field': `pub.${o.id}.status`, on: { change: set(o, 'status', true) } },
            ws.config.statuses.outputs.map((x) => el('option', { value: x, text: x, selected: x === o.status })))),
        ]),
      ]),
      field('Caption / description', el('textarea', { class: 'input', rows: 4, value: o.caption || '', 'data-field': `pub.${o.id}.caption`, on: { change: set(o, 'caption') } })),
      field('Hashtags / tags', el('input', { class: 'input', value: o.hashtags || '', 'data-field': `pub.${o.id}.hashtags`, on: { change: set(o, 'hashtags') } })),
    ])),
    !outs.length ? el('p', { class: 'muted', text: 'No platform versions yet.' }) : null,
    create,
  ]);
}

/** Every way to take this item out of the app, in one place. */
function exportCard(c, ws) {
  const product = EXTRA_TYPES.includes(c.contentType);
  return card('Export', [
    el('p', { class: 'muted small', text: 'Files download to this device. Nothing is uploaded.' }),
    el('div', { class: 'row' }, [
      product ? button('Brief for Claude to make it (.md)', () => download(new Blob([productBrief(ws, c.id)], { type: 'text/markdown' }), `${slug(c.workingTitle)}_make-it.md`), 'primary', { 'data-field': 'step.export.product' }) : null,
      button('Download brief (.md)', () => download(new Blob([assistantBrief(ws, c.id)], { type: 'text/markdown' }), `${slug(c.workingTitle)}_brief.md`), product ? '' : 'primary', { 'data-field': 'step.export.md' }),
      button('Copy brief', () => copyText(assistantBrief(ws, c.id), 'Brief copied')),
      button('Package (.zip)', () => { const pkg = contentPackage(ws, c.id); download(new Blob([zip(pkg.files)], { type: 'application/zip' }), `${pkg.root}.zip`); }),
    ]),
  ]);
}

/** For items that are made rather than recorded: Claude makes it from the brief. */
function makeCard(c, ws) {
  return card('Make it', [
    el('p', { class: 'small muted', text: 'Download the brief, upload it to Claude, and it proposes the outline and design before it builds. It carries the blocks, your notes and research, the videos this is built from (Idea step → Built from), your brand (Settings → Voice and branding) and the graphics to make.' }),
    button('Brief for Claude to make it (.md)', () => download(new Blob([productBrief(ws, c.id)], { type: 'text/markdown' }), `${slug(c.workingTitle)}_make-it.md`), 'primary', { 'data-field': 'make.brief' }),
  ]);
}

/** After recording: where the file goes, the prompt that starts the edit, what happens next. */
function editCard(c, ws) {
  const where = `${sync.name || 'your private folder'}/${recordingFolder(ws, c)}`;
  const prompt = editPrompt(ws, c);
  const live = folderReady();
  const tree = K.folderTree(capKinds(ws), c);
  const main = (c.captures || []).find((x) => x.kind === 'main');
  return card('Edit with Claude', [
    el('p', { class: 'small', text: '1. Make the folder for this video:' }),
    el('div', { class: 'row' }, [el('code', { class: 'path-box', text: where }), button('Copy folder', () => copyText(where, 'Folder copied'), 'small', { 'data-field': 'edit.folder' })]),
    el('div', { class: 'row' }, live
      ? [button('Make the folder', async () => { await makeFolders(tree); toast(`Folder ready: ${where}`); }, 'primary', { 'data-field': 'edit.mkdirs' }),
        el('span', { class: 'small muted', text: 'Safe to press again - nothing in it is touched.' })]
      : [folderSupported()
        ? el('span', { class: 'small muted' }, ['Create it in your Drive by hand, or connect your folder (', el('a', { href: '#/settings', text: 'Settings' }), ' → Your private folder) and the app makes it for you.'])
        : button('Download the folder tree (.zip)', () => downloadTree(K.contentFolder(c).split('/').pop(), tree), '', { 'data-field': 'edit.zip' })]),
    el('p', { class: 'small', text: '2. Export your recording from Audacity as a WAV (File → Export Audio) into that folder.' }),
    live && main ? el('div', { class: 'row' }, [
      button('Check it is there', () => checkFolder(c, ws).catch((e) => toast(`Could not read the folder: ${e.message}`)), '', { 'data-field': 'edit.check' }),
      main.status === 'saved' ? el('span', { class: 'small text-ok', text: `Found: ${main.file}` }) : null]) : null,
    el('p', { class: 'small', text: (c.versions || []).length && !c.finalVideo
      ? `3. This is version ${(c.versions.at(-1).n || 0) + 1}: paste this into the Claude Code chat that made version ${c.versions.at(-1).n} (or a new one) - it fixes only what changed. Put the file name where it says [file name]:`
      : '3. Start a new session in Claude Code and paste this - put the file name where it says [file name]:' }),
    el('pre', { class: 'prompt-box', text: prompt }),
    button('Copy the prompt for Claude', () => copyText(prompt, 'Prompt copied - paste it into a new Claude Code session'), 'primary', { 'data-field': 'edit.prompt' }),
    el('p', { class: 'small muted', text: '4. Claude shows you the cut list, renders the video and puts its path below as the finished video.' }),
    el('p', { class: 'small', text: '5. Watch it in Review: reword text on the cards, switch off what you don\'t want (a stray arrow, a sound), comment on any moment - then copy one prompt back to Claude. Happy with it? Mark ready to release.' }),
    button('Review the finished video', () => openReview(c), c.finalVideo ? 'primary' : '', { 'data-field': 'edit.review' }),
  ]);
}

/** The capture list, folded away: what has to exist (your voice take, the graphics, music) before the edit can start. */
function filesForEdit(c, ws) {
  const prog = K.captureProgress(c.captures || []);
  return more(`Files for the edit: ${prog.saved} of ${prog.total} saved`, [
    el('p', { class: 'small muted', text: 'Everything the edit needs besides your words: your voice take, the graphics and the music. Each has a fixed folder in your Drive so Claude finds it. Your part is usually just number 1 - the voice recording; the rest is made in the edit.' }),
    productionCaptures(c, ws),
    more('Change the list', [captureSection(c, ws)]),
  ], !(c.captures || []).length);
}

const more = (summary, kids, open = false) => el('details', { class: 'more more--card', open }, [el('summary', { text: summary }), ...kids]);

export function contentEditor(id, section = 'idea') {
  const ws = currentWs();
  const c = M.getRecord(ws, 'content', id);
  if (!c) return emptyState('Not found', 'This content item no longer exists.', [button('Content library', () => go('#/library'))]);
  const step = stepOf(section);
  const rec = isRecorded(c);
  const plain = patch('content', id);
  // choosing a series hands out its next number, for every part at once
  const p = (q, render) => ('series' in q ? commitWs((w) => setSeries(w, id, q.series), { render: true }) : plain(q, render));
  const form = (group) => recordForm('content', c, ws, p, { section: step, group });
  const { gaps, next, state } = readiness(ws, c);
  const n = STEPS.findIndex(([s]) => s === step);
  const label = (st) => (rec ? st[1] : st[2]);
  const blocks = c.story?.blocks || [];
  const addRef = () => { let made; commitWs((w) => { const r = M.createRecord(w, 'references', { title: 'New reference', status: w.config.statuses.references[0] }); made = r.record; return M.setLink(r.ws, 'content', id, 'referenceIds', made.id, true); }, { render: false }); go(href('references', made.id)); };
  const addAsset = () => { let made; commitWs((w) => { const r = M.createRecord(w, 'assets', { name: 'New asset', status: w.config.statuses.assets[0] }); made = r.record; return M.setLink(r.ws, 'content', id, 'assetIds', made.id, true); }, { render: false }); go(href('assets', made.id)); };
  const assets = () => card('Assets', [linkEditor('content', c, ws, link('content', id), { only: ['assetIds'] }), button('New asset', addAsset, 'small')]);

  const body = {
    idea: () => [card('', [form()]), seriesCard(c, ws),
      card('Built from and links', [linkEditor('content', c, ws, link('content', id), { only: ['sourceIds', 'ideaIds', 'projectIds'] }),
        el('p', { class: 'small muted', text: 'Built from: the videos an e-book sums up, or the master a short comes from - their material goes into the briefs. No project linked means standalone, which is fine.' })]),
      assistantPanel('content', c, ws)],
    card: () => [card('', [form()]), storyEditor('content', c, ws),
      more('Hook ideas, alternatives and the ending', [form('hooks')]),
      more('Research and claims to check', [form('research'), linkEditor('content', c, ws, link('content', id), { only: ['referenceIds'] }), button('New reference', addRef, 'small')], !!c.claimsToVerify),
      more('Overall look and visual notes', [form('look')]),
      more(blocks.length ? 'Script text (only if you write one out in full)' : 'Script text', [form('script')], !blocks.length),
      assistantPanel('content', c, ws)],
    record: () => (rec
      ? [prompterCard(c), card('', [form()]), workflowPanel('content', c, ws), assets()]
      : [makeCard(c, ws), card('', [form()]), workflowPanel('content', c, ws), assets()]),
    edit: () => (rec ? [editCard(c, ws), filesForEdit(c, ws), card('', [form()]), readyCard(c, ws), versionCard(c)] : [card('', [form()]), readyCard(c, ws), versionCard(c)]),
    publish: () => [publishOutputs(c, ws), exportCard(c, ws), more('Log what was published', [publishingSection(c, ws)])],
    results: () => [performanceSection(c, ws), card('', [form()]), versionCard(c), historySection(c), backlinks('content', id, ws), card('', [recordActions('content', c, '#/library')])],
  }[step];

  const here = gaps[step];
  const look = lookFor(ws, c.audience);
  return el('div', { class: `detail${look ? ' detail--look' : ''}`, style: look ? { '--look-main': look.main, '--look-accent': look.accent } : null }, [
    detailHeader('content', c, [el('a', { href: '#/plan', text: 'Videos' })]),
    familyNav(c, ws, step),
    el('nav', { class: 'steps-nav', 'aria-label': 'Steps' }, STEPS.map((st, i) => {
      const left = gaps[st[0]].length, now = state[st[0]];
      const sub = now === 'todo' ? `${left} to do` : now === 'booked' ? 'set - not out yet' : now === 'later' ? 'after release' : null;
      return el('a', { class: `steps-nav__step${st[0] === step ? ' is-here' : ''} is-${now}`, href: `#/content/${id}/${st[0]}`,
        'aria-current': st[0] === step ? 'step' : null, 'data-field': `step.${st[0]}` }, [
        el('span', { class: 'steps-nav__n', text: now === 'done' ? '✓' : String(i + 1) }),
        el('span', { class: 'steps-nav__label', text: label(st) }),
        sub ? el('span', { class: `steps-nav__left${now === 'todo' ? '' : ' steps-nav__left--quiet'}`, text: sub }) : null,
      ]);
    })),
    el('div', { class: 'card step-head' }, [
      el('p', { class: 'step-head__what', text: STEPS[n][3] }),
      here.length ? el('ul', { class: 'step-head__gaps' }, here.map((g) => el('li', { text: g })))
        : state[step] === 'later' ? el('p', { class: 'small muted', text: 'Nothing to do here until it is out - then note how it did.' })
        : state[step] === 'booked' ? el('p', { class: 'small muted', text: 'Everything is set; this ticks when it is published.' })
        : el('p', { class: 'small text-ok', text: 'Nothing missing in this step.' }),
      el('div', { class: 'row' }, [
        next && next.step !== step ? el('a', { class: 'btn', href: `#/content/${id}/${next.step}`, 'data-field': 'step.next-gap' }, [`Next to do: ${next.text} →`]) : null,
        !here.length && n < STEPS.length - 1 ? el('a', { class: 'btn btn-primary', href: `#/content/${id}/${STEPS[n + 1][0]}`, 'data-field': 'step.next' }, [`Next step: ${label(STEPS[n + 1])} →`]) : null,
        !next ? el('span', { class: 'small text-ok', text: 'Everything is in place.' }) : null,
      ]),
    ]),
    ...body().filter(Boolean),
  ]);
}

/** One tap between the full video and its parts, staying on the same step. */
function familyNav(c, ws, step) {
  const { full, parts } = familyOf(ws, c);
  if (!parts.length) return null;
  const item = (x, text) => el('a', { class: `family__item${x.id === c.id ? ' is-here' : ''}`, href: `#/content/${x.id}/${step}`,
    'aria-current': x.id === c.id ? 'page' : null, title: x.workingTitle, 'data-field': `family.${x.id}` }, [text]);
  return el('nav', { class: 'family', 'aria-label': 'The full video and its parts' }, [
    el('span', { class: 'small muted family__label', text: 'Working on:' }),
    full ? item(full, 'Full video') : null,
    ...parts.map((x, i) => item(x, `Part ${x.part || i + 1}`)),
  ]);
}

/* --------------------------------------------------------- series & parts */

function seriesCard(c, ws) {
  const label = seriesLabel(ws, c);
  const parts = partsOf(ws, c);
  const place = categoryPlace(ws, c);
  const cuts = madeFrom(ws, c);
  const cat = ws.config.categories.find((x) => x.id === c.categoryId);
  const look = lookFor(ws, c.audience);
  const seriesSel = el('select', { class: 'input input--inline', 'data-field': 'content.seriesPick',
    on: { change: (e) => commitWs((w) => setSeries(w, c.id, e.target.value)) } },
    [el('option', { value: '', text: 'No series' }), ...ws.config.series.map((s) => el('option', { value: s, text: s, selected: s === c.series }))]);
  return card('Series & parts', [
    label ? el('p', { class: 'series-label', text: label }) : null,
    el('div', { class: 'row' }, [
      el('label', { class: 'small' }, ['Series ', seriesSel]),
      c.series ? el('label', { class: 'small' }, ['Number ', el('input', { class: 'input input--inline input--num', type: 'number', min: 1, step: 1, value: c.episode ?? '',
        'data-field': 'content.episode', on: { change: (e) => commitWs((w) => setEpisode(w, c.id, e.target.value === '' ? '' : Number(e.target.value))) } })]) : null,
      c.series ? el('span', { class: 'small muted', text: `next free: #${nextEpisode(ws, c.series)}` }) : null,
    ]),
    !ws.config.series.length ? el('p', { class: 'small muted' }, ['Add your series in ', el('a', { href: '#/settings', text: 'Settings' }), '; each one keeps its own count.']) : null,
    place ? el('p', { class: 'small muted', text: `Video ${place.n} of ${place.of} in ${cat?.name || 'this category'}.` }) : null,
    parts.length > 1 ? el('ol', { class: 'parts' }, parts.map((x) => el('li', {}, [x.id === c.id ? el('strong', { text: x.workingTitle }) : el('a', { href: `#/content/${x.id}`, text: x.workingTitle }), ' ', badge(x.status || '-', 'status')]))) : null,
    cuts.length ? el('p', { class: 'small', text: `Cut into ${cuts.length} short${cuts.length > 1 ? 's' : ''}:` }) : null,
    cuts.length ? el('ol', { class: 'parts' }, cuts.map((x) => el('li', {}, [el('a', { href: `#/content/${x.id}`, text: x.workingTitle }), ' ', badge(x.status || '-', 'status')]))) : null,
    el('div', { class: 'row' }, [button('Add part', () => {
      let made; commitWs((w) => { const r = addPart(w, c.id); made = r.record; return r.ws; }, { render: false }); go(`#/content/${made.id}`);
    }, '', { 'data-field': 'content.addPart', title: 'Split this topic into another part under the same series number' }),
      el('span', { class: 'small muted', text: 'Same topic, same series number - Part 1, 2, 3.' })]),
    look ? el('div', { class: 'look' }, [el('span', { class: 'small', text: `Look for "${c.audience}": ` }),
      el('span', { class: 'swatch', style: { background: look.main }, title: look.main }), el('code', { class: 'small', text: look.main }),
      el('span', { class: 'swatch', style: { background: look.accent }, title: look.accent }), el('code', { class: 'small', text: look.accent })])
      : c.audience ? el('p', { class: 'small muted' }, [`"${c.audience}" has no colours yet - `, el('a', { href: '#/settings', text: 'give it a look' }), '.']) : null,
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
