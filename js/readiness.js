// The six steps of one content item, and what is still missing in each. Pure - no DOM.
// The video page shows these as its tabs, with a tick or a count, and lists the gaps with the fix one click away.
import { EXTRA_TYPES } from './extras.js';
import { parseSeconds } from './workflow.js';
import { capturePath, contentFolder } from './capture.js';

/** Items that are written or designed rather than recorded (no teleprompter, no captures). */
const MADE_NOT_RECORDED = new Set([...EXTRA_TYPES, 'Article', 'Carousel', 'Reference sheet']);
export const isRecorded = (c) => !MADE_NOT_RECORDED.has(c.contentType);

/** [id, label for a recorded item, label for a made item, one line on what the step is for] */
export const STEPS = [
  ['idea', 'Idea', 'Idea', 'What it is, who it is for, what they get - and why it is made this way.'],
  ['card', 'Card', 'Outline', 'The structure: each block with its talking points, what is on screen and why it is there.'],
  ['record', 'Record', 'Make', 'Record it with the teleprompter (or make it with Claude), with everything it needs.'],
  ['edit', 'Edit', 'Review', 'Put the recording in its folder, have Claude edit it, check the finished video - then mark it ready.'],
  ['publish', 'Publish', 'Publish', 'Every platform version: caption, hashtags, release date - and the exports.'],
  ['results', 'Results', 'Results', 'How it did, feedback and notes for next time.'],
];

/** Old section names still land somewhere sensible (bookmarks, links from other pages). */
export const SECTION_ALIAS = { overview: 'idea', concept: 'idea', story: 'card', script: 'card', hooks: 'card', research: 'card',
  capture: 'record', production: 'record', editing: 'edit', review: 'edit', outputs: 'publish', publishing: 'publish', performance: 'results', history: 'results' };
export const stepOf = (section) => (STEPS.some(([id]) => id === section) ? section : SECTION_ALIAS[section] || 'idea');

const PLACEHOLDER = /^(untitled|new )/i;

/** { [step]: [what is missing] } plus `next` - the first gap in step order, or null when nothing is missing. */
export function readiness(ws, c) {
  const rec = isRecorded(c);
  const blocks = c.story?.blocks || [];
  const outs = ws.records.outputs.filter((o) => o.contentId === c.id && !o.archived);
  const label = (o) => {
    const p = ws.platforms.find((x) => x.id === o.platformId);
    return [p?.name, p?.formats.find((f) => f.id === o.formatId)?.name].filter(Boolean).join(' ') || 'an output';
  };
  const gaps = {
    idea: [
      (!c.workingTitle || PLACEHOLDER.test(c.workingTitle)) && 'Give it a working title',
      !c.viewerPromise && `Say what the ${rec ? 'viewer' : 'reader'} gets from it`,
      !c.centralMessage && 'Write the central idea in one line',
      !c.categoryId && 'Pick a category',
    ],
    card: blocks.length ? [
      blocks.some((b) => !String(b.script || '').trim()) && `${blocks.filter((b) => !String(b.script || '').trim()).length} block(s) have no talking points yet`,
      rec && !/^\s*»/m.test(blocks[0]?.script || '') && 'Write the hook as a » line to read word for word (first block)',
      rec && blocks.some((b) => parseSeconds(b.duration) === null) && 'Give every block a duration',
    ] : ['Pick a structure (the blocks are the script)'],
    record: rec ? [
      !((c.captures || []).some((x) => x.kind === 'main' && x.status !== 'needed') || /Teleprompter take/.test(c.recordingNotes || '')) && 'Record it - open the teleprompter',
    ] : [
      !['Review', 'Ready', 'Published'].includes(c.status) && !c.finalVideo && 'Make it: download the brief for Claude',
    ],
    edit: rec ? [
      (c.captures || []).some((x) => x.kind === 'main' && x.status === 'needed') && 'Put the recording in its folder (Files for the edit, number 1)',
      !c.finalVideo && 'Edit it: copy the prompt for Claude - then the finished video goes here',
      c.finalVideo && !['Ready', 'Published'].includes(c.status) && 'Watch it, then mark it ready to release',
    ] : [
      !c.finalVideo && 'Add the finished file (where Claude saved it)',
      c.finalVideo && !['Ready', 'Published'].includes(c.status) && 'Check it, then mark it ready to release',
    ],
    publish: outs.length ? [
      ...outs.filter((o) => !String(o.caption || '').trim()).map((o) => `Caption for ${label(o)}`),
      ...outs.filter((o) => !o.scheduledDate && !o.publishedDate).map((o) => `Release date for ${label(o)}`),
    ] : ['Add a platform version (where it goes out)'],
    results: [],
  };
  // a tick means finished: Publish only once it is out, Results only once there are results
  const published = outs.length > 0 && outs.every((o) => o.publishedDate || o.status === 'Published');
  const outIds = new Set(outs.map((o) => o.id));
  const hasResults = ws.records.feedback.some((f) => f.contentId === c.id || outIds.has(f.outputId))
    || ws.records.publications.some((x) => outIds.has(x.outputId));
  if (published && !hasResults) gaps.results.push('Note how it did (feedback or a logged publication)');
  const out = Object.fromEntries(Object.entries(gaps).map(([k, v]) => [k, v.filter(Boolean)]));
  const state = Object.fromEntries(STEPS.map(([id]) => [id, out[id].length ? 'todo' : 'done']));
  if (state.publish === 'done' && !published) state.publish = 'booked';
  if (!published) state.results = 'later';   // planned feedback records don't count before it is out
  const first = STEPS.find(([id]) => out[id].length);
  return { gaps: out, state, next: first ? { step: first[0], text: out[first[0]][0] } : null };
}

/** Where the voice recording goes, relative to the private folder. */
export function recordingFolder(ws, c) {
  const main = (c.captures || []).find((x) => x.kind === 'main');
  return main ? capturePath(ws.config.captureKinds || [], c, main).dir : contentFolder(c);
}

/** The sentence that starts an editing session in Claude Code (the faceless-video skill does the rest). */
export function editPrompt(ws, c) {
  const outs = ws.records.outputs.filter((o) => o.contentId === c.id && !o.archived);
  const ratio = (o) => ws.platforms.find((p) => p.id === o.platformId)?.formats.find((f) => f.id === o.formatId)?.aspectRatio || '';
  const shapes = [outs.some((o) => /9:16/.test(ratio(o))) && 'vertical (9:16)', outs.some((o) => /16:9/.test(ratio(o))) && 'landscape (16:9)'].filter(Boolean);
  const takes = (c.recordingNotes || '').match(/^Teleprompter take[^\n]*/gm) || [];
  return [
    `Use the faceless-video skill to edit "${c.workingTitle}" from ContentBench.`,
    `The recording is in my private folder under ${recordingFolder(ws, c)}/ - [file name].`,
    takes.length ? `Use the latest teleprompter take in its recording notes (${takes.at(-1).replace(/^Teleprompter take - /, '')}).` : 'There are no saved cut points; work from the transcript.',
    'Clean up the retakes and pauses and show me the cut list before rendering.',
    `Then render the ${(shapes.length ? shapes : ['vertical (9:16)']).join(' and the ')} version.`,
    'When it is done, put the finished video\'s path in its Edit step (Finished video) and set the status to Review.',
  ].join(' ');
}
