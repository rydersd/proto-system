/**
 * Service blueprint canvas — React Flow wrapper with full authoring,
 * Overview/Detail toggle, and breadcrumb drill-down through nested
 * blueprints.
 *
 * Usage (from a module script in the page):
 *
 *   import { mountCanvas } from '../../core/blueprint/canvas.js';
 *   mountCanvas(document.getElementById('canvas'), {
 *     blueprints: window.NIB_BLUEPRINTS,        // { flowId: BlueprintFlow }
 *     index: window.NIB_BLUEPRINT_INDEX,        // { ids, tree }
 *     rootFlowId: 'program',                    // initial flow
 *     adapter: localStorageAdapter('my-proj'),  // optional persistence
 *   });
 *
 * Loads React + React Flow from esm.sh — no bundler required.
 */

import * as React from 'https://esm.sh/react@18.3.1';
import * as ReactDOM from 'https://esm.sh/react-dom@18.3.1/client';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge as rfAddEdge,
} from 'https://esm.sh/@xyflow/react@12.3.5?deps=react@18.3.1,react-dom@18.3.1';

import { makeNodeTypes } from './node-types.js';
import { computeLayout, LAYOUT_CONSTANTS } from './layout.js';
import * as ops from './operations.js';
import { createHistory } from './history.js';
import { exportJson, exportYaml, exportXlsx, exportXlsxBundle, downloadBlob } from './exporters.js';
import { localStorageAdapter, debounced, noopAdapter } from './sync-adapter.js';

