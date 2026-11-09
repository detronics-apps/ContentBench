import test from 'node:test';
import assert from 'node:assert/strict';
import { blankWorkspace, createRecord, getRecord } from '../js/model.js';
import { nextEpisode, setSeries, addPart, partsOf, seriesLabel, setEpisode, categoryPlace, lookFor, madeFrom, familyOf, newVersion } from '../js/content.js';

test('the full video and its parts are one family, seen from any member', () => {
  let w = blankWorkspace();
  const add = (f) => { const r = createRecord(w, 'content', f, '2026-11-09T10:00:00.000Z'); w = r.ws; return r.record.id; };
  const full = add({ workingTitle: 'Full' });
  const p2 = add({ workingTitle: 'P2', sourceIds: [full], part: 2 }), p1 = add({ workingTitle: 'P1', sourceIds: [full], part: 1 });
  const alone = add({ workingTitle: 'Alone' });
  const ids = (f) => [f.full?.id, ...f.parts.map((x) => x.id)];
  assert.deepEqual(ids(familyOf(w, getRecord(w, 'content', full))), [full, p1, p2]);
  assert.deepEqual(ids(familyOf(w, getRecord(w, 'content', p2))), [full, p1, p2]);
  assert.deepEqual(familyOf(w, getRecord(w, 'content', alone)), { full: null, parts: [] });
});

test('a new version keeps the old file and clears only what is redone', () => {
  let w = blankWorkspace();
  const r = createRecord(w, 'content', { workingTitle: 'V', status: 'Published', finalVideo: 'G:/x/v1.mp4', recordingNotes: 'mic far\n\nTeleprompter take - V\n0:00 Hook' }, '2026-11-09T10:00:00.000Z');
  w = r.ws; const id = r.record.id;
  const edit = getRecord(newVersion(w, id, 'edit', 'louder music', '2026-11-10T09:00:00.000Z'), 'content', id);
  assert.equal(edit.status, 'Editing');
  assert.equal(edit.finalVideo, '');
  assert.match(edit.recordingNotes, /Teleprompter take/);
  assert.deepEqual(edit.versions, [{ n: 1, file: 'G:/x/v1.mp4', status: 'Published', ended: '2026-11-10', redo: 'edit', note: 'louder music' }]);
  assert.match(getRecord(newVersion(w, id, 'section'), 'content', id).recordingNotes, /Teleprompter take/, 'a section redo still cuts from the old take');
  const all = getRecord(newVersion(w, id, 'all'), 'content', id);
  assert.equal(all.status, 'Capturing');
  assert.equal(all.recordingNotes, 'mic far');
  assert.equal(newVersion(w, id, 'nonsense'), w);
});

test('a long video lists the shorts cut from it, in part order', () => {
  const ws = { records: { content: [{ id: 'm' }, { id: 'b', sourceIds: ['m'], part: 2 }, { id: 'a', sourceIds: ['m'], part: 1 }, { id: 'x', sourceIds: ['m'], archived: true }, { id: 'o' }] } };
  assert.deepEqual(madeFrom(ws, { id: 'm' }).map((x) => x.id), ['a', 'b']);
  assert.deepEqual(madeFrom(ws, { id: 'o' }), []);
});

const NOW = '2026-11-06T10:00:00.000Z';
function ws() {
  let w = blankWorkspace();
  const add = (f) => { const r = createRecord(w, 'content', f, NOW); w = r.ws; return r.record.id; };
  const a = add({ workingTitle: 'A' }), b = add({ workingTitle: 'B' }), c = add({ workingTitle: 'Speed is not truth', categoryId: 'cat_x' });
  return { w, a, b, c };
}

test('series numbers count up and clear with the series', () => {
  let { w, a, b } = ws();
  assert.equal(nextEpisode(w, 'GMG'), 1);
  w = setSeries(w, a, 'GMG', NOW);
  w = setSeries(w, b, 'GMG', NOW);
  assert.equal(getRecord(w, 'content', b).episode, 2);
  assert.equal(seriesLabel(w, getRecord(w, 'content', b)), 'GMG #2');
  w = setSeries(w, b, '', NOW);
  assert.equal(getRecord(w, 'content', b).episode, '');
});

test('a line splits into parts that share the series number', () => {
  let { w, c } = ws();
  w = setSeries(w, c, 'GMG', NOW);
  let r = addPart(w, c, NOW); w = r.ws;
  r = addPart(w, r.record.id, NOW); w = r.ws;
  const parts = partsOf(w, getRecord(w, 'content', c));
  assert.deepEqual(parts.map((p) => p.part), [1, 2, 3]);
  assert.equal(r.record.workingTitle, 'Speed is not truth - Part 3');
  assert.equal(r.record.categoryId, 'cat_x');
  assert.equal(seriesLabel(w, r.record), 'GMG #1 · Part 3 of 3');
  w = setEpisode(w, c, 5, NOW);
  assert.ok(partsOf(w, getRecord(w, 'content', c)).every((p) => p.episode === 5));
  assert.equal(nextEpisode(w, 'GMG'), 6);
  assert.deepEqual(categoryPlace(w, r.record), { n: 3, of: 3 });
});

test('a look belongs to an audience', () => {
  const w = blankWorkspace();
  w.config.looks = { Makers: { main: '#000000', accent: '#ff8800' } };
  assert.equal(lookFor(w, 'Makers').accent, '#ff8800');
  assert.equal(lookFor(w, 'Nobody'), null);
});
