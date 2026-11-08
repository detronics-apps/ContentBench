# Changelog

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
