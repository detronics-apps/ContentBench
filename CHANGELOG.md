# Changelog

## 0.20.0

- **Making it, planned back from the release:** each video has six stages - Investigate, Draft with Claude, Review and
  make it yours, Record, Edit (image and music), Schedule - each with its day, counted back from the release so the
  video is ready the day before. A day that has passed is simply today. Most stages tick themselves from the work
  already done; Review you tick by hand. Move a stage to another day and it stays; Keep these days pins them all.
- **Going out and To do, apart:** Home and This week show two lanes - what is released, and what to make, each stage
  saying which release it is for ("Record · for Sun: Rent or buy") with a tick. The calendar days say what to make.
- **The bank:** the calendar's side list puts the made videos (Ready to drop in) above the ones still being made, and
  Videos shows how many days the made ones cover at your weekly aim.
- The old per-video workflow copies no longer put dates in the plan - they kept a finished video's steps on today.

## 0.19.0

- **Release times:** each platform format has its usual time to go out (Platforms → a platform, at Advanced). The
  release line, the calendar chips and the Publish step show it, and one release can have its own time in Publish.
- **A check that every module parses,** so a stray quote in a screen can never blank the app again.

## 0.18.0

- **No sidebar: every page has the full width.** Drop a thought and How this works are on Home; switching workspace
  and exporting it are in Settings; a video's Related links and Export (package, brief) are at the foot of its page.
- **A wider No release date yet** on the calendar - about a third of it, in two columns, and it stays in view as you
  scroll - with the category filters at the top and a count.

## 0.17.1

- **No small tab row inside a section:** the big buttons on the section page are the way between its parts, and the
  breadcrumb names the part you are in (Home › Content › Releases).
- **The calendar filter narrows only No release date yet:** it is for finding what still needs a date to drag into
  place; everything already on a day stays on the calendar.

## 0.17.0

- **Home is the dashboard:** five big buttons - Planning, Content, Library, Settings, How to use - and under them your
  next task, a box to drop a thought, today, the week ahead, what is ready to release, projects and recent edits.
- **Content in order:** 1 Videos, 2 Releases, 3 Performance, then a line, then Lessons, Beyond video and the new
  **Achievements** page (moved out of Videos). The section page shows only its big buttons, not the tab row as well.
- **Filters on Videos:** tap a category, a series or a status to see only those; tap more of the same kind to add
  them (Home and Parenting together). "Showing 3 of 88" and Show all.
- **Filters on the calendar:** the categories under No release date yet switch on and off, for the chips on the
  days and on the shelf.

## 0.16.2

- **Tag a line while you edit it:** ✎ on a teleprompter line now shows Read · Talk · Note. Pick one and Save, and the
  line changes kind on the card (» read word for word, large and bold; - a point to talk around; a note, small and grey).

## 0.16.1

- **Shorter folder names:** the number, then the series and part (`002_Speed_over_Truth_Part_1_43bfd9`), or the video's own
  name when it is not part of a series (`001_Why_this_channel_exists_b37519`).

## 0.16.0

- **Every video has a number** on the channel - released ones in the order they went out, then the booked ones in date
  order - kept for good once it is out.
- **Folders say what they are:** the number first, then the series and part, then the title (`003_Speed_over_Truth_Part_2_…`).
  A folder's name is kept on the video once it is made, so renaming a video never moves its files.
- **The recording's file name** is shown in the Edit step with **Copy name**, and it is already filled into the prompt
  for Claude - no more typing it twice.
- **Use the short caption** (Publish): the title, the series and part, the question(s) the video asks viewers, and the
  video number in brackets at the end, e.g. `[#5]`.

## 0.15.0

- **Three levels, each with one job.** **Simple** is only what it takes to get from an idea to a released video (a
  video's Idea step: title, type, status, category, what they get, the central idea; Settings: your folder and the
  categories; Platforms: pick where you post). **Advanced** adds the extras that make each video better and setting up
  each platform's formats, style and release days. **Expert** is making the app your own - identity, series, voice and
  branding, AI instructions, statuses, defaults, the Templates tab, technical specs and your own platforms - with a
  short note on each page about how it connects to the rest. The How to use tab shows everything at every level, and
  nothing hidden is ever cleared.

## 0.14.0

- **Teleprompter:** more words get more time - a planned duration is a floor, never a cap, so a line written out in
  full gets the time it needs. Every line can be moved (▲ ▼ or drag it), reworded (✎), removed (✕), and **+ Add a line**
  adds one; every change saves to the card and re-times it at once. It no longer finishes on its own: it holds at the end
  of the last block until you press **Done ✓**.
- **Calendar:** dropping a release on a day that has passed records it as released on that day - the rolling line stays
  put. (Before, it looked missed and moved everything on a day each time.)
