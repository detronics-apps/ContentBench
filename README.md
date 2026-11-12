# Detronics ContentBench

**Live: https://detronics-apps.github.io/ContentBench/**

From a passing thought to an idea, a project, and the videos it becomes - planned, captured
and released on a rhythm. One static page: no backend, no build step, no dependencies, no network
requests once the page has loaded. The tool is public; **your data is not** - it lives in a folder
on your own computer (for example in Google Drive), never in this repository.

| Area | What it does |
|---|---|
| Home | The dashboard: big blocks, one per section - Planning, Content, Library, Settings, How to use - each saying what is waiting; then your next task, a box to drop a thought, today, the week ahead and what is ready to release. Inside a section, only its own tabs. Content numbers its steps - 1 Videos, 2 Releases, 3 Performance - with Lessons, Beyond video and Achievements apart. |
| Thoughts | Seconds each, no limit. Develop / Park / Drop, and the optional Passport questions |
| Ideas | About an hour: the problem, approaches, balance (gain / give up), what it could produce, an optional scorecard |
| Projects | Days: fifteen stages from Passport to Close, moved forwards or back with the reason kept; a done-by forecast counted forwards from today; a folder of everything linked; any number of videos, at any stage |
| Content plan | Per video: overview, concept, story and timeline, script, hooks, research, shots and sound (what to capture, lighting, sound, music), platforms |
| Production | The workflow with forecast dates, the capture list with the exact folder for each file, folder checking, "ready to release" |
| Releases | A release rhythm per platform, the backlog of ready videos filling open slots, a calendar, this week, every date |
| Platforms | Formats with size, length and no-go zones drawn on the frame; a release rhythm each |
| Templates | Workflows, story structures (timed blocks) and the stage process - all editable |
| Settings | Your private folder, categories, capture kinds, voice, AI instructions; workspaces |
| How to use | Searchable how-tos and FAQs, process in words, first-run welcome |

**Nothing is forced.** Every question, gate and score is a suggestion; any step can be skipped;
a project can move to any stage. **Nothing piles up.** Forecasts are counted forwards from today,
every day: unfinished work moves out, there is no "overdue" list, and "Your next task" is the one
thing to focus on. Estimates are placeholders until a stage has been done twice; then your own
average is used.

## Your private data

Settings → **Your private folder** (Chrome or Edge on a computer) connects a folder - for example
`G:\My Drive\ContentBench`, set to *Available offline* in Google Drive for Desktop. The app then
keeps `contentbench-data.json` there and makes each video's folders under `Content/`. Edits are
written within a second; a change made to the file elsewhere is loaded when you come back to the
tab, and if both sides changed you choose which to keep - it never overwrites silently.

`tools/cb.mjs` edits that same file from the command line through the app's own model, so an
assistant can add your thoughts, ideas and projects locally:

```bash
node tools/cb.mjs "G:/My Drive/ContentBench/contentbench-data.json" add thoughts '{"text":"..."}'
```

`.gitignore` refuses the data file, and a test checks that it does.

## Running it

```bash
python -m http.server 8853
```

## Tests

```bash
npm test
```

The pure layer (`js/*.js`) runs under Node's built-in runner with nothing to install. It includes
the spec's §14 end-to-end scenario and edge cases (`tests/scenario.test.js`).

## Layout of the code

```
js/model.js        workspace, records, links (one stored side, backlinks derived), search, import/migrate
js/process.js      stages, moving a project, forward forecast, learned estimates, scorecard summary
js/process-data.js the default process, scorecard, capture kinds - data only
js/workflow.js     workflow + storytelling templates (versioned), instances, forecast, timeline
js/content.js      platforms/formats, outputs and master drift, AI suggestions, planner entries, agenda
js/capture.js      capture list, save paths, folder tree, folder check
js/releases.js     release rhythm, backlog, slots, calendar
js/datafile.js     the private data file format (shared with tools/cb.mjs)
js/schema.js       every record type's fields as data - one generic form renders them all
js/ai.js           assistant actions and prompt builder (no network)
js/seed.js         example workspace - data only, never read by the app logic
js/exporter.js     content package files;  js/zip.js  stored-zip writer
js/guide.js        how-to, FAQ, aliases, onboarding, explain texts;  js/legal.js  footer texts
js/ui/             store, folder sync, planning (hub, thoughts, ideas, projects), content, config views
js/main.js         chrome, hash routing, the panels at the foot of a page
tools/cb.mjs       command-line editor for the private data file
```

**Everything under `js/` except `js/ui/` and `js/main.js` is pure.** Workspace data and the app
are separate: no category, colour, platform or process is hardcoded into the application.

## Architectural decisions

- **Local-first storage.** Workspaces live in `localStorage`, and - once connected - in one data
  file in your own folder, synced by Google Drive or OneDrive. Export/import is a versioned JSON
  package (`kind: content-bench-workspace`, `v: 1`) with migration that fills anything missing.
- **Forward forecasts, never backwards deadlines.** Dates are where work can be if you keep going,
  recomputed from today; a missed day moves the rest out instead of creating a backlog of overdue items.
- **Links are stored once.** E.g. content stores `projectIds`; a project's content is derived.
  Deleting a record strips dangling links; deleting content takes its outputs with it (and says so).
- **Templates are copied, not referenced**, with the template version recorded on the instance.
- **Outputs copy the master** and remember what they copied, so master changes are reported per
  field and only applied on request.
- **First visit opens on a labelled example workspace**; a blank one is one click away.

## Privacy

Nothing you enter leaves your computer. No analytics, no cookies, no fonts or scripts from other
hosts. Workspaces are kept in `localStorage`, and in the folder you choose; if that folder is synced
by Google Drive or OneDrive, that service syncs it - the app itself never talks to a server.

## Accuracy

Platform specifications in the example workspace are placeholders, marked unverified. Check each
platform's current requirements and record the date you did.

## Licence

MIT.
