# SLDS Audit Knowledge — Salesforce Lightning Design System 2

> OOB component inventory, token map, and classification guidance for auditing `surfaces/salesforce.css`.

---

## OOB Component Inventory

These are the real SLDS 2 components. Nib selectors that map to these are classified as **OOB**.

### Page Structure

| SLDS Component | Nib Selector(s) | Notes |
|---------------|-----------------|-------|
| Record Home | `.sfdc-record-page` | Root container for record pages |
| Record Header | `.sfdc-record-header`, `.sfdc-record-header-top`, `.sfdc-record-icon`, `.sfdc-record-info`, `.sfdc-record-type`, `.sfdc-record-name`, `.sfdc-record-actions` | Standard record page header |
| Highlights Panel | `.sfdc-highlights-bar`, `.sfdc-highlight`, `.sfdc-highlight-label`, `.sfdc-highlight-value` | Key field summary |
| Page Layout (3-col) | `.sfdc-record-layout`, `.sfdc-col-related`, `.sfdc-col-record`, `.sfdc-col-activity` | Standard record page grid |

### Navigation & Progress

| SLDS Component | Nib Selector(s) | Notes |
|---------------|-----------------|-------|
| Path | `.sfdc-path-bar`, `.sfdc-path-step`, `.sfdc-path-complete-btn`, `.sfdc-path-chevron`, `.sfdc-path-detail`, `.sfdc-path-fields`, `.sfdc-path-guidance` | Stage progression bar with expandable coaching |
| Tabs (Scoped) | `.sfdc-tabs`, `.sfdc-tab` | Tab navigation |
| Global Header | `.sfdc-global-header`, `.sfdc-global-header-inner`, `.sfdc-global-tab`, `.sfdc-app-launcher`, `.sfdc-app-name`, `.sfdc-global-icon`, `.sfdc-global-avatar` | Lightning Experience header bar |

### Cards & Containers

| SLDS Component | Nib Selector(s) | Notes |
|---------------|-----------------|-------|
| Card | `.sfdc-card`, `.sfdc-card-header`, `.sfdc-card-body`, `.sfdc-card-header-action` | Standard card container |
| Card (accent variants) | `.sfdc-card-accent`, `.sfdc-card-green`, `.sfdc-card-amber`, `.sfdc-card-red`, `.sfdc-card-purple` | Left-border accent variants |

### Data Display

| SLDS Component | Nib Selector(s) | Notes |
|---------------|-----------------|-------|
| Data Table | `.sfdc-table` | Standard data table |
| Detail Grid | `.sfdc-detail-grid`, `.sfdc-detail-field`, `.sfdc-field-value`, `.sfdc-detail-label`, `.sfdc-detail-value` | Field/value pair layout (form-like display) |
| Related List | `.sfdc-related-item`, `.sfdc-related-icon`, `.sfdc-related-info`, `.sfdc-related-title`, `.sfdc-related-sub`, `.sfdc-related-meta`, `.sfdc-related-action` | Child object list items |

### Activity & Feed

| SLDS Component | Nib Selector(s) | Notes |
|---------------|-----------------|-------|
| Activity Timeline | `.sfdc-feed-item`, `.sfdc-feed-item-link`, `.sfdc-feed-avatar`, `.sfdc-feed-body`, `.sfdc-feed-text`, `.sfdc-feed-time` | Activity feed entries |

### Buttons

| SLDS Component | Nib Selector(s) | Notes |
|---------------|-----------------|-------|
| Button (Neutral) | `.sfdc-btn` | Standard outlined button |
| Button (Brand) | `.sfdc-btn-primary` | Primary filled button |
| Button (Small) | `.sfdc-btn-sm` | Compact variant |

### Charts & Dashboards

| SLDS Component | Nib Selector(s) | Notes |
|---------------|-----------------|-------|
| Dashboard Grid | `.sfdc-dashboard` | Chart card grid layout |
| Chart Card | `.sfdc-chart-card`, `.sfdc-chart-header`, `.sfdc-chart-body`, `.sfdc-chart-placeholder` | Container for chart visualizations |
| Bar Chart (wireframe) | `.sfdc-bar-chart`, `.sfdc-bar-group`, `.sfdc-bar`, `.sfdc-bar-label` | Wireframe bar chart |
| Donut Chart (wireframe) | `.sfdc-donut`, `.sfdc-donut-segment`, `.sfdc-donut-center` | Wireframe donut chart |

