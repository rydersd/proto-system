# 2026-03-13 — Reference Hub Patterns

## What changed

### New reference docs
- **`ref/project-deliverables.md`** — Documents the full set of structural deliverables (sitemap, JTBD hub, user flows, story reference, personas) that a complete prototype should include beyond individual wireframe pages. For each deliverable: what it is, when to create it, what goes in it, and how it connects to wireframe pages.
- **`ref/design-notes-guide.md`** — Documents the content structure expected inside `<div class="wf-design-notes">`: Summary, Jobs to Be Done, Design Specification, Technical Details, and Acceptance Criteria. Includes formatting rules, good/thin examples, and reference to eqPartners patterns.

### New starters
- **`starters/sitemap.html`** — Starter template for a visual IA/sitemap page with view-control nav, search, branch containers, expandable nodes, and tab system for audience segmentation.
- **`starters/jtbd.html`** — Starter template for a JTBD hub with persona blocks, numbered job statements, screen links, persona summary table, and tab system.
- **`starters/user-flows.html`** — Starter template for user flow documentation with chain visualizations (step boxes + arrows), journey metadata, and links to swimlane views.
- **`starters/story-reference.html`** — Starter template for a story/character reference page with character cards, org cards, relationship diagrams, and proto-persona validation notice.

### Updated files
- **`ref/new-project.md`** — Added Step 7 (Create Reference Hub Pages) with table of deliverables and starters, plus a Project Completeness Checklist covering sitemap, JTBD, flows, story reference, STORY_MAP, scenarios, and design notes.
- **`ref/_index.md`** — Added routing entries for new ref docs: "Building a sitemap page", "Writing design notes", "JTBD, user flows, personas", "Reference hub pages".
- **`core/proto-components.css`** — Added shared CSS classes for reference hub patterns: `.wf-view-control`, `.wf-view-btn`, `.wf-sitemap-branch`, `.wf-sitemap-node`, `.wf-jtbd-persona-block`, `.wf-jtbd-item`, `.wf-char-card`, `.wf-org-card`, `.wf-flow-chain`, `.wf-flow-step`.

## Why

The eqPartners prototype achieved high fidelity because it included structural deliverables — sitemap, JTBD hub, user flows, story reference, personas — that frame the wireframes with information architecture and user context. When PP-Selfserve was built from proto-system, these deliverables were missing because:

1. `ref/new-project.md` had 6 steps — none mentioned sitemap, JTBD, flows, personas, or stories
2. No starters existed for these page types
3. No ref doc explained the "reference hub" pattern (view-control nav linking reference pages)
4. `ref/navigation.md` documented JOURNEYS and SCENARIOS but not how to build hub pages that visualize them

This update ensures future projects built from proto-system achieve eqPartners-level completeness by documenting patterns and providing starters for every structural deliverable.
