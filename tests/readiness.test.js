import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readiness, stepOf, isRecorded } from '../js/readiness.js';
import { blankWorkspace, createRecord } from '../js/model.js';

const base = () => {
  const w = blankWorkspace({ name: 'T' });
  return { ...w, platforms: [{ id: 'p_tt', name: 'TikTok', formats: [{ id: 'f1', name: 'Short' }] }] };
};

test('a fresh video: every step says what is missing, and next is the first one', () => {
  const r = createRecord(base(), 'content', { workingTitle: 'Untitled content', contentType: 'Short-form video' });
  const { gaps, next } = readiness(r.ws, r.record);
  assert.equal(gaps.idea.length, 4);
  assert.deepEqual(gaps.card, ['Pick a structure (the blocks are the script)']);
  assert.match(gaps.record[0], /teleprompter/);
  assert.match(gaps.publish[0], /platform version/);
  assert.deepEqual(next, { step: 'idea', text: 'Give it a working title' });
});

test('a ready video has no gaps; outputs need a caption and a date', () => {
  let w = base();
  const c = createRecord(w, 'content', { workingTitle: 'Speed', contentType: 'Short-form video', viewerPromise: 'x', centralMessage: 'y', categoryId: 'c',
    story: { blocks: [{ id: 'b1', name: 'Hook', duration: '0:05', script: '» Have you ever?' }] }, recordingNotes: 'Teleprompter take - Speed', finalVideo: 'speed.mp4', status: 'Ready' });
  w = createRecord(c.ws, 'outputs', { contentId: c.record.id, platformId: 'p_tt', formatId: 'f1', caption: '' }).ws;
  let r = readiness(w, c.record);
  assert.deepEqual(r.gaps.publish, ['Caption for TikTok Short', 'Release date for TikTok Short']);
  w = { ...w, records: { ...w.records, outputs: w.records.outputs.map((o) => ({ ...o, caption: 'c', scheduledDate: '2026-11-08' })) } };
  r = readiness(w, c.record);
  assert.equal(r.next, null);
});

test('an e-book is made, not recorded: no hook line or teleprompter asked for', () => {
  const c = createRecord(base(), 'content', { workingTitle: 'Guide', contentType: 'E-book / PDF', story: { blocks: [{ id: 'b', name: 'Cover', script: 'promise' }] } });
  const { gaps } = readiness(c.ws, c.record);
  assert.equal(isRecorded(c.record), false);
  assert.deepEqual(gaps.card, []);
  assert.match(gaps.record[0], /brief for Claude/);
});

test('old section names land on their step', () => {
  assert.equal(stepOf('story'), 'card');
  assert.equal(stepOf('production'), 'record');
  assert.equal(stepOf('outputs'), 'publish');
  assert.equal(stepOf('nonsense'), 'idea');
  assert.equal(stepOf('results'), 'results');
});

test('ticks mean finished: Publish is booked until it is out, Results waits for the release', () => {
  let w = base();
  const c = createRecord(w, 'content', { workingTitle: 'Speed', contentType: 'Short-form video', viewerPromise: 'x', centralMessage: 'y', categoryId: 'c',
    story: { blocks: [{ id: 'b1', name: 'Hook', duration: '0:05', script: '» Have you ever?' }] }, recordingNotes: 'Teleprompter take - Speed', finalVideo: 'speed.mp4', status: 'Ready' });
  w = createRecord(c.ws, 'outputs', { contentId: c.record.id, platformId: 'p_tt', formatId: 'f1', caption: 'c', scheduledDate: '2026-11-08' }).ws;
  let r = readiness(w, c.record);
  assert.deepEqual([r.state.publish, r.state.results, r.state.idea], ['booked', 'later', 'done']);
  w = { ...w, records: { ...w.records, outputs: w.records.outputs.map((o) => ({ ...o, status: 'Published', publishedDate: '2026-11-08' })) } };
  r = readiness(w, c.record);
  assert.equal(r.state.publish, 'done');
  assert.equal(r.state.results, 'todo');
  assert.match(r.next.text, /how it did/);
});

test('the edit step asks for the recording, then the finished video; the prompt carries the take and the shapes', async () => {
  const { editPrompt } = await import('../js/readiness.js');
  let w = { ...base(), platforms: [{ id: 'p_tt', name: 'TikTok', formats: [{ id: 'f1', name: 'Short', aspectRatio: '9:16' }] }] };
  const c = createRecord(w, 'content', { workingTitle: 'Intro', contentType: 'Short-form video', recordingNotes: 'Teleprompter take - Intro (11/8/2026, 3:55:40 AM)\n0:00  Hook',
    captures: [{ id: 'k1', n: 1, kind: 'main', what: 'Voice', status: 'needed' }] });
  w = createRecord(c.ws, 'outputs', { contentId: c.record.id, platformId: 'p_tt', formatId: 'f1' }).ws;
  const { gaps } = readiness(w, c.record);
  assert.match(gaps.edit[0], /export the recording into it/);
  assert.match(gaps.edit[1], /prompt for Claude/);
  const p = editPrompt(w, c.record);
  assert.match(p, /faceless-video skill to edit "Intro"/);
  assert.match(p, /latest teleprompter take.*3:55:40 AM/);
  assert.match(p, /vertical \(9:16\)/);
  assert.match(p, /02_Footage\/Main/);
  const v2 = { ...c.record, versions: [{ n: 1, file: 'G:/x/v1.mp4', redo: 'section', note: 'new ending' }], finalVideo: '' };
  const d = editPrompt(w, v2);
  assert.match(d, /version 2 of "Intro".*fix the delta only/);
  assert.match(d, /Version 1 is G:\/x\/v1\.mp4 - keep it/);
  assert.match(d, /What changed: new ending/);
  assert.match(d, /rewrite only that section's scenes/);
  const full = editPrompt(w, { ...v2, versions: [{ ...v2.versions[0], redo: 'all' }] });
  assert.match(full, /a full new take, reusing what still fits/);
  assert.match(full, /Run every step again on the new voice/, 'a new voice reruns the machine steps in full');
  assert.match(full, /Reuse v1's scene design/);
  assert.doesNotMatch(full, /fix the delta only/);
  assert.match(editPrompt(w, { ...v2, finalVideo: 'G:/x/v2.mp4' }), /to edit "Intro"/, 'once the new version is done, the prompt is the plain one again');
});
