import test from 'node:test';
import assert from 'node:assert/strict';
import { blankWorkspace, createRecord } from '../js/model.js';
import { makingPlan, makingEntries, bankOf, setStage, setStageDays, keepPlan } from '../js/making.js';

const NOW = '2026-11-13T08:00:00.000Z';
function setup(release, fields = {}) {
  let w = blankWorkspace();
  const r = createRecord(w, 'content', { workingTitle: 'Rent or buy', ...fields }, NOW); w = r.ws;
  if (release !== undefined) w = createRecord(w, 'outputs', { contentId: r.record.id, scheduledDate: release }, NOW).ws;
  return { w, id: r.record.id, c: () => w.records.content.find((x) => x.id === r.record.id) };
}
const days = (p) => Object.fromEntries(p.steps.map((s) => [s.id, s.date]));

test('stages are planned back from the release: ready the day before', () => {
  const { w, c } = setup('2026-11-20');
  const p = makingPlan(w, c(), '2026-11-13');
  assert.equal(p.readyBy, '2026-11-19');
  assert.deepEqual(days(p), { investigate: '2026-11-17', draft: '2026-11-18', review: '2026-11-18', record: '2026-11-19', edit: '2026-11-19', schedule: '2026-11-19' });
});

test('going out today with nothing done: every stage is today - never late', () => {
  const { w, c } = setup('2026-11-13');
  const p = makingPlan(w, c(), '2026-11-13');
  assert.ok(p.steps.every((s) => s.date === '2026-11-13'));
  assert.ok(p.steps.find((s) => s.id === 'investigate').carried);
});

test('a done stage ticks everything before it; a later video step ticks its stage', () => {
  let { w, id, c } = setup('2026-11-20');
  w = setStage(w, id, 'review', { done: '2026-11-13' }, NOW);
  const p = makingPlan(w, w.records.content.find((x) => x.id === id), '2026-11-13');
  assert.deepEqual(p.steps.filter((s) => s.done).map((s) => s.id), ['investigate', 'draft', 'review']);
  assert.ok(!p.ready);
  void c;
});

test('a longer investigation and a moved day are kept; keep the plan pins every open day', () => {
  let { w, id } = setup('2026-11-20');
  w = setStageDays(w, id, 'investigate', 3, NOW);
  const get = () => w.records.content.find((x) => x.id === id);
  assert.equal(days(makingPlan(w, get(), '2026-11-13')).investigate, '2026-11-15');
  w = setStage(w, id, 'record', { on: '2026-11-16' }, NOW);
  assert.equal(days(makingPlan(w, get(), '2026-11-13')).record, '2026-11-16');
  w = keepPlan(w, id, '2026-11-13', NOW);
  w = { ...w, records: { ...w.records, outputs: w.records.outputs.map((o) => ({ ...o, scheduledDate: '2026-11-27' })) } };
  assert.equal(days(makingPlan(w, get(), '2026-11-13')).draft, '2026-11-18', 'kept days stay when the release moves');
});

test('the dates say which video each stage is for; undated videos have no days', () => {
  const { w } = setup('2026-11-20');
  const e = makingEntries(w, '2026-11-13');
  assert.equal(e.length, 6);
  assert.equal(e[0].for, '2026-11-20');
  assert.equal(makingEntries(setup(undefined).w, '2026-11-13').length, 0);
});

test('the bank: edited and not out; undated ones are the ones to drop in', () => {
  let { w, id } = setup(undefined);
  assert.equal(bankOf(w, '2026-11-13').ready.length, 0);
  w = setStage(w, id, 'edit', { done: '2026-11-13' }, NOW);
  const b = bankOf(w, '2026-11-13', 1);
  assert.equal(b.bank.length, 1);
  assert.equal(b.days, 1);
});

test('a booked date and caption tick Schedule only - the video still has to be made', () => {
  let { w, id } = setup('2026-11-20');
  w = setStage(w, id, 'schedule', { done: '2026-11-13' }, NOW);
  const p = makingPlan(w, w.records.content.find((x) => x.id === id), '2026-11-13');
  assert.deepEqual(p.steps.filter((s) => s.done).map((s) => s.id), ['schedule']);
  assert.ok(!p.ready);
});
