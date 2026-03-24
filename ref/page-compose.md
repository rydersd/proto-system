# Compose Format Reference

> Template-level page authoring. Write less data, get the same wireframe output.

## When to Use Compose vs PAGE_BLUEPRINT

| Use Case | Format |
|----------|--------|
| Salesforce record pages with SLDS components | **Compose** — template refs handle card/grid/feed patterns |
| Multi-step wizards with forms and guidance | **Compose** — wizard layout handles 2-column stepper/form/guidance |
| List views with KPIs, filters, tables | **Compose** — template refs handle list view patterns |
| Empty/loading/error states | **Compose** — template refs map directly |
| Custom layouts, non-SFDC surfaces | **PAGE_BLUEPRINT** — more flexible, any layout/surface |
| Mixed block types in freeform arrangement | **PAGE_BLUEPRINT** — direct block-level control |

**Rule of thumb**: If your page maps to an SLDS pattern (record page, list view, wizard), use compose. Otherwise use PAGE_BLUEPRINT directly.

## Script Load Order

```html
<script src="project-data.js"></script>
<script src="core/proto-nav.js"></script>
<script src="compose-data.js"></script>        <!-- or inline <script> setting window.COMPOSE -->
<script src="core/proto-compose.js"></script>   <!-- transforms COMPOSE → PAGE_BLUEPRINT -->
<script src="core/proto-gen.js"></script>        <!-- renders PAGE_BLUEPRINT → HTML -->
```

proto-compose.js is a no-op when `window.COMPOSE` is undefined — safe to include on any page.

## COMPOSE Data Structure

```javascript
var COMPOSE = {
  name: 'Screen Title',                    // Human-readable name
  layout: 'page-layouts > record_page',    // Layout template reference
  sections: { ... }                        // Section definitions (layout-specific)
};
```

### Layout References

| Layout Reference | Blueprint Layout | Use Case |
|-----------------|-----------------|----------|
| `page-layouts > record_page` | `record-3col` | SFDC record detail pages |
| `page-layouts > list_view` | `canvas` (list) | Table/list pages with KPIs and filters |
| `wizard > wizard_page_shell` | `canvas` (wizard) | Multi-step wizard forms |

## Record Page Sections

```javascript
sections: {
  header: {
    template: 'record-header > base',
    data: {
      $ICON: 'DR',                    // 2-letter icon text
      $RECORD_TYPE: 'Deal Registration',
      $RECORD_NAME: 'Meridian Capital Group',
      $highlights: [
        { $LABEL: 'Status', $VALUE: 'Under Review' }
      ]
    }
  },
  path: {
    template: 'path-bar > base',
    data: {
      $stages: [
        { $STAGE_NAME: 'Submitted', state: 'complete' },
        { $STAGE_NAME: 'Review',    state: 'current' },
        { $STAGE_NAME: 'Approved',  state: 'future' }
      ]
    }
  },
  left:  [ /* component-card blocks */ ],
  main:  [ /* component-card blocks */ ],
  right: [ /* component-card blocks */ ]
}
```

### Component Card Templates

Each column item is a component card:

```javascript
{
  template: 'component-card > base',    // or 'compact' or 'empty_state'
  data: {
    $COMPONENT_TITLE: 'Deal Details',
    $ICON: 'DR',                        // base only: 2-letter icon
    $ICON_BG: '#FCB95B',               // base only: icon background color
    $COUNT: '5',                        // base only: count badge
    $ACTION: 'Upload'                   // compact only: action link text
  },
  body: { ... }                         // inner content (see below)
}
```

### Body Templates (Inner Content)

**Detail grid** — label/value pairs in a 2-column grid:
```javascript
body: {
  template: 'detail-grid > base',
  repeat: [
    { $LABEL: 'Deal Type', $VALUE: 'New Business' },
    { $LABEL: 'Location',  $VALUE: 'DC6 — Ashburn' }
  ]
}
```

