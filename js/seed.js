// Example data. Every bit of it is workspace data a creator can edit or delete -
// nothing in the application reads these names. Sample records carry `sample: true`.

import { blankWorkspace, createRecord, updateRecord, nowIso } from './model.js';
import { makeWorkflowTemplate, makeStoryTemplate, instantiateWorkflow, instantiateStory, setStepStatus, addDays } from './workflow.js';
import { makePlatform, createOutput } from './content.js';
import { moveStage } from './process.js';
import { makeCapture } from './capture.js';

const VERIFY = 'check the platform\'s current spec';

export function exampleWorkflows(now = nowIso()) {
  return [
    makeWorkflowTemplate({
      name: 'Video (full)', description: 'Example: the Content stage broken down. Days are guesses - the app learns your own.',
      steps: [
        { name: 'Breakdown: what is the one thing this teaches?', days: 1 },
        { name: 'Story', days: 1, instructions: 'Lay out the timeline: hook, setup, the journey, the result, the lesson.' },
        { name: 'Script', days: 1 },
        { name: 'Research and source check', days: 1, checklist: ['Every claim has a source', 'Sources marked verified'] },
        { name: 'Gather footage and assets', days: 1, instructions: 'Work through the capture list on Shots & sound.' },
        { name: 'Record', days: 1 },
        { name: 'Edit', days: 2 },
        { name: 'Legal and factual check', days: 1 },
        { name: 'Publish preparation', days: 1, checklist: ['Caption written', 'Cover chosen', 'Safe zones checked'] },
      ],
    }, now),
    makeWorkflowTemplate({
      name: 'Quick video', description: 'Example: a 1-2 day piece from a thought or brain dump, to keep the backlog full.',
      steps: [{ name: 'Outline', days: 0 }, { name: 'Record', days: 1 }, { name: 'Edit', days: 1 }, { name: 'Publish preparation', days: 0 }],
    }, now),
  ];
}

export function exampleStories(now = nowIso()) {
  return [
    makeStoryTemplate({ name: 'Short-form (example)', description: 'One possible short structure - not a rule for any platform.',
      blocks: [
        { name: 'Hook', purpose: 'Stop the scroll in the first seconds.', duration: '0:03' },
        { name: 'Re-hook', purpose: 'Give a reason to keep watching.', duration: '0:05' },
        { name: 'Main point', duration: '0:15' },
        { name: 'Re-hook or new development', duration: '0:05' },
        { name: 'Explanation / payoff', duration: '0:20' },
        { name: 'CTA', duration: '0:05' },
      ] }, now),
    makeStoryTemplate({ name: 'Long-form (example)', description: 'One possible long structure - not a rule for any platform.',
      blocks: [['Opening hook', '0:30'], ['Context and problem', '1:00'], ['Investigation or story setup', '1:30'], ['Main sections', '4:00'],
        ['Examples and demonstrations', '2:00'], ['Complications, limitations or counterarguments', '1:00'],
        ['Resolution and conclusion', '0:45'], ['Viewer takeaway', '0:20'], ['CTA', '0:15']].map(([name, duration]) => ({ name, duration })) }, now),
  ];
}

/** Placeholder specs, deliberately unverified: platforms change their limits and their on-screen buttons. */
export function examplePlatforms() {
  const vertical = { top: 10, bottom: 20, left: 4, right: 14 };
  return [
    makePlatform({ name: 'TikTok', notes: 'Example profile. Every value is a placeholder - verify before relying on it.',
      checklist: ['Captions burned in or added', 'Cover chosen'], metadataFields: ['Caption', 'Hashtags'],
      rhythm: { enabled: true, days: [6], target: 2 },
      formats: [{ name: 'Short-form video', aspectRatio: '9:16', resolution: '1080x1920', duration: VERIFY, safe: vertical,
        safeZones: 'Keep text clear of the right-hand buttons and the bottom caption', checklist: ['Hook in first seconds'] }] }),
    makePlatform({ name: 'YouTube', notes: 'Example profile. Values are placeholders.', checklist: ['Disclosures set', 'End screen'],
      metadataFields: ['Title', 'Description', 'Tags', 'Chapters', 'Links'], rhythm: { enabled: false, days: [6], target: 1 },
      formats: [
        { name: 'Long-form video', aspectRatio: '16:9', resolution: '1920x1080', duration: 'no fixed limit (verify)', cover: 'Thumbnail 16:9',
          safe: { top: 5, bottom: 12, left: 5, right: 5 }, checklist: ['Chapters in description', 'Thumbnail made'] },
        { name: 'Short', aspectRatio: '9:16', resolution: '1080x1920', duration: VERIFY, safe: vertical },
      ] }),
    makePlatform({ name: 'Instagram', notes: 'Example profile. Values are placeholders.', metadataFields: ['Caption', 'Hashtags'],
      formats: [
        { name: 'Reel', aspectRatio: '9:16', resolution: '1080x1920', duration: VERIFY, cover: 'Cover crop also shown 1:1 / 4:5 in grid', safe: vertical },
        { name: 'Carousel', aspectRatio: '4:5', resolution: '1080x1350', duration: 'n/a', checklist: ['Slide 1 works alone'] },
      ] }),
    makePlatform({ name: 'LinkedIn', notes: 'Example profile. Values are placeholders.', metadataFields: ['Post text', 'Hashtags'],
      formats: [{ name: 'Video', aspectRatio: '1:1 or 4:5', resolution: '1080x1080', duration: VERIFY, safe: { top: 5, bottom: 10, left: 5, right: 5 } }] }),
  ];
}

