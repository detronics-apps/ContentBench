import test from 'node:test';
import assert from 'node:assert/strict';
import { blankWorkspace, createRecord, getRecord } from '../js/model.js';
import { nextEpisode, setSeries, addPart, partsOf, seriesLabel, setEpisode, categoryPlace, lookFor } from '../js/content.js';

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