**Related list** — items with avatar, title, subtitle, meta badge:
```javascript
body: {
  template: 'related-list > base',
  repeat: [
    { $INITIALS: 'CB', $TITLE: 'CloudBridge', $SUBTITLE: 'Gold Partner', $META: 'Referral' }
  ]
}
```

**Activity feed** — compact feed items:
```javascript
body: {
  template: 'feed-item > user',
  repeat: [
    { $INITIALS: 'MC', $TEXT: 'Marcus Chen assigned as reviewer', $TIME: '2 hours ago' }
  ]
}
```

**Data table** — structured table:
```javascript
body: {
  template: 'data-table > base',
  data: {
    $columns: ['Name', 'Status', 'Value'],
    $rows: [
      ['Acme Deal', 'Active', '$1.2M']
    ]
  }
}
```

### Body Shorthands

For simple content, use string shorthands instead of template objects:

```javascript
body: '_buttons: [Edit, Clone, Submit for Approval]'
body: '_text: Descriptive text paragraph here.'
body: '_file: Document_Name.pdf (2.4 MB)'
```

## List View Sections

```javascript
sections: {
  header: {
    data: {
      $PAGE_TITLE: 'Deal Registrations',
      $actions: [
        { template: 'button > brand', data: { $LABEL: 'New Deal' } }
      ]
    }
  },
  kpis: {
    template: 'kpi-card > base',
    repeat: [
      { $LABEL: 'Total', $VALUE: '47', $DETAIL: 'All time' }
    ]
  },
  filters: {
    search: { $PLACEHOLDER: 'Search...' },
    dropdowns: [
      { $LABEL: 'Status', $OPTIONS: ['All', 'Pending', 'Approved'] }
    ]
  },
  table: {
    template: 'data-table > base',
    data: {
      $columns: ['ID', 'Name', 'Status'],
      $rows: [
        ['DR-001', 'Acme Deal', 'Approved']
      ]
    }
  },
  /* OR for empty/error/loading states: */
  body: {
    template: 'component-card > empty_state',   // or 'alert > error'
    data: { ... }
  }
}
```

### Empty State

```javascript
body: {
  template: 'component-card > empty_state',
  data: {
    $COMPONENT_TITLE: 'Deal Registrations',
    $EMPTY_TITLE: 'No Deals Yet',
    $EMPTY_MESSAGE: 'Register your first deal to get started.'
  },
  actions: [
    { template: 'button > brand', data: { $LABEL: 'Register Deal' } }
  ]
}
```

### Alert (Error/Warning/Success/Info)

```javascript
body: {
  template: 'alert > error',               // error | warning | success | info
  data: {
    $TITLE: 'Unable to Load',
    $MESSAGE: 'Please try again.',
    $actions: [
      { template: 'button > neutral', data: { $LABEL: 'Retry' } }
    ]
  }
}
```

### Skeleton Loading

```javascript
body: {
  skeleton_kpis: 5,
  skeleton_rows: 5,
  skeleton_columns: ['ID', 'Name', 'Partner', 'Status']
}
```

## Wizard Page Sections

```javascript
sections: {
  hero: {
    data: {
      $SUBTITLE: 'All fields required.',
      $REG_TYPE: 'Referral',
      $PROSPECT_NAME: 'Meridian Capital Group'
    }
  },
  stepper: {
    template: 'wizard > progress_stepper',
    data: {
      $STEPS: [
        { number: 1, label: 'Prospect',  state: 'current' },
        { number: 2, label: 'Details',   state: 'future' },
        { number: 3, label: 'Contact',   state: 'future' },
        { number: 4, label: 'Review',    state: 'future' }
      ]
    }
  },
  form: [ /* form section objects */ ],
  guidance: {
    template: 'wizard > guidance_sidebar',
    data: {
      $SIDEBAR_TITLE: 'Guidance',
      $STEP_LABEL: 'Step 1 of 4',
      $DESCRIPTION: 'Instructions for this step.',
      $checklist: ['Step 1', 'Step 2', 'Step 3']
    }
  },
  action_bar: {
    template: 'wizard > wizard_action_bar',
    data: {
      $back_visible: false,                // hide Back on first step
      $back_label: 'Back',
      $next_label: 'Next: Deal Details',
      $next_variant: 'success'             // use for final Submit button
    }
  }
}
```

