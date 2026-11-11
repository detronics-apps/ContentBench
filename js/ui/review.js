// The review screen, in two modes:
//  - the finished video: watch it, see which scene is on screen, reword its text, switch parts off (a pointing arrow,
//    a sound effect), comment on any moment;
//  - the storyboard, before rendering: shot by shot, its still and its row of the board (spoken line, on screen,
//    motion, sound, why), the same rewording and switching off, comments per shot - and the go-ahead to render.
// Either way, one prompt hands it all to Claude. The files are opened from this device and never leave it.

import { el, toast } from './dom.js';
import { copyText } from './forms.js';
import { isReviewData, isStoryboard, sceneAt, textName, changesFrom, describeChange, reviewPrompt } from '../review.js';
import { formatSeconds as fmt } from '../workflow.js';

const KINDS = ['Visual', 'Words on screen', 'Sound', 'Voice', 'Other'];
const BOARD = [['spoken', 'Spoken'], ['onScreen', 'On screen'], ['motion', 'Motion'], ['character', 'Character'], ['sound', 'Sound'], ['why', 'Why']];
const draftKey = (id, video) => `content-bench-review:${id}:${video}`;
const readDraft = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
const saveDraft = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* a convenience only */ } };

export function openReview(content) {
  const title = content.workingTitle || 'Video';
  let data = null, url = '', dkey = '', board = false;
  let edits = { texts: {}, off: [] }, comments = [], render = false;
  let shown = -1, pinned = null;   // pinned: a scene picked from the strip, held until the video moves on

  const video = el('video', { class: 'rv-video', controls: true, playsinline: true, preload: 'metadata' });
  const still = el('img', { class: 'rv-still', alt: '', hidden: true });
  const shotNav = el('div', { class: 'row', hidden: true }, [
    el('button', { class: 'btn', type: 'button', 'data-field': 'rv.prev', on: { click: () => step(-1) } }, ['◀ Shot']),
    el('button', { class: 'btn', type: 'button', 'data-field': 'rv.next', on: { click: () => step(1) } }, ['Shot ▶']),
    el('span', { class: 'small muted', text: 'or tap a shot in the strip' }),
  ]);
  const strip = el('div', { class: 'rv-strip', role: 'list' });
  const panel = el('section', { class: 'rv-panel', 'aria-live': 'polite' });
  const list = el('div', { class: 'rv-list' });
  const status = el('p', { class: 'small rv-status', role: 'status' });
  const picker = el('input', { type: 'file', multiple: true, accept: 'video/*,.json', class: 'rv-file', 'data-field': 'rv.files',
    on: { change: (e) => load([...e.target.files]) } });

  const save = () => { if (dkey) saveDraft(dkey, { edits, comments, render }); };
  const t = () => video.currentTime || 0;
  const step = (d) => { if (data) show(Math.max(0, Math.min(data.scenes.length - 1, shown + d))); };

  async function load(files) {
    const vid = files.find((f) => f.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(f.name));
    const js = files.find((f) => /\.json$/i.test(f.name));
    if (js) {
      try {
        const d = JSON.parse(await js.text());
        if (!isReviewData(d)) throw new Error('not a review file');
        data = d;
      } catch (e) { toast(`That .json is not a review file (${e.message}). Pick the one ending in .review.json.`); return; }
    }
    board = isStoryboard(data);
    if (vid && !board) { if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(vid); video.src = url; }
    if (!data || (!board && !video.src)) { status.textContent = !data ? 'Now pick the review file too - same name as the video, ending in .review.json.' : 'Now pick the video too.'; return; }
    video.hidden = board; still.hidden = !board; shotNav.hidden = !board;
    dkey = draftKey(content.id, data.video);
    const d = readDraft(dkey);
    edits = d?.edits || { texts: {}, off: [] }; comments = d?.comments || []; render = !!d?.render;
    status.textContent = d ? 'Picked up where you left off.' : board ? 'The storyboard: nothing is rendered yet. Go shot by shot; tick "render it" when it is right.' : '';
    root.classList.add('is-ready');
    root.querySelector('.pr-title').textContent = `${board ? 'Storyboard' : 'Review'}: ${title}`;
    buildStrip(); shown = -1;
    if (board) show(0); else follow(true);
    renderList();
  }

  function buildStrip() {
    strip.replaceChildren(...data.scenes.map((s, i) => el('button', { class: 'rv-strip__scene', type: 'button', role: 'listitem',
      style: { flex: `${Math.max(0.5, s.end - s.at)} 0 0` }, title: `${fmt(s.at)} ${s.label || s.type}`, 'data-i': i,
      on: { click: () => { if (board) { show(i); return; } video.pause(); video.currentTime = s.at + 0.05; pinned = i; show(i); } } },
    [el('span', { class: 'rv-strip__t', text: board ? String(i + 1) : fmt(s.at) })])));
  }

  /** Follow the video, unless the reader is typing in the panel. A storyboard has no video to follow. */
  function follow(force) {
    if (!data || board) return;
    const i = sceneAt(data, t());
    if (pinned !== null && Math.abs(t() - data.scenes[pinned].at) < 0.3) return;
    pinned = null;
    if (i === shown && !force) return;
    if (!force && panel.contains(document.activeElement) && document.activeElement.matches('input, textarea, select')) return;
    show(i);
  }

  function show(i) {
    shown = i;
    const s = data.scenes[i];
    [...strip.children].forEach((b, j) => b.classList.toggle('is-now', j === i));
    if (board) { still.src = s.still || ''; still.alt = s.still ? `Shot ${i + 1}: ${s.label || s.type}` : ''; still.hidden = !s.still; }
    const off = new Set(edits.off);
    const k = (p) => `${s.sid}|${p}`;
    const at = () => (board ? s.at : t());
    const toggleOff = (p, on) => { edits.off = on ? edits.off.filter((x) => x !== k(p)) : [...new Set([...edits.off, k(p)])]; save(); renderList(); };
    const kind = el('select', { class: 'input input--inline', 'data-field': 'rv.kind', 'aria-label': 'What the comment is about' }, KINDS.map((x) => el('option', { value: x, text: x })));
    const note = el('textarea', { class: 'input', rows: 2, placeholder: board ? 'What should change in this shot? e.g. one card is enough here' : 'What should change here? e.g. this card is too busy - one line is enough', 'data-field': 'rv.note' });
    const add = () => {
      const text = note.value.trim();
      if (!text) { note.focus(); return; }
      comments.push({ t: +at().toFixed(2), sid: s.sid, kind: kind.value, text });
      note.value = ''; save(); renderList(); toast(board ? `Comment added to shot ${i + 1}` : `Comment added at ${fmt(at())}`);
    };
    note.addEventListener('focus', () => video.pause());
    note.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); add(); } });
    const rows = board ? BOARD.filter(([key]) => s.board?.[key]) : [];
    panel.replaceChildren(...[
      el('div', { class: 'small muted', text: `${board ? 'Shot' : 'Scene'} ${i + 1} of ${data.scenes.length} · ${fmt(s.at)}-${fmt(s.end)}` }),
      el('h2', { class: 'rv-scene', text: s.label || s.type }),
      el('p', { class: 'small muted', text: `${s.type} scene` }),
      rows.length ? el('dl', { class: 'rv-board' }, rows.flatMap(([key, label]) => [el('dt', { text: label }), el('dd', { text: s.board[key] })])) : null,
      s.texts.length ? el('h3', { class: 'rv-h', text: 'Words on screen' }) : null,
      ...s.texts.map((x) => {
        const cur = edits.texts[k(x.path)] ?? x.value;
        const input = el('input', { class: 'input', value: cur, 'data-field': `rv.text.${x.path}`, 'aria-label': textName(x.path),
          on: { input: (e) => { edits.texts[k(x.path)] = e.target.value; save(); }, change: () => renderList() } });
        input.addEventListener('focus', () => video.pause());
        return el('label', { class: 'rv-text' }, [el('span', { class: 'small', text: textName(x.path) + (cur !== x.value ? ' (changed)' : '') }), input,
          !x.item ? el('label', { class: 'small rv-check' }, [el('input', { type: 'checkbox', checked: !off.has(k(x.path)), on: { change: (e) => toggleOff(x.path, e.target.checked) } }), ' show it']) : null]);
      }),
      s.parts.length ? el('h3', { class: 'rv-h', text: `Parts of this ${board ? 'shot' : 'scene'}` }) : null,
      s.parts.length ? el('div', { class: 'rv-parts' }, s.parts.map((p) => el('label', { class: 'rv-check' }, [
        el('input', { type: 'checkbox', checked: !off.has(k(p.key)), 'data-field': `rv.part.${p.key}`, on: { change: (e) => toggleOff(p.key, e.target.checked) } }), ` ${p.name}`]))) : null,
      s.parts.length ? el('p', { class: 'small muted', text: 'Untick to switch it off. Everything else stays as it is.' }) : null,
      el('h3', { class: 'rv-h', text: board ? 'Comment on this shot' : 'Comment on this moment' }),
      el('div', { class: 'row' }, [kind]),
      note,
      el('div', { class: 'row' }, [el('button', { class: 'btn btn-primary', type: 'button', 'data-field': 'rv.add', on: { click: add } }, ['Add comment']),
        el('span', { class: 'small muted', text: board ? 'Kept with this shot. Ctrl+Enter adds it too.' : 'Saved at the time the video is on. Ctrl+Enter adds it too.' })]),
    ].filter(Boolean));
  }

  function renderList() {
    const { changes, problems } = changesFrom(data, edits);
    const sorted = comments.map((c, i) => ({ ...c, i })).sort((a, b) => a.t - b.t);
    const shotOf = (c) => data.scenes.findIndex((s) => s.sid === c.sid);
    const any = changes.length || comments.length || (board && render);
    list.replaceChildren(...[
      el('h3', { class: 'rv-h', text: `Your review: ${changes.length} change${changes.length === 1 ? '' : 's'}, ${comments.length} comment${comments.length === 1 ? '' : 's'}` }),
      ...problems.map((p) => el('p', { class: 'small text-warn', text: p })),
      changes.length ? el('ul', { class: 'plain rv-items' }, changes.map((c) => el('li', { class: 'small', text: describeChange(data, c) }))) : null,
      sorted.length ? el('ul', { class: 'plain rv-items' }, sorted.map((c) => el('li', { class: 'small' }, [
        el('button', { class: 'btn btn-ghost rv-jump', type: 'button', title: board ? 'Go to this shot' : 'Go to this moment',
          on: { click: () => { if (board) { show(Math.max(0, shotOf(c))); return; } video.pause(); video.currentTime = c.t; follow(true); } } }, [board ? `Shot ${shotOf(c) + 1}` : fmt(c.t)]),
        ` ${c.kind}: ${c.text} `,
        el('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': 'Remove this comment', on: { click: () => { comments.splice(c.i, 1); save(); renderList(); } } }, ['×'])]))) : null,
      board ? el('label', { class: 'rv-check rv-go' }, [el('input', { type: 'checkbox', checked: render, 'data-field': 'rv.render',
        on: { change: (e) => { render = e.target.checked; save(); renderList(); } } }),
      ` ${changes.length || comments.length ? 'After these changes, render it - no need to show me again' : 'The storyboard is right - render it'}`]) : null,
      el('div', { class: 'row' }, [
        el('button', { class: 'btn btn-primary', type: 'button', 'data-field': 'rv.prompt', disabled: !any,
          on: { click: () => copyText(reviewPrompt({ title, data, changes, comments, render: board && render }), 'Prompt copied - paste it into the Claude Code chat that is editing this video') } }, ['Copy the prompt for Claude']),
        el('button', { class: 'btn', type: 'button', 'data-field': 'rv.clear', disabled: !any,
          on: { click: () => { if (confirm('Start this review again? Your changes and comments here are cleared.')) { edits = { texts: {}, off: [] }; comments = []; render = false; save(); if (board) show(shown); else follow(true); renderList(); } } } }, ['Start again']),
      ]),
      el('p', { class: 'small muted', text: board
        ? 'Kept on this device while you work. Without the tick, Claude makes the changes and shows you the storyboard again; with it, Claude renders.'
        : 'Kept on this device while you work, so you can close and come back. Claude applies the changes exactly and works through the comments - the timing stays its job.' }),
      board && data.notes ? el('details', { class: 'more' }, [el('summary', { text: 'Notes from the edit: cut list and open questions' }), el('pre', { class: 'rv-notes small', text: data.notes })]) : null,
    ].filter(Boolean));
  }

  function close() {
    clearInterval(timer);
    document.removeEventListener('keydown', onKey, true);
    if (url) URL.revokeObjectURL(url);
    root.remove();
  }
  function onKey(e) {
    if (e.target.closest?.('input, textarea, select')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (board && e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (board && e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  }

  const root = el('div', { class: 'review', role: 'dialog', 'aria-label': `Review: ${title}` }, [
    el('header', { class: 'pr-bar' }, [
      el('strong', { class: 'pr-title', text: `Review: ${title}` }),
      el('span', { class: 'small muted rv-hint', text: 'Pick the storyboard file, or the finished video with its review file - all in the video\'s 08_Export folder.' }),
      el('label', { class: 'btn' }, ['Choose files…', picker]),
      el('button', { class: 'btn', type: 'button', 'data-field': 'rv.close', on: { click: close } }, ['Close']),
    ]),
    el('div', { class: 'rv-body' }, [
      el('div', { class: 'rv-left' }, [video, still, shotNav, strip, status]),
      el('div', { class: 'rv-right' }, [panel, list]),
    ]),
  ]);
  panel.append(el('p', { class: 'muted', text: 'Before rendering: choose the storyboard file (… storyboard.review.json). After rendering: the video and its .review.json. Nothing is uploaded - they open on this device.' }));

  document.body.append(root);
  document.addEventListener('keydown', onKey, true);
  const timer = setInterval(() => follow(false), 200);
  return { load };   // for tests: open with files directly
}
