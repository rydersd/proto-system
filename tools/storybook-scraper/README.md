# Design System Scraper — Playbook

A playbook for extracting component definitions from any design system's presentment layer (Storybook, documentation site, or live app). Produces actionable CSS definitions, structural metadata, and token values that an agent can use to faithfully render components.

## The Two-Phase Extraction Model

Extracting a design system requires two distinct passes:

### Phase 1 — Structural Extraction (`extract.mjs`)

Captures **what exists**: class names, ARIA attributes, variant lists, rendered HTML.

This tells you *"the component uses `.slds-card__header`"* but not what that class actually does visually.

### Phase 2 — CSS Extraction (`scrape-css.mjs`)

Captures **how it looks**: authored stylesheet rules, property values, resolved custom properties.

This tells you *"`.slds-card__header` has `padding: 0.75rem 1rem; display: flex; align-items: center`"*.

Both phases are needed. Phase 1 gives the vocabulary; Phase 2 gives the visual specification.

## Why Playwright (Not WebFetch)

Storybook and most modern design system sites are SPAs. Plain HTTP fetch returns an empty shell:

1. **Empty shell page.** The top-level document is a manager UI with content in nested `<iframe>`s.
2. **JavaScript-rendered content.** Components are rendered client-side via React/Lit/Vue/etc.
3. **No useful text.** Docs are assembled at runtime from MDX, CSF metadata, and inline previews.

Playwright launches a real Chromium browser, waits for JS to finish, then extracts the live DOM.

## URL Patterns

Storybook's iframe can be loaded directly, bypassing the manager UI:

```
https://<storybook-host>/iframe.html?id=<story-id>&viewMode=docs|story
```

Story IDs follow: `{prefix}{component-slug}--{story-slug}`

| What | URL |
|---|---|
| Avatar docs | `iframe.html?id=components-avatar--documentation&viewMode=docs` |
| Avatar base story | `iframe.html?id=components-avatar--base&viewMode=story` |
| Button Group with-menu | `iframe.html?id=components-button-group--with-menu&viewMode=story` |

## Phase 1: Structural Extraction

`extract.mjs` reads a `components.json` and for each component:
1. Loads the `--documentation` docs page → headings, description, code blocks, props tables, CSS classes, styling hooks, ARIA attributes
2. Inspects sub-iframes embedded in docs (Storybook nests story previews as iframes)
3. Loads up to 5 individual stories → rendered HTML including shadow DOM
4. Aggregates per-component and writes markdown

### Shadow DOM Traversal

Modern design systems (SLDS/LWC, Shoelace, Spectrum Web Components, Lit-based systems) render components using Web Components with shadow DOM. The scraper **recursively traverses `shadowRoot`** on every element:

```javascript
function getShadowContent(el) {
  let content = '';
  if (el.shadowRoot) {
    content += el.shadowRoot.innerHTML;
    el.shadowRoot.querySelectorAll('*').forEach(child => {
      content += getShadowContent(child);
    });
  }
  el.querySelectorAll('*').forEach(child => {
    content += getShadowContent(child);
  });
  return content;
}
```

Without this, components like SLDS Card or Button appear nearly empty — all their markup lives inside shadow roots.

**Key insight:** Shadow DOM creates a CSS boundary. Styles defined inside a shadow root's `<style>` tag are not accessible via `document.styleSheets`. This is why Phase 2 uses stylesheet extraction for page-level rules and `getComputedStyle()` for resolving custom property values — the two complement each other.

## Phase 2: CSS Extraction

`scrape-css.mjs` extracts the actual visual definitions. It uses a three-pass approach:

### Pass 1 — Stylesheet Rule Extraction

Iterates `document.styleSheets` and captures every rule whose selector references a design-system class:

