import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankWorkspace, createRecord, getRecord } from '../js/model.js';
import { addLesson, updateLesson, removeLesson, lessonsFor, lessonsOf, checksDone, tickCheck, LESSON_STEPS } from '../js/lessons.js';

const NOW = '2026-11-09T10:00:00.000Z';

test('a lesson is an issue, its fix and the check that keeps it from happening again', () => {
  let w = blankWorkspace();
  assert.deepEqual(lessonsOf(w), [], 'a new workspace has none');
  const a = addLesson(w, { step: 'card', check: ' Is the hook about the viewer? ', issue: 'The hook was about me', fix: 'Reworked it' }, NOW);
  w = a.ws;
  assert.equal(a.lesson.check, 'Is the hook about the viewer?');
  assert.equal(a.lesson.date, '2026-11-09');
  w = addLesson(w, { step: 'edit', check: 'Folder made first?' }, NOW).ws;
  assert.deepEqual(lessonsFor(w, 'card').map((l) => l.check), ['Is the hook about the viewer?']);
  w = updateLesson(w, a.lesson.id, { check: 'Is the hook on the viewer\'s turf?' });
  assert.equal(lessonsFor(w, 'card')[0].check, 'Is the hook on the viewer\'s turf?');
  w = removeLesson(w, a.lesson.id);
  assert.equal(lessonsFor(w, 'card').length, 0);
  assert.ok(LESSON_STEPS.some(([id]) => id === 'results'));
});

test('ticks are per video and per check, and only a note to self', () => {
  let w = blankWorkspace();
  const l = addLesson(w, { step: 'card', check: 'Q?' }, NOW); w = l.ws;
  w = addLesson(w, { step: 'card', check: 'Q2?' }, NOW).ws;
  const r = createRecord(w, 'content', { workingTitle: 'V' }, NOW); w = r.ws;
  assert.deepEqual(checksDone(w, r.record, 'card'), { ticked: 0, total: 2 });
  w = tickCheck(w, r.record.id, l.lesson.id, true, NOW);
  assert.deepEqual(checksDone(w, getRecord(w, 'content', r.record.id), 'card'), { ticked: 1, total: 2 });
  w = tickCheck(w, r.record.id, l.lesson.id, false, NOW);
  assert.deepEqual(getRecord(w, 'content', r.record.id).checks, {});
});
