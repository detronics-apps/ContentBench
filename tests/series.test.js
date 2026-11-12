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

test('folders and recording files say the series and the part; a made folder never moves', async () => {
  const { folderLabel, withFolder, recordingFile } = await import('../js/content.js');
  const { contentFolder } = await import('../js/capture.js');
  let w = blankWorkspace();
  const add = (f) => { const r = createRecord(w, 'content', f, '2026-11-12T10:00:00.000Z'); w = r.ws; return r.record; };
  const full = add({ workingTitle: 'Speed over Truth' });
  const p2 = add({ workingTitle: "Speed isn't the same as competence", sourceIds: [full.id], part: 2 });
  add({ workingTitle: 'P1', sourceIds: [full.id], part: 1 });
  const op = add({ workingTitle: 'Read any resistor', series: 'One Problem', episode: 4 });
  const solo = add({ workingTitle: 'Why this channel exists' });
  assert.equal(folderLabel(w, p2), 'Speed over Truth Part 2');
  assert.equal(folderLabel(w, op), 'One Problem 4');
  assert.equal(folderLabel(w, solo), '');
  assert.match(contentFolder(withFolder(w, p2)), /^Content\/Speed_over_Truth_Part_2_[0-9a-f]{6}$/);
  assert.match(contentFolder(withFolder(w, solo)), /^Content\/Why_this_channel_exists_[0-9a-f]{6}$/, 'outside a series: the video name');
  assert.equal(contentFolder({ ...p2, folder: 'Content/Old_name_abc123', workingTitle: 'Renamed' }), 'Content/Old_name_abc123', 'a made folder keeps its name');
  assert.equal(recordingFile(w, p2), "Speed over Truth Part 2 - Speed isn't the same as competence.wav");
  assert.equal(recordingFile(w, { ...solo, versions: [{ n: 1 }], finalVideo: '' }), 'Why this channel exists v2.wav');
});

test('videos are numbered in release order; the number leads the folder and file and ends the caption', async () => {
  const { videoNumber, withFolder, recordingFile, shortCaption } = await import('../js/content.js');
  const { contentFolder } = await import('../js/capture.js');
  let w = blankWorkspace();
  const add = (type, f) => { const r = createRecord(w, type, f, '2026-11-12T10:00:00.000Z'); w = r.ws; return r.record; };
  const intro = add('content', { workingTitle: 'Why this channel exists' });
  const full = add('content', { workingTitle: 'Speed over Truth', series: 'Grind my Gears', episode: 1 });
  const p1 = add('content', { workingTitle: 'Have you ever answered too quickly?', sourceIds: [full.id], part: 1, series: 'Grind my Gears', episode: 1,
    story: { blocks: [{ name: 'Your turn (talk)', script: '- When did you last answer too quickly? Tell me in the comments.\n- [your own words]' }] } });
  const p3 = add('content', { workingTitle: 'Measuring', sourceIds: [full.id], part: 3 });
  const p2 = add('content', { workingTitle: 'Speed', sourceIds: [full.id], part: 2 });
  add('outputs', { contentId: intro.id, scheduledDate: '2026-11-09', publishedDate: '2026-11-09' });
  add('outputs', { contentId: p1.id, scheduledDate: '2026-11-09', publishedDate: '2026-11-09' });
  add('outputs', { contentId: p3.id, scheduledDate: '2026-11-12' });
  add('outputs', { contentId: p2.id, scheduledDate: '2026-11-12' });
  assert.deepEqual([intro, p1, p2, p3, full].map((x) => videoNumber(w, x)), [1, 2, 3, 4, 0]);
  assert.equal(videoNumber(w, { ...p3, videoNo: 9 }), 9, 'a stored number stays');
  assert.match(contentFolder(withFolder(w, p2)), /^Content\/003_Speed_over_Truth_Part_2_[0-9a-f]{6}$/);
  assert.match(contentFolder(withFolder(w, intro)), /^Content\/001_Why_this_channel_exists_[0-9a-f]{6}$/);
  assert.equal(recordingFile(w, p2), '003 Speed over Truth Part 2 - Speed.wav');
  assert.equal(shortCaption(w, p1), 'Have you ever answered too quickly?\nGrind my Gears #1 · Speed over Truth · Part 1\nWhen did you last answer too quickly?\n[#2]');
});
