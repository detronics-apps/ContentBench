import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as M from '../js/model.js';
import { serializeData, parseData, DATA_FILE } from '../js/datafile.js';

test('the data file round-trips the whole app and refuses anything else', () => {
  let ws = M.blankWorkspace({ name: 'Mine' });
  ws = M.createRecord(ws, 'thoughts', { text: 'a passing thought' }).ws;
  const back = parseData(serializeData(M.blankApp(ws)));
  assert.ok(back.ok);
  assert.equal(M.currentWorkspace(back.app).records.thoughts[0].text, 'a passing thought');
  assert.equal(parseData('{').ok, false);
  assert.equal(parseData(JSON.stringify({ kind: 'other', v: 1, app: {} })).ok, false);
  assert.equal(parseData(JSON.stringify({ kind: 'content-bench-data', v: 999, app: {} })).ok, false);
});

test('private data files can never be committed to the public repo', () => {
  const ignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
  assert.ok(ignore.split('\n').includes(DATA_FILE));
});
