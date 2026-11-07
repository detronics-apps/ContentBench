# Changelog

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
