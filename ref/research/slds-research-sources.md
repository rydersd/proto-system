# SLDS Research Sources & Provenance

> How the Salesforce surface rules (`ref/surface-salesforce-rules.md`) were established.
> Research conducted March 2026.

## Primary Sources

### 1. Salesforce Trailhead — SLDS 2 for Developers
- **URL**: https://trailhead.salesforce.com/content/learn/modules/salesforce-lightning-design-system-2-for-developers/explore-salesforce-lightning-design-system-2
- **What was extracted**: SLDS 2 architecture overview, styling hooks syntax (`--slds-g-*` namespace), CSS custom properties approach, separation of structure from visual style, backward compatibility with SLDS 1, Cosmos theme activation, component blueprint philosophy, SLDS Linter tools, AI-ready component metadata.
- **Key finding**: SLDS 2 replaces design tokens with CSS custom properties ("styling hooks"), enabling true theming and dark mode support. The naming convention is `--[namespace]-[scope]-[category]-[property]-[role]-[state]-[range]`.

### 2. Storybook — Salesforce Lightning Design System for React
- **URL**: https://storybook.js.org/showcase/salesforce-lightning-design-system-for-react/
- **What was extracted**: Confirmation of 65 React components, accessibility-first and localization-friendly approach, package name (`@salesforce/design-system-react`), community size (7,747 developers).
- **Key finding**: The React implementation prioritizes accessibility and localization as first-class concerns, not afterthoughts.

### 3. SLDS v1 Documentation — Global Styling Hooks Reference
- **URL**: https://v1.lightningdesignsystem.com/platforms/lightning/new-global-styling-hooks-guidance/
- **What was extracted**: **Complete taxonomy of global styling hooks** — this was the most technically detailed source. Provided:
  - All `--slds-g-color-*` hooks: surface (1-2), surface-container (1-3), on-surface (1-3), border (1-2), accent (1-3), accent-container (1-3), on-accent (1), error/success/warning/info families, disabled families
  - Mutable system colors: neutral-base-10 through 100, brand-base-10 through 100, error/warning/success base scales
  - Immutable palette: 14 color families (blue, cloud-blue, green, hot-orange, indigo, orange, pink, purple, red, teal, violet, yellow, neutral) each with 12 stops (10-95)
  - Shadow hooks: `--slds-g-shadow-1` through `--slds-g-shadow-4`
  - Border radius hooks: `--slds-g-radius-border-1` through `--slds-g-radius-border-4`, plus circle and pill
  - Typography hooks: font-size-base with 15 scaled sizes, 7 font weights
  - Spacing/sizing hooks: border widths 1-4, dimension hooks
  - **Rule**: Re-assigning global hooks inside components is prohibited

### 4. Lightning Design System 2 Official Site — Components
- **URL**: https://www.lightningdesignsystem.com/2e1ef8501/p/755aff-components
- **What was extracted**: **Complete component inventory** organized by category:
  - Input & Forms: 18 components (Checkbox, Combobox, Datepicker, etc.)
  - Display & Data: 16 components (Avatar, Badge, Cards, Data Table, Tree, etc.)
  - Navigation: 8 components (Breadcrumbs, Button, Tabs, etc.)
  - Feedback: 4 components (Modals, Prompt, Toast, Tooltip)
  - Patterns: Data Entry, Displaying Data, Layout, Loading, Navigation, Search, Data Visualization, Builder, System Messaging
  - Foundations: Borders/Radius, Color, Display Density, Icons, Illustrations, Shadows, Spacing/Sizing, Typography
  - AI section: Conversation Design, Vibe Coding, AI Tools, Prompt Design Guide

### 5. Salesforce Official Blog — What is SLDS 2?
- **URL**: https://www.salesforce.com/blog/what-is-slds-2/
- **What was extracted**: High-level design philosophy, "foundation of agentic design system" positioning, Cosmos theme as default, 9 new accent color options, expanded Themes and Branding feature, comfy/compact display density modes.
- **Note**: Page blocked direct scraping (403). Content extracted via search result summaries.

