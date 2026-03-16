# Nib Doctor — Diagnostic Engine

> Automated checks for common wireframe page mistakes. Catches silent failures before they cost hours to debug.

## Quick Start

Add after your last `<script>` tag:

```html
<script src="core/proto-doctor.js"></script>
```

Open the browser console. You'll see:

```
[nib-doctor] Running 15 checks on "home"...
[nib-doctor] ✓ WIREFRAME_CONFIG keys valid
[nib-doctor] ✓ SECTIONS structure valid
[nib-doctor] ⚠ STORY_MAP references page "detail" not found in SECTIONS
[nib-doctor] ✗ filter: grayscale(1) on body — move to html (lesson #9)
[nib-doctor] ─────────────────────────────────
[nib-doctor] 13/15 passed · 1 warning · 1 error
```

## How It Works

- **Read-only** — never modifies the page
- **Optional** — omit the `<script>` tag and it's gone
- **Agent-parseable** — structured `[nib-doctor]` prefix on every line
- **Programmatic** — results available at `window.NibDoctor`

Load order: `project-data.js` → `proto-nav.js` → (optional `proto-gen.js`) → `proto-doctor.js`

## The 15 Checks

| # | Check ID | What It Catches | Level | Lesson |
|---|----------|-----------------|-------|--------|
| 1 | `config-keys` | Unknown WIREFRAME_CONFIG keys (typos like `projectTitle`) | warn | #2 |
| 2 | `sections-structure` | Missing `label`, `items`, `file` in SECTIONS | error | — |
| 3 | `journeys-format` | JOURNEYS items missing `id` or `label` | warn | #3 |
| 4 | `storymap-refs` | STORY_MAP page keys not found in SECTIONS | warn | — |
| 5 | `stories-alignment` | DESIGN_STORIES ids not in STORY_MAP/STORY_TITLES | warn | — |
| 6 | `scenarios-steps` | SCENARIOS step files not in SECTIONS | warn | — |
| 7 | `script-order` | project-data.js not before proto-nav.js | error | — |
| 8 | `surface-css-match` | Surface elements (SFDC/Slack/DS) without matching CSS loaded | warn | — |
| 9 | `filter-on-body` | `filter` on `body` instead of `html` (breaks position:fixed) | error | #9 |
| 10 | `z-index-violations` | Page elements with z-index >= 1000 (framework reserved zone) | warn | #11 |
| 11 | `wobble-in-polished` | Inline `--wf-wobble-filter` persisting in polished mode | warn | #10 |
| 12 | `hardcoded-hex` | Inline hex colors that should use design tokens | warn | — |
| 13 | `design-notes` | Missing `.wf-design-notes` div | warn | — |
| 14 | `dead-sections-links` | Drawer links that return 404 | warn | #7 |
| 15 | `current-page-in-sections` | Current page not in SECTIONS (breadcrumbs break) | warn | — |

## Programmatic Access

After the checks run, `window.NibDoctor` contains:

```js
{
  page: "home",
  checks: 15,
  results: [
    { checkId: "config-keys", checkName: "...", status: "pass", message: "..." },
    { checkId: "filter-on-body", status: "error", message: "...", lesson: "#9" }
  ],
  passed: 13,
  warnings: 1,
  errors: 1,
  timestamp: "2026-03-15T..."
}
```

Each result has:
- `status` — `"pass"`, `"warn"`, or `"error"`
- `message` — human/agent-readable description
- `lesson` — optional reference to `ref/lessons-learned.md` entry
- `checkId` — machine-readable check identifier
- `checkName` — display name

## Framework Element Whitelist

Checks #10 (z-index) and #12 (hardcoded hex) skip framework chrome elements:
- `.wf-ctx-bar` (context bar)
- `#wf-nav-drawer` (navigation drawer)
- `#wf-dn-panel` (design notes panel)
- `#wf-fb-overlay` (feedback overlay)
- `.wf-stencil-layer` (napkin stencils)

## Tips

- **During development**: Keep the script tag active to catch issues early
- **For production/review**: Comment it out (zero overhead when not loaded)
- **For CI/automation**: Parse `window.NibDoctor.errors` count to gate quality
- **Hardcoded hex check**: Capped at 10 findings to keep output readable
