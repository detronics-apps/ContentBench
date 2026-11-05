#!/usr/bin/env node
// Edits a private ContentBench data file through the app's own model, so anything added
// from the command line (or by an assistant) is checked exactly like an edit in the app.
//
//   node tools/cb.mjs <file> init [workspace name]
//   node tools/cb.mjs <file> summary
//   node tools/cb.mjs <file> list <type>
//   node tools/cb.mjs <file> show <type> <id>
//   node tools/cb.mjs <file> add <type> '<json fields>'        -> prints the new id
//   node tools/cb.mjs <file> update <type> <id> '<json patch>'
//   node tools/cb.mjs <file> link <type> <id> <field> <targetId>
//   node tools/cb.mjs <file> stage <projectId> <stageId> [reason]
//
// The file is replaced atomically and the previous version kept as <file>.bak.

import { readFileSync, writeFileSync, renameSync, existsSync, copyFileSync } from 'node:fs';
import * as M from '../js/model.js';
import { serializeData, parseData } from '../js/datafile.js';
import { moveStage } from '../js/process.js';

const [file, cmd, ...args] = process.argv.slice(2);
const die = (msg) => { console.error(msg); process.exit(1); };
if (!file || !cmd) die('usage: node tools/cb.mjs <file> <command> ... (see the top of this file)');

const today = M.nowIso().slice(0, 10);
const load = () => {
  if (!existsSync(file)) die(`No data file at ${file}. Run "init" first.`);
  const r = parseData(readFileSync(file, 'utf8'));
  if (!r.ok) die(r.errors.join('\n'));
  return r.app;
};
const save = (app) => {
  if (existsSync(file)) copyFileSync(file, `${file}.bak`);
  writeFileSync(`${file}.tmp`, serializeData(app));
  renameSync(`${file}.tmp`, file);
};
const json = (s) => { try { return JSON.parse(s || '{}'); } catch (e) { return die(`Not valid JSON: ${e.message}`); } };
const type = (t) => (M.RECORD_TYPES.includes(t) ? t : die(`Unknown type "${t}". One of: ${M.RECORD_TYPES.join(', ')}`));
const withWs = (app, fn) => {
  const ws = M.currentWorkspace(app);
  return M.replaceWorkspace(app, fn(ws));
};

let app;
switch (cmd) {
  case 'init': {
    if (existsSync(file)) die(`${file} already exists - nothing changed.`);
    save(M.blankApp(M.blankWorkspace({ name: args[0] || 'My workspace' })));
    console.log(`Created ${file}`);
    break;
  }
  case 'summary': {
    app = load();
    for (const ws of app.workspaces) {
      console.log(`${ws.id === app.currentId ? '*' : ' '} ${ws.name}`);
      for (const t of M.RECORD_TYPES) if (ws.records[t].length) console.log(`    ${t}: ${ws.records[t].length}`);
    }
    break;
  }
  case 'list': {
    app = load();
    for (const r of M.currentWorkspace(app).records[type(args[0])]) console.log(`${r.id}\t${r.status || r.decision || ''}\t${M.titleOf(r)}`);
    break;
  }
  case 'show': {
    app = load();
    const r = M.getRecord(M.currentWorkspace(app), type(args[0]), args[1]);
    console.log(r ? JSON.stringify(r, null, 2) : die('Not found.'));
    break;
  }
  case 'add': {
    app = load();
    let made;
    app = withWs(app, (ws) => { const r = M.createRecord(ws, type(args[0]), json(args[1])); made = r.record; return r.ws; });
    save(app);
    console.log(made.id);
    break;
  }
  case 'update': {
    app = load();
    if (!M.getRecord(M.currentWorkspace(app), type(args[0]), args[1])) die('Not found.');
    save(withWs(app, (ws) => M.updateRecord(ws, args[0], args[1], json(args[2]))));
    console.log('updated');
    break;
  }
  case 'link': {
    app = load();
    const [t, id, field, target] = args;
    save(withWs(app, (ws) => M.setLink(ws, type(t), id, field, target, true)));
    console.log('linked');
    break;
  }
  case 'stage': {
    app = load();
    const [id, stageId, reason = ''] = args;
    save(withWs(app, (ws) => {
      const p = M.getRecord(ws, 'projects', id) || die('No such project.');
      if (!ws.process.stages.some((s) => s.id === stageId)) die(`No stage "${stageId}".`);
      const moved = moveStage(p, stageId, { reason, today });
      return M.updateRecord(ws, 'projects', id, { stageId: moved.stageId, stageLog: moved.stageLog });
    }));
    console.log('moved');
    break;
  }
  default: die(`Unknown command "${cmd}".`);
}
