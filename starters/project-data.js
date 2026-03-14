/* ========================================================================
   PROJECT DATA — [Project Name]

   This file provides navigation structure for proto-nav.js.
   Load BEFORE proto-nav.js in every HTML page.

   Required: SECTIONS
   Optional: STORY_MAP, STORY_TITLES, JOURNEYS, SCENARIOS,
             DESIGN_STORIES, PROJECT_PHASES
   ======================================================================== */

/* ── WIREFRAME_CONFIG ── (Optional) Project branding & defaults ──── */

// window.WIREFRAME_CONFIG = {
//   title: 'My Project Wireframes',
//   subtitle: '12 screens · Web App',
//   fallbackPage: 'index.html',
//   emailPrefix: '[MyProject WF]',
//   emailFooter: 'Sent from My Project wireframe prototype',
//   emailRecipient: 'you@example.com'
// };

/* ── SECTIONS ── Drives drawer + breadcrumbs ─────────────────────────── */

var SECTIONS = [
  {
    id: 'main',
    label: 'Main',
    epic: '',                         // Optional: 'Epic 1'
    items: [
      { file: 'home',      label: 'Home',      type: 'page' },
      { file: 'dashboard', label: 'Dashboard', type: 'page' }
    ]
  }
  // Add more sections as your project grows:
  // {
  //   id: 'settings',
  //   label: 'Settings',
  //   epic: 'Epic 2',
  //   items: [
  //     { file: 'settings-general', label: 'General', type: 'page' },
  //     { file: 'settings-users',   label: 'Users',   type: 'page' }
  //   ]
  // }
];

/* ── STORY_MAP ── (Optional) Page → Jira story associations ──────────── */

// var STORY_MAP = {
//   'home':      ['1.1', '1.2'],
//   'dashboard': ['1.3']
// };

/* ── STORY_TITLES ── (Optional) Story ID → short description ─────────── */

// var STORY_TITLES = {
//   '1.1': 'Home page layout',
//   '1.2': 'Navigation structure',
//   '1.3': 'Dashboard KPI widgets'
// };

/* ── DESIGN_STORIES ── (Optional) Rich story source of truth ──────────────
   Unlike STORY_MAP (lightweight page→story cross-ref for AC badge injection),
   DESIGN_STORIES is the full source of truth for each design story: user story,
   acceptance criteria, phased delivery plan, decisions log, and SFDC suggestions.
   When DESIGN_STORIES is defined, AC badges become clickable links to the
   design-stories.html page.
   ───────────────────────────────────────────────────────────────────────── */

// var DESIGN_STORIES = [
//   {
//     id: '1.1',                          // Unique story identifier (matches STORY_MAP keys)
//     title: 'Dashboard home layout',     // Short descriptive title
//     userStory: 'As a [persona], I want to [action] so that [outcome]',
//     status: 'in-progress',              // 'draft' | 'in-progress' | 'accepted' | 'deferred'
//     version: 2,                         // Iteration count
//     journeyId: 'first-login',           // Optional: ties to a JOURNEY
//     pages: ['home', 'dashboard'],       // Pages this story touches (filenames without .html)
//     acceptance: [                       // Acceptance criteria checklist
//       'Page loads with KPI widgets populated',
//       'Dashboard shows data from last 30 days by default'
//     ],
//     phases: [                           // Phased delivery plan per story
//       {
//         phase: 1,
//         label: 'Foundation',
//         scope: ['Basic record layout', 'Standard related lists'],
//         dependencies: [],
//         approach: 'oob'                 // 'oob' | 'config' | 'custom-lwc'
//       },
//       {
//         phase: 2,
//         label: 'Enhancement',
//         scope: ['Custom KPI chart', 'Conditional field visibility'],
//         dependencies: ['Phase 1 deployed', 'Report data available'],
//         approach: 'config'
//       }
//     ],
//     decisions: [                        // Decision log with rationale
//       { date: '2026-03-10', decision: 'Use 4-column KPI layout', rationale: 'Aligns with SLDS dashboard pattern' },
//       { date: '2026-03-14', decision: 'Defer custom chart to Phase 2', rationale: 'Dependent on data pipeline completion' }
//     ],
//     sfdc: {                             // Salesforce-specific suggestions (optional)
//       suggestions: [
//         'Consider Report Chart component for KPI visualizations (App Builder standard, no code)',
//         'Dynamic Forms can handle field-level visibility rules without code',
//         'Custom LWC would be needed for the risk score timeline chart'
//       ]
//     }
//   }
// ];

/* ── PROJECT_PHASES ── (Optional) Cross-story phase roadmap ───────────────
   Aggregates stories into project-wide delivery phases with system-level
   dependencies. Used by design-stories.html to render the roadmap view.
   ───────────────────────────────────────────────────────────────────────── */

// var PROJECT_PHASES = [
//   { phase: 1, label: 'Foundation',  stories: ['1.1', '1.2', '2.1'], systemDeps: [] },
//   { phase: 2, label: 'Enhancement', stories: ['1.3', '2.2'],        systemDeps: ['Data pipeline deployed', 'SSO configured'] },
//   { phase: 3, label: 'Polish',      stories: ['2.3', '3.1'],        systemDeps: ['Phase 2 UAT complete'] }
// ];

/* ── JOURNEYS ── (Optional) Highlightable user flows ─────────────────── */

// var JOURNEYS = [
//   { id: 'first-login', label: 'First-time login flow', short: 'First Login' }
// ];

/* ── SCENARIOS ── (Optional) Guided walkthroughs ─────────────────────── */

// var SCENARIOS = [
//   {
//     id: 'happy-path',
//     persona: 'User',
//     label: 'User: Complete the happy path',
//     steps: [
//       { file: 'home', narrative: 'User lands on the home page.' },
//       { file: 'dashboard', narrative: 'Navigates to the dashboard.' }
//     ]
//   }
// ];
