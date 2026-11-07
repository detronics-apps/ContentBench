// Footer texts. The licence named here must match LICENSE (tests/legal.test.js).

export const LICENCE = 'MIT';

export const LEGAL = {
  licence: {
    title: 'Licence & terms',
    paras: [
      `ContentBench is released under the ${LICENCE} licence. You may use, copy and modify it freely; it comes with no warranty.`,
      'Example platform specifications are placeholders. Check each platform\'s current requirements before publishing.',
      'Your content is yours. The app claims nothing over what you write in it.',
    ],
  },
  imprint: {
    title: 'Imprint & privacy',
    paras: [
      'Made by Detronics - https://www.detronics.co.za/',
      'Everything you enter stays in this browser on this device (localStorage). Nothing is uploaded: no accounts, no analytics, no cookies, no third-party scripts.',
      'Exports and backups are files downloaded to your own device. Clearing your browser\'s site data deletes the workspaces - export first.',
    ],
  },
};

/** Shown behind the footer's What's new - never in the welcome. */
export const CHANGES = [
  ['0.6.0', 'A full-screen teleprompter that paces your talking points, shows what comes next and keeps your cut points; read-word-for-word lines and an editable purpose per story block; "How to say it" and "Why it is made this way" fields.'],
  ['0.5.0', 'Big Back and Home buttons at the bottom of every page; series numbers and parts (Grind my Gears #5 · Part 2 of 3); a colour look per audience.'],
  ['0.4.0', 'Home as big section blocks (Dashboard, Planning, Content, Library, Settings, How to use); inside a section, only its own tabs.'],
  ['0.3.1', 'Videos forecast one at a time so today holds one task; today follows your local date.'],
  ['0.3.0', 'Hub home with Planning and Content sides; thoughts, idea scorecard and project stages; forward forecasts that never pile up; capture list with exact folders and folder checking; release rhythm and backlog; your private folder.'],
  ['0.2.0', 'Deadline calendar: drag videos and platform releases onto days, workflow steps dated backwards, a This week view. Video timeline bar on structures, with template comparison, defaults and variants.'],
  ['0.1.0', 'Phase 1 foundation: workspaces, ideas, projects, content items, platform outputs, references and assets; workflow and storytelling templates; planner; content package export; assistant prompts with suggestions kept apart.'],
];
