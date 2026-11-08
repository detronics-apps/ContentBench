// The "How to use" content and first-run story, as data. Grow it with every feature.

/** App term -> the everyday words someone might search for instead. */
export const SEARCH_ALIASES = {
  idea: ['thought', 'note', 'inbox', 'brainstorm', 'jot', 'capture'],
  'content item': ['video', 'post', 'piece', 'episode', 'article', 'master'],
  'platform output': ['tiktok', 'youtube', 'instagram', 'reel', 'short', 'carousel', 'version', 'adaptation', 'cut'],
  workflow: ['process', 'steps', 'pipeline', 'checklist', 'stages'],
  storytelling: ['structure', 'hook', 'outline', 'narrative', 'beats', 'blocks'],
  'beyond video': ['course', 'ebook', 'e-book', 'pdf', 'poster', 'product', 'sell', 'paid', 'linkedin', 'instagram', 'post', 'image'],
  teleprompter: ['prompter', 'autocue', 'record', 'recording', 'read', 'notes', 'pace', 'cue'],
  workspace: ['profile', 'channel', 'account', 'brand', 'start over', 'reset', 'backup'],
  export: ['download', 'zip', 'package', 'share', 'send', 'backup', 'claude', 'assistant'],
  archive: ['hide', 'remove', 'delete', 'restore', 'bin'],
  planner: ['calendar', 'schedule', 'dates', 'deadline', 'due', 'drag', 'week', 'today', 'release', 'backlog', 'saturday', 'next task', 'behind'],
  thought: ['jot', 'brain dump', 'note', 'passport', 'quick'],
  capture: ['shot', 'footage', 'b-roll', 'screen recording', 'screenshot', 'voice', 'audio', 'music', 'folder', 'save'],
  stage: ['phase', 'step', 'progress', 'forecast', 'done by'],
  structure: ['timeline', 'running time', 'length', 'seconds', 'intro', 'rework', 're-hook', 'variant', 'a/b'],
  assistant: ['ai', 'claude', 'chatgpt', 'prompt', 'suggestion'],
  reference: ['source', 'citation', 'link', 'evidence', 'fact check'],
};

export function searchText(text) {
  const low = String(text || '').toLowerCase();
  let extra = '';
  for (const [term, syns] of Object.entries(SEARCH_ALIASES)) if (low.includes(term)) extra += ` ${syns.join(' ')}`;
  return `${text} ${extra}`;
}