- **This week** (Videos): aim for a number of videos a week - a goal, never a requirement - see what is out and booked,
  and **Plan … at N a week** re-dates the line at that pace.
- **Achievements:** first video out, a video a day (6 in a week), 10 in a week, 1,000 views, 1,000 followers, monetised.
  **Channel stats** (Performance) is where the numbers are logged.
- **A new colour comes next** (Card step): when the next video brings a colour family viewers haven't seen, one line to
  say what it means, added before the recap with one tap.
- How to use → The whole process: a **Read it through** step between Card and Record.

## 0.13.0

- **Lessons** (Content → Lessons): every issue is a learning opportunity. Write down what happened, how it was solved,
  and the one question to ask at that step so it doesn't happen again.
- **Check before you move on**: each step of a video shows its questions from the lessons, folded away, with optional
  ticks saved on the video and a "why this check" that shows the issue and the fix. Nothing waits on them.

## 0.12.0

- **Review the storyboard** (Edit step 4): before anything renders, go through the storyboard shot by shot - each shot's
  still and its row of the board (spoken line, on screen, motion, character, sound, why). Reword text, switch parts off,
  comment per shot, and tick **render it** when it is right. One prompt back to Claude: without the tick it shows you
  the storyboard again, with it Claude renders. The edit prompt now asks Claude to save the storyboard to 08_Export.
- **How to use → The whole process:** the flowchart from a thought to a released video - every step, every decision and
  where each choice goes - for both ways of working: automated (Claude connected) or manual (any editor).

## 0.11.3

- A **full new take** is no longer treated as a delta: its prompt runs every machine step again on the new voice (no
  tokens, nothing drifts out of sync) and reuses only the scene design, redoing the scenes whose words changed and
  checking every scene against stills. Section redos and edit-only redos still fix just the delta.

## 0.11.2

- **New versions fix the delta only.** While a new version is in progress, the Edit step's prompt asks Claude for version
  N+1: keep version N, change only what you said changed (a new section is spliced in, the other scenes stay; a full
  retake keeps the scenes of every unchanged section) and render beside the old file. Paste it into the chat that made
  the last version.
- Teleprompter: while one section is being redone, Save keeps the first take (the kept parts are cut from it) and adds
  the new one after it.

## 0.11.1

- **Make a new version → one section** keeps the saved take: the parts you keep are still cut from it. Only a whole new
  recording retires the old take.

## 0.11.0

- **Videos** replaces Content plan and Production: every video in one list, in the order the work runs - **Next to
  release** (date, platform and what each still needs), **In the making**, **Being planned**, **Released** and
  **Parked** - with a search box that finds any of them. A click opens the video at its next to-do.
- **Plans move on, nothing is late:** when a release day passes without it going out, that platform's whole line moves
  on by the same number of days - the next one is today, everything after keeps its spacing.