## Secondary Sources

### 6. Salesforce Blog — Styling Hooks
- **URL**: https://www.salesforce.com/blog/what-are-styling-hooks/
- **What was extracted**: Styling hook naming convention breakdown, global vs component scope distinction, category list (color, font, radius, shadow, spacing, sizing), specific examples like `--slds-g-spacing-3`, `--slds-g-font-scale-5`.

### 7. AstraIT — SLDS 2 Guide
- **URL**: https://astreait.com/Lightning-Design-System-2/
- **What was extracted**: Confirmation of styling hooks as modern replacement for tokens, comfy/compact density modes, Cosmos theme visual direction (rounded elements, refined palette, enhanced typography), Shadow DOM compatibility.

### 8. NSIQ InfoTech — SLDS 2 Overview
- **URL**: https://nsiqinfotech.com/salesforce-lightning-design-system-2/
- **What was extracted**: Utility class naming patterns (`slds-m-top_small`, `slds-p-around_large`, `slds-text-heading_medium`), mobile-first design principle, component types (buttons, grid, cards, modals, data tables), CDN/local integration methods, `slds-scope` wrapper class for external apps.

### 9. Irfan Khatri — SLDS 2 Blog
- **URL**: https://www.irfankhatri.com/blog/salesforce-lightning-design-system-2/
- **What was extracted**: Decoupling of structure from visual style, dark mode architectural support, reduced dependency on Aura/Sass, migration guidance (blueprints continue to work, upgrade to base components recommended).

### 10. ABSYZ — Unpacking SLDS 2.0
- **URL**: https://www.absyz.com/a-fresh-look-for-salesforce-unpacking-the-new-ui-and-slds-2-0/
- **What was extracted**: Limited (page CSS captured but article body not accessible). Confirmed primary brand blue family.

## Accessibility Sources

### 11. Salesforce Lightning Design System — Color Accessibility
- **URL**: https://www.lightningdesignsystem.com/guidelines/color/color-accessibility/
- **What was extracted**: WCAG 2.1 AA compliance mandate, contrast ratio requirements (4.5:1 text, 3:1 large text, 3:1 non-text UI components).

### 12. Salesforce Blog — Lightning Accessibility Updates
- **URL**: https://www.salesforce.com/news/stories/lightning-accessibility-updates/
- **What was extracted**: 2023 color update improving contrast for low-vision users, changes to tokens/hooks/icons for non-text contrast compliance.

### 13. Salesforce Developer Docs — Base Components Accessibility
- **URL**: https://developer.salesforce.com/docs/platform/lwc/guide/base-components-accessibility.html
- **What was extracted**: Base components conform to SLDS color guidelines meeting WCAG 2.1 AA, keyboard interaction patterns, ARIA role requirements.

### 14. Salesforce Developer Docs — LWC Styling Hooks
- **URL**: https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-custom-properties.html
- **What was extracted**: Component-level hooks (`--slds-c-*`) examples: `--slds-c-button-brand-color-background`, `--slds-c-badge-color-background` (default: `#ecebea`), `--slds-c-toast-*`, `--slds-c-tooltip-*`. Note: SLDS 2 does not yet support component-level hooks as of Summer '25.

## Layout & Record Page Sources

### 15. Salesforce Trailhead — Custom Record Pages
- **URL**: https://trailhead.salesforce.com/content/learn/modules/lightning_app_builder/lightning_app_builder_recordpage
- **What was extracted**: Record page structure (header, highlights, path, tabs, 3-column layout), Lightning App Builder customization model, template-based page creation.

### 16. Salesforce Help — Page Layout Elements in Lightning Experience
- **URL**: https://help.salesforce.com/s/articleView?id=sf.layouts_in_lex.htm&language=en_US&type=5
- **What was extracted**: How page layout elements map to Lightning Experience rendering, record detail fields, related lists, and section organization.

## Existing Framework Analysis