/** Every query word must appear - "export youtube" narrows, it does not widen. */
export function guideMatches(text, q) {
  if (!q) return true;
  const hay = searchText(text).toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

export const HOWTOS = [
  { id: 'five-steps', category: 'Content', title: 'Take a video from idea to published', steps: [
    '1 Idea: the title, category, who it is for, what they get, the central idea and why it is made this way. Link what it is built from.',
    '2 Card: pick a structure; its blocks are the script - talking points, what is on screen and why each block is there. Hook ideas, research and the look sit below.',
    '3 Record: open the teleprompter and record; tick off what else needs capturing. (For an e-book or poster this step is Make: a brief for Claude makes it.)',
    '4 Publish: every platform version on one page - title, caption, hashtags and release date - then the exports.',
    '5 Results: how it did, feedback, notes. The step bar always shows what is still missing; press "Next to do" to jump straight there.'] },
  { id: 'beyond-video', category: 'Content', title: 'Track courses, e-books, posters and social posts', steps: [
    'Content → Beyond video: your categories down the side, the kinds across the top.',
    'Press + in a cell to start one in that category - a course, an e-book or PDF, a poster, a LinkedIn or Instagram post. Posts get their platform output straight away.',
    'Each one is a content item, so it has the same plan, make and release steps as a video. At Advanced level, mark it Free or Paid and give it a price.',
    'Videos with an Instagram or LinkedIn output count in those columns too, so reels show up without extra work.',
    'To have Claude make it: on its Idea step, link the videos it is built from (Built from); fill in your brand under Settings → Voice and branding (Advanced) once; then step 3 Make → Brief for Claude to make it, and upload that file to Claude.'] },
  { id: 'teleprompter', category: 'Recording', title: 'Record with the teleprompter', steps: [
    'On the video\'s Card step, fill in the blocks: a purpose, a duration, the talking points and what is on screen. Start a line with » to read it word for word; start it with - to talk around it.',
    'Step 3 Record → Open the teleprompter (or the Teleprompter button under the blocks). "How to say it" at the top of the Card step shows before you start.',
    'It opens on your notes and nothing moves: read through, look ahead with → / ← or by clicking a block in the running order. Press Start (Space), hit record in Audacity during the 3-2-1, and begin talking when it ends. The highlighted line is where the pace says you should be; Next up and On screen now sit on the right.',
    'Pause when you stop to breathe or think. Is the highlight a line ahead of you (or behind)? ▲ Line and Line ▼, right next to Pause, move it one line - or tap the line you are on. ◀ Block and Block ▶ jump a whole block. Botched the start? Restart. The notes wait at the end of each block until you press Block ▶ (switch Auto-advance on to let them run on).',
    'At the end it lists where each block began in your recording - save it to the recording notes as the cut points for the edit.'] },
  { id: 'next-task', category: 'Planning', title: 'Know what to work on next (without catching up)', steps: [
    'Open Home or the Dashboard: "Your next task" is the one thing to focus on.',
    'Finish it, press Done on its step, and the next one takes its place.',
    'If you do not finish something, nothing turns red: tomorrow it is still the next task, and every date after it moves out by itself.'] },
  { id: 'release-dates', category: 'Releases', title: 'Release on a rhythm (for example every Saturday)', steps: [
    'Platforms → TikTok → Release rhythm: switch it on and pick the days.',
    'When a video is finished, its Publish step → Mark ready to release. Its platform versions join the backlog.',
    'Releases → Release rhythm shows the open slots and the next in line; press Book to give them dates.',
    'Each platform runs on its own days. Drag any chip on the calendar to change a date.'] },
  { id: 'timeline', category: 'Story', title: 'Lay out the video as a timeline and test a variant', steps: [
    'Give each block of a storytelling template a duration, like 0:15. The bar shows each block\'s share of the running time.',
    'Make it the default (Templates → the template → Make this the default) and new videos start with a copy.',
    'On a video\'s Card step, repeat a block (an extra re-hook) or change a duration. The bar compares it with the template.',
    'Liked it? "Save as a new template (variant)" keeps it to use on other videos; the default is untouched.'] },
  { id: 'capture', category: 'Planning', title: 'Drop a thought, then grow it', steps: [
    'Type it into "Drop a thought" on Home or in the sidebar and press Enter. Seconds, no form.',
    'Later, in Thoughts, mark it Develop, Park or Drop - or leave it. The Passport questions are there if they help.',
    'Press → Idea to spend about an hour on it, → Project for days of work, or → Video to make content straight away.'] },
  { id: 'idea-to-content', category: 'Planning', title: 'Turn a thought, idea or project into videos', steps: [
    'Open it and press "Make a video" (on a project: "New video from this project", with a series).',
    'The video is linked back. One project can make many videos - lessons learned, how it was built, educational - at any stage, even if it fails.'] },
  { id: 'stages', category: 'Planning', title: 'Move a project through its stages', steps: [
    'Open the project. The stage track shows every stage, grouped Thought, Idea, Plan, Educate, Evaluate, Goal.',
    'Click any stage to move there - forwards or back. Add a reason if you like.',
    'The done-by forecast updates from today. Once a stage has been done twice, your own average replaces the placeholder days.'] },
  { id: 'captures', category: 'Content', title: 'List what to record, and know when it is really saved', steps: [
    'Open the video → step 3 Record → Edit the capture list. Add each capture: main footage, backup footage, screen recording, screenshot, voice-over, music.',
    'Tie each one to a timeline block if you like. Each shows the exact folder and file name to use.',
    'In Production, press Make the folders, save each file there, then Check folder. A capture counts once its file is found.'] },
  { id: 'private-folder', category: 'Settings', title: 'Keep your data in your own Google Drive folder', steps: [
    'Install Google Drive for Desktop and make a folder called ContentBench in it (Available offline).',
    'Settings → Your private folder → Choose folder, and pick it. Allow edits.',
    'From then on your data is saved to contentbench-data.json there, and video folders go under Content/. The public app holds none of it.'] },
  { id: 'link-project', category: 'Content', title: 'Link content to a project (or leave it standalone)', steps: [
    'Open the content item on its Idea step.',
    'Under Links, tick the project. Untick to make it standalone again.',
    'The project lists the content automatically - the link is stored once.'] },
  { id: 'workflow', category: 'Content', title: 'Choose a workflow and storytelling template', steps: [
    'Open the content item.',
    'On the Record step, pick a workflow and press Start. On the Card step, pick a structure and press Use.',
    'The item keeps its own copy, so later template edits do not change it.'] },
  { id: 'outputs', category: 'Platforms', title: 'Make TikTok and YouTube versions of one piece', steps: [
    'Add platforms first under Platforms & Publishing (or press "Add example platforms").',
    'Open the content item, go to Outputs, choose a platform and format, and press Create output.',
    'Repeat for each platform. Each output starts from the master and can then be rewritten freely.'] },
  { id: 'master-changed', category: 'Platforms', title: 'Bring a master change into an output', steps: [
    'Edit the master content; outputs are never changed automatically.',
    'Open the output. A notice lists the fields whose master changed.',
    'Press "Use master" to take the new text, or "Keep mine" to keep your adaptation.'] },
  { id: 'export', category: 'Export', title: 'Export a content package for a collaborator or assistant', steps: [
    'Open the content item.',
    'In the sidebar, under Export, press "Download package (.zip)".',
    'Or "Copy assistant brief" to paste the whole package into an AI assistant as text.'] },
  { id: 'ai', category: 'Assistant', title: 'Use an AI assistant without losing your own words', steps: [
    'Open an idea, content item or output and find "Assistant" at the bottom.',
    'Pick an action and press "Copy prompt" - paste it into the assistant you use.',
    'Paste the reply back as a suggestion. Accept, edit or reject it; accepting adds to your text, never replaces it.'] },
  { id: 'reset', category: 'Workspace', title: 'Start fresh without losing the app', steps: [
    'Open Settings.',
    'Use "Reset data" to clear records but keep your setup, or "Reset configuration" for the opposite.',
    'Each asks first and says exactly what goes. Other workspaces are never touched.'] },
  { id: 'backup', category: 'Workspace', title: 'Back up or move a workspace', steps: [
    'Open Settings and press "Export workspace (.json)".',
    'On the other machine, press "Import workspace" and choose the file.',
    'The file is checked before anything is added; an import never replaces an existing workspace.'] },
];

export const FAQS = [
  { q: 'What if I do not finish something by its date?', a: 'Nothing happens - no overdue list, no pile-up. Forecasts are counted from today every day, so the unfinished step simply continues and everything after it moves out. The next task is the one to focus on.' },
  { q: 'Do I have to answer the Passport questions or the scorecard?', a: 'No. They are suggestions: answer the ones that help, skip the rest. Nothing in the app waits for an answer before you can move on.' },
  { q: 'Where is my real data kept?', a: 'Connect your private folder (Settings → Your private folder) and it is a file in that folder - for example in Google Drive - not in the public app. Without a folder it stays in this browser.' },
  { q: 'How does the app know a capture is done?', a: 'Every capture has a number and an exact folder. Save the file there with a name starting with that number (01-, 02-, …) and press Check folder. In browsers that cannot open folders, tick it by hand.' },
  { q: 'How are the step dates worked out?', a: 'Backwards from the due date. The last step is due on it; each earlier step is due when the next one has to start, using each step\'s days. Skipped steps take no time. Weekends are counted as normal days.' },
  { q: 'Why does a block show "no time yet"?', a: 'Its duration is blank or not a time. Use 15, 0:15, 1:30, 45s or 2m. The app never guesses a length.' },
  { q: 'Where is my data?', a: 'Only in this browser, on this device (localStorage). Nothing is uploaded. Export a workspace regularly as a backup.' },
  { q: 'Does the assistant run inside the app?', a: 'No. The app builds the prompt and keeps the reply as a suggestion; you run the assistant yourself. No integration is faked.' },
  { q: 'I edited a workflow template - why did my content item not change?', a: 'An item keeps the version it started with, on purpose. Its Production tab says when the template has moved on.' },
  { q: 'What is the difference between a content item and a platform output?', a: 'The content item is the idea of the piece. An output is one version of it for one platform and format. One item can have none, one or many.' },
  { q: 'Are the platform specs correct?', a: 'They are placeholders you edit. Each platform shows when you last verified it - specs change, so check before publishing.' },
  { q: 'What does archive do?', a: 'Hides a record from lists without deleting it. Turn on "Show archived" to see and restore it. Delete is permanent and asks first.' },
  { q: 'Why do thoughts and ideas never get dates?', a: 'They are not commitments. Only projects, videos, releases and tasks appear in the dates.' },
  { q: 'What do Simple, Advanced and Expert change?', a: 'Only how many fields are shown. Nothing hidden is cleared, and every level saves the same data.' },
];

export const MENTAL_MODEL = [
  ['Idea → content → outputs', 'One idea can feed many content items; one item can become many platform versions.'],
  ['Templates are copied', 'A workflow or structure is copied into the item that uses it, so editing a template is always safe.'],
  ['Your words stay yours', 'Raw input is preserved, and assistant suggestions sit beside your text until you accept them.'],
  ['Workspace = your setup', 'Categories, platforms, templates and records belong to a workspace, never to the app.'],
];

export const FEATURES = [
  ['Five steps per video', 'Any video or product', 'Idea → Card → Record → Publish → Results along the top, each with a tick or what is still to do, and a button to the next gap.'],
  ['Every platform on one page', 'A video → 4 Publish', 'Title, caption, hashtags, date and status for TikTok, YouTube, Instagram and the rest, side by side.'],
  ['Beyond video', 'Content → Beyond video', 'Courses, e-books and PDFs, posters, LinkedIn and Instagram posts per category - with a + to start one and free / paid counted.'],
  ['Teleprompter', 'A video → 3 Record', 'Full screen: your notes, the line you should be on, what comes next and what is on screen. Pause any time; it keeps your cut points.'],
  ['Read lines and talking points', 'A video → 2 Card', 'Start a line with » to read it word for word, - to talk around it. Each block also says why it is there.'],
  ['Why it is made this way', 'A video → 1 Idea', 'The reasoning behind the structure, so the next video copies the thinking, not just the format.'],
  ['Back and Home', 'Bottom of every page', 'Big buttons: one step back to the logical place, or straight home. The breadcrumb up top shows where you are.'],
  ['Series numbers and parts', 'A video → 1 Idea', 'Pick a series and it takes the next number; Add part splits one topic into Part 1, 2, 3 under the same number.'],
  ['A look per audience', 'Settings → A look per audience', 'Same look and feel, its own colours - so a niche video tells viewers what to expect.'],
  ['Thoughts', 'Planning → Thoughts', 'Seconds each: drop it, weigh it up later with optional Passport questions.'],
  ['Project stages', 'Projects → a project', 'Move to any stage, forwards or back; the done-by date follows, from today.'],
  ['Scorecard', 'Idea or project', 'Optional 1-10 criteria; score only what applies.'],
  ['Capture list', 'A video → 3 Record', 'Every shot, recording and sound, with the exact folder it goes in.'],
  ['Check folder', 'A video → 3 Record', 'Finds each saved file, so done means really there.'],
  ['Release rhythm', 'Platforms → a platform', 'Release days per platform; the backlog fills the open slots.'],
  ['Safe zones drawn', 'Platforms → a format', 'The no-go margins shown on the frame.'],
  ['Private folder', 'Settings', 'Your data in your own Google Drive folder, not in the public app.'],
  ['Deadline calendar', 'Planner → Calendar', 'Drag a video to its due day; its workflow steps are dated backwards.'],
  ['This week', 'Planner → This week', 'Overdue, today and the next six days, steps included.'],
  ['Release chips per platform', 'Planner → Calendar', 'Each TikTok, Reel and YouTube upload has its own date and category colour.'],
  ['Video timeline', 'A video → 2 Card', 'The structure as a timed bar, compared with its template.'],
  ['Variant templates', 'A video → 2 Card', 'Save a tweaked structure as a new template to test it.'],
  ['Quick capture', 'Sidebar → Quick capture', 'Jot an idea from any screen without leaving it.'],
  ['Related records', 'Sidebar → Related', 'Jump between an idea, its content and its outputs in both directions.'],
  ['Master drift', 'Output → notice', 'Shows which master fields changed since an output copied them.'],
  ['Brief in one file', 'Sidebar → Export', 'Download brief (.md): the whole video - plan, talking points, reasoning, claims, visuals - in one Markdown file for another chat or AI.'],
  ['Content package', 'Sidebar → Export', 'A zip of Markdown files an outsider can read without guessing.'],
  ['Board view', 'Content Library → Board', 'Content grouped by status.'],
  ['Remove samples', 'Settings → Workspace', 'Strips every example record, keeping your own.'],
  ['Spec verification date', 'Platforms → platform', 'Records when you last checked a platform\'s limits.'],
  ['Detail levels', 'Bar under the header', 'Simple shows the essentials; Expert shows everything.'],
];

/** The first-run story: numbered starting actions, each a link into the app. */
export const ONBOARDING = [
  { title: 'Five steps per video', text: 'Every video walks Idea → Card → Record → Publish → Results. The bar at the top shows what is missing and takes you to it.', href: '#/plan' },
  { title: 'Drop a thought', text: 'Home has a box for it. Seconds, no form. Weigh it up later - or never.', href: '#/thoughts' },
  { title: 'Grow the good ones', text: 'A thought becomes an idea (about an hour), an idea becomes a project (days). Every question is optional.', href: '#/projects' },
  { title: 'Plan a video, then make it', text: 'Any thought, idea or project can become videos: story, what to capture and where each file goes.', href: '#/plan' },
  { title: 'Keep your data private', text: 'Settings → Your private folder: pick a Google Drive folder and your data lives there, not in the public app.', href: '#/settings' },
];

/** The "How this works" panel per module: the idea in plain language. main.js adds the live numbers. */
export const EXPLAIN = {
  home: ['One block per section', 'Planning holds the inputs - thoughts, ideas, projects. Content is the execution: plan each video, make it, release it. Library, Settings and How to use hold the rest. Each block says what is waiting there.'],
  section: ['The parts of this section', 'Pick one. The bar at the top keeps every part of the section one click away, and Home goes back to the blocks.'],
  dashboard: ['What to do now', 'One next task, today and the week ahead. Everything is counted forwards from today, so unfinished work moves out instead of piling up.'],
  thoughts: ['Seconds each, no limit', 'Drop thoughts in as they come. Not all of them have merit - the Passport questions help you weigh them up, when you feel like it.'],
  ideas: ['About an hour each', 'Who has the problem, what could solve it, what it could produce. The scorecard is there if it helps; skip any of it.'],
  projects: ['Days each, a folder that fills up', 'A project moves through stages, forwards or back. Its done-by date is a forecast from today, using your own times once it has them. It can produce videos at any stage, even if it fails.'],
  plan: ['Five steps per video', 'Idea, Card, Record, Publish, Results. Each step on a video shows what is still missing and takes you to the next thing to do.'],
  create: ['Five steps per video', 'Idea, Card, Record, Publish, Results - each shows what is still missing.'],
  content: ['Plan it, then make it', 'The Plan tabs are the inputs; the Make tabs are production, publishing and what happened after.'],
  outputs: ['An adaptation that remembers its source', 'This output copied its master when it was made. When the master changes, you are told which fields, and you choose per field.'],
  production: ['Go and make it', 'Each capture has an exact folder. Save the file there and Check folder finds it. When it is done, mark it ready - it joins the release backlog.'],
  releases: ['A backlog and a rhythm', 'Each platform has its own release days. Ready videos wait in a backlog and fill the next open slot when you book them.'],
  planner: ['A backlog and a rhythm', 'Each platform has its own release days. Ready videos wait in a backlog and fill the next open slot.'],
  platforms: ['A platform holds formats', 'Each format has its own size, length and no-go zones, drawn so you can see them. Specs are editable and dated, because platforms change them.'],
  performance: ['Look back, then capture forward', 'Record what happened and what you learned. Follow-up thoughts go back into Thoughts.'],
  templates: ['Templates are copied, never linked', 'Workflows, story structures and the stage process are yours to edit. Items already using a template keep the version they started with.'],
  settings: ['The workspace is yours, the app is not', 'Your private folder, categories, capture kinds and voice are workspace data. Resetting a workspace never touches the app or other workspaces.'],
  assets: ['Sources and files as records', 'A reference or asset is entered once and linked wherever it is used.'],
  guide: ['Search in your own words', 'The search knows that "tiktok version" means a platform output and "backup" means export.'],
};
