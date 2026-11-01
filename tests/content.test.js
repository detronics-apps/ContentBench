import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/model.js';
import * as C from '../js/content.js';
import { makeStoryTemplate } from '../js/workflow.js';

const T = '2026-01-01T00:00:00.000Z';

function setup() {
  let ws = M.blankWorkspace({}, T);
  const plat = C.makePlatform({ name: 'P', checklist: ['p1'], formats: [{ name: 'F', aspectRatio: '9:16', duration: '60s', checklist: ['f1'] }] });
  const story = makeStoryTemplate({ name: 'S', blocks: ['Hook'] });
  ws = { ...ws, platforms: [plat], stories: [story] };
  const r = M.createRecord(ws, 'content', { workingTitle: 'Master', centralMessage: 'msg', viewerPromise: 'promise', script: 'master script' }, T);
  return { ws: r.ws, content: r.record, plat, story };
}

test('an output starts from the master, with platform specs and checklists copied in', () => {
  const { ws, content, plat, story } = setup();
  const { record: o } = C.createOutput(ws, content.id, { platformId: plat.id, formatId: plat.formats[0].id, storyId: story.id }, T);
  assert.equal(o.title, 'Master');
  assert.equal(o.script, 'master script');
  assert.equal(o.aspectRatio, '9:16');
  assert.deepEqual(o.checklist.map((x) => x.text), ['p1', 'f1']);
  assert.equal(o.story.blocks[0].name, 'Hook');
  assert.equal(C.outputLabel(ws, o), 'P · F');
  assert.throws(() => C.createOutput(ws, 'nope'));
});

test('a master edit never reaches an output until asked; drift says which fields', () => {
  const { ws, content } = setup();
  const r = C.createOutput(ws, content.id, {}, T);
  let w = M.updateRecord(r.ws, 'outputs', r.record.id, { script: 'my tiktok cut' }, T);
  w = M.updateRecord(w, 'content', content.id, { script: 'new master', viewerPromise: 'new promise' }, T);
  let o = M.getRecord(w, 'outputs', r.record.id);
  assert.equal(o.script, 'my tiktok cut', 'adaptation untouched');
  const drift = C.masterDrift(o, M.getRecord(w, 'content', content.id));
  assert.deepEqual(drift.map((d) => [d.field, d.customised]), [['viewerPromise', false], ['script', true]]);

  w = C.pullFromMaster(w, o.id, 'viewerPromise', T);
  w = C.keepOutputVersion(w, o.id, 'script', T);
  o = M.getRecord(w, 'outputs', o.id);
  assert.equal(o.viewerPromise, 'new promise');
  assert.equal(o.script, 'my tiktok cut');
  assert.deepEqual(C.masterDrift(o, M.getRecord(w, 'content', content.id)), []);
  assert.equal(M.getRecord(w, 'content', content.id).script, 'new master', 'master untouched by output edits');
});

test("accepting a suggestion appends - it never overwrites the creator's text", () => {
  let rec = { notes: 'mine' };
  rec = C.addSuggestion(rec, { field: 'notes', text: 'ai text' }, T);
  rec = C.addSuggestion(rec, { field: 'notes', text: 'second' }, T);
  const [a, b] = rec.aiSuggestions;
  rec = C.resolveSuggestion(rec, a.id, 'accepted', 'ai text, edited', T);
  assert.equal(rec.notes, 'mine\n\nai text, edited');
  rec = C.resolveSuggestion(rec, b.id, 'rejected', undefined, T);
  assert.equal(rec.notes, 'mine\n\nai text, edited');
  assert.equal(C.resolveSuggestion(rec, a.id, 'accepted').notes, rec.notes, 'resolving twice does nothing');
  assert.throws(() => C.resolveSuggestion(rec, a.id, 'maybe'));
  const empty = C.addSuggestion({}, { field: 'x', text: 't' });
  assert.equal(C.resolveSuggestion(empty, empty.aiSuggestions[0].id, 'accepted').x, 't', 'empty field takes it as is');
});

test('planner keeps kinds separate, never lists ideas, and marks overdue only when not done', () => {
  let ws = M.blankWorkspace({}, T);
  const add = (type, f) => { ws = M.createRecord(ws, type, f, T).ws; };
  add('ideas', { title: 'idea', targetDate: '2020-01-01' });
  add('projects', { title: 'P', status: 'Active', milestones: [{ id: 'm', name: 'M1', date: '2026-01-05', done: false }] });
  add('content', { workingTitle: 'C', targetDate: '2025-12-01', status: 'Published' });
  add('content', { workingTitle: 'Late', targetDate: '2025-12-02', status: 'Editing' });
  add('outputs', { title: 'O', scheduledDate: '2026-02-01' });
  add('tasks', { title: 'Tk', due: '2026-01-03', status: 'To do' });
  const e = C.plannerEntries(ws, '2026-01-04');
  assert.ok(!e.some((x) => x.type === 'ideas'));
  assert.deepEqual(e.map((x) => [x.kind, x.title, x.overdue]), [
    ['production', 'C', false], ['production', 'Late', true], ['task', 'Tk', true],
    ['milestone', 'P: M1', false], ['publishing', 'O', false]]);
});

test('verificationAge is null until verified', () => {
  assert.equal(C.verificationAge(C.makePlatform()), null);
  assert.equal(C.verificationAge(C.makePlatform({ verifiedOn: '2026-01-01' }), '2026-01-31'), 30);
});
