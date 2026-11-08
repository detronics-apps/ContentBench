// Full-screen teleprompter for one content item: your notes, where you should be by now,
// what comes next, and a pace to keep. It never listens to you - the clock and your keys move it.

import { el, toast } from './dom.js';
import { commitWs, ws as currentWs } from './store.js';
import * as M from '../model.js';
import { prompterPlan, positionAt, paceNote, takeText, withLatestTake } from '../prompter.js';
import { formatSeconds as fmt } from '../workflow.js';

const SIZE_KEY = 'content-bench-prompter-size';
const readSize = () => { try { return Number(localStorage.getItem(SIZE_KEY)) || 1; } catch { return 1; } };
const saveSize = (v) => { try { localStorage.setItem(SIZE_KEY, String(v)); } catch { /* a preference only */ } };
const AUTO_KEY = 'content-bench-prompter-auto';
// off by default: the notes wait at the end of a block until you press → (you never get overtaken mid-thought)
const readAuto = () => { try { return localStorage.getItem(AUTO_KEY) === 'on'; } catch { return false; } };
const saveAuto = (v) => { try { localStorage.setItem(AUTO_KEY, v ? 'on' : 'off'); } catch { /* a preference only */ } };

export function openPrompter(type, record) {
  const plan = prompterPlan(record.story?.blocks || []);
  if (!plan.blocks.length) { toast('Pick a story structure and fill in its blocks first - the teleprompter reads those.'); return; }
  const title = M.titleOf(record);
  // an output's take belongs to its content item: that is where the recording notes and the delivery live
  const [noteType, noteId] = type === 'outputs' && record.contentId ? ['content', record.contentId] : [type, record.id];
  const delivery = M.getRecord(currentWs(), noteType, noteId)?.delivery || '';
  let t = 0;                 // position in the plan, seconds - moves only while running
  let running = false, auto = readAuto(), started = false, done = false;
  let rec0 = 0, last = 0, timer = 0, countTo = 0, shownBlock = -1, size = readSize();
  const marks = [];          // where each block began in the recording

  const now = () => performance.now() / 1000;
  const recTime = () => (rec0 ? now() - rec0 : 0);

  /* ---- layout, built once; tick() only changes text and classes */
  const bar = el('div', { class: 'pr-rundown', 'aria-hidden': 'true' }, [
    ...plan.blocks.map((b) => el('span', { class: 'pr-rundown__seg', style: { flex: `${b.seconds} 0 0` }, title: `${b.name} · ${fmt(b.seconds)}` })),
    el('span', { class: 'pr-rundown__needle' })]);
  const clock = el('span', { class: 'pr-clock' });
  const recClock = el('span', { class: 'pr-clock pr-clock--rec', title: 'Time since the hook started, pauses included - the length of your recording' });
  const restartBtn = el('button', { class: 'btn', type: 'button', hidden: true, 'data-field': 'pr.restart', title: 'Start the whole take again from the top (keyboard: R)', on: { click: () => restart() } }, ['Restart']);
  const playBtn = el('button', { class: 'btn primary', type: 'button', 'data-field': 'pr.play', on: { click: () => toggle() } });
  const autoBtn = el('button', { class: 'btn', type: 'button', 'aria-pressed': String(auto), 'data-field': 'pr.auto',
    title: 'On: moves to the next block when its time is up. Off: waits at the end of the block until you press Block ▶.', on: { click: () => { auto = !auto; saveAuto(auto); autoBtn.setAttribute('aria-pressed', String(auto)); autoBtn.textContent = auto ? 'Auto-advance: on' : 'Auto-advance: off'; } } }, [auto ? 'Auto-advance: on' : 'Auto-advance: off']);
  const btn = (text, fn, attrs = {}) => el('button', { class: 'btn', type: 'button', on: { click: fn }, ...attrs }, [text]);

  const nowPane = el('section', { class: 'pr-now', 'aria-live': 'polite' });
  const nextPane = el('div', { class: 'pr-next' });
  const screenPane = el('div', { class: 'pr-screen' });
  const list = el('ol', { class: 'pr-list' }, plan.blocks.map((b, i) => el('li', { 'data-i': i, title: 'Go to this block', on: { click: () => { if (!done) { t = b.start; last = now(); tick(); } } } }, [
    el('span', { class: 'pr-list__t', text: fmt(b.start) }), ` ${b.name}`])));
  const banner = el('div', { class: 'pr-banner', hidden: true });
  const sheet = el('div', { class: 'pr-sheet' });

  const root = el('div', { class: 'prompter', role: 'dialog', 'aria-label': `Teleprompter: ${title}`, style: { '--pr-size': size } }, [
    el('header', { class: 'pr-bar' }, [
      el('strong', { class: 'pr-title', text: title }),
      bar, clock, recClock,
      el('div', { class: 'pr-controls' }, [
        btn('◀ Block', () => jump(-1), { title: 'Back to the start of this block, or the one before (keyboard: ←)' }),
        btn('▲ Line', () => lineStep(-1), { title: 'One line back - you are still on the line above (keyboard: ↑)', 'data-field': 'pr.lineup' }),
        playBtn,
        btn('Line ▼', () => lineStep(1), { title: 'One line on - you are already on the next line (keyboard: ↓)', 'data-field': 'pr.linedown' }),
        btn('Block ▶', () => jump(1), { title: 'Next block (keyboard: →)', 'data-field': 'pr.next' }),
        autoBtn,
        restartBtn,
        btn('A−', () => zoom(-0.1), { 'aria-label': 'Smaller text' }),
        btn('A+', () => zoom(0.1), { 'aria-label': 'Larger text' }),
        btn('Full screen', () => fullscreen(), { title: 'F' }),
        btn('Close', () => close(), { 'data-field': 'pr.close', title: 'Esc' }),
      ]),
    ]),
    el('div', { class: 'pr-split' }, [nowPane, el('aside', { class: 'pr-side' }, [
      el('h3', { class: 'pr-h', text: 'On screen now' }), screenPane,
      el('h3', { class: 'pr-h', text: 'Next up' }), nextPane,
      el('h3', { class: 'pr-h', text: 'Running order' }), list])]),
    el('footer', { class: 'pr-keys small' }, ['Tap a line to say "I am here"; tap a block in the running order to go there. The red clock counts time since you pressed Start, pauses included - like your recording. With a keyboard or clicker you can also use: Space start/pause · ↑ ↓ one line · ← → one block · R restart · F full screen · Esc close.']),
    banner, sheet,
  ]);

  /* ---- the panes */
  function showBlock(i) {
    const b = plan.blocks[i];
    const pace = paceNote(b);
    nowPane.replaceChildren(...[
      el('div', { class: 'pr-meta small', text: `Block ${i + 1} of ${plan.blocks.length} · ${fmt(b.start)}–${fmt(b.start + b.seconds)}${b.estimated ? ' (no duration set - estimated from the words)' : ''}` }),
      el('h2', { class: 'pr-name', text: b.name }),
      b.purpose ? el('p', { class: 'pr-purpose', text: b.purpose }) : null,
      el('div', { class: 'pr-progress' }, [el('span', { class: 'pr-progress__fill' })]),
      el('div', { class: 'pr-left small' }),
      pace ? el('p', { class: 'pr-pace small', text: pace }) : null,
      el('ol', { class: 'pr-lines' }, b.lines.map((l) => el('li', { class: `pr-line pr-line--${l.kind}`, title: 'Tap: I am on this line', on: { click: () => { if (!done) { t = b.start + l.at; last = now(); tick(); } } } }, [
        l.kind === 'read' ? el('span', { class: 'pr-tag', text: 'READ' }) : null, l.text]))),
      b.notes ? el('p', { class: 'pr-notes small', text: b.notes }) : null,
    ].filter(Boolean));   // replaceChildren would print a null as the text "null"
    const n = plan.blocks[i + 1];
    nextPane.replaceChildren(...(n ? [el('strong', { text: n.name }), ...n.lines.slice(0, 2).map((l) => el('p', { class: `pr-peek pr-line--${l.kind}`, text: l.text }))]
      : [el('p', { class: 'pr-peek', text: 'That is the end - stop the recording after the motto.' })]));
    screenPane.replaceChildren(el('p', { class: 'pr-peek', text: b.visual || 'Nothing planned - your face or the character.' }));
    [...list.children].forEach((li, j) => li.classList.toggle('is-now', j === i));
    [...bar.children].forEach((s, j) => s.classList?.toggle('is-now', j === i));
  }

  function tick() {
    const pos = positionAt(plan, t);
    if (pos.done) return finish();
    if (pos.block !== shownBlock) {
      showBlock(pos.block); shownBlock = pos.block;
      if (started) marks.push({ at: recTime(), name: plan.blocks[pos.block].name, planned: plan.blocks[pos.block].start });
    }
    const b = plan.blocks[pos.block];
    nowPane.querySelectorAll('.pr-line').forEach((li, j) => { li.classList.toggle('is-now', j === pos.line); li.classList.toggle('is-past', j < pos.line); });
    nowPane.querySelector('.pr-progress__fill').style.width = `${Math.min(100, pos.progress * 100)}%`;
    const over = !auto && t >= b.start + b.seconds - 0.05;
    nowPane.querySelector('.pr-left').textContent = !started ? `Preview - read it through. Look ahead with the Line and Block buttons or the running order; while you talk, tap the line you are on to keep the highlight there. Press Start, then hit record during the 3-2-1 (${fmt(b.seconds)} for this block).`
      : over ? 'Time is up - press Block ▶ when you are ready.' : `${fmt(Math.ceil(pos.left))} left in this block`;
    root.classList.toggle('is-over', over);
    bar.lastChild.style.left = `${(t / plan.total) * 100}%`;
    clock.textContent = `${fmt(t)} / ${fmt(plan.total)}`;
    recClock.textContent = started ? `● ${fmt(recTime())}` : '';
    playBtn.textContent = running ? 'Pause' : started ? 'Continue' : 'Start';
    restartBtn.hidden = !started && !countTo;
  }

  function loop() {
    const n = now();
    if (countTo) {   // 3-2-1 after Start, time to hit record in Audacity; shown at the bottom so the notes stay readable
      const left = Math.ceil(countTo - n);
      if (left > 0) { banner.hidden = false; banner.className = 'pr-banner pr-banner--pause pr-banner--count'; banner.textContent = `Start recording - ${left}`; }
      else { countTo = 0; banner.hidden = true; beginTake(); }
    } else if (running) {
      let next = t + (n - last);
      const b = plan.blocks[positionAt(plan, t).block];
      if (!auto && b) next = Math.min(next, b.start + b.seconds - 0.01);   // hold at the end of the block
      t = next;
    }
    last = n;
    if (!done) tick();
  }

  /** The take begins: the clock runs from the block on screen. */
  function beginTake() {
    const b = plan.blocks[positionAt(plan, t).block];
    t = b.start; started = true; running = true; rec0 = now(); last = rec0;
    marks.push({ at: 0, name: b.name, planned: b.start });
    root.classList.remove('is-preview');
  }

  /* ---- controls */
  function toggle() {
    if (done) return;
    if (!started) { if (!countTo) countTo = now() + 3; return; }   // the notes stay put during the countdown
    running = !running;
    banner.hidden = running;
    if (!running) { banner.className = 'pr-banner pr-banner--pause'; banner.textContent = 'Paused - take a breath, read ahead. Press Continue to carry on.'; }
  }
  /** One line back or forward - keep the highlight on the line you are actually saying; it carries on from there. */
  function lineStep(d) {
    if (done) return;
    const pos = positionAt(plan, Math.min(t, plan.total - 0.001));
    const bi = pos.block, b = plan.blocks[bi], li = Math.max(0, pos.line) + d;
    if (li >= 0 && li < b.lines.length) t = b.start + b.lines[li].at + 0.01;
    else if (li < 0 && bi > 0) { const pb = plan.blocks[bi - 1]; t = pb.start + (pb.lines.at(-1)?.at || 0) + 0.01; }
    else if (li >= b.lines.length && bi + 1 < plan.blocks.length) t = plan.blocks[bi + 1].start + 0.01;
    else t = d < 0 ? b.start : t;
    last = now(); tick();
  }
  /** Throw the take away and go back to the top: the notes on screen, nothing moving, the cut points cleared. */
  function restart() {
    if (done) return;
    running = false; started = false; countTo = 0; rec0 = 0; t = 0;
    marks.length = 0;
    banner.hidden = true;
    root.classList.add('is-preview');
    shownBlock = -1; last = now(); tick();
    toast('Back to the top. Restart your recording too, then press Start.');
  }
  function jump(d) {
    if (done) return;
    const pos = positionAt(plan, t);
    const b = plan.blocks[pos.block];
    if (d > 0) t = pos.block + 1 < plan.blocks.length ? plan.blocks[pos.block + 1].start : plan.total;
    else t = pos.into > 2 || pos.block === 0 ? b.start : plan.blocks[pos.block - 1].start;
    last = now(); tick();
  }
  function fullscreen() { (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen?.())?.catch(() => {}); }
  function zoom(d) { size = Math.min(2, Math.max(0.6, Math.round((size + d) * 10) / 10)); root.style.setProperty('--pr-size', size); saveSize(size); }

  function finish() {
    done = true; running = false; clearInterval(timer);
    const total = recTime();
    const text = takeText(marks, { title, at: new Date().toLocaleString() }) + `\n${fmt(total)}  end`;
    banner.hidden = true;
    sheet.hidden = false;
    // feedback lives on the sheet itself, next to the buttons, so it cannot be missed
    const status = el('p', { class: 'small pr-status', role: 'status' });
    const saveBtn = btn('Save to recording notes', () => {
      if (saveBtn.disabled) return;
      commitWs((w) => { const r = M.getRecord(w, noteType, noteId); return M.updateRecord(w, noteType, noteId, { recordingNotes: withLatestTake(r.recordingNotes, text) }); }, { render: false });
      saveBtn.disabled = true; saveBtn.textContent = 'Saved ✓';
      status.textContent = 'Saved on this video (Record step → "Recording notes and cut points"). It replaces any earlier take - this one is used for the edit. Safe to close.';
    }, { class: 'btn primary', 'data-field': 'pr.save' });
    const copyBtn = btn('Copy', () => navigator.clipboard?.writeText(text).then(
      () => { copyBtn.textContent = 'Copied ✓'; status.textContent = 'Copied - paste it wherever you like.'; },
      () => { status.textContent = 'Could not copy here - select the text above and press Ctrl+C.'; status.classList.add('pr-status--warn'); }));
    sheet.replaceChildren(el('div', { class: 'pr-sheet__box' }, [
      el('h2', { text: 'Take done' }),
      el('p', { text: `${fmt(total)} recorded against ${fmt(plan.total)} planned. Stop your recording.` }),
      el('p', { class: 'small', text: 'Where each block began, counted from the hook - these are your cut points in the edit:' }),
      el('pre', { class: 'pr-take', text }),
      el('div', { class: 'row' }, [
        saveBtn, copyBtn,
        btn('Another take', () => { close(); openPrompter(type, record); }),
        btn('Close', () => close()),
      ]),
      status,
    ]));
  }

  function onKey(e) {
    if (e.target.closest?.('input, textarea')) return;
    const k = e.key;
    if (k === ' ' || k === 'Enter') toggle();
    else if (k === 'ArrowRight' || k === 'PageDown') jump(1);
    else if (k === 'ArrowLeft' || k === 'PageUp') jump(-1);
    else if (k === 'f' || k === 'F') fullscreen();
    else if (k === 'r' || k === 'R') restart();
    else if (k === 'ArrowUp') lineStep(-1);
    else if (k === 'ArrowDown') lineStep(1);
    else if (k === '+' || k === '=') zoom(0.1);
    else if (k === '-') zoom(-0.1);
    else if (k === 'Escape' && !document.fullscreenElement) close();
    else return;
    e.preventDefault();
  }
  function close() {
    clearInterval(timer); done = true;
    document.removeEventListener('keydown', onKey, true);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    root.remove();
  }

  /* ---- preview first: the notes are on screen, nothing moves until Start */
  sheet.hidden = true;
  root.classList.add('is-preview');
  if (delivery) screenPane.previousSibling.before(el('div', { class: 'pr-howto' }, [el('h3', { class: 'pr-h', text: 'How to say it' }), el('p', { class: 'pr-delivery', text: delivery })]));

  document.body.append(root);
  document.addEventListener('keydown', onKey, true);
  showBlock(0); shownBlock = 0;
  // a timer, not animation frames: frames stop when the window is covered (by the recording app, say) - the clock must not
  last = now(); timer = setInterval(loop, 50);
}
