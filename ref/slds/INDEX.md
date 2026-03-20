# SLDS Figma Templates

Load `_tokens.md` for colors/spacing. Load component `.json` for `create_node_tree` templates.
Font: replace `$FONT` with project font (default: `SF Pro`). PCP project: `Nexa Text`.

## Components

| Need | File | Variants |
|------|------|----------|
| Card container | card.json | base, accent-left (5 colors) |
| Button | button.json | neutral, brand, destructive, success, sm |
| Badge | badge.json | default, inverse, info, success, warning, error |
| Data table | data-table.json | base (uses $repeat for rows) |
| Record header | record-header.json | icon+title+highlights+actions |
| Stage path | path-bar.json | steps: complete, current, future, lost |
| Form field | form-elements.json | input, select, textarea, checkbox |
| Tabs | tabs.json | tab bar with active state |
| Related list | related-list.json | list items with $repeat |
| Feed item | feed-item.json | avatar+text+time |
| Modal | modal.json | overlay+header+body+footer |
| Alert banner | alert.json | info, success, warning, error |
| Global header | global-header.json | Lightning header bar |
| Page layout | page-layouts.json | record, list, dashboard shells |
| KPI card | kpi-card.json | label+value+detail |
| Detail grid | detail-grid.json | field-value pairs (2-col wrap) |
| Component card | component-card.json | base (icon+title+count+actions), compact, empty_state — wraps modules in 3-col layout |
| Wizard | wizard.json | page shell, stepper, guidance sidebar, dual listbox, review accordion, action bar |

## Critical Rules

1. **NEVER** use `fillColor` with `a:0` — omit fillColor entirely for transparent frames
2. **ALWAYS** use `layoutMode: "VERTICAL"` on frames containing `$repeat` children
3. Set `clipsContent: true` on all screen-level frames
4. All text nodes need `fontFamily: "$FONT"` — replace at call time
5. Stroke arrays: `[{ color: "#HEX", weight: N }]` — never use `a:0` strokes
