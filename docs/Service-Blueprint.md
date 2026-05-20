**Tags:** `authoring` · `blueprint` · `react-flow`

# Service Blueprint Canvas

An editable React Flow swimlane canvas for service blueprints. Pair it with [[Spreadsheet-Authoring]] — the canvas reads `BlueprintFlow` objects produced by `nib-ingest` and writes back to the same workbook on demand.

> **Agent reference:** [`ref/service-blueprint.md`](../ref/service-blueprint.md) for the API, schema, and layout constants.

## Two views, one canvas

- **Overview** — the leadership bird's-eye. Each lane condenses to a single row; a summary card above shows `meta:summary` plus a 3-bullet "what changes" list and the owner persona. Sub-blueprints surface as drill-in chips.
- **Detail** — the full granular swimlane. All cards stacked per (phase, lane) cell, sentiment cells in signal lanes, edges visible.

A toolbar segmented control toggles between the two.

## Nested blueprints

A node in any flow can carry `childBlueprintId`. In the canvas it gets a small **↳ Open** chip — click it to push the child onto the breadcrumb stack and re-render the canvas with that child's data. The breadcrumb walks back up.

The hierarchy itself is built from `meta:parent` on each child flow tab; the ingest emitter writes that into `data/blueprints/_index.js`.

## What you can edit in v1

- Drag a card between lanes / phases (drop position resolves to the new cell)
- Double-click a card to rename inline
- Click a lane or phase header to rename inline
- Add a lane / phase from the toolbar; remove via the `×` button on the header
- Drag from a card's right edge to another card's left edge to add an edge
- Select an edge or card → Delete to remove
- ⌘Z / ⇧⌘Z for undo/redo

## Deferred to v1.1

- Drag-reorder of lanes (operations.js has `reorderLane`, just no UI yet)
- Drag-reorder of phases
- Marquee multi-select + bulk move/delete

## Round-trip with the workbook

`Export → XLSX (all flows)` writes a workbook covering every blueprint currently loaded — including any unsaved edits in other flows held in the history stack. Re-running `nib-ingest` against that workbook produces the same canonical project shape, so the canvas → spreadsheet → canvas loop is the contract.

## Persistence

By default the canvas debounces and saves to localStorage under a project namespace. Drop in a custom `SyncAdapter` (`{ load, save }`) to push edits to a backend instead.

## Related

- [[Spreadsheet-Authoring]] — Where the data comes from
- [[Page-Blueprint]] — The other "blueprint" — declarative page rendering, distinct from this swimlane canvas
- [[Templates]] — Project scaffolds that ship with the canvas pre-wired
