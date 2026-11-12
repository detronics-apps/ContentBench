import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// The UI modules have no tests of their own; a stray quote in one blanks the whole app, so at least parse them all.
test('every module parses', () => {
  const files = ['js', 'js/ui'].flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.js')).map((f) => `${d}/${f}`));
  const bad = files.filter((f) => { try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); return false; } catch { return true; } });
  assert.deepEqual(bad, []);
});
