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
  assert.equal(outputDirs.size, 3);
  const readme = files.find((f) => f.path.endsWith('README.md')).text;
  for (const f of files) if (!f.path.endsWith('README.md')) assert.ok(readme.includes(f.path.slice(root.length + 1)), f.path);
  for (const n of ['Master_Concept.md', 'Story_and_Structure.md', 'Script_or_Talking_Points.md', 'Research_and_References.md', 'Asset_Manifest.md', 'Production_Notes.md']) {
    assert.ok(files.some((f) => f.path === `${root}/${n}`), n);
  }
  const pkg = JSON.parse(files.find((f) => f.path.endsWith('package.json')).text);
  assert.equal(pkg.outputs.length, 3);
  assert.ok(!files.some((f) => /undefined|\[object/.test(f.text)), 'no leaked internals');
  assert.ok(assistantBrief(ws, c.id).includes('Master concept'));
});

test('the brief carries how to say it and why it is made this way', () => {
  const { ws, record } = createRecord(blankWorkspace('T'), 'content', { workingTitle: 'X', delivery: 'Talk to one person.', reasoning: 'Human hook first.' });
  const brief = assistantBrief(ws, record.id);
  assert.match(brief, /How to say it \(vibe and rules\)\n\nTalk to one person\./);
  assert.match(brief, /Why it is made this way\n\nHuman hook first\./);
});

test('product brief: the job for its kind, the rules, the design and the source material it is built from', async () => {
  const { productBrief } = await import('../js/exporter.js');
  let w = blankWorkspace({ name: 'T' });
  w = { ...w, config: { ...w.config, categories: [{ id: 'cat_t', name: 'Thinking', color: '#A18AC8' }], brand: { colors: 'ink and cream', fonts: 'Archivo', visualNotes: '' } } };
  const src = createRecord(w, 'content', { workingTitle: 'Speed over Truth', centralMessage: 'Speed follows competence.', claimsToVerify: 'the 50% figure' });
  const p = createRecord(src.ws, 'content', { workingTitle: 'Thinking guide', contentType: 'E-book / PDF', categoryId: 'cat_t', offer: 'Paid', price: 'R99', sourceIds: [src.record.id] });
  const md = productBrief(p.ws, p.record.id);
  assert.match(md, /^# Brief: make the E-book \/ PDF "Thinking guide"/);
  assert.match(md, /designed PDF guide/);
  assert.match(md, /Never invent facts/);
  assert.match(md, /Free or paid: Paid - R99/);
  assert.match(md, /category colour #A18AC8/);
  assert.match(md, /### Speed over Truth[\s\S]*Speed follows competence\.[\s\S]*do not state as fact/);
});
