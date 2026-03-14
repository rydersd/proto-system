# Proto-System Architecture

> How the pieces connect. Read this to understand the system mental model before building pages.

## 1. Script Load Order & Initialization

**Required order:**
```
project-data.js → proto-nav.js → [blueprint-data.js → proto-gen.js]
```

- `project-data.js` sets global data structures on `window` (see §2)
- `proto-nav.js` reads those globals and builds the page chrome (context bar, drawer, design notes panel, story mode, etc.)
- `proto-gen.js` (optional) reads `window.PAGE_BLUEPRINT` and generates page content — runs on `DOMContentLoaded`, after proto-nav.js has executed

**`wfNavInit()` sequence** (proto-nav.js entry point):
1. `injectSVGFilters()` — SVG filter definitions for blur/grain
2. `injectWobbleVariants()` — randomized border-radius variants
3. `buildContextBar()` — top navigation bar with hamburger, title, fidelity slider, notes button
4. `buildSurfaceHeader()` — surface-specific header injection (e.g., SFDC global nav)
5. `wfFidelityRestore()` — restore fidelity level from sessionStorage
6. `buildDrawer()` — navigation drawer from SECTIONS data
7. `buildDesignNotesPanel()` — 3-tab design notes overlay
8. `buildFeedbackPanel()` — feedback/annotation overlay
9. `buildStoryModeSelector()` — journey/story mode dropdown
10. `buildScenarioBanner()` — guided walkthrough banner
11. `hideOldChrome()` — remove legacy chrome elements
12. `wfInitModals()` — modal dialog system
13. `wfInitThreadPanel()` — thread/comment panel
14. `wfCheckActions()` — process pending modal actions from sessionStorage
15. `randomizeTornEdges()` / `randomizeWobble()` — paper aesthetic randomization
16. `wfInitScatterTransition()` — scatter GL transition setup
17. `buildStencilLayer()` — stencil overlay for blueprint aesthetic

## 2. Global Data Structures

All set in `project-data.js` on `window` before proto-nav.js loads:

| Global | Required? | Purpose |
|--------|-----------|---------|
| `WIREFRAME_CONFIG` | Yes | Project branding — `title`, `subtitle`, `fallbackPage`, email config |
| `SECTIONS` | Yes | Page registry — drives drawer navigation, breadcrumbs, page numbering. Each entry's `type` field (`'sfdc'`, `'slack'`, `'internal'`) triggers surface-specific behavior |
| `STORY_MAP` | No | Object mapping page filenames to story IDs — auto-injects story badges into Notes Context tab. When `DESIGN_STORIES` is also defined, badges render as links to `design-stories.html` |
| `STORY_TITLES` | No | Object mapping story IDs to human-readable titles |
| `JOURNEYS` | No | Array or object format (normalized at init by `normalizeJourneys()`). Drives `data-journey` attribute highlighting across pages |
| `SCENARIOS` | No | Guided walkthroughs — array of `{ id, label, steps: [{ file, narrative, friction? }] }` |
| `DESIGN_STORIES` | No | Array of rich story objects — user stories, acceptance criteria, phased implementation, decisions, SFDC suggestions. Living design document source of truth |
| `PROJECT_PHASES` | No | Array of project-level phase definitions — groups stories into delivery phases with system dependencies |
| `PAGE_BLUEPRINT` | No | Declarative page definition — consumed by proto-gen.js (see §6) |

## 3. CSS Module Ownership

Each CSS file owns a specific domain. Never put styles in the wrong module:

| Module | Owns | Key selectors |
|--------|------|---------------|
| `proto-tokens.css` | Design tokens, global reset, fidelity controls | `--wf-*` custom properties, `:root`, `[data-wf-fidelity]` |
| `proto-components.css` | UI primitives | `.btn`, `.wf-card`, `.wf-table`, `.wf-form-group`, `.wf-badge`, `.wf-tabs` |
| `proto-blueprint.css` | Paper aesthetic effects | `.wf-tape`, `.wf-pin`, `.wf-torn-*`, `.wf-stacked`, `.wf-sketch`, `[data-wf-confidence]` |
| `proto-chrome.css` | Framework shell | `.wf-context-bar`, `#wf-nav-drawer`, `#wf-dn-panel`, `html.wf-dn-open` (body margin-right 400px, z-index 3000) |
| `proto-feedback.css` | Feedback/annotation modal | `#wf-fb-overlay` |
| `proto-story.css` | Journey highlighting, scenarios | `html.story-active`, `html.scenario-active`, `.wf-story-bar`, `[data-journey]` |
| `proto-keyframes.css` | Animations | `@keyframes wf-toast`, `wf-flash`, `wf-scroll-highlight`, scatter transitions |
| `proto-core.css` | **Legacy monolith** — kept for backward compatibility | Superset of above; new pages should use modular imports |

**Surface CSS** (in `surfaces/`, one per page):

| File | Surface | Key selectors |
|------|---------|---------------|
| `salesforce.css` | SFDC | `.sfdc-*` — record pages, path bar, highlights bar, feed |
| `slack.css` | Slack | `.slack-*` — app shell, messages, threads |
| `internal-ds.css` | Internal portal | `.ds-*` — KPI cards, form groups, page containers |

