// The capture list: everything a video needs recorded or gathered before editing, and the
// exact place each file goes. A capture counts as saved when a file is found there.

import { newId, slug } from './model.js';
import { FIXED_FOLDERS } from './process-data.js';

export const CAPTURE_STATUS = { needed: 'Still needed', saved: 'Found in its folder', marked: 'Marked as saved by hand' };

/** Each capture keeps the number it was given, so reordering or renaming never moves its file. */
export function makeCapture(captures = [], fields = {}) {
  const n = captures.reduce((m, c) => Math.max(m, c.n || 0), 0) + 1;
  return { id: newId('cap'), n, kind: 'main', what: '', blockId: '', notes: '', status: 'needed', ...fields };
}

/**
 * A video's folder. Once made, its name is kept on the video (`folder`), so renaming the video never moves its files.
 * Before that it is worked out from the label (series and part, see content.js folderFor) and the title.
 */
// short on purpose: the number, then the series and part - or, outside a series, the video's own name
export const contentFolder = (content) => content.folder
  || `Content/${slug([content.folderNumber, content.folderLabel || content.workingTitle || 'Untitled'].filter(Boolean).join(' '), 90)}_${content.id.slice(-6)}`;

const kindOf = (kinds, id) => kinds.find((k) => k.id === id) || { id, name: id, folder: '09_Other' };

/** Where one capture goes. Any file in `dir` whose name starts with `prefix` counts. */
export function capturePath(kinds, content, cap) {
  const dir = `${contentFolder(content)}/${kindOf(kinds, cap.kind).folder}`;
  const prefix = `${String(cap.n).padStart(2, '0')}-`;
  return { dir, prefix, suggested: `${prefix}${slug(cap.what || kindOf(kinds, cap.kind).name, 30)}`, full: `${dir}/${prefix}${slug(cap.what || kindOf(kinds, cap.kind).name, 30)}` };
}

/** Every folder a video gets: the fixed ones and one per capture kind. */
export function folderTree(kinds, content) {
  const root = contentFolder(content);
  return [root, ...FIXED_FOLDERS.map((f) => `${root}/${f}`), ...new Set(kinds.map((k) => `${root}/${k.folder}`))];
}

/**
 * Applies a folder listing ({ dir: [file names] }) to the captures. Found -> saved;
 * a saved file that has gone missing -> needed again. Hand-marked ones are left alone.
 */
export function checkCaptures(kinds, content, listing) {
  return (content.captures || []).map((c) => {
    if (c.status === 'marked') return c;
    const { dir, prefix } = capturePath(kinds, content, c);
    const found = (listing[dir] || []).find((name) => name.toLowerCase().startsWith(prefix.toLowerCase()));
    return { ...c, status: found ? 'saved' : 'needed', file: found || '' };
  });
}

export function captureProgress(captures = []) {
  const saved = captures.filter((c) => c.status !== 'needed').length;
  return { total: captures.length, saved, needed: captures.length - saved };
}
