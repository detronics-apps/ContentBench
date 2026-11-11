// Goals and achievements: a weekly target to aim for (a goal, never a requirement) and milestones worth celebrating.
// Pure - no DOM. Settings live on the workspace: config.weeklyTarget (posts a week) and config.channelStats
// ([{ date, followers, views, monetised }] - logged by hand from the platform's own numbers).

import { addDays } from './workflow.js';

const released = (o) => !!o.publishedDate || o.status === 'Published';

/** The Monday that starts the week of `iso`. */
export function weekStart(iso) {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return addDays(iso, -((d + 6) % 7));
}

/** Posts released in the week that starts on `monday` (every platform counts). */
export const releasedInWeek = (ws, monday) => ws.records.outputs
  .filter((o) => !o.archived && released(o) && o.publishedDate && o.publishedDate >= monday && o.publishedDate < addDays(monday, 7));

/** This week against the target: released so far, booked for the rest of the week, and the target itself. */
export function weekProgress(ws, today) {
  const monday = weekStart(today);
  const target = Number(ws.config.weeklyTarget) || 0;
  const out = releasedInWeek(ws, monday).length;
  const booked = ws.records.outputs.filter((o) => !o.archived && !released(o) && o.scheduledDate >= today && o.scheduledDate < addDays(monday, 7)).length;
  return { monday, target, released: out, booked };
}

const latestStat = (ws, key) => [...(ws.config.channelStats || [])].sort((a, b) => (a.date < b.date ? -1 : 1))
  .find((s) => (key === 'monetised' ? s.monetised : Number(s[key]) >= 1000)) || null;

/** The best week so far: the most posts released Monday to Sunday, and when that week started. */
function weeks(ws) {
  const by = {};
  for (const o of ws.records.outputs) if (!o.archived && released(o) && o.publishedDate) { const m = weekStart(o.publishedDate); by[m] = (by[m] || 0) + 1; }
  return by;
}

/**
 * The milestones, in order: earned (with the date) or still ahead (with how close). Release milestones count posts;
 * views, followers and monetisation come from the channel stats you log.
 */
export function achievements(ws, today) {
  const by = weeks(ws);
  // an earlier version that went out counts too (logged as a publication)
  const firstOut = [...ws.records.outputs.filter((o) => !o.archived && o.publishedDate).map((o) => o.publishedDate),
    ...(ws.records.publications || []).filter((p) => !p.archived && p.date).map((p) => p.date)].sort()[0] || null;
  const firstWeek = (n) => Object.keys(by).sort().find((m) => by[m] >= n) || null;
  const best = Math.max(0, ...Object.values(by));
  const now = weekProgress(ws, today).released;
  const stat = (key) => latestStat(ws, key);
  const newest = [...(ws.config.channelStats || [])].sort((a, b) => (a.date < b.date ? 1 : -1))[0] || {};
  return [
    { id: 'first', title: 'First video out', detail: 'The hardest one.', earned: firstOut, progress: firstOut ? null : { n: 0, of: 1 } },
    { id: 'daily', title: 'A video a day', detail: '6 in one week - every day, with one rest day.', earned: firstWeek(6) && addDays(firstWeek(6), 6), progress: { n: Math.max(now, best), of: 6 } },
    { id: 'ten', title: '10 in a week', detail: 'The pace that gets a channel noticed.', earned: firstWeek(10) && addDays(firstWeek(10), 6), progress: { n: Math.max(now, best), of: 10 } },
    { id: 'views', title: '1,000 views', detail: 'Across the channel.', earned: stat('views')?.date || null, progress: { n: Number(newest.views) || 0, of: 1000 } },
    { id: 'followers', title: '1,000 followers', detail: 'A real audience.', earned: stat('followers')?.date || null, progress: { n: Number(newest.followers) || 0, of: 1000 } },
    { id: 'paid', title: 'Monetised', detail: 'The channel starts paying.', earned: stat('monetised')?.date || null, progress: null },
  ].map((a) => ({ ...a, earned: a.earned || null }));
}

/** Logs the channel's numbers for a day (one entry per day; a later log the same day replaces it). */
export function logStats(ws, { date, followers = '', views = '', monetised = false }) {
  const rest = (ws.config.channelStats || []).filter((s) => s.date !== date);
  const entry = { date, followers: followers === '' ? '' : Number(followers), views: views === '' ? '' : Number(views), monetised: !!monetised };
  return { ...ws, config: { ...ws.config, channelStats: [...rest, entry].sort((a, b) => (a.date < b.date ? -1 : 1)) } };
}

export const setWeeklyTarget = (ws, n) => ({ ...ws, config: { ...ws.config, weeklyTarget: Math.max(0, Math.round(Number(n) || 0)) } });
