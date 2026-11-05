// The private data file: the whole app (every workspace) as one JSON file in the
// creator's own Drive folder. The browser and tools/cb.mjs read and write the same shape.

import { migrateApp, SCHEMA_VERSION, nowIso } from './model.js';

export const DATA_KIND = 'content-bench-data';
export const DATA_FILE = 'contentbench-data.json';

export function serializeData(app, now = nowIso()) {
  return JSON.stringify({ kind: DATA_KIND, v: SCHEMA_VERSION, saved: now, app }, null, 1);
}

/** Never throws: a damaged or foreign file comes back as errors, and nothing is applied. */
export function parseData(text) {
  let data;
  try { data = JSON.parse(text); } catch { return { ok: false, errors: ['The data file is not valid JSON.'] }; }
  if (data?.kind !== DATA_KIND) return { ok: false, errors: [`This is not a ContentBench data file (expected kind "${DATA_KIND}").`] };
  if (typeof data.v !== 'number' || data.v > SCHEMA_VERSION) return { ok: false, errors: [`Data file version ${data.v} is newer than this app (${SCHEMA_VERSION}).`] };
  const app = migrateApp(data.app);
  return app ? { ok: true, errors: [], app, saved: data.saved || '' } : { ok: false, errors: ['The data file holds no workspace.'] };
}
