// The review screen: watch the finished video, see which scene is on screen, reword its text, switch parts off
// (a pointing arrow, a sound effect), comment on any moment - then one prompt hands it all to Claude.
// The video and its review file are opened from this device and never leave it.

import { el, toast } from './dom.js';
import { copyText } from './forms.js';
import { isReviewData, sceneAt, textName, changesFrom, describeChange, reviewPrompt } from '../review.js';
import { formatSeconds as fmt } from '../workflow.js';

const KINDS = ['Visual', 'Words on screen', 'Sound', 'Voice', 'Other'];
const draftKey = (id, video) => `content-bench-review:${id}:${video}`;
const readDraft = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
const saveDraft = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* a convenience only */ } };

export function openReview(content) {
  const title = content.workingTitle || 'Video';
  let data = null, url = '', dkey = '';
  let edits = { texts: {}, off: [] }, comments = [];
  let shown = -1, pinned = null;   // pinned: a scene picked from the strip, held until the video moves on

  const video = el('video', { class: 'rv-video', controls: true, playsinline: true, preload: 'metadata' });
  const strip = el('div', { class: 'rv-strip', role: 'list' });
  const panel = el('section', { class: 'rv-panel', 'aria-live': 'polite' });
  const list = el('div', { class: 'rv-list' });
  const status = el('p', { class: 'small rv-status', role: 'status' });
  const picker = el('input', { type: 'file', multiple: true, accept: 'video/*,.json', class: 'rv-file', 'data-field': 'rv.files',
    on: { change: (e) => load([...e.target.files]) } });

  const save = () => { if (dkey) saveDraft(dkey, { edits, comments }); };
  const t = () => video.currentTime || 0;

  async function load(files) {
    const vid = files.find((f) => f.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(f.name));
    const js = files.find((f) => /\.json$/i.test(f.name));
    if (js) {
      try {
        const d = JSON.parse(await js.text());
        if (!isReviewData(d)) throw new Error('not a review file');
        data = d;
      } catch (e) { toast(`That .json is not a review file (${e.message}). Pick the one next to the video, ending in .review.json.`); return; }
    }
    if (vid) { if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(vid); video.src = url; }
    if (!data || !video.src) { status.textContent = !data ? 'Now pick the review file too - same name as the video, ending in .review.json.' : 'Now pick the video too.'; return; }
    dkey = draftKey(content.id, data.video);
    const d = readDraft(dkey);
    edits = d?.edits || { texts: {}, off: [] }; comments = d?.comments || [];
    status.textContent = d ? 'Picked up where you left off on this video.' : '';
    root.classList.add('is-ready');
    buildStrip(); shown = -1; follow(true); renderList();
  }

  function buildStrip() {
    strip.replaceChildren(...data.scenes.map((s, i) => el('button', { class: 'rv-strip__scene', type: 'button', role: 'listitem',
      style: { flex: `${Math.max(0.5, s.end - s.at)} 0 0` }, title: `${fmt(s.at)} ${s.label || s.type}`, 'data-i': i,
      on: { click: () => { video.pause(); video.currentTime = s.at + 0.05; pinned = i; show(i); } } },
    [el('span', { class: 'rv-strip__t', text: fmt(s.at) })])));
  }

  /** Follow the video, unless the reader is typing in the panel. */
  function follow(force) {
    if (!data) return;
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
    const off = new Set(edits.off);
    const k = (p) => `${s.sid}|${p}`;
    const toggleOff = (p, on) => { edits.off = on ? edits.off.filter((x) => x !== k(p)) : [...new Set([...edits.off, k(p)])]; save(); renderList(); };
    const kind = el('select', { class: 'input input--inline', 'data-field': 'rv.kind', 'aria-label': 'What the comment is about' }, KINDS.map((x) => el('option', { value: x, text: x })));
    const note = el('textarea', { class: 'input', rows: 2, placeholder: 'What should change here? e.g. this card is too busy - one line is enough', 'data-field': 'rv.note' });
    const add = () => {
      const text = note.value.trim();
      if (!text) { note.focus(); return; }
      comments.push({ t: +t().toFixed(2), sid: s.sid, kind: kind.value, text });
      note.value = ''; save(); renderList(); toast(`Comment added at ${fmt(t())}`);
    };
    note.addEventListener('focus', () => video.pause());
    note.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); add(); } });
    panel.replaceChildren(...[
      el('div', { class: 'small muted', text: `Scene ${i + 1} of ${data.scenes.length} · ${fmt(s.at)}-${fmt(s.end)}` }),
      el('h2', { class: 'rv-scene', text: s.label || s.type }),
      el('p', { class: 'small muted', text: `${s.type} scene` }),
      s.texts.length ? el('h3', { class: 'rv-h', text: 'Words on screen' }) : null,
      ...s.texts.map((x) => {
        const cur = edits.texts[k(x.path)] ?? x.value;
        const input = el('input', { class: 'input', value: cur, 'data-field': `rv.text.${x.path}`, 'aria-label': textName(x.path),
          on: { input: (e) => { edits.texts[k(x.path)] = e.target.value; save(); }, change: () => renderList() } });
        input.addEventListener('focus', () => video.pause());
        return el('label', { class: 'rv-text' }, [el('span', { class: 'small', text: textName(x.path) + (cur !== x.value ? ' (changed)' : '') }), input,
          !x.item ? el('label', { class: 'small rv-check' }, [el('input', { type: 'checkbox', checked: !off.has(k(x.path)), on: { change: (e) => toggleOff(x.path, e.target.checked) } }), ' show it']) : null]);
      }),
      s.parts.length ? el('h3', { class: 'rv-h', text: 'Parts of this scene' }) : null,
      s.parts.length ? el('div', { class: 'rv-parts' }, s.parts.map((p) => el('label', { class: 'rv-check' }, [
        el('input', { type: 'checkbox', checked: !off.has(k(p.key)), 'data-field': `rv.part.${p.key}`, on: { change: (e) => toggleOff(p.key, e.target.checked) } }), ` ${p.name}`]))) : null,
      s.parts.length ? el('p', { class: 'small muted', text: 'Untick to switch it off. Everything else in the scene stays as it is.' }) : null,
      el('h3', { class: 'rv-h', text: 'Comment on this moment' }),
      el('div', { class: 'row' }, [kind]),
      note,
      el('div', { class: 'row' }, [el('button', { class: 'btn btn-primary', type: 'button', 'data-field': 'rv.add', on: { click: add } }, ['Add comment']),
        el('span', { class: 'small muted', text: 'Saved at the time the video is on. Ctrl+Enter adds it too.' })]),
    ].filter(Boolean));
  }

  function renderList() {
    const { changes, problems } = changesFrom(data, edits);
    const sorted = comments.map((c, i) => ({ ...c, i })).sort((a, b) => a.t - b.t);
    list.replaceChildren(...[
      el('h3', { class: 'rv-h', text: `Your review: ${changes.length} change${changes.length === 1 ? '' : 's'}, ${comments.length} comment${comments.length === 1 ? '' : 's'}` }),
      ...problems.map((p) => el('p', { class: 'small text-warn', text: p })),
      changes.length ? el('ul', { class: 'plain rv-items' }, changes.map((c) => el('li', { class: 'small', text: describeChange(data, c) }))) : null,
      sorted.length ? el('ul', { class: 'plain rv-items' }, sorted.map((c) => el('li', { class: 'small' }, [
        el('button', { class: 'btn btn-ghost rv-jump', type: 'button', title: 'Go to this moment', on: { click: () => { video.pause(); video.currentTime = c.t; follow(true); } } }, [fmt(c.t)]),
        ` ${c.kind}: ${c.text} `,
        el('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': 'Remove this comment', on: { click: () => { comments.splice(c.i, 1); save(); renderList(); } } }, ['×'])]))) : null,
      el('div', { class: 'row' }, [
        el('button', { class: 'btn btn-primary', type: 'button', 'data-field': 'rv.prompt', disabled: !changes.length && !comments.length,
          on: { click: () => copyText(reviewPrompt({ title, data, changes, comments }), 'Prompt copied - paste it into a new Claude Code session') } }, ['Copy the prompt for Claude']),
        el('button', { class: 'btn', type: 'button', 'data-field': 'rv.clear', disabled: !changes.length && !comments.length,
          on: { click: () => { if (confirm('Start this review again? Your changes and comments on this video are cleared.')) { edits = { texts: {}, off: [] }; comments = []; save(); follow(true); renderList(); } } } }, ['Start again']),
      ]),
      el('p', { class: 'small muted', text: 'Kept on this device while you work, so you can close and come back. Claude applies the changes exactly and works through the comments - the timing stays its job.' }),
    ].filter(Boolean));
  }

  function close() {
    clearInterval(timer);
    document.removeEventListener('keydown', onKey, true);
    if (url) URL.revokeObjectURL(url);
    root.remove();
  }
  function onKey(e) { if (e.key === 'Escape' && !e.target.closest?.('input, textarea, select')) { e.preventDefault(); close(); } }

  const root = el('div', { class: 'review', role: 'dialog', 'aria-label': `Review: ${title}` }, [
    el('header', { class: 'pr-bar' }, [
      el('strong', { class: 'pr-title', text: `Review: ${title}` }),
      el('span', { class: 'small muted rv-hint', text: 'Pick the finished video and its review file - both in the video\'s 08_Export folder, same name.' }),
      el('label', { class: 'btn' }, ['Choose files…', picker]),
      el('button', { class: 'btn', type: 'button', 'data-field': 'rv.close', on: { click: close } }, ['Close']),
    ]),
    el('div', { class: 'rv-body' }, [
      el('div', { class: 'rv-left' }, [video, strip, status]),
      el('div', { class: 'rv-right' }, [panel, list]),
    ]),
  ]);
  panel.append(el('p', { class: 'muted', text: 'Choose the video and its .review.json to start. Nothing is uploaded - they open on this device.' }));

  document.body.append(root);
  document.addEventListener('keydown', onKey, true);
  const timer = setInterval(() => follow(false), 200);
  return { load };   // for tests: open with files directly
}
