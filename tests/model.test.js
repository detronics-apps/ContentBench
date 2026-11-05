import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/model.js';

const T = '2026-01-01T00:00:00.000Z';
const T2 = '2026-01-02T00:00:00.000Z';

function sample() {
  let ws = M.blankWorkspace({ name: 'W' }, T);
  const add = (type, f) => { const r = M.createRecord(ws, type, f, T); ws = r.ws; return r.record; };
  const idea = add('ideas', { title: 'Idea' });
  const proj = add('projects', { title: 'Proj', ideaIds: [idea.id] });
  const ref = add('references', { title: 'Ref' });
  const c = add('content', { workingTitle: 'C', ideaIds: [idea.id], projectIds: [proj.id], referenceIds: [ref.id] });
  const o = add('outputs', { title: 'O', contentId: c.id });
  const pub = add('publications', { title: 'P', outputId: o.id });
  return { ws, idea, proj, ref, c, o, pub };
}

test('blank workspace has every record list empty and generic config', () => {
  const ws = M.blankWorkspace({}, T);
  for (const t of M.RECORD_TYPES) assert.deepEqual(ws.records[t], []);
  assert.deepEqual(ws.config.categories, []);
  assert.ok(ws.config.statuses.ideas.includes('Parked'));
});

test('createRecord stamps id, dates, link defaults; edits never mutate', () => {
  const ws = M.blankWorkspace({}, T);
  const { ws: ws2, record } = M.createRecord(ws, 'content', { workingTitle: 'X' }, T);
  assert.equal(ws.records.content.length, 0, 'original untouched');
  assert.match(record.id, /^cont_/);
  assert.deepEqual(record.ideaIds, []);
  assert.equal(record.created, T);
  const ws3 = M.updateRecord(ws2, 'content', record.id, { workingTitle: 'Y', id: 'hijack' }, T2);
  assert.equal(M.getRecord(ws3, 'content', record.id).workingTitle, 'Y');
  assert.equal(M.getRecord(ws3, 'content', record.id).modified, T2);
  assert.equal(M.getRecord(ws2, 'content', record.id).workingTitle, 'X');
  assert.throws(() => M.createRecord(ws, 'videos', {}), /unknown type/);
});

test('related() finds links in both directions from one stored side', () => {
  const { ws, idea, proj, c, o } = sample();
  const fromIdea = M.related(ws, 'ideas', idea.id);
  assert.deepEqual(fromIdea.incoming.map((x) => x.type).sort(), ['content', 'projects']);
  const fromContent = M.related(ws, 'content', c.id);
  assert.deepEqual(fromContent.outgoing.map((x) => x.type).sort(), ['ideas', 'projects', 'references']);
  assert.deepEqual(fromContent.incoming.map((x) => x.record.id), [o.id]);
  assert.equal(M.related(ws, 'projects', proj.id).incoming[0].record.id, c.id);
});

test('deleting content cascades to outputs and their publications, and strips links', () => {
  const { ws, c, o, pub, ref } = sample();
  assert.deepEqual(M.cascadeOf(ws, 'content', c.id).map((x) => x.record.id), [o.id, pub.id]);
  const after = M.deleteRecord(ws, 'content', c.id, T2);
  assert.equal(after.records.content.length, 0);
  assert.equal(after.records.outputs.length, 0);
  assert.equal(after.records.publications.length, 0);
  assert.equal(after.records.references.length, 1, 'shared reference survives');
  const afterRef = M.deleteRecord(ws, 'references', ref.id, T2);
  assert.deepEqual(M.getRecord(afterRef, 'content', c.id).referenceIds, [], 'dangling link removed');
});

test('archive hides from search until asked for; restore brings it back', () => {
  const { ws, idea } = sample();
  const a = M.archiveRecord(ws, 'ideas', idea.id, T2);
  assert.equal(M.searchRecords(a, 'ideas').length, 0);
  assert.equal(M.searchRecords(a, 'ideas', { archived: true }).length, 1);
  assert.equal(M.searchRecords(M.restoreRecord(a, 'ideas', idea.id, T2), 'ideas').length, 1);
});

test('search ANDs words across string and tag fields', () => {
  let ws = M.blankWorkspace({}, T);
  ws = M.createRecord(ws, 'ideas', { title: 'Bridge hum', tags: ['wind'], status: 'Inbox' }, T).ws;
  ws = M.createRecord(ws, 'ideas', { title: 'Bridge paint', status: 'Parked' }, T).ws;
  assert.equal(M.searchRecords(ws, 'ideas', { q: 'bridge' }).length, 2);
  assert.equal(M.searchRecords(ws, 'ideas', { q: 'bridge wind' }).length, 1);
  assert.equal(M.searchRecords(ws, 'ideas', { status: 'Parked' }).length, 1);
});

