# Detronics ContentBench

**Live: https://detronics-apps.github.io/ContentBench/**

Take content from a first thought to researched, planned, produced, published and evaluated -
with your own process. Phase 1 of the Content Workshop spec
(`Content_Workshop_Phase_1_Foundation_and_Skeleton.md`): the foundation and a working skeleton of
every module. One static page. No backend, no build step, no dependencies, no network requests
once the page has loaded.

| Module | What it does |
|---|---|
| Dashboard | Quick capture, active work, upcoming dates, recent ideas, active projects, recently edited |
| Ideas | Inbox; original input preserved; "Develop into content" (one idea → many items) |
| Projects | Milestones, risks, decisions, lessons; linked ideas and content (or none) |
| Content Library | List and board views, search and filters |
| Create Content | Twelve sections per item: overview, concept, story, script, hooks, research, visuals, outputs, production, publishing, performance, history |
| Production | Workflow progress per item, tasks |
| Planner | Calendar: drag a video to its due day and its workflow steps are dated backwards; each platform release is its own chip, coloured by category. This week: today and the six days ahead. Ideas never overdue |
| Platforms & Publishing | Platform profiles with separate formats, dated spec verification, outputs, publishing records |
| Performance | Feedback and lessons per item or output |
| Templates | Versioned workflow (steps with days) and storytelling templates (blocks with durations, shown as a timeline bar); defaults for new content; items keep the version they started with |
| Assets & References | Reusable reference and asset records, linked wherever used |
| Settings | Identity, categories and colours, series, audiences, statuses, voice, AI instructions; create / load example / export / import / reset / delete workspace |
| How to use | Searchable how-tos and FAQs in everyday words, process, feature tiles; first-run welcome |

Every module carries a **"How this works"** panel in the sidebar: the idea in plain language and
the live numbers for what is on screen.

## What is functional and what is a placeholder

- **Functional:** everything listed above, including relationships in both directions, archive and
  restore, cascade-aware delete, master→output drift with per-field "Use master / Keep mine",
  content package export (.zip of Markdown + JSON), workspace export/import with validation.
- **Assistant (AI):** manual by design. The app builds the prompt (with the workspace's own AI
  instructions and the no-invention rules) for you to paste into any assistant; the reply comes back
  as a suggestion you accept, edit or reject. Accepting appends, never overwrites. No model is
  called and no integration is faked.
- **Planned, labelled as such in the app:** automatic publishing, advanced analytics, content
  templates and stand-alone publishing templates, multi-user collaboration, folder-based storage.

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
js/workflow.js     workflow + storytelling templates (versioned) and their instances
js/content.js      platforms/formats, outputs and master drift, AI suggestions, planner
js/schema.js       every record type's fields as data - one generic form renders them all
js/ai.js           assistant actions and prompt builder (no network)
js/seed.js         example workspace - data only, never read by the app logic
js/exporter.js     content package files;  js/zip.js  stored-zip writer
js/guide.js        how-to, FAQ, aliases, onboarding, explain texts;  js/legal.js  footer texts
js/ui/             store (localStorage), forms, views, assistant panel
js/main.js         chrome, hash routing, sidebar
```

**Everything under `js/` except `js/ui/` and `js/main.js` is pure.** Workspace data and the app
are separate: no category, colour, platform or process is hardcoded into the application.

## Architectural decisions

- **Local-first storage.** Workspaces live in `localStorage`; export/import is a versioned JSON
  package (`kind: content-bench-workspace`, `v: 1`) with migration that fills anything missing.
  Storage technology is not locked in - the JSON package is the portable format.
- **Links are stored once.** E.g. content stores `projectIds`; a project's content is derived.
  Deleting a record strips dangling links; deleting content takes its outputs with it (and says so).
- **Templates are copied, not referenced**, with the template version recorded on the instance.
- **Outputs copy the master** and remember what they copied, so master changes are reported per
  field and only applied on request.
- **First visit opens on a labelled example workspace**; a blank one is one click away.

## Privacy

Nothing you enter leaves your browser. No analytics, no cookies, no fonts or scripts from other
hosts. Workspaces are kept in `localStorage` on your own device - clearing site data deletes them,
so export a backup.

## Accuracy

Platform specifications in the example workspace are placeholders, marked unverified. Check each
platform's current requirements and record the date you did.

## Licence

MIT.
