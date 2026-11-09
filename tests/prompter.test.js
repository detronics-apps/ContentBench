import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLines, prompterPlan, positionAt, paceNote, takeText, replaceLine } from '../js/prompter.js';

test('rewording a line keeps its marker and leaves the other lines alone', () => {
  const s = '» Read this.\n\n- talk point\nnote here';
  assert.equal(replaceLine(s, 0, 'Say it like this.'), '» Say it like this.\n\n- talk point\nnote here');
  assert.equal(replaceLine(s, 1, 'new point\nsecond bit'), '» Read this.\n\n- new point second bit\nnote here');
  assert.equal(replaceLine(s, 2, 'new note'), '» Read this.\n\n- talk point\nnew note');
  assert.deepEqual(parseLines(replaceLine(s, 0, 'X')).map((l) => l.kind), ['read', 'talk', 'note']);
});

test('lines: » is read, - is talked, the rest are notes', () => {
  assert.deepEqual(parseLines('» Have you ever?\n- a point\n\nPause here').map((l) => l.kind), ['read', 'talk', 'note']);
  assert.equal(parseLines('»Read me')[0].text, 'Read me');
});

test('plan: blocks end to end, untimed blocks estimated from their words', () => {
  const p = prompterPlan([{ id: 'a', name: 'Hook', duration: '0:05', script: '» one two three four five' },
    { id: 'b', name: 'Talk', duration: '', script: '- ' + 'word '.repeat(20) }]);
  assert.equal(p.blocks[0].seconds, 5);
  assert.equal(p.blocks[1].start, 5);
  assert.equal(p.blocks[1].estimated, true);
  assert.equal(p.blocks[1].seconds, 8); // 20 words / 2.5 a second
  assert.equal(p.total, 13);
});

test('position: block and line follow the clock, then done', () => {
  const p = prompterPlan([{ id: 'a', name: 'A', duration: '10', script: '- one two three\n- four five six' }, { id: 'b', name: 'B', duration: '4', script: '» x' }]);
  assert.deepEqual([positionAt(p, 0).block, positionAt(p, 0).line], [0, 0]);
  assert.equal(positionAt(p, 6).line, 1);
  assert.equal(positionAt(p, 10).block, 1);
  assert.equal(positionAt(p, 14).done, true);
  assert.equal(positionAt(prompterPlan([]), 0).done, true);
});

test('pace: too many words for the time is called tight', () => {
  const [tight] = prompterPlan([{ name: 'T', duration: '2', script: '» ' + 'w '.repeat(30) }]).blocks;
  assert.match(paceNote(tight), /Tight/);
  const [ok] = prompterPlan([{ name: 'O', duration: '4', script: '» one two three four five six seven eight nine ten' }]).blocks;
  assert.equal(paceNote(ok), '');
});

test('take text lists each block start in the recording', () => {
  assert.equal(takeText([{ at: 0, name: 'Hook', planned: 0 }, { at: 7.4, name: 'Invite', planned: 6 }], { title: 'X' }),
    'Teleprompter take - X\n0:00  Hook  (plan 0:00)\n0:07  Invite  (plan 0:06)');
});

test('a saved take replaces earlier takes and keeps other notes', async () => {
  const { withLatestTake } = await import('../js/prompter.js');
  const notes = 'Mic close.\n\nTeleprompter take - X (1)\n0:00  A\n\nTeleprompter take - X (2)\n0:00  A';
  assert.equal(withLatestTake(notes, 'Teleprompter take - X (3)\n0:00  A'), 'Mic close.\n\nTeleprompter take - X (3)\n0:00  A');
  assert.equal(withLatestTake('', 'Teleprompter take - Y'), 'Teleprompter take - Y');
  // redoing one section: the first take stays (the kept parts are cut from it), later retakes are replaced
  assert.equal(withLatestTake(notes, 'Teleprompter take - X (3)\n0:00  A', { keepFirst: true }),
    'Mic close.\n\nTeleprompter take - X (1)\n0:00  A\n\nTeleprompter take - X (3)\n0:00  A');
});