test('setLink toggles list links and replaces single links', () => {
  const { ws, c, proj } = sample();
  const off = M.setLink(ws, 'content', c.id, 'projectIds', proj.id, false, T2);
  assert.deepEqual(M.getRecord(off, 'content', c.id).projectIds, []);
  const on = M.setLink(off, 'content', c.id, 'projectIds', proj.id, true, T2);
  assert.deepEqual(M.getRecord(on, 'content', c.id).projectIds, [proj.id]);
  assert.throws(() => M.setLink(ws, 'content', c.id, 'nope', 'x'), /no link/);
});

test('resets touch only what they say; describeRemoval says it', () => {
  const { ws } = sample();
  const cfg = { ...ws, config: { ...ws.config, aiInstructions: 'mine' } };
  const data = M.resetWorkspaceData(cfg, T2);
  assert.equal(data.config.aiInstructions, 'mine');
  assert.equal(data.records.ideas.length, 0);
  const conf = M.resetWorkspaceConfig(cfg, T2);
  assert.equal(conf.config.aiInstructions, '');
  assert.equal(conf.records.ideas.length, 1);
  assert.match(M.describeRemoval(ws, 'data').removes, /1 idea/);
  assert.throws(() => M.describeRemoval(ws, 'everything'));
});

test('deleting one workspace never touches another, and one always remains', () => {
  const a = M.blankWorkspace({ name: 'A' }, T);
  const b = M.blankWorkspace({ name: 'B' }, T);
  let app = M.addWorkspace(M.blankApp(a), b);
  assert.equal(app.currentId, b.id);
  app = M.deleteWorkspace(app, b.id);
  assert.deepEqual(app.workspaces.map((w) => w.name), ['A']);
  assert.equal(app.currentId, a.id);
  app = M.deleteWorkspace(app, a.id);
  assert.equal(app.workspaces.length, 1, 'a fresh blank replaces the last');
});

test("removeSamples keeps the creator's own records", () => {
  let ws = M.blankWorkspace({}, T);
  ws = M.createRecord(ws, 'ideas', { title: 'sample', sample: true }, T).ws;
  ws = M.createRecord(ws, 'ideas', { title: 'mine' }, T).ws;
  assert.deepEqual(M.removeSamples(ws, T2).records.ideas.map((r) => r.title), ['mine']);
});

test('list helpers move, duplicate and remove by id', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(M.moveItem(list, 'a', 1).map((x) => x.id), ['b', 'a', 'c']);
  assert.equal(M.moveItem(list, 'a', -1), list, 'out of range is a no-op');
  const dup = M.duplicateItem(list, 'b', 'x');
  assert.equal(dup.length, 4);
  assert.notEqual(dup[2].id, 'b');
  assert.deepEqual(M.removeItem(list, 'b').map((x) => x.id), ['a', 'c']);
});

test('import validation rejects bad files and migrates an old-shape one', () => {
  assert.equal(M.validateImport('not json').ok, false);
  assert.equal(M.validateImport('{"kind":"other","v":1,"workspace":{}}').ok, false);
  assert.equal(M.validateImport(`{"kind":"${M.EXPORT_KIND}","v":99,"workspace":{}}`).ok, false);
  // a literal minimal file, as an older or hand-made export might look
  const old = `{"kind":"${M.EXPORT_KIND}","v":1,"workspace":{"id":"ws_old","name":"Old","records":{"ideas":[{"id":"idea_1","title":"x"}]},"config":{"statuses":{"ideas":["A"]}}}}`;
  const r = M.validateImport(old);
  assert.ok(r.ok, r.errors.join());
  assert.deepEqual(r.workspace.records.ideas[0].relatedIdeaIds, [], 'missing link fields defaulted');
  assert.deepEqual(r.workspace.records.outputs, []);
  assert.deepEqual(r.workspace.config.statuses.ideas, ['A']);
  assert.ok(r.workspace.config.statuses.content.length > 0, 'absent statuses defaulted');
  const dup = `{"kind":"${M.EXPORT_KIND}","v":1,"workspace":{"records":{"ideas":[{"id":"x"}],"projects":[{"id":"x"}]}}}`;
  assert.equal(M.validateImport(dup).ok, false);
});

test('export then import round-trips, and a clashing id is never overwritten', () => {
  const { ws } = sample();
  const r = M.validateImport(M.exportWorkspace(ws, T));
  assert.ok(r.ok);
  assert.deepEqual(r.workspace.records, ws.records);
  const app = M.importWorkspace(M.blankApp(ws), r.workspace);
  assert.equal(app.workspaces.length, 2);
  assert.notEqual(app.workspaces[1].id, ws.id);
});

test('migrateApp recovers a stored app and rejects junk', () => {
  assert.equal(M.migrateApp(null), null);
  assert.equal(M.migrateApp({ workspaces: [] }), null);
  const app = M.migrateApp({ currentId: 'gone', workspaces: [{ id: 'w1', name: 'x' }] });
  assert.equal(app.currentId, 'w1');
});

test('today is the local date of the reader, not UTC', () => {
  assert.equal(M.todayIso(new Date(2026, 0, 2, 0, 30)), '2026-01-02');
  assert.equal(M.todayIso(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});
