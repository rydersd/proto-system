# Service Blueprint Canvas

> ⚠️ **Deprecated.** Edit [`docs/Service-Blueprint.md`](../docs/Service-Blueprint.md) instead. This file will be removed in a future release.

> Read when adding an editable service blueprint canvas to a Nib project. Pairs with `spreadsheet-authoring.md` — the canvas reads what the workbook produces.

## What it is

A React Flow swimlane canvas that:
- Renders a `BlueprintFlow` (one of the flow tabs in a Nib workbook).
- Toggles between **Overview** (leadership view: lane summary + per-blueprint card) and **Detail** (full granular swimlanes).
- Supports breadcrumb drill-down through nested blueprints (`childBlueprintId` on a node + `meta:parent` on a child flow).
- Allows in-canvas editing: drag-to-relane, inline label edit, add/remove lanes and phases, add/remove edges.
- Round-trip exports to JSON, YAML, and `.xlsx` — the xlsx is re-ingestable, byte-stable.

No bundler. React + React Flow load from `esm.sh`.

## Mounting

```html
<link rel="stylesheet" href="../../core/blueprint/canvas.css">
<div id="canvas" style="height: 80vh"></div>

<script src="data/blueprints/_index.js"></script>
<script src="data/blueprints/program.js"></script>
<!-- one <script> per child flow file -->

<script type="module">
  import { mountCanvas, debounced, localStorageAdapter } from '../../core/blueprint/canvas.js';
  mountCanvas(document.getElementById('canvas'), {
    blueprints: window.NIB_BLUEPRINTS,
    index: window.NIB_BLUEPRINT_INDEX,
    rootFlowId: 'program',
    adapter: debounced(localStorageAdapter('my-project')),
  });
</script>
```

## API

```ts
mountCanvas(container: HTMLElement, options: {
  blueprints: { [flowId: string]: BlueprintFlow };
  index: { ids: string[]; tree: TreeNode[] };
  rootFlowId: string;
  adapter?: SyncAdapter;
});
```

`SyncAdapter` is `{ load(flowId), save(flowId, flow), clear?(flowId) }` returning Promises. Built-ins:

- `localStorageAdapter(namespace)` — namespaced localStorage; survives refresh.
- `debounced(adapter, waitMs)` — wraps any adapter; debounces saves.
- `noopAdapter` — never persists; useful for read-only demos.

A custom adapter is the integration point for a Worker / Firestore / git-backed persistence.

## BlueprintFlow shape

Defined in `core/schema/workbook.schema.json`. Same shape the spreadsheet ingest produces:

```js
{
  meta: { flowId, title, parent?, summary?, whatChanges?, ownerPersonaId?, status? },
  phases: [{ id, label }],
  lanes:  [{ id, label, tier?, actorGroup?, accent?, cells? }],
  nodes:  [{ id, phase, lane, label, summary?, status?, childBlueprintId?, ... }],
  edges:  [{ from, to, style?, label? }],
}
```

`tier: 'signal'` lanes carry CSAT cells (sentiment) instead of nodes — see `cells[]` on the lane.

## Editing model

Every edit goes through `core/blueprint/operations.js`. Each op is a pure `(flow, args) → flow'` transformation; the canvas pushes the result onto the history stack and calls `adapter.save`.

Available ops: `moveNode`, `renameNode`, `setNodeField`, `addNode`, `removeNode`, `addEdge`, `removeEdge`, `addLane`, `removeLane`, `renameLane`, `reorderLane`, `addPhase`, `removePhase`, `renamePhase`, `reorderPhase`.

Reorder ops exist in operations.js but the v1 canvas UI doesn't expose drag-reorder — call them via custom toolbar buttons if needed.

## Round-trip

- `Export → JSON (this flow)` — pretty-printed flow JSON.
- `Export → YAML (this flow)` — `js-yaml` dump (loaded from esm.sh on demand).
- `Export → XLSX (this flow)` — single-tab workbook for one flow.
- `Export → XLSX (all flows)` — multi-tab workbook covering every flow in `blueprints`. Use this to push edits back into the source-of-truth workbook; it round-trips through `nib-ingest`.

The xlsx export reuses the cell format documented in [`spreadsheet-authoring.md`](spreadsheet-authoring.md): `meta:title` / `meta:phases` / `meta:lanes` rows + extended meta rows + a header row + data rows.

## Layout constants

Defined in `core/blueprint/layout.js` (exported as `LAYOUT_CONSTANTS`):

| Const | Value | Purpose |
|---|---|---|
| `PHASE_W` | 220 | Phase column width |
| `PHASE_H` | 44 | Phase header height |
| `LANE_LABEL_W` | 160 | Left-side lane label gutter |
| `CARD_W` / `CARD_H` | 200 / 96 | Journey card dimensions |
| `CSAT_H` | 64 | Sentiment cell height |
| `LANE_PAD_Y` / `ROW_GAP` | 12 / 8 | Lane internal padding / card stack gap |

Override these by forking `layout.js` — they're not currently parameterized via `mountCanvas` options.

## Worked example

`examples/service-blueprint/` ships a 3-flow nested blueprint (program → deal-reg + onboarding) plus the index.html that mounts the canvas. Open it via a static server (file:// breaks ES module imports).