```javascript
for (const sheet of document.styleSheets) {
  try {
    for (const rule of sheet.cssRules) {
      if (rule instanceof CSSStyleRule && /\.slds[-_]/.test(rule.selectorText)) {
        for (let i = 0; i < rule.style.length; i++) {
          const prop = rule.style[i];
          const val = rule.style.getPropertyValue(prop).trim();
          rules[rule.selectorText][prop] = val;
        }
      }
    }
  } catch (e) { /* SecurityError for cross-origin — skip */ }
}
```

### Why Stylesheet Rules Beat `getComputedStyle()`

| | `cssRules` (authored) | `getComputedStyle()` (computed) |
|---|---|---|
| Shows only authored declarations | Yes | No — includes every inherited + default property |
| Preserves `var()` references | Yes — `var(--slds-g-spacing-3)` | No — resolves to `0.75rem` |
| Shows selector specificity | Yes — you know which rule applies | No — flat key-value dump |
| Noise level | Low — only what the author wrote | High — hundreds of properties |
| Works across shadow DOM | Only page-level stylesheets | Yes, on any element |

The sweet spot: use `cssRules` for authored declarations, then `getComputedStyle(document.documentElement)` to resolve `var()` values.

### Pass 2 — CSS Custom Property Resolution

For every `var(--slds-*)` found in Pass 1 values, resolve to actual value:

```javascript
const rootStyle = getComputedStyle(document.documentElement);
varValues[varName] = rootStyle.getPropertyValue(varName).trim();
```

The output preserves both: `padding: var(--slds-g-spacing-3) /* = 0.75rem */;`

This is critical for wireframe rendering — agents need the concrete value to draw, but need the token name to map to design system documentation.

### Pass 3 — Component Relevance Filtering

Not all 4000+ stylesheet rules on a Storybook page are relevant to a given component. Filter by:

1. Collect all `slds-*` classes actually present in the rendered story HTML
2. Only keep rules whose selectors reference at least one of those classes
3. Score by relevance (more matching classes + more useful properties = higher priority)
4. Cap at 30-40 selectors per priority component, 15 for others

### Property Filtering Strategy

For wireframe/design purposes, not all CSS properties matter equally:

**Always include:** `display`, `flex-direction`, `align-items`, `justify-content`, `gap`, `grid-template-columns`, `padding*`, `margin*`, `border*`, `border-radius`, `background-color`, `background`, `width`, `height`, `min-height`, `max-width`, `overflow`

**Include if non-default:** `font-size`, `font-weight`, `line-height`, `color`, `text-transform`, `letter-spacing`, `box-shadow`, `opacity`

**Include only if positioned:** `position`, `top/right/bottom/left`, `z-index` (skip if `position: static`)

**Omit (noise for wireframes):** `transition`, `animation`, `cursor`, `outline`, `appearance`, `-webkit-*`, `-moz-*`

### State Selectors

- Omit interaction states (`:hover`, `:focus`, `:active`) — wireframes don't need hover styles
- Keep structural states: `.slds-is-open`, `.slds-is-active`, `.slds-is-selected`, `.slds-is-current`, `.slds-is-complete`

### Shadow DOM CSS Limitations

**What you CAN extract from shadow DOM:**
- Classes used in rendered HTML (via recursive `shadowRoot.innerHTML`)
- Computed styles on individual elements (via `getComputedStyle()`)
- CSS custom property values from `:root` (custom properties pierce shadow boundaries)

**What you CANNOT extract from shadow DOM:**
- Authored stylesheet rules inside `<style>` tags within shadow roots — `document.styleSheets` only lists document-level sheets
- The selectors and specificity of shadow-internal CSS

**Implication:** For LWC/Web Component systems, the page-level stylesheets contain utility classes and overrides, while the base component styling lives in shadow DOM. The extracted CSS will show contextual rules (`.slds-card .slds-card` nesting resets, tab-context overrides) rather than the base `.slds-card` rule. This is actually useful — it shows how components compose — but you should supplement with token-resolved computed values for the base appearance.

## Adapting for Other Design Systems

This scraper works with any Storybook instance. To adapt:

### 1. Build the Component List

Open the target Storybook, expand the sidebar, and map each component:

