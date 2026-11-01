import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../js/workflow.js';

const tpl = () => W.makeWorkflowTemplate({ name: 'T', steps: ['A', { name: 'B', skippable: false }, { name: 'C', optional: true }] });

test('every template edit bumps the version', () => {
  let t = tpl();
  assert.equal(t.version, 1);
  t = W.addStep(t, { name: 'D' });
  t = W.updateStep(t, t.steps[0].id, { name: 'A2' });
  t = W.moveStep(t, t.steps[0].id, 1);
  t = W.duplicateStep(t, t.steps[0].id);
  t = W.removeStep(t, t.steps[0].id);
  assert.equal(t.version, 6);
  assert.deepEqual(t.steps.map((s) => s.name), ['B', 'A2', 'C', 'D']);
});

test("removing a step also removes it from other steps' dependencies", () => {
  let t = tpl();
  t = W.updateStep(t, t.steps[2].id, { dependsOn: [t.steps[0].id] });
  t = W.removeStep(t, t.steps[0].id);
  assert.deepEqual(t.steps[1].dependsOn, []);
});

test('an instance keeps its version; template edits never reach it', () => {
  let t = tpl();
  const inst = W.instantiateWorkflow(t);
  t = W.updateStep(t, t.steps[0].id, { name: 'Renamed' });
  assert.equal(inst.steps[0].name, 'A');
  assert.equal(inst.templateVersion, 1);
  assert.deepEqual(W.templateDrift(inst, t), { from: 1, to: 2 });
  assert.equal(W.templateDrift(inst, W.makeWorkflowTemplate()), null, 'other template');
});

test('a required unskippable step refuses to be skipped; progress counts', () => {
  let inst = W.instantiateWorkflow(tpl());
  const [a, b, c] = inst.steps;
  inst = W.setStepStatus(inst, b.id, 'skipped');
  assert.equal(inst.steps[1].status, 'todo');
  inst = W.setStepStatus(inst, a.id, 'done');
  inst = W.setStepStatus(inst, c.id, 'skipped');
  const p = W.progress(inst);
  assert.deepEqual({ ...p, next: p.next.name }, { done: 1, skipped: 1, total: 3, requiredLeft: 1, next: 'B' });
  assert.throws(() => W.setStepStatus(inst, a.id, 'finished'));
});

test('checklist toggles and dependencies block', () => {
  let t = W.makeWorkflowTemplate({ steps: [{ name: 'A', checklist: ['x', 'y'] }, 'B'] });
  t = W.updateStep(t, t.steps[1].id, { dependsOn: [t.steps[0].id] });
  let inst = W.instantiateWorkflow(t);
  assert.deepEqual(W.blockedSteps(inst), [inst.steps[1].id]);
  inst = W.toggleCheck(inst, inst.steps[0].id, 1);
  assert.deepEqual(inst.steps[0].checks, [false, true]);
  inst = W.setStepStatus(inst, inst.steps[0].id, 'done');
  assert.deepEqual(W.blockedSteps(inst), []);
});

test('story blocks add, remove, reorder and repeat; instances own their blocks', () => {
  let s = W.makeStoryTemplate({ blocks: ['Hook', 'Payoff'] });
  s = W.repeatBlock(s, s.blocks[0].id);
  s = W.moveBlock(s, s.blocks[2].id, -1);
  assert.deepEqual(s.blocks.map((b) => b.name), ['Hook', 'Payoff', 'Hook']);
  assert.equal(s.version, 3);
  const inst = W.instantiateStory(s);
  assert.notEqual(inst.blocks[0].id, s.blocks[0].id);
  const edited = W.instanceBlocks.update(inst, inst.blocks[0].id, { script: 'hi' });
  assert.equal(s.blocks[0].script, '');
  assert.equal(edited.blocks[0].script, 'hi');
  assert.equal(W.instanceBlocks.remove(edited, edited.blocks[0].id).blocks.length, 2);
});

test('duplicateTemplate restarts at version 1 with a new id', () => {
  const t = W.addStep(tpl(), {});
  const d = W.duplicateTemplate(t);
  assert.equal(d.version, 1);
  assert.notEqual(d.id, t.id);
  assert.match(d.name, /copy/);
});

test('back-scheduling: last step due on the date, each earlier one when the next must start; skipped take no time', () => {
  let inst = W.instantiateWorkflow(W.makeWorkflowTemplate({ steps: [{ name: 'Research', days: 3 }, { name: 'Script', days: 2 }, { name: 'Extra', days: 5 }, { name: 'Record', days: 1 }] }));
  inst = W.setStepStatus(inst, inst.steps[2].id, 'skipped');
  inst = W.scheduleBackwards(inst, '2026-03-31');
  assert.deepEqual(inst.steps.map((s) => s.due), ['2026-03-28', '2026-03-30', '', '2026-03-31']);
  assert.equal(W.startDate(inst), '2026-03-25');
  assert.equal(W.addDays('2026-03-29', 1), '2026-03-30', 'a DST weekend does not shift the day');
  assert.equal(W.stepDays({ days: '' }), 1);
  assert.equal(W.stepDays({ days: 0 }), 0);
});

test('timeline: durations parse, untimed blocks are listed not guessed', () => {
  assert.equal(W.parseSeconds('0:15'), 15);
  assert.equal(W.parseSeconds('1:30'), 90);
  assert.equal(W.parseSeconds('45s'), 45);
  assert.equal(W.parseSeconds('2m'), 120);
  assert.equal(W.parseSeconds('1m30'), 90);
  assert.equal(W.parseSeconds('12'), 12);
  assert.equal(W.parseSeconds('a while'), null);
  assert.equal(W.parseSeconds(''), null);
  assert.equal(W.formatSeconds(75), '1:15');
  const t = W.timeline([{ id: 'a', name: 'Hook', duration: '0:03' }, { id: 'b', name: 'Body', duration: '?' }, { id: 'c', name: 'CTA', duration: '5' }]);
  assert.equal(t.total, 8);
  assert.deepEqual(t.segments.map((s) => s.start), [0, 3]);
  assert.deepEqual(t.untimed, ['Body']);
});
