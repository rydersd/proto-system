# CLAUDE.md — Proto-System Framework

## What This Is

Proto-system is an agent-consumable wireframe prototyping framework. It provides shared CSS, JS, and reference documentation so that agents can rapidly generate consistent, professional wireframe pages for any project.

## How to Use This Framework

### Before generating any page:
1. Read `ref/_index.md` — routing table for which refs to load
2. Read `ref/tokens.md` — color and typography tokens (never hardcode hex)
3. Read `ref/page-template.md` — required HTML boilerplate

### For a specific surface:
- Slack wireframe → read `ref/surface-slack.md`
- Salesforce wireframe → read `ref/surface-salesforce.md`
- Internal portal wireframe → read `ref/surface-internal.md`

### For complex layouts:
- Read `ref/layouts.md` — grid, sidebar, split view patterns
- Read `ref/components.md` — buttons, cards, tables, forms, badges, modals, toast

### For new projects:
- Read `ref/new-project.md` — 6-step bootstrap from starters/

### For navigation setup:
- Read `ref/navigation.md` — how SECTIONS drives the drawer + breadcrumbs

### When starting a real project:
The `examples/` directory contains reference implementations. When bootstrapping a new project:
1. Copy a starter from `starters/` (not from `examples/`)
2. Create your own `project-data.js` with project-specific SECTIONS
3. The navigation drawer automatically shows YOUR project's pages, not the examples
4. Do not link back to examples from your project — examples are for reference only

## Directory Structure

```
framework/
├── core/         # Shared CSS + JS (do not modify per-project)
│   ├── proto-core.css      # Design tokens + base components
│   ├── proto-nav.js        # Context bar, drawer, toast, modal
│   └── proto-signals.js    # Optional state management
├── surfaces/     # Platform CSS overlays
│   ├── slack.css           # Slack app shell, messages, threads
│   ├── salesforce.css      # SFDC record pages, path bar, feed
│   └── internal-ds.css     # Portal KPIs, form groups, cards
├── ref/          # Agent reference docs (read before building)
├── starters/     # Copy-paste HTML + JS templates
└── examples/     # Reference implementations
```

## Current Phase

Phase 1 (documentation + starters) is complete. Core CSS/JS extraction (Phases 2-4) is planned as a separate effort. Until extraction is done, the existing `wireframe.css` and `wf-nav.js` in the Slack MEDDPICC project serve as the living source of truth — the ref docs describe the patterns they contain.

## Design Token Summary

| Token | Hex | Use |
|-------|-----|-----|
| `--wf-ink` | #1e2a3a | Headings, borders |
| `--wf-text` | #3b4f68 | Body text |
| `--wf-muted` | #4a5f7f | Secondary text, labels |
| `--wf-line` | #b0bdd0 | Borders, dividers |
| `--wf-tint` | #dce4ef | Subtle fills |
| `--wf-surface` | #edf1f7 | Card backgrounds |
| `--wf-canvas` | #f0f4fa | Page background |
| `--wf-accent` | #3d6daa | The ONE blue |
| `--wf-red` | #8b4553 | Errors, overdue |
| `--wf-amber` | #6b5a2f | Warnings, pending |
| `--wf-green` | #45785a | Success, confirmed |
| `--wf-purple` | #6b5b8a | AI, suggestions |
| `--wf-paper-shadow` | (layered) | Paper depth shadows |
| `--wf-tape-color` | rgba(220,228,200,0.55) | Tape strip fill |
| `--wf-pin-color` | #c0392b | Pushpin dot |

## Key Rules

- Never hardcode hex values — always use tokens
- One surface CSS per page — don't mix Slack + SFDC
- `wf-` prefix = shared core components
- Surface prefix (`slack-`, `sfdc-`, `ds-`) = platform-specific
- Buttons use `.btn` / `.btn-primary` everywhere (no prefix)
- Every page needs design notes (`wf-design-notes` div)
- Script load order: `project-data.js` THEN `proto-nav.js`
- Fidelity slider (Napkin/Blueprint/Polished) controls `--wf-wobble-radius`, `--wf-grain-opacity`, `--wf-grid-opacity` — never hardcode these
- Use `data-wf-confidence` attribute on uncertain features — the aesthetic communicates design certainty
- Paper utilities (`.wf-tape`, `.wf-pin`, `.wf-torn-*`, `.wf-stacked`, `.wf-sketch`) use pseudo-elements — don't conflict
