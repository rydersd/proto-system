# New Project Bootstrap

> Read when starting a project from scratch. Follow these 6 steps in order.

## Step 1: Create Project Directory

```
my-project/
├── core/          → copy from framework/core/
├── surfaces/      → copy from framework/surfaces/
├── project-data.js
├── project.css    → project-specific styles (optional, start empty)
├── login.html     → auth gate page (optional)
└── [pages].html
```

Copy `core/` and `surfaces/` from the framework. Don't modify them — they're shared.

## Step 2: Create project-data.js

Copy `starters/project-data.js` and fill in SECTIONS:

```javascript
var SECTIONS = [
  {
    id: 'main',
    label: 'Main Pages',
    items: [
      { file: 'home', label: 'Home', type: 'page' },
      { file: 'dashboard', label: 'Dashboard', type: 'page' }
    ]
  }
];
```

See `ref/navigation.md` for full SECTIONS spec and optional data structures.

## Step 3: Create First Page

Copy `starters/blank-page.html` (or a surface starter). Update:

1. `<title>` — page name + project name
2. Surface CSS link — pick the right one for this page's platform
3. Page content — build from `ref/components.md` and `ref/layouts.md`
4. Design notes — fill in Summary, JTBD, Design Spec
5. `project-data.js` path — make sure it points to your file

## Step 4: Add Project-Specific CSS (if needed)

Create `project.css` for classes unique to this project. Prefix with your project abbreviation:

```css
/* Project: Partner Portal (pp-) */
.pp-partner-card { ... }
.pp-tier-badge { ... }
```

Link after surface CSS: `<link rel="stylesheet" href="project.css">`

## Step 5: Build More Pages

For each new page:

1. Read the relevant refs (`_index.md` tells you which)
2. Copy a starter or duplicate an existing page
3. Add the page to SECTIONS in project-data.js
4. Add design notes

## Step 6: Add Stories + Scenarios (Optional)

If project needs story mapping or guided walkthroughs, add to project-data.js:

```javascript
var STORY_MAP = { 'home': ['1.1'], 'dashboard': ['1.2', '1.3'] };
var STORY_TITLES = { '1.1': 'Home page layout', '1.2': 'KPI widgets', '1.3': 'Pipeline chart' };
var SCENARIOS = [ { id: 'first-login', persona: 'Rep', label: 'Rep: First login', steps: [...] } ];
```

## File Loading Order

In every HTML page, scripts load in this order:

```html
<script src="project-data.js"></script>    <!-- 1. data first -->
<script src="core/proto-nav.js"></script>  <!-- 2. nav engine second -->
```

## Checklist

- [ ] `core/` and `surfaces/` copied (not modified)
- [ ] `project-data.js` has at least one SECTIONS entry
- [ ] First page loads without console errors
- [ ] Context bar shows with breadcrumbs
- [ ] Drawer opens and lists your pages
- [ ] Design notes button works
