// The whole process as a flowchart: steps, decisions and where each choice goes. Pure - no DOM.
// Two ways through it: automated (Claude Code connected to the private folder fills the data in) and manual (copy
// the prompts and briefs to any editor, AI or person, and fill the results in yourself). `text` is the same for both;
// `auto` / `manual` replace it where the two differ.

export const TRACKS = { auto: 'Automated - Claude connected', manual: 'Manual - any editor' };

/** kind: 'step' (then `next`) or 'choice' (then `choices`: [label, target id]). Keep every text short. */
export const FLOW = [
  { id: 'idea', kind: 'step', title: 'Idea', where: 'Planning → Thoughts, then Videos',
    text: 'Drop the thought. Make it a video. Say what the viewer gets.', next: 'big' },
  { id: 'big', kind: 'choice', title: 'Big topic?', where: 'Idea step',
    choices: [['Yes - split it', 'parts'], ['No - one video', 'card']] },
  { id: 'parts', kind: 'step', title: 'Parts first', where: 'Idea → Series & parts',
    text: 'TikTok parts, each a full episode. The full video comes after the last part.', next: 'card' },
  { id: 'card', kind: 'step', title: 'Card', where: 'Video → 2 Card',
    auto: 'Ask Claude to write the card (my-script-writing). It fills the blocks.',
    manual: 'Fill the blocks yourself, or copy an AI prompt from the card.', next: 'rehearse' },
  { id: 'rehearse', kind: 'step', title: 'Read it through', where: 'Record → Open the teleprompter (preview)',
    text: 'Read it aloud. Reword, add, move or remove lines - the timing follows.', next: 'record' },
  { id: 'record', kind: 'step', title: 'Record', where: 'Video → 3 Record',
    text: 'Teleprompter → Start → record in Audacity → Save take.', next: 'line' },
  { id: 'line', kind: 'choice', title: 'A line came out better?', where: 'Teleprompter',
    choices: [['Yes - ✎ reword it, retake', 'record'], ['No', 'folder']] },
  { id: 'folder', kind: 'step', title: 'Folder', where: 'Video → 4 Edit',
    auto: 'Make the folder → export the WAV into it → Check it is there.',
    manual: 'Download the folder tree → save the WAV in it.', next: 'edit' },
  { id: 'edit', kind: 'step', title: 'Hand it over', where: 'Video → 4 Edit',
    auto: 'Copy the prompt → paste it into Claude Code. It edits.',
    manual: 'Copy the prompt or download the brief → send it to your editor.', next: 'board' },
  { id: 'board', kind: 'choice', title: 'Storyboard right?', where: 'Edit → Review the storyboard',
    auto: 'Claude stops before rendering. Review it shot by shot.',
    manual: 'Ask your editor for a storyboard or a rough cut.',
    choices: [['Yes - tick "render it", copy the prompt', 'render'], ['No - comment, reword, switch off, copy the prompt', 'board']] },
  { id: 'render', kind: 'step', title: 'Render', where: 'Edit → Finished video',
    auto: 'Claude renders and puts the path in Finished video.',
    manual: 'Your editor delivers. Paste the file path in Finished video.', next: 'review' },
  { id: 'review', kind: 'choice', title: 'Changes needed?', where: 'Edit → Review the finished video',
    auto: 'Watch it scene by scene.', manual: 'Watch it. Write your notes for the editor.',
    choices: [['Yes - comment, reword, switch off, copy the prompt', 'render'], ['No - Mark ready to release', 'publish']] },
  { id: 'publish', kind: 'step', title: 'Publish', where: 'Video → 5 Publish',
    text: 'Caption and date per platform. It joins the release line.', next: 'out' },
  { id: 'out', kind: 'choice', title: 'Went out on the day?', where: 'Videos → Next to release',
    choices: [['Yes - Released ✓', 'results'], ['Missed - nothing to do, the line moves on', 'out']] },
  { id: 'results', kind: 'step', title: 'Results', where: 'Video → 6 Results',
    text: 'Note how it did.', next: 'rework' },
  { id: 'rework', kind: 'choice', title: 'Rework it?', where: 'Edit or Results → Make a new version',
    text: 'A new version keeps the old file. The prompt fixes only what changed.',
    choices: [['The whole recording', 'record'], ['One section - record just that', 'record'], ['Just the edit', 'edit'], ['No - next video', 'idea']] },
];

const byId = Object.fromEntries(FLOW.map((n, i) => [n.id, { ...n, n: i + 1 }]));

/** One node as one track sees it: its number, its text for that track, and where each way out goes. */
export function flowFor(track = 'auto') {
  return FLOW.map((node, i) => ({
    n: i + 1, id: node.id, kind: node.kind, title: node.title, where: node.where,
    text: node[track] || node.text || '',
    exits: node.kind === 'step'
      ? [{ label: '', to: byId[node.next].n, title: byId[node.next].title, back: byId[node.next].n <= i + 1, next: byId[node.next].n === i + 2 }]
      : node.choices.map(([label, to]) => ({ label, to: byId[to].n, title: byId[to].title, back: byId[to].n <= i + 1, next: byId[to].n === i + 2 })),
  }));
}
