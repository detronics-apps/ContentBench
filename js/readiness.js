// The five steps of one content item, and what is still missing in each. Pure - no DOM.
// The video page shows these as its tabs, with a tick or a count, and lists the gaps with the fix one click away.
import { EXTRA_TYPES } from './extras.js';
import { parseSeconds } from './workflow.js';

/** Items that are written or designed rather than recorded (no teleprompter, no captures). */
const MADE_NOT_RECORDED = new Set([...EXTRA_TYPES, 'Article', 'Carousel', 'Reference sheet']);
export const isRecorded = (c) => !MADE_NOT_RECORDED.has(c.contentType);

/** [id, label for a recorded item, label for a made item, one line on what the step is for] */
export const STEPS = [
  ['idea', 'Idea', 'Idea', 'What it is, who it is for, what they get - and why it is made this way.'],
  ['card', 'Card', 'Outline', 'The structure: each block with its talking points, what is on screen and why it is there.'],
  ['record', 'Record', 'Make', 'Record it with the teleprompter (or make it with Claude), with everything it needs.'],
  ['publish', 'Publish', 'Publish', 'Every platform version: caption, hashtags, release date - and the exports.'],
  ['results', 'Results', 'Results', 'How it did, feedback and notes for next time.'],
];

/** Old section names still land somewhere sensible (bookmarks, links from other pages). */
export const SECTION_ALIAS = { overview: 'idea', concept: 'idea', story: 'card', script: 'card', hooks: 'card', research: 'card',
  capture: 'record', production: 'record', outputs: 'publish', publishing: 'publish', performance: 'results', history: 'results' };
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
      !['Ready', 'Published'].includes(c.status) && 'Make it: download the brief for Claude, then mark it ready',
    ],
    publish: outs.length ? [
      ...outs.filter((o) => !String(o.caption || '').trim()).map((o) => `Caption for ${label(o)}`),
      ...outs.filter((o) => !o.scheduledDate && !o.publishedDate).map((o) => `Release date for ${label(o)}`),
    ] : ['Add a platform version (where it goes out)'],
    results: [],
  };
  const out = Object.fromEntries(Object.entries(gaps).map(([k, v]) => [k, v.filter(Boolean)]));
  const first = STEPS.find(([id]) => out[id].length);
  return { gaps: out, next: first ? { step: first[0], text: out[first[0]][0] } : null };
}
