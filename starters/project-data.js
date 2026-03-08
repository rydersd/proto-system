/* ========================================================================
   PROJECT DATA — [Project Name]

   This file provides navigation structure for proto-nav.js.
   Load BEFORE proto-nav.js in every HTML page.

   Required: SECTIONS
   Optional: STORY_MAP, STORY_TITLES, JOURNEYS, SCENARIOS
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