(function injectReactFlowCss() {
  if (document.querySelector('link[data-rf-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://esm.sh/@xyflow/react@12.3.5/dist/style.css';
  link.setAttribute('data-rf-css', '1');
  document.head.appendChild(link);
})();

const { useState, useEffect, useMemo, useCallback, useRef, createElement: h, Fragment } = React;
const nodeTypes = makeNodeTypes({ React, Handle, Position });

// ── Toolbar ────────────────────────────────────────────────────────────────
function Toolbar({
  flow, breadcrumb, viewMode,
  canUndo, canRedo,
  onUndo, onRedo, onSetView, onAddLane, onAddPhase,
  onExportJson, onExportYaml, onExportXlsx, onExportBundle,
  onDrillUp, onDrillRoot,
}) {
  return h(
    'div',
    { className: 'nib-bp-toolbar' },
    h('div', { className: 'nib-bp-bc' },
      h('button', { className: 'nib-bp-bc-btn', onClick: onDrillRoot, title: 'Back to root' }, '⌂'),
      breadcrumb.map((b, i) => h(
        Fragment, { key: b.flowId },
        h('span', { className: 'nib-bp-bc-sep' }, '/'),
        i === breadcrumb.length - 1
          ? h('span', { className: 'nib-bp-bc-current' }, b.label)
          : h('button', { className: 'nib-bp-bc-btn', onClick: () => onDrillUp(i) }, b.label)
      ))
    ),
    h('div', { className: 'nib-bp-toolbar-mid' },
      h('div', { className: 'nib-bp-segctl', role: 'tablist' },
        ['overview', 'detail'].map((m) => h('button', {
          key: m,
          className: 'nib-bp-segbtn' + (viewMode === m ? ' is-active' : ''),
          onClick: () => onSetView(m),
        }, m === 'overview' ? 'Overview' : 'Detail'))
      ),
    ),
    h('div', { className: 'nib-bp-toolbar-actions' },
      h('button', { className: 'nib-bp-btn', onClick: onUndo, disabled: !canUndo, title: 'Undo (⌘Z)' }, '↶'),
      h('button', { className: 'nib-bp-btn', onClick: onRedo, disabled: !canRedo, title: 'Redo (⇧⌘Z)' }, '↷'),
      h('button', { className: 'nib-bp-btn', onClick: onAddLane, title: 'Add lane' }, '+ Lane'),
      h('button', { className: 'nib-bp-btn', onClick: onAddPhase, title: 'Add phase' }, '+ Phase'),
      h('div', { className: 'nib-bp-menu' },
        h('button', { className: 'nib-bp-btn' }, 'Export ▾'),
        h('div', { className: 'nib-bp-menu-list' },
          h('button', { onClick: onExportJson }, 'JSON (this flow)'),
          h('button', { onClick: onExportYaml }, 'YAML (this flow)'),
          h('button', { onClick: onExportXlsx }, 'XLSX (this flow)'),
          h('button', { onClick: onExportBundle }, 'XLSX (all flows — round-trip)')
        )
      )
    )
  );
}

// ── Overview cards (leadership view) ───────────────────────────────────────
function OverviewSummary({ flow, allFlows, onDrillIn }) {
  const meta = flow.meta || {};
  const children = Object.values(allFlows || {}).filter((f) => f.meta && f.meta.parent === meta.flowId);
  return h(
    'div',
    { className: 'nib-bp-overview' },
    h('div', { className: 'nib-bp-overview-card' },
      h('div', { className: 'nib-bp-overview-title' }, meta.title || meta.flowId),
      meta.summary
        ? h('p', { className: 'nib-bp-overview-summary' }, meta.summary)
        : null,
      meta.whatChanges && meta.whatChanges.length
        ? h('ul', { className: 'nib-bp-overview-changes' },
            meta.whatChanges.map((c, i) => h('li', { key: i }, c)))
        : null,
      h('div', { className: 'nib-bp-overview-foot' },
        meta.ownerPersonaId ? h('span', null, 'Owner: ', h('strong', null, meta.ownerPersonaId)) : null,
        meta.status ? h('span', { className: `nib-bp-pill is-${meta.status}` }, meta.status) : null
      )
    ),
    children.length
      ? h('div', { className: 'nib-bp-overview-children' },
          h('div', { className: 'nib-bp-overview-children-h' }, 'Drill into:'),
          children.map((c) => h('button', {
            key: c.meta.flowId,
            className: 'nib-bp-overview-child',
            onClick: () => onDrillIn(c.meta.flowId),
          },
            h('div', { className: 'nib-bp-overview-child-t' }, c.meta.title || c.meta.flowId),
            c.meta.summary ? h('div', { className: 'nib-bp-overview-child-s' }, c.meta.summary) : null
          )))
      : null
  );
}

// ── Main canvas component ──────────────────────────────────────────────────
function BlueprintCanvas({ blueprints, index, rootFlowId, adapter }) {
  const [drillStack, setDrillStack] = useState([rootFlowId]);
  const currentFlowId = drillStack[drillStack.length - 1];
  const [viewMode, setViewMode] = useState('overview');
  const [editingNodeId, setEditingNodeId] = useState(null);
  const historyRefs = useRef({}); // flowId → history

  // Initial flow snapshot. If adapter has a saved version, use it.
  const [flow, setFlow] = useState(blueprints[currentFlowId]);

  // Re-bind history + flow on drill or first-mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = adapter ? await adapter.load(currentFlowId) : null;
      if (cancelled) return;
      const initial = stored || blueprints[currentFlowId];
      if (!historyRefs.current[currentFlowId]) {
        historyRefs.current[currentFlowId] = createHistory(initial);
      } else {
        historyRefs.current[currentFlowId].replace(initial);
      }
      setFlow(initial);
    })();
    return () => { cancelled = true; };
  }, [currentFlowId]);

  const history = historyRefs.current[currentFlowId];

  const apply = useCallback((nextFlow) => {
    history.set(nextFlow);
    setFlow(nextFlow);
    if (adapter) adapter.save(currentFlowId, nextFlow);
  }, [currentFlowId, adapter, history]);

  const undo = useCallback(() => { setFlow(history.undo()); }, [history]);
  const redo = useCallback(() => { setFlow(history.redo()); }, [history]);

  // Drill helpers
  const drillIn = useCallback((childId) => {
    if (!blueprints[childId]) return;
    setDrillStack((s) => [...s, childId]);
  }, [blueprints]);
  const drillUp = useCallback((targetIdx) => {
    setDrillStack((s) => s.slice(0, targetIdx + 1));
  }, []);
  const drillRoot = useCallback(() => setDrillStack([rootFlowId]), [rootFlowId]);

  const breadcrumb = useMemo(() =>
    drillStack.map((id) => ({ flowId: id, label: (blueprints[id] && blueprints[id].meta.title) || id }))
  , [drillStack, blueprints]);

  // Layout
  const { rfNodes, rfEdges, canvasSize } = useMemo(() => {
    if (!flow) return { rfNodes: [], rfEdges: [], canvasSize: { width: 800, height: 600 } };
    return computeLayout(flow, viewMode);
  }, [flow, viewMode]);

  // Decorate node data with editing handlers + drill-in callbacks.
  const decoratedNodes = useMemo(() => {
    if (!flow) return [];
    return rfNodes.map((n) => {
      if (n.type === 'lane') {
        return { ...n, data: {
          ...n.data,
          editable: true,
          onRenameLane: (laneId, label) => apply(ops.renameLane(flow, laneId, label)),
          onRemoveLane: (laneId) => {
            if (confirm(`Remove lane "${laneId}" and all its nodes?`)) apply(ops.removeLane(flow, laneId));
          },
        } };
      }
      if (n.type === 'phase') {
        return { ...n, data: {
          ...n.data,
          editable: true,
          onRenamePhase: (phaseId, label) => apply(ops.renamePhase(flow, phaseId, label)),
          onRemovePhase: (phaseId) => {
            if (confirm(`Remove phase "${phaseId}" and all its nodes?`)) apply(ops.removePhase(flow, phaseId));
          },
        } };
      }
      if (n.type === 'journeyNode') {
        return { ...n, data: {
          ...n.data,
          editing: editingNodeId === n.data.id,
          onEditNode: (id) => setEditingNodeId(id),
          onCommitEdit: (id, label) => {
            setEditingNodeId(null);
            if (label && label.trim()) apply(ops.renameNode(flow, id, label.trim()));
          },
          onDrillIn: (childId) => drillIn(childId),
        } };
      }
      return n;
    });
  }, [rfNodes, flow, editingNodeId, apply, drillIn]);

  // Handlers
  const onNodeDragStop = useCallback((_evt, dragged) => {
    if (dragged.type !== 'journeyNode' || !flow) return;
    // Resolve new lane + phase from the drop position.
    const targetLane = laneAtY(flow, dragged.position.y);
    const targetPhase = phaseAtX(flow, dragged.position.x);
    if (!targetLane || !targetPhase) return;
    const node = flow.nodes.find((n) => n.id === dragged.id);
    if (!node || (node.lane === targetLane && node.phase === targetPhase)) return;
    apply(ops.moveNode(flow, dragged.id, targetLane, targetPhase));
  }, [flow, apply]);

  const onConnect = useCallback((conn) => {
    if (!conn.source || !conn.target) return;
    apply(ops.addEdge(flow, conn.source, conn.target));
  }, [flow, apply]);

  const onEdgesDelete = useCallback((deleted) => {
    let next = flow;
    for (const e of deleted) next = ops.removeEdge(next, e.source, e.target);
    if (next !== flow) apply(next);
  }, [flow, apply]);

  const onNodesDelete = useCallback((deleted) => {
    let next = flow;
    for (const n of deleted) {
      if (n.type === 'journeyNode') next = ops.removeNode(next, n.id);
    }
    if (next !== flow) apply(next);
  }, [flow, apply]);

  // Toolbar callbacks
  const addLane = useCallback(() => {
    const label = prompt('Lane label:', 'New lane');
    if (!label) return;
    const tier = prompt('Tier (current / future / signal / —):', '—');
    const result = ops.addLane(flow, { label, tier: tier && tier !== '—' ? tier : null });
    apply(result.flow);
  }, [flow, apply]);

  const addPhase = useCallback(() => {
    const label = prompt('Phase label:', 'New phase');
    if (!label) return;
    const result = ops.addPhase(flow, { label });
    apply(result.flow);
  }, [flow, apply]);

  const onExportJson = useCallback(() => {
    downloadBlob(exportJson(flow), `${flow.meta.flowId}.json`, 'application/json');
  }, [flow]);
  const onExportYaml = useCallback(async () => {
    const text = await exportYaml(flow);
    downloadBlob(text, `${flow.meta.flowId}.yaml`, 'text/yaml');
  }, [flow]);
  const onExportXlsx = useCallback(async () => {
    const buf = await exportXlsx(flow);
    downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${flow.meta.flowId}.xlsx`);
  }, [flow]);
  const onExportBundle = useCallback(async () => {
    // Pull the latest edited version of every flow from history if present.
    const all = {};
    for (const id of Object.keys(blueprints)) {
      const hist = historyRefs.current[id];
      all[id] = hist ? hist.get() : blueprints[id];
    }
    const buf = await exportXlsxBundle(all);
    downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      'blueprints.xlsx');
  }, [blueprints]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (meta && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  if (!flow) return h('div', { className: 'nib-bp-loading' }, 'Loading…');

  const allFlows = blueprints;

  return h(
    'div',
    { className: 'nib-bp-shell' },
    h(Toolbar, {
      flow, breadcrumb, viewMode,
      canUndo: history && history.canUndo(), canRedo: history && history.canRedo(),
      onUndo: undo, onRedo: redo, onSetView: setViewMode,
      onAddLane: addLane, onAddPhase: addPhase,
      onExportJson, onExportYaml, onExportXlsx, onExportBundle,
      onDrillUp: drillUp, onDrillRoot: drillRoot,
    }),
    viewMode === 'overview'
      ? h(OverviewSummary, { flow, allFlows, onDrillIn: drillIn })
      : null,
    h('div', { className: 'nib-bp-canvas-wrap' },
      h(ReactFlow, {
        nodes: decoratedNodes,
        edges: rfEdges,
        nodeTypes,
        onNodeDragStop,
        onConnect,
        onEdgesDelete,
        onNodesDelete,
        fitView: true,
        defaultEdgeOptions: { type: 'default' },
        nodesDraggable: true,
        nodesConnectable: true,
        elementsSelectable: true,
        proOptions: { hideAttribution: true },
      },
        h(Background, { color: '#cdd6e3', gap: 18, size: 1 }),
        h(MiniMap, { pannable: true, zoomable: true }),
        h(Controls, null)
      )
    )
  );
}

// ── Position → lane/phase resolvers ────────────────────────────────────────
function laneAtY(flow, y) {
  let cursorY = LAYOUT_CONSTANTS.PHASE_H;
  for (const lane of flow.lanes) {
    const h = lane.tier === 'signal'
      ? LAYOUT_CONSTANTS.CSAT_H + LAYOUT_CONSTANTS.LANE_PAD_Y * 2
      : LAYOUT_CONSTANTS.CARD_H + LAYOUT_CONSTANTS.LANE_PAD_Y * 2;
    if (y >= cursorY - LAYOUT_CONSTANTS.LANE_PAD_Y && y < cursorY + h) return lane.id;
    cursorY += h;
  }
  return flow.lanes[flow.lanes.length - 1]?.id;
}

function phaseAtX(flow, x) {
  const adjusted = x - LAYOUT_CONSTANTS.LANE_LABEL_W;
  if (adjusted < 0) return flow.phases[0]?.id;
  const idx = Math.min(flow.phases.length - 1, Math.floor(adjusted / LAYOUT_CONSTANTS.PHASE_W));
  return flow.phases[idx]?.id;
}

// ── Public mount API ───────────────────────────────────────────────────────
export function mountCanvas(container, options) {
  const {
    blueprints,
    index,
    rootFlowId,
    adapter = debounced(localStorageAdapter('nib-bp')),
  } = options;
  if (!blueprints || !blueprints[rootFlowId]) {
    container.innerHTML = `<p style="padding:24px;color:#a44;">No blueprint named "${rootFlowId}" — check NIB_BLUEPRINTS / rootFlowId.</p>`;
    return;
  }
  const root = ReactDOM.createRoot(container);
  root.render(h(BlueprintCanvas, { blueprints, index, rootFlowId, adapter }));
}

// Re-export for convenience
export { localStorageAdapter, debounced, noopAdapter, ops };
