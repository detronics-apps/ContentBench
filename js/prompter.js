// The teleprompter's plan: what to say, and when, from a story's blocks. Pure - no DOM.
//
// In a block's talking points, a line starting with » is read word for word; a line starting
// with - (or * or •) is a point to talk around; anything else is shown as a note.

import { parseSeconds, formatSeconds } from './workflow.js';

/** About 150 words a minute: a calm, clear talking pace. */
export const WORDS_PER_SECOND = 2.5;
/** A talking point takes about as long as its words; raise this if you tend to expand on each point. */
const TALK_STRETCH = 1;

const words = (s) => (String(s).match(/\S+/g) || []).length;

export function parseLines(text = '') {
  return String(text).split('\n').map((s) => s.trim()).filter(Boolean).map((s) => {
    if (/^»/.test(s)) return { kind: 'read', text: s.replace(/^»\s*/, '') };
    if (/^[-*•]\s+/.test(s)) return { kind: 'talk', text: s.replace(/^[-*•]\s+/, '') };
    return { kind: 'note', text: s };
  });
}

// ponytail: words-on-the-card as the time weight; real delivery varies, which is why the reader can pause and skip
const weight = (l) => Math.max(3, words(l.text)) * (l.kind === 'read' ? 1 : TALK_STRETCH);

/**
 * Blocks laid end to end with each line's moment inside its block.
 * A block with no duration gets an estimate from its words at a calm pace (`estimated: true`).
 */
export function prompterPlan(blocks = []) {
  let start = 0;
  const out = blocks.map((b) => {
    const lines = parseLines(b.script);
    const total = lines.reduce((n, l) => n + weight(l), 0);
    const estimate = Math.max(3, Math.round(total / WORDS_PER_SECOND));
    const planned = parseSeconds(b.duration);
    const seconds = planned ?? estimate;
    let at = 0;
    const timed = lines.map((l) => { const x = { ...l, at: total ? (at / total) * seconds : 0 }; at += weight(l); return x; });
    const seg = { id: b.id, name: b.name || 'Block', purpose: b.purpose || '', visual: b.visual || '', notes: b.notes || '',
      lines: timed, start, seconds, estimate, estimated: planned === null };
    start += seconds;
    return seg;
  });
  return { blocks: out, total: start };
}

/**
 * Where the reader should be at plan time `t` (seconds): the block, the line, and how far through.
 * Past the end -> `done`.
 */
export function positionAt(plan, t) {
  const n = plan.blocks.length;
  if (!n) return { done: true, block: -1, line: -1, into: 0, left: 0, progress: 1 };
  const i = plan.blocks.findIndex((b) => t < b.start + b.seconds);
  if (i < 0) return { done: true, block: n - 1, line: -1, into: 0, left: 0, progress: 1 };
  const b = plan.blocks[i];
  const into = Math.max(0, t - b.start);
  let line = -1;
  b.lines.forEach((l, j) => { if (l.at <= into) line = j; });
  return { done: false, block: i, line, into, left: b.seconds - into, progress: into / b.seconds };
}

/** How the planned time compares to what the words need at a calm pace. */
export function paceNote(seg) {
  if (!seg.lines.length || seg.estimated) return '';
  const ratio = seg.estimate / seg.seconds;
  if (ratio > 1.3) return `Tight: the words need about ${formatSeconds(seg.estimate)} at a calm pace - keep it brisk or give it more time.`;
  if (ratio < 0.6) return 'Room to breathe: take your time and let it land.';
  return '';
}

/**
 * A block's script with its `index`-th line (as parseLines counts them) reworded.
 * The line keeps its marker (» read, - talk), so it stays the same kind on the teleprompter.
 */
export function replaceLine(script = '', index, text) {
  let n = -1;
  return String(script).split('\n').map((raw) => {
    if (!raw.trim() || ++n !== index) return raw;
    const mark = raw.match(/^\s*(»\s*|[-*•]\s+)/)?.[0] ?? '';
    return mark + String(text).replace(/\s*\n\s*/g, ' ').trim();
  }).join('\n');
}

/** A take's block starts, as text for the recording notes - where to cut in the edit. */
export function takeText(marks, { title = '', at = '' } = {}) {
  const head = `Teleprompter take${title ? ` - ${title}` : ''}${at ? ` (${at})` : ''}`;
  const rows = marks.map((m) => `${formatSeconds(m.at)}  ${m.name}${m.planned != null ? `  (plan ${formatSeconds(m.planned)})` : ''}`);
  return [head, ...rows].join('\n');
}

/** Recording notes with this take as the only take: earlier takes go, anything else written there stays. */
export function withLatestTake(notes, take) {
  const kept = String(notes || '').split('\n\n').filter((x) => x.trim() && !x.startsWith('Teleprompter take'));
  return [...kept, take].join('\n\n');
}
