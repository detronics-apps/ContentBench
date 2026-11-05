// The default process: fifteen stages from a passing thought to a closed project, and a
// scorecard. Generic data only - every workspace keeps its own editable copy (your own wording
// belongs in your private data file), and nothing in the app reads these names. Days are
// placeholders until your own history replaces them.

export const DEFAULT_STAGES = [
  {"id": "st1", "n": 1, "name": "Passport", "group": "Thought", "question": "Is this worth spending time on?", "does": "Jot down what it is, who it is for and why it might matter. A quick look before committing real time.", "goal": "", "prompts": ["Is this worth spending time on?", "Does it solve a real problem?", "Who would benefit?", "What value could it create?", "What might we learn?", "What would we give up to do it?"], "loopsTo": "Problem, if it looks worth it", "days": 0},
  {"id": "st2", "n": 2, "name": "Problem", "group": "Idea", "question": "Why does solving this matter?", "does": "Pin down the problem: who has it, how often, and what happens if nobody solves it.", "goal": "", "prompts": ["Can I explain the problem simply?", "Is it a recurring problem, or a one-off annoyance?", "Who has it?", "What would solving it be worth?"], "loopsTo": "Problem, if it is still unclear", "days": 0},
  {"id": "st3", "n": 3, "name": "Ideas", "group": "Idea", "question": "What could solve it?", "does": "Brainstorm several possible solutions. Question the assumptions. For each, what do we gain and what do we give up?", "goal": "", "prompts": ["Is there at least one workable solution?", "Is it within our ability?", "Have we considered more than one approach?", "Is the likely value worth a closer look?"], "loopsTo": "Problem, if a deeper problem appears", "days": 0},
  {"id": "st4", "n": 4, "name": "Investigation", "group": "Plan", "question": "What do we not know yet?", "does": "Research what already exists: products, papers, standards, forums, failures. Note what is known, unknown and misunderstood, with sources.", "goal": "", "prompts": ["Have we documented what already exists?", "Do we understand the underlying principles?", "Do we know what we still do not know?"], "loopsTo": "Problem if it changes; Ideas if a better solution emerges", "days": 3},
  {"id": "st5", "n": 5, "name": "Define", "group": "Plan", "question": "What exactly are we building?", "does": "Turn the research into a plan: requirements, scope, constraints, risks, success and failure criteria. Map the important branches and \"what if\" cases.", "goal": "", "prompts": ["Are the requirements clear?", "Does the plan solve the root problem?", "Have we mapped the important branches?", "What complexity are we adding, and is it worth it?"], "loopsTo": "Investigation if knowledge is missing; Ideas if the approach changes", "days": 2},
  {"id": "st6", "n": 6, "name": "Action", "group": "Plan", "question": "What useful thing are we making?", "does": "Build it: the app, the prototype, the guide, the design.", "goal": "", "prompts": ["Does it work as defined?", "Do the critical paths work?"], "loopsTo": "Define if the plan is flawed", "days": 5},
  {"id": "st7", "n": 7, "name": "Testing", "group": "Plan", "question": "What mistakes are we preventing?", "does": "Try to break it: normal cases, edge cases, failures. Use it yourself; give it to someone you trust.", "goal": "", "prompts": ["Does it solve the original problem?", "Is it accurate?", "Is it simple enough to use?"], "loopsTo": "Action for fixes; Refine for polish", "days": 2},
  {"id": "st8", "n": 8, "name": "Refine", "group": "Plan", "question": "What is worth improving?", "does": "Fix, simplify and polish what testing found. Useful effort, not perfection.", "goal": "", "prompts": ["Is it good enough to release?", "Is more effort still buying real value?"], "loopsTo": "Action or Testing", "days": 2},
  {"id": "st9", "n": 9, "name": "Evaluate", "group": "Plan", "question": "Was it worth it?", "does": "Compare the result with the original problem and criteria. Record what worked, what failed and what changed.", "goal": "", "prompts": ["Was the project valuable?", "What did we learn?", "Is it worth further work?"], "loopsTo": "Investigation or Define if something fundamental is missing; Content when ready", "days": 1, "finish": true},
  {"id": "st10", "n": 10, "name": "Content", "group": "Educate", "question": "What do we want to share?", "does": "Turn the journey into content: story, script, sources, footage, recording, editing, checking.", "goal": "", "prompts": ["Does it teach the how and the why?", "Is it accurate?", "Is the next step for the viewer clear?"], "loopsTo": "Evaluate if the story needs more context", "days": 2},
  {"id": "st11", "n": 11, "name": "Distribute", "group": "Educate", "question": "Who can benefit, and where are they?", "does": "Publish where the audience is. Titles, descriptions, thumbnails, links.", "goal": "", "prompts": ["Can the right people find it?", "Do the links work?"], "loopsTo": "Content if a new format is needed", "days": 1},
  {"id": "st12", "n": 12, "name": "Feedback", "group": "Evaluate", "question": "What are people telling us?", "does": "Read comments, questions and numbers. Look for patterns rather than reacting to each one.", "goal": "", "prompts": ["What confused people?", "What did they ask that we never considered?", "Is there a new problem in here?"], "loopsTo": "Content for follow-ups; Update for changes; Problem for something new", "days": 7},
  {"id": "st13", "n": 13, "name": "Update", "group": "Evaluate", "question": "Is another round worth it?", "does": "Decide whether to improve, maintain, freeze or leave it.", "goal": "", "prompts": ["Does the update justify its cost?", "Will it create ongoing work?"], "loopsTo": "Define, Action or Testing", "days": 2},
  {"id": "st14", "n": 14, "name": "Call to Action", "group": "Evaluate", "question": "What is the next useful step for people?", "does": "Point attention at something useful: the tool, another video, a way to give feedback.", "goal": "", "prompts": ["Is the next step clear and worthwhile?"], "loopsTo": "Content or Distribute", "days": 1},
  {"id": "st15", "n": 15, "name": "Close", "group": "Goal", "question": "What knowledge do we keep?", "does": "Close it: archive files, sources, decisions, results and lessons. Note future ideas.", "goal": "", "prompts": ["Is everything worth keeping documented?", "Can we walk away without loose ends?"], "loopsTo": "Passport, for a new problem", "days": 1},
];