```json
[
  { "name": "Avatar", "slug": "avatar", "stories": ["base", "variants", "circle", "sizes"] },
  { "name": "Button Group", "slug": "button-group", "stories": ["base", "disabled", "with-menu"] }
]
```

### 2. Adjust Class/Variable Regexes

| Design System | Class Regex | Variable Regex |
|---|---|---|
| SLDS | `slds[-_][a-zA-Z0-9_-]+` | `--slds[-_][a-zA-Z0-9_-]+` |
| Material UI | `(?:Mui[A-Z]\|mdc-)[a-zA-Z0-9-]+` | `--mdc-[a-zA-Z0-9-]+` |
| Carbon | `(?:bx--\|cds--)[a-zA-Z0-9-]+` | `--cds-[a-zA-Z0-9-]+` |
| Ant Design | `ant-[a-zA-Z0-9-]+` | `--ant-[a-zA-Z0-9-]+` |
| Chakra UI | `chakra-[a-zA-Z0-9-]+` | `--chakra-[a-zA-Z0-9-]+` |
| Spectrum | `spectrum-[A-Z][a-zA-Z0-9-]+` | `--spectrum-[a-zA-Z0-9-]+` |

### 3. Adjust Story ID Prefix

Check the URL in the browser when clicking a story:
- `components-{slug}--{story}` (SLDS, most Storybooks)
- `atoms-{slug}--{story}` (atomic design)
- `{slug}--{story}` (no prefix)

### 4. Tune Timeouts

```javascript
const POST_LOAD_WAIT = 3000;  // Default render wait (ms)
const NAV_TIMEOUT = 30000;    // Navigation timeout (ms)
```

Heavyweight components (SLDS Global Header) may need 5-10s. Lightweight component libraries may work with 1-2s.

### 5. Identify Shadow DOM Usage

Test a few components:
```javascript
// In browser console on a Storybook story page
const root = document.querySelector('#storybook-root');
root.querySelectorAll('*').forEach(el => {
  if (el.shadowRoot) console.log(el.tagName, '→ has shadow DOM');
});
```

If shadow DOM is present, ensure the scraper's recursive traversal is enabled, and expect CSS extraction to capture override/contextual rules rather than base component styling.

## Batch Execution

Both scrapers support batch splitting for parallel execution:

```bash
# Phase 1 — structural (4 parallel)
node extract.mjs components.json https://storybook-host 0 4 &
node extract.mjs components.json https://storybook-host 1 4 &
node extract.mjs components.json https://storybook-host 2 4 &
node extract.mjs components.json https://storybook-host 3 4 &

# Phase 2 — CSS (4 parallel)
node scrape-css.mjs 0 4 &
node scrape-css.mjs 1 4 &
node scrape-css.mjs 2 4 &
node scrape-css.mjs 3 4 &
```

Each batch launches its own Chromium instance. 4 parallel batches handles ~85 components in under 10 minutes.

## Output Format

### Structural output (Phase 1)
Markdown per batch with: component name, description, variants, CSS classes, styling hooks, ARIA attributes, props tables, base story HTML.

### CSS output (Phase 2)
Markdown + JSON per batch. CSS definitions use inline resolution comments:

```
`.slds-card__header` {
  padding: var(--slds-g-spacing-3) var(--slds-g-spacing-4) /* = 0.75rem 1rem */;
  display: flex;
  align-items: center;
}
```

JSON output includes structured data for programmatic consumption:
```json
{
  "card": {
    "filteredRules": [{ "selector": "...", "props": {...}, "score": 42 }],
    "varValues": { "--slds-g-spacing-3": "0.75rem" },
    "referencedVars": ["--slds-g-spacing-3", "--slds-g-spacing-4"],
    "usedClasses": ["slds-card", "slds-card__header", ...]
  }
}
```

## Phase 3: Icon Extraction

Icons are a separate extraction concern — they live in SVG sprite sheets, not in Storybook stories. While Phase 1 and Phase 2 capture component structure and CSS, icons need their own pass.

