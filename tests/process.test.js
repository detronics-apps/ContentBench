import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../js/process.js';

const proc = () => P.defaultProcess();

test('the default process has 15 stages in six groups, with the passport prompts first', () => {
  const p = proc();
  assert.equal(p.stages.length, 15);
  assert.deepEqual([...new Set(P.sortedStages(p).map((s) => s.group))], P.GROUPS);
  assert.equal(P.passportPrompts(p).length, 6);
  assert.equal(P.firstPlanStage(p).name, 'Investigation');
  assert.ok(p.scorecard.length >= 10);
  for (const c of p.scorecard) assert.equal(c.anchors.length, 10, c.name);
  assert.equal(p.stages.filter((s) => s.finish).length, 1);
});

test('a project can move to any stage, back as well as forward, and the log keeps the time', () => {
  let pr = { stageId: '' };
  pr = P.moveStage(pr, 'st4', { today: '2026-01-01' });
  pr = P.moveStage(pr, 'st6', { today: '2026-01-04' });
  pr = P.moveStage(pr, 'st4', { today: '2026-01-05', reason: 'missing data' });
  assert.equal(pr.stageId, 'st4');
  assert.deepEqual(pr.stageLog.map((e) => [e.stageId, e.entered, e.left]),
    [['st4', '2026-01-01', '2026-01-04'], ['st6', '2026-01-04', '2026-01-05'], ['st4', '2026-01-05', '']]);
  assert.equal(pr.stageLog[2].reason, 'missing data');
  assert.equal(P.moveStage(pr, 'st4', { today: '2026-02-01' }), pr, 'same stage is no move');
});

test('estimates are placeholders until two finished visits, then your own average', () => {
  const stage = { id: 'st4', days: 3 };
  assert.deepEqual(P.estimateDays(stage, []), { days: 3, source: 'placeholder', samples: 0 });
  assert.equal(P.estimateDays(stage, [5]).source, 'placeholder');
  assert.deepEqual(P.estimateDays(stage, [5, 8]), { days: 7, source: 'yours', samples: 2 });
  const projects = [{ stageLog: [{ stageId: 'st4', entered: '2026-01-01', left: '2026-01-06' }, { stageId: 'st4', entered: '2026-01-07', left: '2026-01-07' },
    { stageId: 'st4', entered: '2026-02-01', left: '' }] }];
  assert.deepEqual(P.stageSamples(projects, 'st4'), [5], 'open visits and same-day pass-throughs are not samples');
});

test('forecast counts forwards to the finish stage, minus time already spent', () => {
  const p = proc();
  let pr = P.moveStage({ stageId: '' }, 'st8', { today: '2026-03-01' });   // Refine 2 days, then Evaluate 1
  const f = P.projectForecast(pr, p, [pr], '2026-03-02');
  assert.equal(f.remaining, 1 + 1);
  assert.equal(f.date, '2026-03-04');
  assert.equal(f.finishStage.name, 'Evaluate');
  assert.equal(P.projectForecast(pr, p, [pr], '2026-03-10').remaining, 1 + 1, 'running over: still a day left, never zero');
  const stamped = P.stampForecast(pr, '2026-03-04');
  assert.deepEqual(P.forecastDrift(stamped, '2026-03-06'), { was: '2026-03-04', days: 2 });
  pr = P.moveStage(pr, 'st12', { today: '2026-03-03' });
  assert.equal(P.projectForecast(pr, p, [pr], '2026-03-03').past, true);
});

test('scores are optional: the average counts only what was answered', () => {
  const card = proc().scorecard;
  assert.deepEqual(P.scoreSummary({}, card), { answered: 0, total: card.length, average: null });
  assert.deepEqual(P.scoreSummary({ sc1: 4, sc2: 7, sc3: '', sc4: 99 }, card), { answered: 2, total: card.length, average: 5.5 });
  assert.equal(P.answeredCount({ 0: 'yes', 2: '  ' }, ['a', 'b', 'c']), 1);
});
