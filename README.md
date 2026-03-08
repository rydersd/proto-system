# Proto-System — Agent-Consumable Wireframe Framework

A reusable wireframe prototyping system optimized for LLM/agent consumption. An agent reads the ref docs, generates pages that render correctly first try.

## Quick Start

1. Read `ref/_index.md` — tells you which refs to load for your task
2. Read `ref/tokens.md` — never hardcode colors
3. Read `ref/page-template.md` — every page needs the same boilerplate
4. Read the surface ref for your target platform
5. Copy a starter from `starters/` and build from there

## Structure

```
framework/
├── core/        → Shared CSS + JS (never modify per-project)
├── surfaces/    → Platform-specific CSS (Slack, Salesforce, internal DS)
├── ref/         → Agent reference docs (read before generating pages)
├── starters/    → Copy-paste starting HTML + JS templates
└── examples/    → Reference implementations
```

## Surfaces

| Surface | CSS file | Prefix | Use for |
|---------|----------|--------|---------|
| Slack | `surfaces/slack.css` | `slack-` | Chat interfaces, deal rooms, bot DMs |
| Salesforce | `surfaces/salesforce.css` | `sfdc-` | Record pages, reports, dashboards |
| Internal DS | `surfaces/internal-ds.css` | `ds-` | Partner portals, admin panels |

## Current Status

- **Phase 1 (complete)**: Ref docs + starters — framework documentation and templates
- **Phase 2 (planned)**: Extract proto-core.css from wireframe.css
- **Phase 3 (planned)**: Extract surface CSS files
- **Phase 4 (planned)**: Extract proto-nav.js from wf-nav.js
- **Phase 5 (planned)**: Validate against Slack MEDDPICC project
- **Phase 6 (planned)**: Validate with a fresh project
