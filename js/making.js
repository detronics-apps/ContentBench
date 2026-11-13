// Making a video, planned back from the day it goes out. Pure - no DOM.
//
// One list of stages per video, in the order the work runs. Each stage gets the day to work on it, counted back
// from the release: the video is ready the day before it goes out. Nothing is ever late - a day that has passed
// is simply today. Most stages tick themselves from the work already done (a written card means the draft is done);
// Review is the one you tick by hand. A day you move a stage to is kept (pinned) until you clear it.

import { addDays } from './workflow.js';
import { readiness } from './readiness.js';

/** `days` = how long it usually takes, in working days; `from` = the video step that ticks it. */
export const MAKING = [
  { id: 'investigate', name: 'Investigate', days: 1, hint: 'Gather the data - build or update the app if the video needs it' },
  { id: 'draft', name: 'Draft with Claude', days: 0.5, from: 'card', hint: 'The rough card' },
  { id: 'review', name: 'Review and make it yours', days: 0.5, hint: 'Read it through and reword it until it sounds like you' },
  { id: 'record', name: 'Record', days: 0.5, from: 'record' },
  { id: 'edit', name: 'Edit, image and music', days: 0.5, from: 'edit' },
  { id: 'schedule', name: 'Schedule', days: 0, from: 'publish', hint: 'Date, time and caption - about 10 minutes' },
];
/** Ready this many days before it goes out. */
export const READY_BEFORE = 1;

const live = (ws, c) => ws.records.outputs.filter((o) => o.contentId === c.id && !o.archived);
/** Out on every platform version it has. */
export const isOut = (ws, c) => live(ws, c).length > 0 && live(ws, c).every((o) => o.publishedDate || o.status === 'Published');

/** The next release of a video: the earliest version booked and not yet out. */
export function releaseOf(ws, c) {
  const o = live(ws, c).filter((x) => x.scheduledDate && !x.publishedDate).sort((a, b) => (a.scheduledDate < b.scheduledDate ? -1 : 1))[0];
  return o ? { date: o.scheduledDate, output: o } : null;
}

/** Which stages are done: ticked, or ticked by the video's own steps - and anything before a done stage (bar Schedule) is done too. */
export function stagesDone(ws, c) {
  const state = readiness(ws, c).state;
  const own = MAKING.map((s) => !!c.making?.[s.id]?.done || (s.from && ['done', 'booked'].includes(state[s.from])));
  // a done stage means the ones before it are done - except Schedule, which can be booked before the video is made
  return MAKING.map((s, i) => own[i] || own.some((o, j) => o && j > i && MAKING[j].id !== 'schedule'));
}

/**
 * The plan for one video: each stage with its day. `readyBy` = the day before release, or today if that has passed.
 * A stage's day counts back from readyBy by the time the stages after it still need. Undated videos get no days.
 */
export function makingPlan(ws, c, today) {
  const release = releaseOf(ws, c);
  const done = stagesDone(ws, c);
  const days = (s) => Number(c.making?.days?.[s.id] ?? s.days) || 0;
  const readyBy = release ? (addDays(release.date, -READY_BEFORE) < today ? today : addDays(release.date, -READY_BEFORE)) : null;
  let left = 0;
  const steps = MAKING.map((s, i) => ({ ...s, days: days(s), done: done[i] })).reverse().map((s) => {
    if (s.done || !readyBy) return { ...s, date: null };
    left += s.days;
    const planned = addDays(readyBy, -Math.max(0, Math.ceil(left) - 1));
    const pin = c.making?.[s.id]?.on || '';
    const date = pin || planned;
    return { ...s, planned, pinned: !!pin, date: date < today ? today : date, carried: date < today };
  }).reverse();
  return { release, readyBy, steps, ready: done[MAKING.findIndex((s) => s.id === 'edit')], done: done.every(Boolean) };
}

const inMaking = (ws, c) => !c.archived && c.status !== 'Parked' && !isOut(ws, c);

/** Every open stage with a day, for the dates: "Record - for Sun's video". */
export function makingEntries(ws, today) {
  return ws.records.content.filter((c) => inMaking(ws, c)).flatMap((c) => {
    const p = makingPlan(ws, c, today);
    return p.steps.filter((s) => s.date).map((s) => ({
      kind: 'step', date: s.date, title: `${s.name}: ${c.workingTitle}`, step: s.name, stageId: s.id, video: c.workingTitle,
      for: p.release.date, type: 'content', id: c.id, done: false, passed: false, carried: s.carried, pinned: s.pinned,
    }));
  });
}

/**
 * The bank: videos made and waiting. `ready` = edited and not out yet; `bank` = those of them with no release date,
 * to drop into any open day. `days` = how many days they cover at `perDay` releases a day.
 */
export function bankOf(ws, today, perDay = 1) {
  const ready = ws.records.content.filter((c) => inMaking(ws, c) && makingPlan(ws, c, today).ready);
  const bank = ready.filter((c) => !releaseOf(ws, c));
  return { ready, bank, days: perDay > 0 ? Math.floor(ready.length / perDay) : 0 };
}

/** Tick a stage done (or not) for a video. */
export function setStage(ws, id, stageId, patch, now = new Date().toISOString()) {
  return { ...ws, records: { ...ws.records, content: ws.records.content.map((c) => {
    if (c.id !== id) return c;
    const making = { ...(c.making || {}) };
    const next = { ...(making[stageId] || {}), ...patch };
    for (const k of Object.keys(next)) if (next[k] === '' || next[k] == null) delete next[k];
    if (Object.keys(next).length) making[stageId] = next; else delete making[stageId];
    return { ...c, making, modified: now };
  }) } };
}

/** How many days a stage takes for this video (Investigate can take longer when an app needs building). */
export const setStageDays = (ws, id, stageId, days, now = new Date().toISOString()) => setStage(ws, id, 'days', { [stageId]: days === '' ? '' : Number(days) }, now);

/** Keep the days as planned now: every open stage is pinned to its day, so moving the release leaves them be. */
export function keepPlan(ws, id, today, now = new Date().toISOString()) {
  const c = ws.records.content.find((x) => x.id === id);
  if (!c) return ws;
  return makingPlan(ws, c, today).steps.filter((s) => s.date && !s.pinned).reduce((w, s) => setStage(w, id, s.id, { on: s.date }, now), ws);
}
