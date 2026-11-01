import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentPackage, assistantBrief, slug } from '../js/exporter.js';
import { exampleWorkspace } from '../js/seed.js';
import { blankWorkspace, createRecord } from '../js/model.js';

const T = '2026-01-01T00:00:00.000Z';

test('slug is filesystem-safe', () => {
  assert.equal(slug('Why: bridges / hum?'), 'Why_bridges_hum');
  assert.equal(slug(''), 'Untitled');
});

test('a minimal item exports only the files that have content', () => {
  const { ws, record } = createRecord(blankWorkspace({}, T), 'content', { workingTitle: 'Bare' }, T);
  const { files } = contentPackage(ws, record.id, T);
  const names = files.map((f) => f.path.split('/').pop());
  assert.deepEqual(names.sort(), ['AI_Instructions.md', 'Brief.md', 'README.md', 'package.json']);
});

test('the example package has one folder per output and an index naming every file', () => {
  const ws = exampleWorkspace(T);
  const c = ws.records.content.find((x) => x.workingTitle === 'Why bridges hum');
  const { root, files } = contentPackage(ws, c.id, T);
  assert.ok(root.includes(c.id), 'stable id in the folder name');
  const outputDirs = new Set(files.filter((f) => f.path.includes('Platform_Outputs/')).map((f) => f.path.split('/')[2]));
  assert.equal(outputDirs.size, 2);
  const readme = files.find((f) => f.path.endsWith('README.md')).text;
  for (const f of files) if (!f.path.endsWith('README.md')) assert.ok(readme.includes(f.path.slice(root.length + 1)), f.path);
  for (const n of ['Master_Concept.md', 'Story_and_Structure.md', 'Script_or_Talking_Points.md', 'Research_and_References.md', 'Asset_Manifest.md', 'Production_Notes.md']) {
    assert.ok(files.some((f) => f.path === `${root}/${n}`), n);
  }
  const pkg = JSON.parse(files.find((f) => f.path.endsWith('package.json')).text);
  assert.equal(pkg.outputs.length, 2);
  assert.ok(!files.some((f) => /undefined|\[object/.test(f.text)), 'no leaked internals');
  assert.ok(assistantBrief(ws, c.id).includes('Master concept'));
});
