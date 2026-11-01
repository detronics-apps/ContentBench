// The end-to-end scenario from the Phase 1 spec, section 14 step 5, run against the
// pure layer exactly as the UI drives it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/model.js';
import * as C from '../js/content.js';
import * as W from '../js/workflow.js';
import { exampleWorkspace, exampleWorkflows, exampleStories, examplePlatforms } from '../js/seed.js';
import { contentPackage } from '../js/exporter.js';
import { zip } from '../js/zip.js';

const T = '2026-03-01T09:00:00.000Z';

test('idea -> content -> project -> templates -> two outputs -> refs -> export, all links intact', () => {
  let ws = { ...M.blankWorkspace({ name: 'Mine' }, T), workflows: exampleWorkflows(T), stories: exampleStories(T), platforms: examplePlatforms() };
  // 1-2 capture, then edit the raw idea and add notes
  let r = M.createRecord(ws, 'ideas', { title: 'Hum', rawInput: 'why do bridges hum', status: 'Inbox' }, T);
  ws = M.updateRecord(r.ws, 'ideas', r.record.id, { notes: 'try a fan', rawInput: 'why do bridges hum?' }, T);
  const ideaId = r.record.id;
  // 3-4 develop into a standalone content item
  r = M.createRecord(ws, 'content', { workingTitle: 'Bridges', ideaIds: [ideaId], centralMessage: 'vortices', script: 'master' }, T);
  ws = r.ws; const cid = r.record.id;
  assert.equal(M.getRecord(ws, 'content', cid).projectIds.length, 0, 'standalone');
  // 5 link to a project
  r = M.createRecord(ws, 'projects', { title: 'Tunnel' }, T); ws = r.ws;
  ws = M.setLink(ws, 'content', cid, 'projectIds', r.record.id, true, T);
  // 6 workflow + story
  const [detailed] = ws.workflows; const [short, long] = ws.stories;
  ws = M.updateRecord(ws, 'content', cid, { workflow: W.instantiateWorkflow(detailed, T), story: W.instantiateStory(long, T) }, T);
  // 7-8 TikTok + YouTube outputs, each with a different structure
  const tt = ws.platforms.find((p) => p.name === 'TikTok');
  const yt = ws.platforms.find((p) => p.name === 'YouTube');
  r = C.createOutput(ws, cid, { platformId: tt.id, formatId: tt.formats[0].id, storyId: short.id }, T); ws = r.ws; const ttId = r.record.id;
  r = C.createOutput(ws, cid, { platformId: yt.id, formatId: yt.formats[0].id, storyId: long.id }, T); ws = r.ws; const ytId = r.record.id;
  assert.notDeepEqual(M.getRecord(ws, 'outputs', ttId).story.blocks.map((b) => b.name), M.getRecord(ws, 'outputs', ytId).story.blocks.map((b) => b.name));
  // 9 references and assets
  r = M.createRecord(ws, 'references', { title: 'Paper' }, T); ws = M.setLink(r.ws, 'content', cid, 'referenceIds', r.record.id, true, T);
  r = M.createRecord(ws, 'assets', { name: 'Clip' }, T); ws = M.setLink(r.ws, 'outputs', ttId, 'assetIds', r.record.id, true, T);
  // 10 platform metadata
  ws = M.updateRecord(ws, 'outputs', ttId, { caption: 'Singing bridge', hashtags: '#physics' }, T);
  // 11 export
  const pkg = contentPackage(ws, cid, T);
  assert.ok(pkg.files.some((f) => f.path.includes('TikTok') && f.text.includes('Singing bridge')));
  assert.ok(zip(pkg.files).length > 0);
  // 12 relationships intact
  const rel = M.related(ws, 'content', cid);
  assert.deepEqual(rel.outgoing.map((x) => x.type).sort(), ['ideas', 'projects', 'references']);
  assert.deepEqual(rel.incoming.filter((x) => x.type === 'outputs').map((x) => x.record.id).sort(), [ttId, ytId].sort());
  assert.equal(M.related(ws, 'ideas', ideaId).incoming[0].record.id, cid, 'navigable back to the idea');
});

test('the edge cases the spec lists all hold in the example workspace', () => {
  const ws = exampleWorkspace(T);
  const contentWith = (n) => ws.records.content.filter((c) => ws.records.outputs.filter((o) => o.contentId === c.id).length === n);
  assert.ok(ws.records.content.some((c) => !c.projectIds.length), 'standalone content');
  assert.ok(ws.records.projects.some((p) => !M.related(ws, 'projects', p.id).incoming.length), 'project with no content');
  assert.ok(ws.records.ideas.some((i) => i.status === 'Parked'), 'parked idea');
  assert.ok(ws.workflows.some((w) => w.steps.length <= 4) && ws.workflows.some((w) => w.steps.length >= 15), 'light and detailed');
  assert.equal(contentWith(1).length, 1, 'one output');
  assert.equal(contentWith(3).length, 1, 'several outputs');
  for (const t of M.RECORD_TYPES) for (const rec of ws.records[t]) assert.equal(rec.sample, true, `${t} ${rec.id} labelled`);
  const clean = M.removeSamples(ws, T);
  for (const t of M.RECORD_TYPES) assert.equal(clean.records[t].length, 0, t);
  assert.ok(clean.workflows.length && clean.platforms.length, 'configuration survives removing samples');
});

test('a blank workspace holds no personal data and a reset leaves the app working', () => {
  const blank = M.blankWorkspace({}, T);
  assert.equal(JSON.stringify(blank.records), JSON.stringify(Object.fromEntries(M.RECORD_TYPES.map((t) => [t, []]))));
  assert.equal(blank.config.identity.channelName, '');
  let app = M.addWorkspace(M.blankApp(exampleWorkspace(T)), blank);
  const other = app.workspaces[0];
  app = M.replaceWorkspace(app, M.resetWorkspaceData(M.currentWorkspace(app), T));
  assert.deepEqual(app.workspaces[0], other, 'other workspace untouched');
  const after = M.createRecord(M.currentWorkspace(app), 'ideas', { title: 'still works' }, T);
  assert.equal(after.ws.records.ideas.length, 1);
});
