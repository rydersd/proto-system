# Surface CSS Audit Methodology

> Universal process for auditing any nib surface CSS file against its target design system.

---

## Overview

A surface CSS file (`surfaces/*.css`) maps nib's wireframe framework to a specific platform's design system (Salesforce SLDS, Slack Block Kit, etc.). This audit ensures the surface CSS:

1. Only contains selectors that map to real OOB components or generic wireframe patterns
2. Uses accurate token values for polished fidelity mode
3. Follows consistent naming conventions
4. Contains no dead code

---

## Step 1: Selector Audit

### Extract all class selectors

Parse the CSS file and extract every class selector. Group them by section comment headers (lines matching `/* ── ... ──`).

### Classify each selector

For each selector, determine its classification:

| Classification | Criteria | Action |
|---------------|----------|--------|
| **OOB** | Exists as a standard component in the target design system documentation. The nib selector directly represents this component. | Keep |
| **Generic** | A reusable wireframe pattern not tied to any specific project. Could appear in any project using this surface. Examples: progress bar, alert, table, badge. | Keep |
| **Custom** | Contains project-specific domain terms (e.g., "meddpicc", "partner", "evidence"). Represents data or concepts from a particular project, not the design system. | Remove or rename to generic |

### Classification decision tree

1. Does the selector name contain a domain-specific noun (e.g., "partner", "evidence", "deal-room")? → **Custom**
2. Does the design system documentation list a component matching this selector? → **OOB**
3. Is this a common UI pattern that any project might need (progress bar, alert, banner)? → **Generic**
4. Is this a combination of OOB components that creates a project-specific assembly? → **Custom** (even if individual parts are OOB)

---

## Step 2: Token Audit

### Check polished-mode token overrides

Surface CSS files contain a polished fidelity section that overrides `--wf-*` tokens with real design system hex values:

```css
html[data-wf-fidelity="polished"][data-wf-surface="sfdc"] {
  --wf-accent: #0070D2;  /* Should match real DS value */
}
```

For each override:
1. Look up the expected hex value in the surface-specific knowledge file
2. Compare against the value in the CSS
3. Flag any mismatches with the correct value

### Check component-level hex values

In polished-mode component overrides, hardcoded hex values should match real design system tokens:

```css
html.wireframe[data-wf-fidelity="polished"] .sfdc-global-header {
  background: #061C3F;  /* Should match HEADER_BG token */
}
```

---

## Step 3: Naming Audit

All selectors in a surface file must follow the naming convention:

```
.{surface}-{component}[-{modifier}]
```

Where:
- `{surface}` is the surface prefix (`sfdc-`, `slack-`, `ds-`)
- `{component}` is the component name in kebab-case
- `{modifier}` is an optional state or variant

### Common violations

- Missing surface prefix (e.g., `.partner-card` instead of `.sfdc-partner-card`)
- Using project-domain terms as component names
- Inconsistent casing or separator style

---

## Step 4: Dead Code Check

### Cross-reference selectors against HTML usage

Search for each selector in:
1. `examples/` — reference implementations
2. `starters/` — starter templates

A selector with zero references in any HTML file is potentially dead code.

### Caveats

- Some selectors may be generated dynamically by `proto-gen.js` or `proto-nav.js` — check JS files too
- Polished-mode overrides reference the same selectors as the base styles — don't flag these as dead
- Variant selectors (`.complete`, `.current`, `.active`) modify base selectors — check the base, not the variant

---

## Step 5: Specificity Audit

### Polished mode specificity

Polished-mode overrides must use sufficient specificity to override blueprint paper adaptations:

- Paper adaptations use: `html.wireframe .sfdc-*`
- Polished overrides must use: `html.wireframe[data-wf-fidelity="polished"] .sfdc-*`

If polished overrides use lower specificity than paper adaptations, the paper styles will persist in polished mode.

### Token-level overrides

Token overrides on the root element should use attribute selectors:
```css
html[data-wf-fidelity="polished"][data-wf-surface="sfdc"] { ... }
```

---

## Output Format

Present findings as a structured table with classifications, token accuracy, dead selectors, and actionable recommendations. See the audit skill prompt for the exact table format.
