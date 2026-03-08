# Navigation System

> Read when setting up proto-nav.js for a project, or when adding story maps / scenarios.

## How It Works

`proto-nav.js` runs on every page. It reads data from `project-data.js` (loaded before it) and builds:

1. **Context bar** — top bar with hamburger, breadcrumbs, and action buttons
2. **Drawer** — full-page nav panel triggered by hamburger, built from SECTIONS
3. **Design notes panel** — side panel that shows content from `<div class="wf-design-notes">`
4. **Story mode** — optional journey highlighting using `data-journey` attributes
5. **Scenarios** — optional guided walkthroughs stored in sessionStorage

## Required: SECTIONS

Drives the drawer and breadcrumbs. Array of section groups:

```javascript
var SECTIONS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    epic: 'Epic 1',              // optional — shown as badge
    items: [
      { file: 'home', label: 'Home', type: 'page' },
      { file: 'reports', label: 'Reports', type: 'page' },
      { file: 'settings', label: 'Settings', type: 'modal' }
    ]
  },
  {
    id: 'onboarding',
    label: 'Onboarding Flow',
    epic: 'Epic 2',
    items: [
      { file: 'onboarding-welcome', label: 'Welcome', type: 'page' },
      { file: 'onboarding-company', label: 'Company Info', type: 'page' }
    ]
  }
];
```

`file` = HTML filename without `.html`. `type` = display hint (page, modal, channel, dm, canvas, sfdc, reference).

## Optional: STORY_MAP + STORY_TITLES

Maps pages to Jira stories (or any story IDs). Shows story badges in context bar.

```javascript
var STORY_MAP = {
  'home':               ['1.1', '1.2'],
  'onboarding-welcome': ['2.1'],
  'onboarding-company': ['2.2', '2.3']
};

var STORY_TITLES = {
  '1.1': 'Dashboard home layout',
  '1.2': 'KPI widget data binding',
  '2.1': 'Welcome screen with org lookup',
  '2.2': 'Company info form',
  '2.3': 'D&B integration for company search'
};
```

## Optional: JOURNEYS

Defines user journeys that can be highlighted on pages using `data-journey` attributes:

```javascript
var JOURNEYS = [
  { id: 'onboard-new-partner', label: 'Onboard a new partner', short: 'Onboard' },
  { id: 'submit-deal', label: 'Submit a deal registration', short: 'Deal Reg' }
];
```

On HTML elements, add `data-journey="onboard-new-partner"` to make them highlightable when that journey is selected.

## Optional: SCENARIOS

Guided walkthroughs — step-by-step page tours with narrative:

```javascript
var SCENARIOS = [
  {
    id: 'new-partner-onboarding',
    persona: 'Admin',
    label: 'Admin: Onboard a new partner',
    steps: [
      { file: 'home', narrative: 'Jordan opens the partner portal dashboard.' },
      { file: 'onboarding-welcome', narrative: 'Clicks "Add Partner" to start onboarding.' },
      { file: 'onboarding-company', narrative: 'Searches D&B for the company. Fills in details.' }
    ]
  }
];
```

Scenarios use sessionStorage to track current step. `wfScenarioStart(id)` begins, `wfScenarioNext()` advances.

## Key Functions (from proto-nav.js)

| Function | What it does |
|----------|-------------|
| `wfToast(msg, ms)` | Show brief notification (default 2500ms) |
| `wfModalClose(id)` | Close modal by element ID |
| `wfThreadOpen()` | Show `.slack-thread-panel` |
| `wfThreadClose()` | Hide `.slack-thread-panel` |
| `wfDnToggle()` | Toggle design notes panel |
| `wfScenarioStart(id)` | Start a guided scenario |
| `wfScenarioNext()` | Next step in scenario |
| `wfScenarioExit()` | Exit scenario mode |

## Rules

- `project-data.js` must load BEFORE `proto-nav.js` in the HTML
- SECTIONS is required — without it, no drawer or breadcrumbs render
- STORY_MAP, JOURNEYS, SCENARIOS are optional — features silently skip if missing
- File names in SECTIONS/STORY_MAP never include `.html` extension
- Every page's filename must match a `file` value in SECTIONS for breadcrumbs to work

## WIREFRAME_CONFIG

Optional global configuration object defined in `project-data.js` before SECTIONS. Controls project-level settings for proto-nav.js.

```javascript
var WIREFRAME_CONFIG = {
  projectTitle: 'My Project',       // Shown in context bar and drawer header
  logoUrl: '',                       // Optional logo image URL for context bar
  defaultFidelity: 'blueprint',     // Starting fidelity: 'napkin', 'blueprint', or 'polished'
  feedbackMailto: 'team@example.com', // Email address for feedback panel submissions
  hiddenFeatures: [],                // Array of feature IDs to disable (e.g. ['scenarios', 'journeys'])
  theme: 'light'                     // Reserved for future theme support
};
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `projectTitle` | string | `''` | Display name shown in the context bar title and drawer header |
| `logoUrl` | string | `''` | URL to a logo image; rendered in the context bar next to the title |
| `defaultFidelity` | string | `'blueprint'` | Initial fidelity level on first visit (`'napkin'`, `'blueprint'`, or `'polished'`) |
| `feedbackMailto` | string | `''` | Recipient email for the feedback panel's mailto integration |
| `hiddenFeatures` | array | `[]` | Feature IDs to suppress (e.g. `['scenarios', 'journeys']`) |
| `theme` | string | `'light'` | Reserved for future theme switching support |

## Fidelity Slider

The context bar includes a three-position fidelity slider: **Napkin**, **Blueprint**, and **Polished**.

- **Napkin** — hand-drawn feel with heavy wobble, visible paper grain, and loose grid lines
- **Blueprint** — balanced wireframe look with mild asymmetry and subtle grid (default)
- **Polished** — clean, precise rendering with no grain or wobble

The slider sets CSS custom properties on `:root` (`--wf-wobble-radius`, `--wf-grain-opacity`, `--wf-grid-opacity`, `--wf-shadow-scale`, `--wf-wobble-filter`) and persists the selection to `sessionStorage` under the key `wf_fidelity`. On page load, proto-nav.js restores the saved fidelity level automatically.

## Confidence Attribute

Add `data-wf-confidence` to any HTML element to communicate design certainty visually:

| Value | Effect |
|-------|--------|
| `confirmed` | Clean, precise borders — design is validated and approved |
| `partial` | Mildly asymmetric borders — some validation done |
| `uncertain` | Wobbly borders, reduced opacity, SVG filter applied — feature not yet validated |

At **Polished** fidelity, `uncertain` elements render with dashed borders instead of wobble effects. This attribute works on any element — cards, sections, buttons, entire page regions.
