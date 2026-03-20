# Surface CSS Audit Checklist

> Quick-reference checklist for auditing any nib surface CSS file. Use alongside the surface-specific knowledge file.

---

## Selector Audit

- [ ] Every selector maps to a real DS component (OOB) or a generic wireframe pattern (Generic)
- [ ] No project-specific domain terms in selector names (e.g., "meddpicc", "partner", "evidence", "deal-room")
- [ ] No project-specific data model concepts baked into CSS (e.g., partner org, evidence log)
- [ ] Selectors that duplicate existing OOB components are removed or merged
- [ ] All selectors follow `{surface}-{component}[-{modifier}]` naming convention

## Token Audit

- [ ] Polished-mode `--wf-*` token overrides match real DS hex values
- [ ] Component-level polished overrides use correct DS colors (not wireframe defaults)
- [ ] No wireframe-muted colors leaking into polished mode
- [ ] Token override selector uses `html[data-wf-fidelity="polished"][data-wf-surface="{surface}"]`

## Specificity Audit

- [ ] Polished overrides use `html.wireframe[data-wf-fidelity="polished"]` (beats paper adaptations)
- [ ] Paper adaptations use `html.wireframe .{surface}-*` (beats base styles)
- [ ] Base styles use `.{surface}-*` (no fidelity qualifier)
- [ ] No `!important` used (except where truly necessary for cross-concern overrides)

## Dead Code Audit

- [ ] Every selector is referenced in at least one HTML file in `examples/` or `starters/`
- [ ] Or is generated dynamically by `proto-gen.js` or `proto-nav.js`
- [ ] Polished-mode overrides reference selectors that exist in the base section
- [ ] No orphaned polished overrides for removed base selectors

## Naming Audit

- [ ] All selectors use the correct surface prefix (`sfdc-`, `slack-`, `ds-`)
- [ ] Component names are generic, not project-specific
- [ ] Modifier classes follow consistent patterns (`.complete`, `.current`, `.active`, `.open`)
- [ ] Color variant classes use nib semantic names (`.green`, `.amber`, `.red`, `.purple`, `.accent`)

## Structure Audit

- [ ] CSS is organized with clear section comment headers (`/* ── Section Name ──── */`)
- [ ] Related selectors are grouped together under their section header
- [ ] Polished overrides are in a clearly marked section at the bottom
- [ ] Paper/blueprint adaptations are in a clearly marked section
- [ ] No inline styles that should be in the CSS file