## 4. Surface Detection Chain

1. `detectSurface()` calls `currentFile()` to get the current page filename
2. Looks up the page in `SECTIONS` to find its `type` field
3. Returns `'sfdc'`, `'slack'`, `'internal'`, or `null`
4. `buildSurfaceHeader()` uses the result — currently only injects a header for `type: 'sfdc'` (Salesforce global nav bar)
5. Surface CSS is loaded per-page via `<link>` in the HTML (not auto-injected)

## 5. Design Notes Wiring

**Page author provides** one of:
- A single `.wf-design-notes` div with `<h3>` headings separating content
- Or segmented divs: `.wf-context-notes`, `.wf-design-notes-spec`, `.wf-design-notes-impl`

**proto-nav.js processes it:**
1. `buildDesignNotesPanel()` creates the slide-out panel (`#wf-dn-panel`)
2. `wfDnOpen()` reads the hidden div, splits content by `<h3>` headings into 3 tabs (Context / Design / Technical)
3. Auto-injects story badges from `STORY_MAP` into the Context tab. When `DESIGN_STORIES` is also defined, badges render as links to `design-stories.html#story-{id}`
4. CSS: `html.wf-dn-open` shifts body content right 400px, panel renders at z-index 3000

**proto-gen.js can also generate notes** from `PAGE_BLUEPRINT.notes` object (summary, jtbd, designSpec, technical, acceptance fields).

## 6. Module Dependency Diagram

```
project-data.js
│  Sets: WIREFRAME_CONFIG, SECTIONS, STORY_MAP, STORY_TITLES, JOURNEYS, SCENARIOS, DESIGN_STORIES, PROJECT_PHASES
│
▼
proto-nav.js  (wfNavInit on DOMContentLoaded)
│  Reads globals → builds context bar, drawer, design notes, story mode, scenarios
│  Manages: fidelity slider, paper effects, modals, feedback panel
│
├──→ CSS Modules (loaded via <link> in HTML):
│      proto-tokens.css → proto-components.css → proto-blueprint.css
│      → proto-chrome.css → proto-story.css → proto-feedback.css → proto-keyframes.css
│
├──→ Surface CSS (one per page): salesforce.css | slack.css | internal-ds.css
│
├──→ Page HTML: .wf-* classes, data-* attributes, .wf-design-notes content
│
├──→ proto-gen.js [optional] (wfBlueprintInit on DOMContentLoaded)
│      Reads: window.PAGE_BLUEPRINT
│      Generates: page layout + content blocks + design notes
│      Layouts: record-3col, dashboard, list, detail, form, canvas
│      Block types: detail-grid, related-list, card, kpi-row, timeline, form, table, chart-placeholder, empty-state
│      Surface headers: sfdc, slack, internal, generic
│
└──→ proto-stories.js [optional] (Design Stories page renderer)
       Reads: window.DESIGN_STORIES, window.PROJECT_PHASES
       Generates: story cards, phase roadmap, validation warnings, status filters
```

## 7. State Management

**sessionStorage keys** (persist across page navigations within a session):

| Key | Purpose | Set by |
|-----|---------|--------|
| `wf_fidelity` | Fidelity level (0=napkin, 1=blueprint, 2=polished) | Fidelity slider |
| `wf_scenario` | Active scenario JSON `{ id, step }` | Scenario navigation |
| `wf_story_journey` | Active story/journey ID | Story mode selector |
| `wf_action` | Pending modal action key | Modal save → consumed on next page load |
| `wf_scatter_angle` | Scatter transition angle | Scatter GL init |

**CSS class/attribute state on `<html>`:**

| State | Applied to `<html>` | Triggered by |
|-------|---------------------|--------------|
| `.wireframe` | Set in HTML boilerplate | Page author (required) |
| `[data-wf-fidelity]` | `"0"`, `"1"`, or `"2"` | Fidelity slider |
| `.wf-dn-open` | Added/removed | Design notes panel toggle |
| `.story-active` | Added/removed | Story mode activation |
| `.scenario-active` | Added/removed | Scenario walkthrough activation |

## 8. Key Interaction Flows

**Hamburger → Drawer:**
Context bar hamburger button → `wfNavToggle()` → drawer slides in/out, lists pages from SECTIONS

**Notes button → Panel:**
Context bar notes button → `wfDnOpen()` → reads `.wf-design-notes` div → splits by `<h3>` into 3 tabs → injects story badges → panel slides in from right → `html.wf-dn-open` shifts body

**Fidelity slider:**
Drag slider → `wfFidelity(val)` → sets `data-wf-fidelity` on `<html>` → CSS tokens (`--wf-wobble-radius`, `--wf-grain-opacity`, `--wf-grid-opacity`) respond → `sessionStorage.wf_fidelity` persists

**Scenario walkthrough:**
Select scenario → `wfScenarioStart(id)` → stores in sessionStorage → navigates to first step → scenario banner shows narrative + friction callouts → Next/Prev buttons advance steps → Exit clears sessionStorage