/** A complete example workspace - configuration plus clearly labelled sample records. */
export function exampleWorkspace(now = nowIso()) {
  const today = now.slice(0, 10);
  let ws = blankWorkspace({ name: 'Example workspace', description: 'Sample configuration and records to explore. Remove the samples or start a blank workspace when you are ready.' }, now);
  const cat = (name, color) => ({ id: `cat_${name.toLowerCase().replace(/\W+/g, '')}`, name, color });
  ws = { ...ws,
    config: { ...ws.config,
      identity: { ...ws.config.identity, channelName: 'Example Channel', tagline: 'How everyday things actually work',
        philosophy: 'Curiosity first. Show the evidence, admit what we do not know.' },
      categories: [cat('Science', '#2f6e94'), cat('Making', '#1f7a3d'), cat('Philosophy', '#8a5a00')],
      series: ['Lessons learned', 'How it was built', 'Educational', 'Project log', 'Philosophy'],
      audiences: ['Curious beginners', 'Hobbyist makers'],
      tags: ['wind', 'bridges', 'soldering'],
      voice: { tone: 'Plain, warm, precise', communication: 'Explain before naming things', hookStyles: 'A question the viewer has had themselves' },
      aiInstructions: 'Use plain language. Never invent sources or statistics. Mark anything uncertain as [VERIFY].',
    },
    workflows: exampleWorkflows(now), stories: exampleStories(now), platforms: examplePlatforms() };
  const [full, quick] = ws.workflows;
  const [short, long] = ws.stories;
  ws.config.preferences = { ...ws.config.preferences, defaultWorkflowId: quick.id, defaultStoryId: short.id };
  const yt = ws.platforms.find((p) => p.name === 'YouTube');
  const tt = ws.platforms.find((p) => p.name === 'TikTok');
  const ig = ws.platforms.find((p) => p.name === 'Instagram');
  const S = { sample: true };
  const add = (type, fields) => { const r = createRecord(ws, type, { ...S, ...fields }, now); ws = r.ws; return r.record; };
  const out = (contentId, platform, fields, storyId = short.id) => {
    const r = createOutput(ws, contentId, { platformId: platform.id, formatId: platform.formats[0].id, storyId }, now);
    ws = updateRecord(r.ws, 'outputs', r.record.id, { ...S, ...fields }, now);
    return r.record;
  };

  // Thoughts: dropped in without a second look; a few get weighed up.
  const hum = add('thoughts', { text: 'saw a bridge singing in the wind - why? vortex thing?', source: 'Interesting question', decision: 'Develop', categoryId: 'cat_science',
    passport: { 0: 'Yes - a demo anyone can do at home', 2: 'Curious beginners', 4: 'Vortex shedding, from first principles' } });
  const clip = add('thoughts', { text: 'a history of the paperclip', source: 'Brain dump', decision: 'Develop' });
  add('ideas', { title: 'A history of the paperclip', thoughtIds: [clip.id], status: 'Parked', notes: 'Fun, but nothing to teach yet. Parked is a valid outcome.' });
  add('thoughts', { text: 'why do fume extractors cost so much', source: 'Personal frustration' });
  const speed = add('thoughts', { text: '"but it was fast" - speed is not truth', source: 'Personal frustration', decision: 'Develop', categoryId: 'cat_philosophy' });

  // An idea: about an hour of thinking.
  const idea = add('ideas', { title: 'Why do bridges hum in the wind?', thoughtIds: [hum.id], rawInput: 'saw a bridge singing in the wind - why? vortex thing? could demo with a fan + string',
    status: 'Exploring', categoryId: 'cat_science', audience: 'Curious beginners', tags: ['wind', 'bridges'],
    problem: 'People see it on video and the usual explanation ("the wind makes it vibrate") explains nothing.',
    approaches: 'Tabletop demo with a fan and string; slow-motion footage; a simple simulation.', produce: ['Video', 'Flowchart'],
    scores: { sc1: 3, sc12: 8, sc16: 9 } });

  // A project: days of work, moving through the stages.
  let project = add('projects', { title: 'Build a home wind tunnel', description: 'A small tunnel for filming airflow demos.', status: 'Active',
    projectType: 'Build', categoryId: 'cat_making', ideaIds: [idea.id], startDate: addDays(today, -9), produce: ['Video', 'Physical product'] });
  const p = (x) => ({ ...x });
  let pr = p(project);
  pr = moveStage(pr, 'st4', { today: addDays(today, -9) });
  pr = moveStage(pr, 'st5', { today: addDays(today, -6) });
  pr = moveStage(pr, 'st4', { today: addDays(today, -4), reason: 'Fan airflow numbers were missing' });
  pr = moveStage(pr, 'st5', { today: addDays(today, -3) });
  pr = moveStage(pr, 'st6', { today: addDays(today, -1) });
  ws = updateRecord(ws, 'projects', project.id, { stageId: pr.stageId, stageLog: pr.stageLog }, now);
  add('projects', { title: 'Workshop reorganisation', description: 'A project with no content - and that is fine.', status: 'Proposed', stageId: 'st1' });

  const asset = add('assets', { name: 'Fan and string demo footage (example)', assetType: 'Footage', location: 'Content/Why_bridges_hum/02_Footage/Main', status: 'Needed' });
  const ref = add('references', { title: 'Example reference - replace with a real source', author: '', url: '', status: 'Unverified',
    notes: 'Placeholder. This app never invents sources.' });

  // Content from the project, while it is still being built.
  const content = add('content', { workingTitle: 'Why bridges hum', contentType: 'Short-form video', status: 'Scripting',
    categoryId: 'cat_science', series: 'Educational', audience: 'Curious beginners',
    ideaIds: [idea.id], projectIds: [project.id], thoughtIds: [hum.id], referenceIds: [ref.id], assetIds: [asset.id],
    brief: 'Explain why wind makes some structures sing, with a tabletop demo.',
    centralMessage: 'Wind passing a cable sheds alternating swirls that push it side to side.',
    viewerPromise: 'You will know why a bridge can hum, and be able to make a string do it at home.',
    script: '- Open on the humming bridge\n- Fan + string demo\n- Swirls explained\n- Why engineers care',
    lighting: 'One soft key light left, window as fill.', sound: 'Lapel mic; fan off while talking.',
    workflow: setStepStatus(instantiateWorkflow(full, now), full.steps[0].id, 'done'), story: instantiateStory(short, now) });
  const blocks = M_blocks(ws, content.id);
  let caps = [];
  for (const [kind, what, bi] of [['main', 'Talking head intro', 0], ['backup', 'Bridge footage (licensed)', 0], ['screen', 'Simulation of the swirls', 4],
    ['main', 'Fan and string demo', 2], ['voice', 'Voice-over for the payoff', 4], ['music', 'Light background track', -1]]) {
    caps = [...caps, makeCapture(caps, { kind, what, blockId: bi >= 0 ? blocks[bi]?.id || '' : '' })];
  }
  ws = updateRecord(ws, 'content', content.id, { captures: caps }, now);
  out(content.id, tt, { title: 'This bridge is singing' });
  out(content.id, ig, { title: 'Bridge sings (Reel)' });
  out(content.id, yt, { title: 'Why bridges hum', status: 'Draft' }, long.id);

  // Quick videos: 1-2 days each, ready and waiting for a Saturday.
  const quickOne = add('content', { workingTitle: 'Speed is not truth', contentType: 'Quick video', status: 'Ready', series: 'Philosophy',
    categoryId: 'cat_philosophy', thoughtIds: [speed.id], centralMessage: 'A fast answer is only useful if it is right.',
    workflow: ['done', 'done', 'done', 'done'].reduce((w, st, i) => setStepStatus(w, w.steps[i].id, st), instantiateWorkflow(quick, now)), story: instantiateStory(short, now) });
  out(quickOne.id, tt, { title: 'Speed is not truth', status: 'Ready' });
  const lessons = add('content', { workingTitle: 'Wind tunnel, week one: what went wrong', contentType: 'Quick video', status: 'Editing', series: 'Lessons learned',
    categoryId: 'cat_making', projectIds: [project.id], workflow: setStepStatus(instantiateWorkflow(quick, now), quick.steps[0].id, 'done') });
  out(lessons.id, tt, { title: 'My wind tunnel failed (week one)' });
  return ws;
}

const M_blocks = (ws, contentId) => ws.records.content.find((c) => c.id === contentId)?.story?.blocks || [];
