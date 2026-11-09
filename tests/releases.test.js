import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../js/releases.js';
import { exampleWorkspace } from '../js/seed.js';

const T = '2026-01-01T00:00:00.000Z';   // a Thursday

test('slots follow the rhythm, and a switched-off rhythm has none', () => {
  assert.deepEqual(R.slotDates({ enabled: true, days: [6] }, '2026-01-01', 14), ['2026-01-03', '2026-01-10']);
  assert.deepEqual(R.slotDates({ enabled: false, days: [6] }, '2026-01-01', 14), []);
});

test('the backlog fills empty slots in order; booked slots stay booked', () => {
  const ws = exampleWorkspace(T);
  const tt = ws.platforms.find((p) => p.name === 'TikTok');
  const plan = R.releasePlan(ws, tt.id, '2026-01-01', 28);
  assert.equal(plan.slots.length, 4);
  assert.equal(plan.backlog.length, 1, 'only the ready TikTok output waits');
  assert.equal(plan.slots[0].suggestion?.title, 'Speed is not truth');
  assert.equal(plan.uncovered, 3);
  const filled = R.fillSlots(ws, tt.id, '2026-01-01', 28);
  const after = R.releasePlan(filled, tt.id, '2026-01-01', 28);
  assert.equal(after.slots[0].output?.title, 'Speed is not truth');
  assert.equal(after.backlog.length, 0);
  assert.deepEqual(R.backlogHealth(ws, '2026-01-01').map((h) => [h.platform.name, h.ready, h.short]), [['TikTok', 1, true]]);
});

test('calendar chips are release dates only; a published output keeps its date', () => {
  let ws = exampleWorkspace(T);
  const o = ws.records.outputs[0];
  ws = R.placeOnCalendar(ws, o.id, '2026-02-07');
  assert.equal(R.calendarItems(ws).find((i) => i.id === o.id).date, '2026-02-07');
  assert.ok(R.calendarItems(ws).every((i) => i.type === 'outputs'));
  const pub = { ...ws, records: { ...ws.records, outputs: ws.records.outputs.map((x) => (x.id === o.id ? { ...x, publishedDate: '2026-01-02' } : x)) } };
  assert.equal(R.placeOnCalendar(pub, o.id, '2026-03-01'), pub);
});

/** A workspace with one video and the given platform versions. */
function queueWs(outs) {
  let ws = exampleWorkspace(T);
  const [p1, p2] = ws.platforms;
  const c = { id: 'c1', workingTitle: 'Q', status: 'Ready', created: T, modified: T, archived: false };
  ws = { ...ws, records: { ...ws.records, content: [c], outputs: outs.map((o, i) => ({ id: `o${i}`, contentId: 'c1', platformId: o.p === 2 ? p2.id : p1.id, status: 'Scheduled',
    scheduledDate: o.d, publishedDate: o.pub || '', archived: false, created: T, modified: T })) } };
  return ws;
}
const dates = (ws) => ws.records.outputs.map((o) => o.scheduledDate);

test('a missed release moves its platform\'s whole queue on by the missed days, spacing kept', () => {
  const ws = queueWs([{ d: '2026-11-08' }, { d: '2026-11-11' }, { d: '2026-11-14' }, { d: '2026-11-08', p: 2 }, { d: '2026-11-07', pub: '2026-11-07' }]);
  const out = R.rollForward(ws, '2026-11-10');
  assert.deepEqual(dates(out), ['2026-11-10', '2026-11-13', '2026-11-16', '2026-11-10', '2026-11-07']);
  assert.equal(R.rollForward(out, '2026-11-10'), out, 'nothing to move: the same workspace back');
  const fine = queueWs([{ d: '2026-11-12' }]);
  assert.equal(R.rollForward(fine, '2026-11-10'), fine);
});

test('released on the day it went out; the video is Published when every version is out', () => {
  let ws = queueWs([{ d: '2026-11-10' }, { d: '2026-11-12', p: 2 }]);
  ws = R.markReleased(ws, 'o0', '2026-11-09');
  const o = ws.records.outputs[0];
  assert.deepEqual([o.publishedDate, o.scheduledDate, o.status], ['2026-11-09', '2026-11-09', 'Published']);
  assert.equal(ws.records.content[0].status, 'Ready');
  assert.deepEqual(R.releaseQueue(ws).map((x) => x.output.id), ['o1']);
  ws = R.markReleased(ws, 'o1', '2026-11-12');
  assert.equal(ws.records.content[0].status, 'Published');
  assert.equal(R.markReleased(ws, 'o1', '2026-11-20'), ws, 'already out: the date it went out stays');
  assert.equal(R.rollForward(ws, '2026-12-01'), ws, 'released ones never move');
});
