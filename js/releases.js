// Releasing on a rhythm. Each platform has its own release days; finished outputs wait
// in a backlog and fill the next free slot. Nothing is moved without the creator's click.

import { nowIso, todayIso, getRecord, updateRecord } from './model.js';
import { addDays } from './workflow.js';
import { outputLabel } from './content.js';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const blankRhythm = () => ({ enabled: false, days: [], target: 2 });

const weekday = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/** Release days from `from` (inclusive) for `span` days. */
export function slotDates(rhythm, from, span = 28) {
  if (!rhythm?.enabled || !rhythm.days?.length) return [];
  const out = [];
  for (let i = 0; i < span; i++) {
    const d = addDays(from, i);
    if (rhythm.days.includes(weekday(d))) out.push(d);
  }
  return out;
}

const released = (o) => !!o.publishedDate || o.status === 'Published';

/** Ready, not yet given a date: the backlog for one platform, oldest first. */
export function backlog(ws, platformId) {
  return ws.records.outputs.filter((o) => !o.archived && o.platformId === platformId && !released(o) && !o.scheduledDate
    && (o.status === 'Ready' || getRecord(ws, 'content', o.contentId)?.status === 'Ready'))
    .sort((a, b) => (a.created < b.created ? -1 : 1));
}

/** The next weeks of slots for one platform: what is booked, and what the backlog would fill. */
export function releasePlan(ws, platformId, today = todayIso(), span = 28) {
  const platform = ws.platforms.find((p) => p.id === platformId);
  if (!platform) return null;
  const queue = backlog(ws, platformId);
  const waiting = [...queue];
  const booked = ws.records.outputs.filter((o) => !o.archived && o.platformId === platformId && o.scheduledDate && !released(o));
  const slots = slotDates(platform.rhythm, today, span).map((date) => {
    const output = booked.find((o) => o.scheduledDate === date) || null;
    return { date, output, suggestion: output ? null : waiting.shift() || null };
  });
  const empty = slots.filter((s) => !s.output).length;
  return { platform, slots, backlog: queue, empty, uncovered: Math.max(0, empty - queue.length) };
}

/** One line per platform with a rhythm switched on: is there enough waiting? */
export function backlogHealth(ws, today = todayIso(), span = 28) {
  return ws.platforms.filter((p) => p.rhythm?.enabled).map((p) => {
    const plan = releasePlan(ws, p.id, today, span);
    const target = Number(p.rhythm.target) || 0;
    return { platform: p, ready: plan.backlog.length, empty: plan.empty, uncovered: plan.uncovered, short: plan.backlog.length < target, target };
  });
}

/** Books the backlog into every empty slot it can fill. */
export function fillSlots(ws, platformId, today, span = 28, now = nowIso()) {
  const plan = releasePlan(ws, platformId, today, span);
  let out = ws;
  for (const s of plan?.slots || []) if (s.suggestion) out = updateRecord(out, 'outputs', s.suggestion.id, { scheduledDate: s.date, status: 'Scheduled' }, now);
  return out;
}

/* ---------------------------------------------------------------- calendar */

/** Release chips: one per platform output, coloured by its content's category. */
export function calendarItems(ws) {
  const cat = (id) => ws.config.categories.find((x) => x.id === id) || null;
  return ws.records.outputs.filter((r) => !r.archived).map((o) => {
    const c = getRecord(ws, 'content', o.contentId);
    return { type: 'outputs', id: o.id, title: o.title || c?.workingTitle || '(untitled)', label: outputLabel(ws, o),
      platformId: o.platformId, date: o.publishedDate || o.scheduledDate || '', color: cat(c?.categoryId)?.color || '',
      category: cat(c?.categoryId)?.name || '', done: released(o),
      ready: o.status === 'Ready' || c?.status === 'Ready' };
  });
}

/** A drop on the calendar. A published output keeps its date. */
export function placeOnCalendar(ws, id, date, now = nowIso()) {
  const o = getRecord(ws, 'outputs', id);
  if (!o || released(o)) return ws;
  return updateRecord(ws, 'outputs', id, { scheduledDate: date }, now);
}
