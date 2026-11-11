// Reviewing a finished video: which scene is on screen, the exact changes the creator made (reworded text, parts
// switched off) and the prompt that hands it all to Claude. Pure - no DOM.
//
// The review file comes from the editing kit (content-motion/review.mjs export) and sits beside the video:
//   { kind: 'contentbench-review-data', editDir, video, duration,
//     scenes: [{ sid, at, end, type, label, texts: [{ path, value, item }], parts: [{ key, name }] }] }
// Timing is not editable here on purpose: placing things on the words is the editor's job.

import { formatSeconds as fmt } from './workflow.js';

export const isReviewData = (d) => !!d && d.kind === 'contentbench-review-data' && Array.isArray(d.scenes);

/** The index of the scene on screen at time t (seconds). */
export function sceneAt(data, t) {
  let i = 0;
  data.scenes.forEach((s, j) => { if (s.at <= t) i = j; });
  return i;
}

/** "Line 2", "Card 1 title", "Kicker" - a readable name for a text's path. */
export function textName(p) {
  return p.split('.').map((k, i, all) => (/^\d+$/.test(k) ? String(Number(k) + 1)
    : i === 0 && /^\d+$/.test(all[1] || '') ? k.replace(/s$/, '').replace(/^\w/, (c) => c.toUpperCase())
      : k.replace(/^\w/, (c) => (i === 0 ? c.toUpperCase() : c)))).join(' ');
}

const key = (sid, p) => `${sid}|${p}`;

/**
 * The exact changes from what the creator did on the review screen.
 * edits: { texts: { 'sid|path': newText }, off: ['sid|key', ...] }
 * Returns { changes, problems } - a line in a list cannot be emptied (that would break the layout); say so instead.
 */
export function changesFrom(data, edits = {}) {
  const changes = [], problems = [];
  const off = new Set(edits.off || []);
  for (const s of data.scenes) {
    for (const t of s.texts) {
      const k = key(s.sid, t.path);
      if (off.has(k)) { if (t.item) problems.push(`${s.label || s.type}: ${textName(t.path)} is a line in a list - reword it instead of switching it off.`); else changes.push({ sid: s.sid, off: t.path }); continue; }
      if (!(k in (edits.texts || {}))) continue;
      const to = String(edits.texts[k]).replace(/\s+/g, ' ').trim();
      if (to === t.value) continue;
      if (!to) { if (t.item) problems.push(`${s.label || s.type}: ${textName(t.path)} can be reworded, not emptied.`); else changes.push({ sid: s.sid, off: t.path }); continue; }
      changes.push({ sid: s.sid, path: t.path, from: t.value, to });
    }
    for (const p of s.parts) if (off.has(key(s.sid, p.key))) changes.push({ sid: s.sid, off: p.key });
  }
  return { changes, problems };
}

/** One readable line per change, for the prompt and the screen. */
export function describeChange(data, c) {
  const s = data.scenes.find((x) => x.sid === c.sid);
  const where = `${fmt(s?.at ?? 0)} ${s?.label || s?.type || `scene ${c.sid}`}`;
  if (c.off) {
    const part = s?.parts.find((p) => p.key === c.off)?.name || textName(c.off);
    return `${where}: switch off ${part}`;
  }
  return `${where}: ${textName(c.path)} "${c.from}" -> "${c.to}"`;
}

/** A storyboard review comes before the render: no video, one still per shot, and the go-ahead to render. */
export const isStoryboard = (data) => data?.stage === 'storyboard';

/**
 * The prompt that starts (or continues) a Claude Code session to apply the review.
 * render: on a storyboard, the creator's go-ahead - render after the changes instead of stopping again.
 */
export function reviewPrompt({ title = '', data, changes = [], comments = [], render = false }) {
  const board = isStoryboard(data);
  const sorted = [...comments].sort((a, b) => a.t - b.t);
  const notes = {
    changes,
    comments: sorted.map((c) => {
      const s = data.scenes.find((x) => x.sid === c.sid);
      return { time: fmt(c.t), sid: c.sid, scene: s ? `${s.type}${s.label ? ` · ${s.label}` : ''}` : '', kind: c.kind, text: c.text };
    }),
  };
  const lines = [
    board
      ? `Use the faceless-video skill to apply my review of the storyboard for "${title || data.video}" - before rendering. Edit folder: ${data.editDir}`
      : `Use the faceless-video skill to apply my review of "${title || data.video}" (${data.video}). Edit folder: ${data.editDir}`,
    '',
    changes.length
      ? `1. Exact changes (${changes.length}) - apply them as they are: save the JSON below as review-notes.json in the edit folder and run \`node review.mjs apply "${data.editDir}" review-notes.json\`.`
      : '1. No exact changes this time.',
    ...changes.map((c) => `   - ${describeChange(data, c)}`),
    '',
    sorted.length ? `2. My comments (${sorted.length}) - work through each one. Timing stays yours: place anything you change on the words, with purpose.` : '2. No comments this time.',
    ...notes.comments.map((c) => `   - ${c.time} · ${c.scene || `scene ${c.sid}`} · ${c.kind}: ${c.text}`),
    '',
    !board ? '3. Rebuild, render as a new file next to the old one (never overwrite), export its review file, and put the new path in the Edit step as the finished video.'
      : render ? `3. Then rebuild, re-make only the changed stills, and render - this is my go-ahead${changes.length || sorted.length ? ' once the changes are in' : ': the storyboard is approved'}. Export the review file next to the video and put its path in the Edit step as the finished video.`
        : '3. Then rebuild, re-make only the changed stills, update storyboard.md, export the storyboard again (`node review.mjs storyboard`) to the same place, and stop for my OK - don\'t render yet.',
    '',
    '```json',
    JSON.stringify(notes, null, 1),
    '```',
  ];
  return lines.join('\n');
}