- **Released ✓** (Videos and each video's Publish step) records the release on the day it actually went out; when every
  platform version is out, the video is Published.
- "Carried over" is gone: anything due now just says **now**.

## 0.10.0

- **Review the finished video** (Edit step): open the video and its review file (both in 08_Export) and watch it scene by
  scene. Reword the text on a card, untick what you don't want - a pointing arrow, a sound effect, an optional line - and
  comment on any moment (Visual, Words on screen, Sound, Voice, Other). **Copy the prompt for Claude** hands it all back
  in one go: the exact changes are applied as they are, the comments are worked through, and the timing stays Claude's
  job. Your review is kept on this device while you work. Nothing is uploaded.
- **Make a new version** (Edit and Results steps): redo a finished or published video - the whole recording, one section
  (an opening, an ending), or just the edit. The old finished file goes into the versions list; only what you redo is
  cleared.
- **Working on: Full video · Part 1 · Part 2 ...** - a strip under the title of every video in a family, one tap to
  switch, staying on the same step.
- Teleprompter: Start, Save and Save line show as the main button again.

## 0.9.3

- **Edit** step, in the order you do it: 1 **Make the folder** (right there, first), 2 export the recording from Audacity into it -
  **Check it is there** confirms the file arrived - 3 copy the prompt for Claude, 4 watch the finished video.

## 0.9.2

- Teleprompter: **✎ beside every line** rewords it on the spot. The take pauses, you type how you actually want to say
  it, and **Save line** (or Enter) writes it to the card - a READ line stays a READ line - so the next take reads it that
  way. Esc or Cancel leaves it as it was.

## 0.9.1

- A long video now lists the **shorts cut from it** (under Series & parts), each one linked. A short counts when it names
  the long video under **Built from**.

## 0.9.0

- **Edit** is its own step: Idea → Card → Record → **Edit** → Publish → Results (for e-books and posters: Review).
  It shows the folder your recording goes in (with Copy), **Copy the prompt for Claude** - the sentence that starts an
  editing session in Claude Code, with the title, the folder, the latest take and the shapes to render filled in - the
  files for the edit, the **Finished video** field and **Mark ready to release** (moved here from Publish).
  Its to-do list: the recording in its folder, then the finished video, then watch it and mark it ready.
- Saving a teleprompter take **replaces the earlier take** (other notes in that field stay), so the latest is the one
  used for the edit.

## 0.8.9

- Teleprompter: **▲ Line / Line ▼** right beside Start/Pause move the highlight one line back or on (across blocks too) - or tap
  the line you are on (lines now light up under the pointer, and the preview says so) - so
  it matches the line you are actually saying; the pace carries on from there. **◀ Block / Block ▶** sit outside them.
  Keyboard extras: ↑ ↓ for a line, ← → for a block.
- **Catch up** is removed - stepping a line back does the same job, more precisely.

## 0.8.8

- Teleprompter: every action is a labelled button (Back, Next, Pause/Continue, Catch up, Restart...); hints name the
  buttons, and keyboard keys are listed only as optional shortcuts. On a phone the buttons are compact, the side panel
  is short and the shortcut footer is hidden, so the notes get the room.

## 0.8.7

- **Catch up** in the teleprompter (button or C): the notes wait while you keep talking - not a pause, no message
  over the notes, just a quiet strip at the bottom. Press it again when you are there. The recording clock runs on.
- **Click a line** to tell the teleprompter "I am here".
- **Auto-advance is off by default** (and remembered): the notes wait at the end of each block until you press →,
  so they never run into the next section while you are still talking.

## 0.8.6

- **A tick means finished.** Publish shows "set - not out yet" until every version is published; Results shows
  "after release" until the video is out, then asks how it did. Planned feedback records no longer tick Results.
- The capture list on Record folds away as **Files for the edit: x of y saved**, with one line on what it is for
  (your voice take, the graphics, the music - each with its own folder) and "Change the list" inside.

## 0.8.5

- The teleprompter's right-hand panel reads in time order: How to say it → On screen now → Next up → Running order.

## 0.8.4

- **Take done** screen: Save and Copy confirm on the screen itself (Saved ✓ / Copied ✓, or how to copy by hand)
  and say where the notes went - step 3 Record → Recording notes and cut points. Save stores a take once, however
  often it is clicked (it used to add a copy per click, with its confirmation hidden behind the teleprompter).
- Messages (toasts) now show above the full-screen teleprompter, e.g. after Restart.

## 0.8.3

- **Restart** in the teleprompter (or the R key), once a take has started: back to the top with the notes on
  screen and nothing moving, the clocks at zero and the take's cut points cleared - no closing and reopening.

## 0.8.2

- Pressing **Start** in the teleprompter gives a **3-2-1** first - time to hit record in Audacity - shown in the
  bottom strip so the notes stay readable. Opening it still shows the notes with nothing moving.

## 0.8.1

- The teleprompter opens on your notes and **nothing moves until you press Start** - no 3-2-1. Read through
  first; look ahead with → / ← or by clicking a block in the running order; Start begins the clock at once,
  from the block on screen. "How to say it" sits at the top of the right-hand panel.
- **Paused** now shows as a slim strip at the bottom of the screen, so the notes stay readable while you
  catch your breath and read ahead.

## 0.8.0

- **Five steps per video** instead of twelve sections: **Idea** (what it is, who for, what they get, why it is
  made this way, what it is built from) → **Card** (the blocks are the script: talking points, what is on screen
  and why each block is there; hook ideas, research and the look folded below) → **Record** (teleprompter,
  captures, workflow; for e-books, posters and posts this is **Make**, with the brief for Claude) → **Publish**
  (every platform version on one page - title, caption, hashtags, date, status - plus all the exports) →
  **Results**.
- Each step shows **what is still missing** (no hook line, blocks without talking points, a caption or release
  date per platform...), the step bar shows a tick or a count, and "Next to do" jumps to the first gap.
- The basics are no longer hidden at Simple: category, audience, claims to check, recording notes, free or paid.
  Free / paid and price show only on products; lighting, sound and music only on recorded pieces.
- What is on screen is part of every block at every level. Old links to sections (story, outputs, production...)
  land on the matching step.

## 0.7.0

- **Beyond video** (Content → Beyond video): a grid of your categories against courses, e-books and
  PDFs, posters, LinkedIn posts and Instagram posts and reels. Each cell lists what exists, with its
  status and free / paid; + starts a new one in that category (posts get their platform output too).
  A video with an Instagram or LinkedIn output counts in those columns.
- Content items can be marked **Free or paid** with a **price** (Advanced).
- **Brief for Claude to make it** (Sidebar → Export, on courses, e-books, posters and posts): one Markdown
  file to upload to Claude - the job for that kind of product, the no-invention rules, the product, its
  structure, your content and research, the full material of the videos it is **built from** (a new
  link on the Overview), your brand guide (Settings → Voice and branding) and the graphics to make.
- New content types: Course, E-book / PDF, Poster, LinkedIn post, Instagram post (added to older
  workspaces the first time you start one). New example formats: LinkedIn post, Instagram image post.

## 0.6.1

- **Download brief (.md)** in Sidebar → Export: everything about a video in one Markdown file, to paste
  into another chat or AI for review. The brief and the package now include *How to say it* and
  *Why it is made this way*.

## 0.6.0

- **Teleprompter** (a video → Production, or under its story blocks): full screen, notes on the left and
  next up / on screen now / running order on the right. The line the pace says you should be on is
  highlighted; a bar shows the time left in the block and warns when the words won't fit the time at a
  calm ~150 words a minute. Space pauses (your recording keeps running), → and ← move between blocks
  (a clicker's Page Down / Page Up too), auto-advance can wait for you instead. At the end it lists where
  each block began in the recording - the cut points - and saves them to the recording notes.
  The clock runs on a timer, so it keeps time while your recording app covers the window.
- Story blocks: a line starting » is read word for word, a line starting - is a talking point. The
  block's purpose (why it is there) is now editable on the video.
- New fields: **How to say it (vibe and rules)** on Script, shown before the teleprompter starts, and
  **Why it is made this way** on Concept.

## 0.5.0

- Every page ends with big **Back** and **Home** buttons (44 px, 52 px and full width on a phone). Back goes one logical step up: a video to its list, a tab to its section, a section to home. The breadcrumb at the top stays as the "where am I".
- **Series numbers:** choosing a series gives the video the next free number in it (Grind my Gears #5). The number is editable.
- **Parts:** "Add part" turns one content-plan line into Part 1, 2, 3 under the same series number, carrying category, audience and links.
- Each video shows where it sits in its category (video 3 of 7 in Business).
- **A look per audience:** two colours (main, accent) per audience profile; a video picks them up from its audience and shows them on its page.

## 0.4.0
- Home is a grid of big blocks, one per section: Dashboard, Planning, Content, Library, Settings,
  How to use - each with what is waiting there. The long tab bar is gone: inside a section you see
  a breadcrumb home and only that section's tabs. "ContentBench" in the header goes home.

## 0.3.1
- Videos are forecast one at a time (soonest release first, then the one furthest along), so today
  holds one real task instead of every video's first step.
- "Today" is your local date, not UTC - it no longer lags until 2 am in time zones ahead of UTC.

## 0.3.0
- A hub home: your next task, drop a thought, Planning (thoughts, ideas, projects) and Content
  (content plan, production, releases), plus a Dashboard.
- Thoughts as their own records, with optional Passport questions; ideas with problem, approaches,
  balance and an optional scorecard; projects moving through fifteen stages, forwards or
  back, with a folder of everything linked and any number of videos.
- Forward forecasts replace backwards scheduling: counted from today, so unfinished work moves out;
  your own stage times replace placeholder estimates; no overdue lists.
- Capture list per video with the exact folder for each file; folders created and checked in your
  private folder.
- Release rhythm per platform, a ready-to-release backlog filling open slots.
- Safe zones drawn per format; LinkedIn added to the example platforms.
- Your private folder: the data file lives in your own (Drive-synced) folder; tools/cb.mjs edits it.
- Nothing is forced: every step can be skipped, every question and score is optional.

## 0.2.0
- Planner calendar: drag a video's Due chip onto a day; its workflow steps are dated backwards from it
  (each step has a number of days). Click-then-click works on touch screens and keyboards.
- Platform outputs are their own calendar chips, so TikTok, Reels and YouTube run on separate
  schedules. Chips are coloured by content category; filter by platform.
- Planner → This week: overdue, today and the next six days, workflow steps included.
- Video timeline: storytelling blocks take a duration (0:15); a bar shows the running order and
  length, compared against the template. Default workflow and structure for new content; save a
  tweaked structure as a variant template.

## 0.1.0
- Phase 1 foundation: workspaces (blank, example, import, export, reset data, reset configuration,
  delete), ideas, projects, content items, platform outputs, references, assets, tasks, publishing
  records, feedback.
- Versioned workflow and storytelling templates, copied into items.
- Master → output drift with per-field choice.
- Content package export (.zip) and assistant brief.
- Planner with separate milestone / production / publishing dates.
- Assistant prompts with suggestions kept apart from the creator's text.
- How-to tab, first-run welcome, detail levels.
