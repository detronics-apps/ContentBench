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
 * A block with no duration gets an estimate from its words at a calm pace (`estimated: true`). A planned duration
 * is a floor, not a cap: when the words need longer (lines added or written out in full), the block grows with them
 * (`grown: true`) - more text always gets more time.
 */
export function prompterPlan(blocks = []) {
  let start = 0;
  const out = blocks.map((b) => {
    const lines = parseLines(b.script);
    const total = lines.reduce((n, l) => n + weight(l), 0);
    const estimate = Math.max(3, Math.round(total / WORDS_PER_SECOND));
    const planned = parseSeconds(b.duration);
    const seconds = planned === null ? estimate : Math.max(planned, estimate);
    let at = 0;
    const timed = lines.map((l) => { const x = { ...l, at: total ? (at / total) * seconds : 0 }; at += weight(l); return x; });
    const seg = { id: b.id, name: b.name || 'Block', purpose: b.purpose || '', visual: b.visual || '', notes: b.notes || '',
      lines: timed, start, seconds, estimate, planned, estimated: planned === null, grown: planned !== null && estimate > planned };
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
  if (seg.grown) return `Longer than planned (${formatSeconds(seg.planned)}): the words need about ${formatSeconds(seg.estimate)}, so the block has that time.`;
  const ratio = seg.estimate / seg.seconds;
  if (ratio < 0.6) return 'Room to breathe: take your time and let it land.';
  return '';
}

/**
 * A block's script with its `index`-th line (as parseLines counts them) reworded.
 * The line keeps its marker (» read, - talk), so it stays the same kind on the teleprompter - unless `kind` gives a new one.
 */
export const MARKS = { read: '» ', talk: '- ', note: '' };
export function replaceLine(script = '', index, text, kind) {
  let n = -1;
  return String(script).split('\n').map((raw) => {
    if (!raw.trim() || ++n !== index) return raw;
    const mark = kind in MARKS ? MARKS[kind] : raw.match(/^\s*(»\s*|[-*•]\s+)/)?.[0] ?? '';
    return mark + String(text).replace(/\s*\n\s*/g, ' ').trim();
  }).join('\n');
}

/** A take's block starts, as text for the recording notes - where to cut in the edit. */
export function takeText(marks, { title = '', at = '' } = {}) {
  const head = `Teleprompter take${title ? ` - ${title}` : ''}${at ? ` (${at})` : ''}`;
  const rows = marks.map((m) => `${formatSeconds(m.at)}  ${m.name}${m.planned != null ? `  (plan ${formatSeconds(m.planned)})` : ''}`);
  return [head, ...rows].join('\n');
}

/**
 * Recording notes with this take as the latest take: earlier takes go, anything else written there stays.
 * keepFirst (a section being redone): the first take stays too - the parts that are kept are still cut from it.
 */
export function withLatestTake(notes, take, { keepFirst = false } = {}) {
  const parts = String(notes || '').split('\n\n').filter((x) => x.trim());
  const isTake = (x) => x.startsWith('Teleprompter take');
  const first = keepFirst ? parts.filter(isTake).slice(0, 1) : [];
  return [...parts.filter((x) => !isTake(x)), ...first, take].join('\n\n');
}

/** The raw lines of a script and, for each counted line (as parseLines counts them), its index in that list. */
function counted(script) {
  const raw = String(script || '').split('\n');
  const idx = raw.map((r, i) => (r.trim() ? i : -1)).filter((i) => i >= 0);
  return { raw, idx };
}

/** Moves the `from`-th line to position `to` (both as parseLines counts them); everything else stays as it was. */
export function moveLine(script = '', from, to) {
  const { raw, idx } = counted(script);
  if (from === to || from < 0 || to < 0 || from >= idx.length || to >= idx.length) return script;
  const lines = idx.map((i) => raw[i]);
  const [x] = lines.splice(from, 1);
  lines.splice(to, 0, x);
  idx.forEach((i, k) => { raw[i] = lines[k]; });
  return raw.join('\n');
}

/** Adds a line after the `after`-th line (-1: at the top). New lines are talking points unless they start with ». */
export function insertLine(script = '', after, text) {
  const { raw, idx } = counted(script);
  const t = String(text).replace(/\s*\n\s*/g, ' ').trim();
  const line = /^»/.test(t) ? t : `- ${t.replace(/^[-*•]\s*/, '')}`;
  if (!idx.length) return [line, ...raw.filter((r) => r.trim())].join('\n');
  const at = after < 0 ? idx[0] : idx[Math.min(after, idx.length - 1)] + 1;
  raw.splice(at, 0, line);
  return raw.join('\n');
}

/** Removes the `index`-th line. */
export function removeLine(script = '', index) {
  const { raw, idx } = counted(script);
  if (index < 0 || index >= idx.length) return script;
  raw.splice(idx[index], 1);
  return raw.join('\n');
}
