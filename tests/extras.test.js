import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extrasGrid, isKind, EXTRA_KINDS, withExtraTypes } from '../js/extras.js';
import { blankWorkspace, createRecord, archiveRecord } from '../js/model.js';

const kind = (id) => EXTRA_KINDS.find((k) => k.id === id);

function ws() {
  let w = blankWorkspace({ name: 'T' });
  w = { ...w, config: { ...w.config, categories: [{ id: 'cat_a', name: 'A', color: '#111111' }] },
    platforms: [{ id: 'plat_ig', name: 'Instagram', formats: [] }] };
  w = createRecord(w, 'content', { workingTitle: 'Guide', contentType: 'E-book / PDF', categoryId: 'cat_a', offer: 'Paid' }).ws;
  w = createRecord(w, 'content', { workingTitle: 'Cheat sheet', contentType: 'E-book / PDF', categoryId: 'cat_a', offer: 'Free' }).ws;
  const v = createRecord(w, 'content', { workingTitle: 'A video', contentType: 'Short-form video', categoryId: 'cat_a' });
  w = createRecord(v.ws, 'outputs', { contentId: v.record.id, platformId: 'plat_ig' }).ws;
  const old = createRecord(w, 'content', { workingTitle: 'Old poster', contentType: 'Poster' });
  return archiveRecord(old.ws, 'content', old.record.id);
}

test('a video with an Instagram output counts as an Instagram reel; types count directly', () => {
  const w = ws();
  const video = w.records.content.find((c) => c.workingTitle === 'A video');
  assert.equal(isKind(w, video, kind('instagram')), true);
  assert.equal(isKind(w, video, kind('ebook')), false);
});

test('grid: per category and kind, free and paid counted, archived and empty "No category" left out', () => {
  const rows = extrasGrid(ws());
  assert.deepEqual(rows.map((r) => r.cat.name), ['A']);
  const cell = rows[0].cells.find((c) => c.kind.id === 'ebook');
  assert.deepEqual([cell.items.length, cell.paid, cell.free], [2, 1, 1]);
  assert.equal(rows[0].cells.find((c) => c.kind.id === 'poster').items.length, 0);
});

test('extra content types are added once', () => {
  assert.deepEqual(withExtraTypes(['Poster', 'Article']).filter((t) => t === 'Poster').length, 1);
  assert.ok(withExtraTypes([]).includes('Course'));
});