### Generic Wireframe Patterns

These are reusable patterns that don't map to a specific SLDS component but are useful across any SFDC project:

| Pattern | Nib Selector(s) | OOB Equivalent | Classification |
|---------|-----------------|---------------|---------------|
| Progress Bar | `.sfdc-progress-bar`, `.sfdc-progress-fill` | SLDS Progress Bar | Generic |
| Alert Banner | `.sfdc-alert` | SLDS Alert / Scoped Notification | Generic |
| Prompt Banner | `.sfdc-prompt` | SLDS Prompt | Generic |
| Summary Row | `.sfdc-summary-row`, `.sfdc-summary-label`, `.sfdc-summary-value` | No direct equivalent — generic pattern | Generic |
| Slack Button | `.sfdc-btn-slack` | Integration-specific but reusable | Generic |

---

## SLDS 2 Cosmos Token Values

Use these to validate polished-mode token overrides in `surfaces/salesforce.css`.

### Core Token Map

| Token Purpose | SLDS Hook | Hex Value | Nib Override |
|--------------|-----------|-----------|-------------|
| Brand / Accent | `--slds-g-color-accent-1` | `#0070D2` | `--wf-accent` |
| Brand Hover | — | `#005FB2` | Button hover states |
| Error | `--slds-g-color-error-1` | `#C23934` | `--wf-red` |
| Warning Text | `--slds-g-color-warning-1` | `#844800` | `--wf-amber` |
| Success | `--slds-g-color-success-1` | `#04844B` | `--wf-green` |
| Info / AI | — | `#5A1BA9` | `--wf-purple` |
| Primary text | `--slds-g-color-on-surface-1` | `#181818` | `--wf-ink` |
| Body text | `--slds-g-color-on-surface-2` | `#444444` | `--wf-text` |
| Secondary text | `--slds-g-color-on-surface-3` | `#7E8C99` | `--wf-muted` |
| Primary border | `--slds-g-color-border-1` | `#C9C9C9` | `--wf-line` |
| Subtle divider | `--slds-g-color-border-2` | `#E5E5E5` | `--wf-tint` |
| Container bg | `--slds-g-color-surface-container-1` | `#F3F3F3` | `--wf-surface` |
| Page bg | — | `#F3F3F3` | `--wf-canvas` |
| Card bg | `--slds-g-color-surface-1` | `#FFFFFF` | `--wf-white` |
| Header bg | — | `#061C3F` | Global header `background` |
| Opp icon | — | `#FCB95B` | Record icon `background` |

### Component-Level Hex Values (Polished Mode)

| Component | Property | Expected Hex | Source |
|-----------|----------|-------------|--------|
| Global Header bg | `background` | `#061C3F` | DEEP_COVE |
| Record Header bg | `background` | `#FFFFFF` | SURFACE_1 |
| Path step (complete) | `background` | `#0070D2` | BRAND |
| Path step (incomplete) | `background` | `#ECEBEA` | Neutral fill |
| Path step (incomplete) | `color` | `#706E6B` | Neutral text |
| Card header bg | `background` | `#FAFAFA` | Slightly lighter than SURFACE_2 |
| Button hover | `background` | `#005FB2` | BRAND_HOVER |
| Table header bg | `background` | `#F3F3F3` | SURFACE_2 |

---

## Common False Positives

Things that look custom but are actually OOB:

| Selector | Why It's OOB |
|----------|-------------|
| `.sfdc-path-chevron` | Part of the standard SLDS Path component interaction |
| `.sfdc-path-detail` | SLDS Path coaching/guidance expandable panel |
| `.sfdc-path-guidance` | Standard path coaching text area |
| `.sfdc-feed-item-link` | Clickable feed item — standard activity timeline pattern |
| `.sfdc-bar-chart` / `.sfdc-donut` | Wireframe chart representations — generic but SFDC-branded |

## Common False Negatives

Things that look OOB but are actually custom:

| Selector | Why It's Custom |
|----------|----------------|
| `.sfdc-slack-tile` | Slack-in-SFDC integration — not a standard SLDS component |
| `.sfdc-evidence-badge` | "Attested/unattested" is domain-specific terminology |
| `.sfdc-paper-steps` | Duplicates `.sfdc-path-*` — project-specific variant |
| `.sfdc-partner-*` | Full partner data model baked into CSS — project-specific |
| `.sfdc-suggestion-banner` | Name is too specific — rename to generic `.sfdc-prompt` |
