import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReviewData, sceneAt, textName, changesFrom, describeChange, reviewPrompt } from '../js/review.js';

const data = {
  kind: 'contentbench-review-data', editDir: 'C:/k/public/edits/x', video: 'x.mp4', duration: 30,
  scenes: [
    { sid: 0, at: 0, end: 10, type: 'Slam', label: '01 / HOOK', texts: [{ path: 'kicker', value: 'have you', item: false }, { path: 'lines.0', value: 'ONE', item: true }], parts: [{ key: 'sfx.0', name: 'Sound effect: pop' }] },
    { sid: 3, at: 10, end: 30, type: 'Next', label: '', texts: [{ path: 'cards.1.title', value: 'T', item: true }], parts: [{ key: 'point', name: 'Pointing arrow' }] },
  ],
};

test('review data is recognised and the scene follows the time', () => {
  assert.ok(isReviewData(data));
  assert.ok(!isReviewData({ scenes: [] }));
  assert.equal(sceneAt(data, 0), 0);
  assert.equal(sceneAt(data, 9.9), 0);
  assert.equal(sceneAt(data, 10), 1);
  assert.equal(sceneAt(data, 99), 1);
});

test('text paths read as words', () => {
  assert.equal(textName('lines.0'), 'Line 1');
  assert.equal(textName('kicker'), 'Kicker');
  assert.equal(textName('cards.1.title'), 'Card 2 title');
});

test('only real changes come out; a list line cannot be emptied or switched off', () => {
  const { changes, problems } = changesFrom(data, {
    texts: { '0|kicker': 'have you', '0|lines.0': '  TWO  ', '3|cards.1.title': '' },
    off: ['0|sfx.0', '3|point', '0|lines.0'],
  });
  assert.deepEqual(changes, [{ sid: 0, off: 'sfx.0' }, { sid: 3, off: 'point' }]);
  assert.equal(problems.length, 2);
  const r = changesFrom(data, { texts: { '0|lines.0': 'TWO', '0|kicker': '' } });
  assert.deepEqual(r.changes, [{ sid: 0, off: 'kicker' }, { sid: 0, path: 'lines.0', from: 'ONE', to: 'TWO' }]);
  assert.deepEqual(r.problems, []);
});

test('the prompt carries the exact changes as JSON and the comments in time order', () => {
  const changes = [{ sid: 3, off: 'point' }, { sid: 0, path: 'lines.0', from: 'ONE', to: 'TWO' }];
  assert.equal(describeChange(data, changes[0]), '0:10 Next: switch off Pointing arrow');
  const p = reviewPrompt({ title: 'X', data, changes, comments: [{ t: 12, sid: 3, kind: 'Visual', text: 'too busy' }, { t: 2, sid: 0, kind: 'Sound', text: 'too loud' }] });
  assert.match(p, /node review\.mjs apply "C:\/k\/public\/edits\/x"/);
  assert.ok(p.indexOf('too loud') < p.indexOf('too busy'));
  const json = JSON.parse(p.slice(p.indexOf('```json') + 7, p.lastIndexOf('```')));
  assert.deepEqual(json.changes, changes);
  assert.equal(json.comments[0].time, '0:02');
  assert.match(reviewPrompt({ data }), /No exact changes this time/);
});
