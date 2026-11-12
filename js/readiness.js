// The six steps of one content item, and what is still missing in each. Pure - no DOM.
// The video page shows these as its tabs, with a tick or a count, and lists the gaps with the fix one click away.
import { EXTRA_TYPES } from './extras.js';
import { parseSeconds } from './workflow.js';
import { capturePath, contentFolder } from './capture.js';
import { withFolder, recordingFile } from './content.js';

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
/** Shown at Expert in each step's header: how this step connects to the rest of the app. */
export const STEP_CONNECTS = {
  idea: 'The category sets the colour family of the edit; the title, what the viewer gets and the central idea feed the AI prompts, the brief export and every platform version. A short made from a longer video names it under Built from - that links the family strip under the title.',
  card: 'The blocks are the script: the teleprompter reads them line by line (» read word for word, - talk around it), the edit prompt and the storyboard follow them, and their words set the timing. Lessons for this step show at the bottom.',
  record: 'Each saved take writes its cut points to Recording notes; the edit uses the latest. Redoing one section keeps the first take, because the parts that stay are still cut from it.',
  edit: 'The folder comes from the capture kinds (Settings at Expert). The prompt is built from the card, the take and the platform shapes; the storyboard and the finished video come back as review files you open here. A new version keeps the old file in the versions list.',
  publish: 'Each platform version with a date joins the release line (Videos → Next to release). A missed day moves that platform\'s line on; a past day dropped on the calendar, or Released ✓, records the real date - and counts towards the weekly aim and the achievements.',
  results: 'Feedback or a logged publication ticks this step. Channel stats (Performance) feed the achievements and the weekly progress check-ins; an issue written down under Lessons becomes a check on every video.',
};

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
      (c.captures || []).some((x) => x.kind === 'main' && x.status === 'needed') && 'Make the folder and export the recording into it (Edit with Claude, steps 1-2)',
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
  const cf = withFolder(ws, c);
  return main ? capturePath(ws.config.captureKinds || [], cf, main).dir : contentFolder(cf);
}

/** The sentence that starts an editing session in Claude Code (the faceless-video skill does the rest). */
export function editPrompt(ws, c) {
  const outs = ws.records.outputs.filter((o) => o.contentId === c.id && !o.archived);
  const ratio = (o) => ws.platforms.find((p) => p.id === o.platformId)?.formats.find((f) => f.id === o.formatId)?.aspectRatio || '';
  const shapes = [outs.some((o) => /9:16/.test(ratio(o))) && 'vertical (9:16)', outs.some((o) => /16:9/.test(ratio(o))) && 'landscape (16:9)'].filter(Boolean);
  const takes = (c.recordingNotes || '').match(/^Teleprompter take[^\n]*/gm) || [];
  const shape = (shapes.length ? shapes : ['vertical (9:16)']).join(' and the ');
  // the storyboard stop: reviewed in ContentBench (Edit -> Review the storyboard) before anything renders
  const board = `At the storyboard stop, export it for me to review in ContentBench: node review.mjs storyboard <the edit folder> "<my private folder>/${contentFolder(withFolder(ws, c))}/08_Export/${c.workingTitle.replace(/[\\/:*?"<>|]/g, '')} - storyboard.review.json". I'll send my review back.`;
  const v = (c.versions || []).at(-1);
  if (v && !c.finalVideo) {
    // a new version: fix the delta only, ideally in the chat that made the last one
    const what = {
      section: `New recording of just the changed section: my private folder under ${recordingFolder(ws, c)}/${recordingFile(ws, c)}. Cut it from its take, splice it into the cleaned voice of v${v.n} at a natural pause with a short crossfade, re-run words and mouth on the joined file, and rewrite only that section's scenes. Every other scene, the cut, the look, the sounds and the music stay as they are.`,
      edit: 'Same recording as before. Change only what is described above; keep the cut, the voice and every other scene.',
      // a new voice changes every word time and mouth shape: the machine steps run again in full (they cost no tokens);
      // what is reused is the scene design, which is anchored to words and so follows the new pacing by itself
      all: `A new full take: my private folder under ${recordingFolder(ws, c)}/${recordingFile(ws, c)}. Run every step again on the new voice - cut list, clean-up, words and mouth, render - so nothing drifts out of sync. Reuse v${v.n}'s scene design as the starting point: its scenes are anchored to words, so they follow the new pacing; redo the scenes the build reports as broken (an anchor word I no longer say) and those of the sections that changed, and check every scene against stills before rendering - a word said earlier or more often can pin a scene to the wrong moment without an error. Keep the look, the sound kit and the music.`,
    }[v.redo] || '';
    return [
      v.redo === 'all'
        ? `Use the faceless-video skill to make version ${v.n + 1} of "${c.workingTitle}" from ContentBench - a full new take, reusing what still fits.`
        : `Use the faceless-video skill to make version ${v.n + 1} of "${c.workingTitle}" from ContentBench - fix the delta only, don't redo the video.`,
      `Version ${v.n} is ${v.file} - keep it; render the new one beside it, never overwrite.`,
      `What changed: ${(v.note || '[say what changed]').replace(/([^.!?])$/, '$1.')}`,
      what,
      ...(() => {
        const name = (t) => t.replace(/^Teleprompter take - /, '');
        if (v.redo === 'all') return takes.length ? [`The new take's cut points are in its recording notes (${name(takes.at(-1))}).`] : [];
        if (v.redo === 'section') return takes.length ? [`Recording notes: the first take (${name(takes[0])}) still cuts the parts that stay${takes.length > 1 ? `; the latest (${name(takes.at(-1))}) is the new section` : ''}.`] : [];
        return [];
      })(),
      `The card in ContentBench is the script to follow. Show me ${v.redo === 'all' ? 'the cut list and which scenes you redid' : 'the changed part of the cut list'}.`,
      board,
      `Render the ${shape} version after my OK, and export its review file.`,
      'When it is done, put the new path in the Edit step (Finished video) and set the status to Review.',
    ].filter(Boolean).join(' ');
  }
  return [
    `Use the faceless-video skill to edit "${c.workingTitle}" from ContentBench.`,
    `The recording is in my private folder under ${recordingFolder(ws, c)}/${recordingFile(ws, c)}.`,
    takes.length ? `Use the latest teleprompter take in its recording notes (${takes.at(-1).replace(/^Teleprompter take - /, '')}).` : 'There are no saved cut points; work from the transcript.',
    'Clean up the retakes and pauses and show me the cut list.',
    board,
    `Render the ${shape} version after my OK, and export its review file.`,
    'When it is done, put the finished video\'s path in its Edit step (Finished video) and set the status to Review.',
  ].join(' ');
}
