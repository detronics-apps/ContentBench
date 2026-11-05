import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as K from '../js/capture.js';
import { DEFAULT_CAPTURE_KINDS as kinds } from '../js/process-data.js';

const content = { id: 'cont_abcdef123456', workingTitle: 'Why bridges hum!' };

test('each capture has a fixed number and an exact folder', () => {
  let caps = [];
  caps = [...caps, K.makeCapture(caps, { kind: 'screen', what: 'CAD walkthrough' })];
  caps = [...caps, K.makeCapture(caps, { kind: 'voice' })];
  assert.deepEqual(caps.map((c) => c.n), [1, 2]);
  const p = K.capturePath(kinds, content, caps[0]);
  assert.equal(p.dir, 'Content/Why_bridges_hum_123456/03_Screen');
  assert.equal(p.prefix, '01-');
  assert.equal(p.suggested, '01-CAD_walkthrough');
  assert.equal(K.makeCapture([caps[1]], {}).n, 3, 'numbers are never reused after a removal');
});

test('the folder tree covers the fixed folders and every kind', () => {
  const tree = K.folderTree(kinds, content);
  assert.equal(tree[0], 'Content/Why_bridges_hum_123456');
  assert.ok(tree.includes('Content/Why_bridges_hum_123456/05_Audio/Voice'));
  assert.ok(tree.includes('Content/Why_bridges_hum_123456/08_Export'));
  assert.equal(new Set(tree).size, tree.length);
});

test('checking the folder: found counts as saved, a vanished file is needed again, hand-marked stays', () => {
  const c = { ...content, captures: [
    { id: 'a', n: 1, kind: 'screen', status: 'needed' },
    { id: 'b', n: 2, kind: 'voice', status: 'saved' },
    { id: 'c', n: 3, kind: 'music', status: 'marked' }] };
  const listing = { 'Content/Why_bridges_hum_123456/03_Screen': ['01-whatever-name.MOV', '10-other.mp4'] };
  const out = K.checkCaptures(kinds, c, listing);
  assert.deepEqual(out.map((x) => x.status), ['saved', 'needed', 'marked']);
  assert.equal(out[0].file, '01-whatever-name.MOV');
  assert.deepEqual(K.captureProgress(out), { total: 3, saved: 2, needed: 1 });
});
