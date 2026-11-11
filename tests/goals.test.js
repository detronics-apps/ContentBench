import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankWorkspace } from '../js/model.js';
import { weekStart, weekProgress, achievements, logStats, setWeeklyTarget } from '../js/goals.js';
import { dayQuota, planAtPace } from '../js/releases.js';

const T = '2026-11-01T00:00:00.000Z';
function ws(outs, cfg = {}) {
  const w = blankWorkspace();
  const content = [{ id: 'c', workingTitle: 'C', status: 'Ready', created: T, modified: T, archived: false }];
  const outputs = outs.map((o, i) => ({ id: `o${i}`, contentId: 'c', platformId: 'p', status: o.pub ? 'Published' : 'Scheduled', scheduledDate: o.d || o.pub, publishedDate: o.pub || '', archived: false, created: T, modified: T }));
  return { ...w, config: { ...w.config, ...cfg }, records: { ...w.records, content, outputs } };
}

test('weeks start on Monday; this week counts what is out and what is still booked', () => {
  assert.equal(weekStart('2026-11-11'), '2026-11-09');
  assert.equal(weekStart('2026-11-09'), '2026-11-09');
  assert.equal(weekStart('2026-11-15'), '2026-11-09');
  const w = ws([{ pub: '2026-11-08' }, { pub: '2026-11-09' }, { pub: '2026-11-10' }, { d: '2026-11-12' }, { d: '2026-11-16' }], { weeklyTarget: 10 });
  assert.deepEqual(weekProgress(w, '2026-11-11'), { monday: '2026-11-09', target: 10, released: 2, booked: 1 });
});

test('achievements: first out, a video a day (6 in a week), 10 in a week, and the logged numbers', () => {
  const six = [...Array(6)].map((_, i) => ({ pub: `2026-11-${String(16 + i).padStart(2, '0')}` }));
  let w = ws([{ pub: '2026-11-08' }, ...six]);
  const a = Object.fromEntries(achievements(w, '2026-11-23').map((x) => [x.id, x]));
  assert.equal(a.first.earned, '2026-11-08');
  assert.equal(a.daily.earned, '2026-11-22', 'earned at the end of that week');
  assert.equal(a.ten.earned, null);
  assert.deepEqual(a.ten.progress, { n: 6, of: 10 });
  w = logStats(w, { date: '2026-11-20', followers: 250, views: 1400 });
  w = logStats(w, { date: '2026-12-01', followers: 1010, views: 9000, monetised: true });
  const b = Object.fromEntries(achievements(w, '2026-12-02').map((x) => [x.id, x]));
  assert.equal(b.views.earned, '2026-11-20');
  assert.equal(b.followers.earned, '2026-12-01');
  assert.equal(b.paid.earned, '2026-12-01');
  assert.equal(logStats(w, { date: '2026-12-01', followers: 1020 }).config.channelStats.length, 2, 'one entry per day');
  assert.equal(setWeeklyTarget(w, '10').config.weeklyTarget, 10);
});

test('the line is planned at the weekly pace, in its own order, from a date', () => {
  assert.deepEqual(dayQuota(10), [1, 1, 2, 1, 2, 1, 2]);
  assert.equal(dayQuota(10).reduce((a, b) => a + b), 10);
  assert.deepEqual(dayQuota(7), [1, 1, 1, 1, 1, 1, 1]);
  const w = ws([{ d: '2026-11-14' }, { d: '2026-12-03' }, { d: '2026-12-05' }, { d: '2026-12-07' }, { d: '2026-12-09' }, { pub: '2026-11-09' }]);
  const out = planAtPace(w, 'p', '2026-11-15', 10, T);
  assert.deepEqual(out.records.outputs.map((o) => o.scheduledDate), ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-17', '2026-11-09']);
});
