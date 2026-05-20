/**
 * Custom React Flow node types for the Nib service blueprint canvas.
 *
 * Lifted from eqPartners/prototype/journey.js with project-specific bits
 * (GitHub thread fetch, JTBD persona color map, drill-via-querystring) removed
 * and styling rebound to Nib tokens.
 *
 * This module is loaded as an ES module from the canvas. It expects React +
 * @xyflow/react globals to be available (the canvas imports them and exposes
 * createElement / Handle / Position via window.__nibBpReact).
 */

const STATUS_LABELS = {
  live: 'Live',
  draft: 'Draft',
  future: 'Proposed',
  blocked: 'Blocked',
};

export function makeNodeTypes(deps) {
  const { React, Handle, Position } = deps;
  const h = React.createElement;

  function LaneBandNode({ data }) {
    const tier = data.tier;
    const cls = 'nib-bp-lane' + (tier ? ` is-${tier}` : '');
    const tierChip =
      tier === 'current' ? 'Today' :
      tier === 'future'  ? 'Proposed' :
      tier === 'signal'  ? 'Sentiment' : null;
    return h(
      'div',
      { className: cls, style: { background: data.accent || 'transparent' } },
      h(
        'div',
        { className: 'nib-bp-lane-label' },
        data.editable
          ? h('input', {
              className: 'nib-bp-lane-input',
              defaultValue: data.label,
              onBlur: (e) => data.onRenameLane && data.onRenameLane(data.laneId, e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter') e.target.blur(); },
            })
          : data.label,
        tierChip ? h('span', { className: `nib-bp-lane-chip is-${tier}` }, tierChip) : null,
        data.editable
          ? h('button', {
              className: 'nib-bp-lane-rm',
              onClick: () => data.onRemoveLane && data.onRemoveLane(data.laneId),
              title: 'Remove lane',
            }, '×')
          : null
      )
    );
  }

  function CsatCellNode({ data }) {
    const sentiment = data.sentiment || {};
    return h(
      'div',
      { className: 'nib-bp-csat', title: data.note || '' },
      h('span', { className: 'nib-bp-csat-emoji' }, sentiment.emoji || '·'),
      h(
        'span',
        { className: 'nib-bp-csat-body' },
        h('span', { className: 'nib-bp-csat-label' }, sentiment.label || ''),
        h('span', { className: 'nib-bp-csat-note' }, data.note || '')
      )
    );
  }

  function PhaseHeaderNode({ data }) {
    return h(
      'div',
      { className: 'nib-bp-phase-header', style: { background: data.accent } },
      data.editable
        ? h('input', {
            className: 'nib-bp-phase-input',
            defaultValue: data.label,
            onBlur: (e) => data.onRenamePhase && data.onRenamePhase(data.phaseId, e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter') e.target.blur(); },
          })
        : h('div', null, data.label),
      data.editable
        ? h('button', {
            className: 'nib-bp-phase-rm',
            onClick: () => data.onRemovePhase && data.onRemovePhase(data.phaseId),
            title: 'Remove phase',
          }, '×')
        : null
    );
  }

  function PhaseColumnNode({ data }) {
    return h(
      'div',
      { className: 'nib-bp-phase-col' },
      h('span', { className: 'nib-bp-phase-watermark' }, data.label)
    );
  }

  function JourneyCardNode({ data, selected }) {
    const cls = [
      'nib-bp-card',
      `is-${data.status || 'draft'}`,
      data.dimmed ? 'is-dimmed' : '',
      selected ? 'is-selected' : '',
      data.childBlueprintId ? 'is-drillable' : '',
    ].filter(Boolean).join(' ');

    return h(
      React.Fragment,
      null,
      h(Handle, { type: 'target', position: Position.Left, style: { opacity: 0, pointerEvents: 'none' } }),
      h(
        'div',
        {
          className: cls,
          title: data.childBlueprintId ? `${data.label} — drill into ${data.childBlueprintId}` : data.label,
          onDoubleClick: () => data.onEditNode && data.onEditNode(data.id),
          onClick: (e) => {
            if (data.childBlueprintId && (e.metaKey || e.ctrlKey)) {
              data.onDrillIn && data.onDrillIn(data.childBlueprintId);
              e.stopPropagation();
            }
          },
        },
        h(
          'div',
          { className: 'nib-bp-card-head' },
          data.persona
            ? h('span', { className: 'nib-bp-card-persona' }, data.persona)
            : h('span', { className: 'nib-bp-card-persona is-system' }, 'System'),
          (data.gapNotes && data.gapNotes.length)
            ? h('span', { className: 'nib-bp-card-badge is-gap', title: `${data.gapNotes.length} gap note${data.gapNotes.length > 1 ? 's' : ''}` }, '⚠')
            : null,
          data.childBlueprintId
            ? h('button', {
                className: 'nib-bp-card-drill',
                title: `Drill into ${data.childBlueprintId}`,
                onClick: (e) => {
                  e.stopPropagation();
                  data.onDrillIn && data.onDrillIn(data.childBlueprintId);
                },
              }, '↳ Open')
            : null
        ),
        data.editing
          ? h('input', {
              className: 'nib-bp-card-edit',
              autoFocus: true,
              defaultValue: data.label,
              onBlur: (e) => data.onCommitEdit && data.onCommitEdit(data.id, e.target.value),
              onKeyDown: (e) => {
                if (e.key === 'Enter') e.target.blur();
                if (e.key === 'Escape') { e.target.value = data.label; e.target.blur(); }
              },
            })
          : h('div', { className: 'nib-bp-card-label' }, data.label),
        data.summary ? h('div', { className: 'nib-bp-card-summary' }, data.summary) : null,
        h(
          'div',
          { className: 'nib-bp-card-foot' },
          h('span', { className: `nib-bp-pill is-${data.status || 'draft'}` }, STATUS_LABELS[data.status] || data.status || 'Draft')
        )
      ),
      h(Handle, { type: 'source', position: Position.Right, style: { opacity: 0, pointerEvents: 'none' } })
    );
  }

  return {
    lane: LaneBandNode,
    phase: PhaseHeaderNode,
    phaseColumn: PhaseColumnNode,
    journeyNode: JourneyCardNode,
    csatCell: CsatCellNode,
  };
}