### 17. Nib `surfaces/salesforce.css`
- **File**: `/Users/ryders/Developer/GitHub/proto_framework/surfaces/salesforce.css` (838 lines)
- **What was analyzed**: Complete existing SFDC surface implementation. Confirmed class inventory, component patterns, token usage, wireframe-mode paper adaptations, napkin-mode sharpie overrides, responsive breakpoints.

### 18. Nib `ref/surface-salesforce.md`
- **File**: `/Users/ryders/Developer/GitHub/proto_framework/ref/surface-salesforce.md` (227 lines)
- **What was analyzed**: Existing agent reference doc for Salesforce wireframes. Confirmed record page structure, card patterns, detail grid, related lists, activity feed, path detail, tabs, buttons, class reference, and rules.

## LWC, Font Deprecation & App Builder Sources

### 19. Salesforce Developer Docs — LWC Guide
- **URL**: https://developer.salesforce.com/docs/platform/lwc/guide
- **What was extracted**: Shadow DOM constraints for base components, styling hook application in LWC context, `--slds-c-*` component hook patterns, base component attribute/variant customization, SLDS 1 fallback requirement during transition period.
- **Key finding**: LWC base components render in Shadow DOM — external CSS cannot pierce the boundary. Customization is exclusively via styling hooks and component attributes. SLDS 2 does not yet expose all component-level hooks.

### 20. Salesforce Release Notes — Summer '21 Font Change
- **URL**: https://help.salesforce.com/s/articleView?id=release-notes.rn_lex_font_change.htm
- **What was extracted**: Salesforce Sans deprecation in Summer '21, migration to system-ui font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`), automatic migration of existing orgs, platform-native rendering behavior.
- **Key finding**: Salesforce Sans is no longer bundled or loaded by default. The system font stack renders platform-native text, which aligns with nib's existing `var(--wf-font)` approach.

### 21. Salesforce Help — Lightning App Builder
- **URL**: https://help.salesforce.com/s/articleView?id=sf.lightning_app_builder_overview.htm
- **What was extracted**: ~40 standard drag-and-drop components (Record Detail, Related Lists, Activity Timeline, Path, Report Chart, Flow, etc.), Dynamic Forms (field-level layout with conditional visibility), Dynamic Actions (context-aware action buttons with filter rules), distinction between no-code configurable elements and custom LWC requirements.
- **Key finding**: A significant portion of Salesforce record page UI is configurable without code via App Builder. This distinction matters for wireframe annotation — stakeholders need to know what's "drag-and-drop" vs "requires development."

## Synthesis Methodology

1. **Architecture rules** (Section 1) derived from sources 1, 3, 6, 9 — SLDS 2 styling hooks system
2. **Color system** (Section 2) derived from sources 3, 11, 12 — hook taxonomy + WCAG requirements
3. **Typography** (Section 3) derived from sources 3, 8, 17, 20 — type scale hooks + existing CSS analysis + font deprecation
4. **Spacing & sizing** (Section 4) derived from sources 3, 6, 7, 17 — hook scale + existing pixel values
5. **Component patterns** (Section 5) derived from sources 4, 15, 16, 17, 18 — SLDS inventory + record page anatomy
6. **Layout rules** (Section 6) derived from sources 15, 16, 17 — record page grid + responsive behavior
7. **Accessibility** (Section 7) derived from sources 11, 12, 13 — WCAG 2.1 AA + focus/ARIA patterns
8. **Interaction patterns** (Section 8) derived from sources 4, 14, 17 — button hierarchy, nav, notifications
9. **SLDS 1 vs 2 comparison** (Section 9) derived from sources 1, 5, 7, 9 — architectural and visual changes
10. **AI/agentic design** (Section 10) derived from sources 1, 4, 5 — agent metadata and AI-ready components
11. **Wireframe rules** (Section 11) derived from sources 17, 18 — existing framework conventions + SLDS patterns
12. **LWC styling** (Section 12) derived from sources 14, 19 — Shadow DOM constraints + component hooks + SLDS 1 fallback
13. **App Builder patterns** (Section 13) derived from sources 15, 21 — standard components + Dynamic Forms/Actions + code vs no-code distinction