### Where to Find Icon Sprites

Most design systems publish SVG sprite sheets containing `<symbol>` elements:

| Design System | Icon Source |
|---|---|
| SLDS | `@salesforce-ux/design-system/assets/icons/{category}-sprite/svg/symbols.svg` or individual files at `assets/icons/{category}/{name}.svg` |
| Material Icons | `@material-design-icons/svg/filled/{name}.svg` |
| Carbon Icons | `@carbon/icons/svg/32/{name}.svg` |
| Spectrum | `@spectrum-css/icon/icons/{name}.svg` |
| Heroicons | `heroicons/24/outline/{name}.svg` |

CDN pattern (jsDelivr): `https://cdn.jsdelivr.net/npm/{package}@{version}/{path}`

### Extraction Approach

**Option A — Sprite sheet parsing:**
Fetch the sprite SVG and extract `<symbol id="name" viewBox="...">` blocks. Each symbol contains the icon's `<path>` elements.

```javascript
// Parse sprite sheet
const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
const symbols = doc.querySelectorAll('symbol');
symbols.forEach(sym => {
  const id = sym.getAttribute('id');
  const viewBox = sym.getAttribute('viewBox');
  const paths = sym.innerHTML; // <path d="..."/> elements
});
```

**Option B — Individual file fetch:**
When sprite sheets are too large for reliable parsing (>500 icons), fetch individual SVGs by name. This is more reliable for targeted extraction.

### Priority Icon Selection

Don't extract all 500+ icons. Map from wireframe usage:

1. Grep wireframe HTML for emoji/entity placeholders (`✓`, `✗`, `⚠`, `🔒`, `▼`, etc.)
2. Grep for icon-related class names or aria-labels
3. Map each placeholder to the design system's icon name
4. Extract only the ~20 icons actually used

### Output Format

Two output files per project:

**Markdown catalog** (`ref/icons-{system}.md`):
- Placeholder mapping table (emoji → icon name)
- Copy-paste ready `<svg>` markup with `.wf-icon` class
- Grouped by category (status, navigation, action, etc.)

**JSON data** (`ref/{system}-icons.json`):
```json
{
  "utility:check": {
    "viewBox": "0 0 520 520",
    "paths": ["M191 425L26 259c-6-6-6-16 0-22l..."]
  }
}
```

The JSON format enables programmatic use — Figma MCP plugins, icon search tools, or automated wireframe icon replacement.

### Adapting for Other Systems

The extraction pattern is the same regardless of design system:

1. **Find the icon package** — check the design system's npm package or CDN
2. **Identify the naming convention** — `utility:check` (SLDS), `check_circle` (Material), `checkmark--filled` (Carbon)
3. **Extract SVG data** — sprite sheet or individual files
4. **Normalize viewBox** — some systems use `0 0 24 24`, others `0 0 520 520` or `0 0 1000 1000`. Record the original viewBox; the `.wf-icon` CSS handles sizing via `width`/`height`
5. **Note fill behavior** — some icons use `fill="currentColor"` (good), others hardcode `fill="#fff"` (strip it) or use `stroke` instead of `fill` (note in catalog)

## Known Issues

- **Shadow DOM CSS boundary:** Base component styles inside shadow roots cannot be extracted via `document.styleSheets`. Use computed styles or design token documentation to supplement.
- **Cross-origin iframes** within docs pages cannot be inspected. Silently skipped.
- **Very large components** may hit the 10KB HTML truncation limit.
- **Deprecated components** (Lookup, Picklist, Wizard) may have minimal output.
- **`light-dark()` values:** Modern SLDS uses `light-dark()` CSS function for dark mode. Resolved values show `light-dark(#fff, #000)` rather than a single hex. Use the light-mode value (first argument) for wireframes.
- **Global Header/Navigation** are heavyweight — may need 5-10s render wait.

## Dependencies

- **playwright** (`^1.58.0`) — Browser automation
- **Node.js** >= 18 (ES module support)

Install: `npm install && npx playwright install chromium`