### Form Section Templates

**Regular input fields:**
```javascript
{
  section_title: 'Company Details',
  _note: 'Optional note for developers',
  fields: [
    { template: 'form-elements > input',    data: { $LABEL: 'Name *', $VALUE: 'Acme' } },
    { template: 'form-elements > input',    data: { $LABEL: 'City' }, half_width: true },
    { template: 'form-elements > select',   data: { $LABEL: 'Country', $VALUE: 'Select...' } },
    { template: 'form-elements > textarea', data: { $LABEL: 'Notes', $PLACEHOLDER: 'Enter...' } },
    { template: 'form-elements > checkbox', data: { $LABEL: 'Services' }, _options: ['A', 'B', 'C'] }
  ]
}
```

**Dual listbox:**
```javascript
{
  section_title: 'Locations',
  region_pills: ['Americas', 'EMEA', 'APAC'],    // optional filter pills
  fields: [{
    template: 'wizard > dual_listbox',
    data: {
      $available: ['NY5 — New York', 'DC6 — Ashburn'],
      $selected: []
    }
  }]
}
```

**Review accordion (step 4):**
```javascript
{
  template: 'wizard > review_accordion',
  data: {
    $SECTION_TITLE: 'Prospect Information',
    $N: '1',
    $rows: [
      { $LABEL: 'Company', $VALUE: 'Meridian Capital Group' }
    ]
  }
}
```

**Prefill checkbox:**
```javascript
{
  section_title: 'Contact',
  prefill_checkbox: { $LABEL: 'I am the contact', $checked: true },
  fields: [ ... ]
}
```

## Template Reference Table

| Compose Template | What It Produces |
|-----------------|-----------------|
| `record-header > base` | SFDC record header + highlights panel |
| `path-bar > base` | Sales path bar with stage indicators |
| `component-card > base` | Card with icon + title + count header |
| `component-card > compact` | Card with title-only header |
| `component-card > empty_state` | Empty state card with CTA |
| `detail-grid > base` + repeat | 2-column label/value grid |
| `related-list > base` + repeat | Avatar + title + subtitle list |
| `feed-item > user` + repeat | Compact activity feed items |
| `data-table > base` | Sortable data table |
| `kpi-card > base` + repeat | KPI metric row |
| `wizard > progress_stepper` | Horizontal step indicator |
| `wizard > guidance_sidebar` | Help sidebar with checklist |
| `wizard > dual_listbox` | Available/selected transfer widget |
| `wizard > review_accordion` | Read-only review section |
| `wizard > wizard_action_bar` | Back/Next action bar |
| `alert > error/warning/success/info` | Notification banner |
| `button > brand/neutral` | Button (used in actions arrays) |

## Variable Substitution

Variables use the `$KEY` pattern. All values in `data` objects with `$` prefix keys are substituted into templates:

```javascript
data: {
  $LABEL: 'Status',      // replaces $LABEL in template
  $VALUE: 'Active'       // replaces $VALUE in template
}
```

## Repeat Arrays

Templates that render multiple items use `repeat` arrays. Each item in the array provides variables for one instance:

```javascript
{
  template: 'related-list > base',
  repeat: [
    { $INITIALS: 'CB', $TITLE: 'CloudBridge', $SUBTITLE: 'Gold', $META: 'Referral' },
    { $INITIALS: 'MC', $TITLE: 'Meridian',    $SUBTITLE: 'Prospect', $META: 'Customer' }
  ]
}
```

## Starters

- `starters/compose-record.html` — SFDC record page (deal detail)
- `starters/compose-wizard.html` — Wizard step (deal registration step 1)
