import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32, zip } from '../js/zip.js';

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('zip has a local header per file and a central directory that points back at them', () => {
  const files = [{ path: 'a/b.md', text: 'hello' }, { path: 'ü.md', text: 'wörld' }];
  const z = zip(files);
  const v = new DataView(z.buffer);
  const end = z.length - 22;
  assert.equal(v.getUint32(end, true), 0x06054b50);
  assert.equal(v.getUint16(end + 10, true), 2);
  let at = v.getUint32(end + 16, true);
  const dec = new TextDecoder();
  for (const f of files) {
    assert.equal(v.getUint32(at, true), 0x02014b50);
    const nameLen = v.getUint16(at + 28, true);
    const local = v.getUint32(at + 42, true);
    assert.equal(dec.decode(z.slice(at + 46, at + 46 + nameLen)), f.path);
    assert.equal(v.getUint32(local, true), 0x04034b50);
    const size = v.getUint32(local + 18, true);
    const n = v.getUint16(local + 26, true);
    assert.equal(dec.decode(z.slice(local + 30 + n, local + 30 + n + size)), f.text);
    at += 46 + nameLen;
  }
});
