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
