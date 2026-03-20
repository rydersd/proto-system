---
name: audit-surface
description: Audit a surface CSS file against its real design system for OOB accuracy
user_invocable: true
---

# Surface CSS Audit

You are auditing a nib surface CSS file against its target design system. The goal is to ensure every selector maps to a real OOB component, tokens are accurate, and no project-specific code has leaked into shared surface CSS.

## Arguments

The user provides a surface name as argument: `$ARGUMENTS`

If no argument is provided, ask which surface to audit (salesforce, slack, or internal).

## Steps

1. **Read the audit methodology**: Read `ref/audit/_method.md` for the universal process.

2. **Read surface-specific knowledge**:
   - If surface is `salesforce`: Read `ref/audit/slds.md` and `ref/surface-salesforce-rules.md`
   - If surface is `slack`: Read `ref/audit/slack.md`
   - For any surface: Also read `ref/audit/checklist.md`

3. **Read the target CSS file**: Read `surfaces/{surface}.css`

4. **Extract all selectors** from the CSS file, grouped by section comment headers (lines starting with `/* ── `).

5. **Classify each selector group** as one of:
   - **OOB** — maps to a real design system component documented in the knowledge file
   - **Generic** — reusable wireframe pattern not tied to any specific project's data model (e.g., progress bar, alert, table)
   - **Custom** — project-specific domain concepts baked into the selector name, or components not in the design system

6. **Token audit**: For the polished fidelity section, cross-check every hardcoded hex value against the real design system token values in the knowledge file. Flag any mismatches.

7. **Dead code check**: Search `examples/` and `starters/` for usage of each selector. Flag any selectors with zero HTML references.

8. **Naming audit**: Verify all selectors follow `{surface}-{component}` naming convention.

9. **Output a findings table** in this format:

```
## Surface Audit: {surface}.css

### Selector Classification

| Section | Selectors | Classification | Notes |
|---------|-----------|---------------|-------|
| Record Header | .sfdc-record-header, ... | OOB | Maps to SLDS Record Header |
| ... | ... | ... | ... |

### Token Accuracy (Polished Mode)

| Token Override | Current Hex | Expected Hex | Status |
|---------------|-------------|-------------|--------|
| --wf-accent | #0070D2 | #0070D2 | ✓ |
| ... | ... | ... | ... |

### Dead Selectors (No HTML Usage)

| Selector | Recommendation |
|----------|---------------|
| ... | Remove / Keep for future use |

### Recommendations

1. ...
2. ...
```