/** 1-10 per criterion, every one optional. Rename, add or remove them per workspace. */
const scale = (top) => ["Almost none", "Very low", "Low", "Below average", "Moderate", "Above average", "High", "Very high", "Exceptional", "The highest it could be"].map((t, i) => (i === 9 && top ? top : t));
export const DEFAULT_SCORECARD = [
  { id: 'sc1', name: "Problem severity", anchors: scale() },
  { id: 'sc2', name: "How often it happens", anchors: scale() },
  { id: 'sc3', name: "Audience size", anchors: scale() },
  { id: 'sc4', name: "Useful to me", anchors: scale() },
  { id: 'sc5', name: "Useful to others", anchors: scale() },
  { id: 'sc6', name: "Time it saves", anchors: scale() },
  { id: 'sc7', name: "Money it saves or earns", anchors: scale() },
  { id: 'sc8', name: "Stress it removes", anchors: scale() },
  { id: 'sc9', name: "What we would learn", anchors: scale() },
  { id: 'sc10', name: "Simplicity to build", anchors: scale() },
  { id: 'sc11', name: "Simplicity to use", anchors: scale() },
  { id: 'sc12', name: "Content potential", anchors: scale() },
  { id: 'sc13', name: "Commercial potential", anchors: scale() },
  { id: 'sc14', name: "Reusable knowledge", anchors: scale() },
  { id: 'sc15', name: "Low maintenance", anchors: scale() },
  { id: 'sc16', name: "Personal interest", anchors: scale() },
  { id: 'sc17', name: "Value for the effort", anchors: scale() },
];

/** Where each kind of capture is saved inside a video's folder. Editable per workspace. */
export const DEFAULT_CAPTURE_KINDS = [
  { id: 'main', name: 'Main footage', folder: '02_Footage/Main' },
  { id: 'backup', name: 'Backup footage (B-roll)', folder: '02_Footage/Backup' },
  { id: 'screen', name: 'Screen recording', folder: '03_Screen' },
  { id: 'shot', name: 'Screenshot', folder: '04_Screenshots' },
  { id: 'voice', name: 'Voice-over', folder: '05_Audio/Voice' },
  { id: 'music', name: 'Music', folder: '05_Audio/Music' },
  { id: 'sfx', name: 'Sound effect', folder: '05_Audio/Effects' },
  { id: 'graphic', name: 'Graphic or overlay', folder: '06_Graphics' },
];

/** Folders every video gets, whatever it captures. */
export const FIXED_FOLDERS = ['01_Plan', '07_Edit', '08_Export'];

export const DEFAULT_THOUGHT_SOURCES = ['Personal frustration', 'Something I noticed', 'Someone asked', 'Interesting question', 'Brain dump', 'Reading or watching'];

export const DEFAULT_PRODUCE = ['App', 'e-book', 'Video', 'Flowchart', 'Database', 'Poster', 'Physical product'];
