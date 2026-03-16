#!/usr/bin/env node
/**
 * SLDS 2 CSS-Aware Scraper
 *
 * Extracts authored stylesheet rules for every slds-* class, resolves CSS
 * custom property values, and outputs actionable visual definitions.
 *
 * Usage:
 *   node scrape-css.mjs <batch-number> <total-batches>
 *
 * Examples:
 *   node scrape-css.mjs 0 4   # Run batch 0 of 4
 *   node scrape-css.mjs 0 1   # Run all components in one batch
 */

import { chromium } from 'playwright';
import fs from 'fs';

const IFRAME_BASE = 'https://sds-site-docs-1fea39e7763a.herokuapp.com/iframe.html';

const batchNum = parseInt(process.argv[2] || '0');
const totalBatches = parseInt(process.argv[3] || '1');

// ---------------------------------------------------------------------------
// Property filtering
// ---------------------------------------------------------------------------

const ALWAYS_INCLUDE = new Set([
  'display', 'flex-direction', 'align-items', 'justify-content', 'gap',
  'grid-template-columns', 'grid-template-rows', 'grid-auto-flow',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'padding-inline', 'padding-inline-start', 'padding-inline-end',
  'padding-block', 'padding-block-start', 'padding-block-end',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'margin-inline', 'margin-inline-start', 'margin-inline-end',
  'margin-block', 'margin-block-start', 'margin-block-end',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-width', 'border-style', 'border-color',
  'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width',
  'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color',
  'border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  'background-color', 'background',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'overflow', 'overflow-x', 'overflow-y',
]);

const INCLUDE_IF_NON_DEFAULT = new Set([
  'font-size', 'font-weight', 'line-height', 'color', 'text-color',
  'text-transform', 'letter-spacing', 'text-decoration',
  'box-shadow', 'opacity', 'white-space', 'text-overflow',
  'text-align', 'vertical-align',
]);

const INCLUDE_IF_POSITIONED = new Set([
  'position', 'top', 'right', 'bottom', 'left', 'z-index', 'inset',
]);

const OMIT = new Set([
  'transition', 'transition-property', 'transition-duration', 'transition-timing-function',
  'transition-delay', 'animation', 'animation-name', 'animation-duration',
  'animation-timing-function', 'animation-delay', 'animation-fill-mode',
  'cursor', 'outline', 'outline-offset', 'outline-width', 'outline-style',
  'outline-color', 'appearance', '-webkit-appearance',
  'pointer-events', 'user-select', '-webkit-user-select',
  'touch-action', 'will-change', 'contain', 'content-visibility',
  'unicode-bidi', 'direction',
]);

function shouldIncludeProperty(prop, val, allProps) {
  // Skip vendor prefixes
  if (prop.startsWith('-webkit-') || prop.startsWith('-moz-') || prop.startsWith('-ms-')) return false;
  if (OMIT.has(prop)) return false;
  if (ALWAYS_INCLUDE.has(prop)) return true;
  if (INCLUDE_IF_NON_DEFAULT.has(prop)) return true;
  if (INCLUDE_IF_POSITIONED.has(prop)) {
    const pos = allProps['position'];
    return pos && pos !== 'static';
  }
  // Include CSS custom properties (var declarations)
  if (prop.startsWith('--')) return true;
  return false;
}

// Interaction-state selectors to omit (keep structural states)
const OMIT_STATE_RE = /:hover|:focus(?!-visible)|:active|:visited|:focus-within/;
const KEEP_STATE_RE = /\.slds-is-(open|active|selected|current|complete|incomplete|expanded|collapsed|won|lost)/;

function shouldIncludeSelector(sel) {
  // Always keep structural state selectors
  if (KEEP_STATE_RE.test(sel)) return true;
  // Omit interaction states
  if (OMIT_STATE_RE.test(sel)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// All 87 SLDS 2 components (same list as scrape-all.mjs)
// ---------------------------------------------------------------------------

const ALL_COMPONENTS = [
  { name: 'Accordion', slug: 'expandable-section', stories: ['base','non-collapsible','closed'] },
  { name: 'Activity Timeline', slug: 'activity-timeline', stories: ['base','expanded','error','narrow'] },
  { name: 'Agentforce', slug: 'agentforce', stories: ['brand-button','neutral-button','brand-button-icon','bordered-button-icon','brand-button-group','neutral-button-group','input','card','modal'] },
  { name: 'Alert', slug: 'alert', stories: ['base','error','offline','warning'] },
  { name: 'App Launcher', slug: 'app-launcher', stories: ['base'] },
  { name: 'Avatar', slug: 'avatar', stories: ['base','variants','circle','profile-icon','sizes'] },
  { name: 'Avatar Group', slug: 'avatar-group', stories: ['base','with-icon','with-user-initials'] },
  { name: 'Badge', slug: 'badge', stories: ['base'] },
  { name: 'Brand Band', slug: 'brand-band', stories: ['base'] },
  { name: 'Breadcrumbs', slug: 'breadcrumbs', stories: ['base','kinetics','overflow-menu'] },
  { name: 'Builder Header', slug: 'builder-header', stories: ['base'] },
  { name: 'Button', slug: 'button', stories: ['base'] },
  { name: 'Button Dual Stateful', slug: 'button-dual-stateful', stories: ['not-pressed','pressed'] },
  { name: 'Button Group', slug: 'button-group', stories: ['base','disabled','inverse','with-menu'] },
  { name: 'Button Icon', slug: 'button-icon', stories: ['base','disabled','warning-state','error-state'] },
  { name: 'Button Stateful', slug: 'button-stateful', stories: ['brand','neutral'] },
  { name: 'Card', slug: 'card', stories: ['base'] },
  { name: 'Carousel', slug: 'carousel', stories: ['base'] },
  { name: 'Chat', slug: 'chat', stories: ['base','past-chats'] },
  { name: 'Checkbox', slug: 'checkbox', stories: ['base','required','error'] },
  { name: 'Checkbox Button', slug: 'checkbox-button', stories: ['base','checked'] },
  { name: 'Checkbox Button Group', slug: 'checkbox-button-group', stories: ['base'] },
  { name: 'Checkbox Toggle', slug: 'checkbox-toggle', stories: ['base','checked'] },
  { name: 'Color Picker', slug: 'color-picker', stories: ['base'] },
  { name: 'Combobox', slug: 'combobox', stories: ['base'] },
  { name: 'Counter', slug: 'counter', stories: ['base'] },
  { name: 'Data Table', slug: 'data-table', stories: ['base'] },
  { name: 'Datepicker', slug: 'datepicker', stories: ['base'] },
  { name: 'Datetime Picker', slug: 'datetime-picker', stories: ['base'] },
  { name: 'Docked Composer', slug: 'docked-composer', stories: ['base','open'] },
  { name: 'Docked Form Footer', slug: 'docked-form-footer', stories: ['base'] },
  { name: 'Docked Utility Bar', slug: 'docked-utility-bar', stories: ['base'] },
  { name: 'Drop Zone', slug: 'drop-zone', stories: ['base'] },
  { name: 'Dueling Picklist', slug: 'dueling-picklist', stories: ['base'] },
  { name: 'Dynamic Icons', slug: 'dynamic-icons', stories: ['ellie','eq','waffle'] },
  { name: 'Dynamic Menu', slug: 'dynamic-menu', stories: ['base'] },
  { name: 'Expandable Section', slug: 'expandable-section', stories: ['base','non-collapsible','closed'] },
  { name: 'Expression', slug: 'expression', stories: ['base'] },
  { name: 'Feed', slug: 'feed', stories: ['base'] },
  { name: 'File', slug: 'file', stories: ['base'] },
  { name: 'FileSelector', slug: 'file-selector', stories: ['base'] },
  { name: 'Form Element', slug: 'form-element', stories: ['base'] },
  { name: 'Global Header', slug: 'global-header', stories: ['standard'] },
  { name: 'Global Navigation', slug: 'global-navigation', stories: ['standard'] },
  { name: 'Icon', slug: 'icon', stories: ['base','variants'] },
  { name: 'Illustration', slug: 'illustration', stories: ['base'] },
  { name: 'Input', slug: 'input', stories: ['base'] },
  { name: 'Lookup', slug: 'lookup', stories: ['deprecated-base'] },
  { name: 'Map', slug: 'map', stories: ['base'] },
  { name: 'Menu', slug: 'menu', stories: ['base','widths','heights'] },
  { name: 'Modal', slug: 'modal', stories: ['base'] },
  { name: 'Notifications', slug: 'notifications', stories: ['base','stacked'] },
  { name: 'Page Header', slug: 'page-header', stories: ['base'] },
  { name: 'Panel', slug: 'panel', stories: ['base'] },
  { name: 'Path', slug: 'path', stories: ['base'] },
  { name: 'Path Simple', slug: 'path-simple', stories: ['deprecated-path-simple'] },
  { name: 'Picklist', slug: 'picklist', stories: ['deprecated-base'] },
  { name: 'Pill', slug: 'pill', stories: ['base'] },
  { name: 'Popover', slug: 'popover', stories: ['base'] },
  { name: 'Progress Bar', slug: 'progress-bar', stories: ['base'] },
  { name: 'Progress Indicator', slug: 'progress-indicator', stories: ['base'] },
  { name: 'Progress Ring', slug: 'progress-ring', stories: ['base'] },
  { name: 'Prompt', slug: 'prompt', stories: ['base'] },
  { name: 'Publisher', slug: 'publisher', stories: ['base','active'] },
  { name: 'Radio Button Group', slug: 'radio-button-group', stories: ['button'] },
  { name: 'Radio Group', slug: 'radio-group', stories: ['base'] },
  { name: 'Rich Text Editor', slug: 'rich-text-editor', stories: ['base'] },
  { name: 'Scoped Notifications', slug: 'scoped-notifications', stories: ['base'] },
  { name: 'Select', slug: 'select', stories: ['base'] },
  { name: 'Setup Assistant', slug: 'setup-assistant', stories: ['base'] },
  { name: 'Slider', slug: 'slider', stories: ['base'] },
  { name: 'Spinner', slug: 'spinner', stories: ['base','brand','sizes'] },
  { name: 'Split View', slug: 'split-view', stories: ['base'] },
  { name: 'Summary Detail', slug: 'summary-detail', stories: ['base'] },
  { name: 'Tabs', slug: 'tabs', stories: ['base'] },
  { name: 'Textarea', slug: 'textarea', stories: ['base'] },
  { name: 'Tile', slug: 'tile', stories: ['base'] },
  { name: 'Timepicker', slug: 'timepicker', stories: ['base'] },
  { name: 'Toast', slug: 'toast', stories: ['base'] },
  { name: 'Tooltip', slug: 'tooltip', stories: ['base'] },
  { name: 'Tree Grid', slug: 'tree-grid', stories: ['base'] },
  { name: 'Trees', slug: 'trees', stories: ['base'] },
  { name: 'Trial Bar', slug: 'trial-bar', stories: ['base'] },
  { name: 'Vertical Navigation', slug: 'vertical-navigation', stories: ['basic','advanced'] },
  { name: 'Visual Picker', slug: 'visual-picker', stories: ['base'] },
  { name: 'Welcome Mat', slug: 'welcome-mat', stories: ['base'] },
  { name: 'Wizard', slug: 'wizard', stories: ['deprecated'] },
];

// Priority components get more thorough extraction (more selectors kept)
const PRIORITY_SLUGS = new Set([
  'card', 'button', 'data-table', 'badge', 'path', 'page-header',
  'tabs', 'input', 'modal', 'expandable-section', 'global-header',
  'pill', 'toast', 'combobox',
]);

// ---------------------------------------------------------------------------
// Batch splitting
// ---------------------------------------------------------------------------

const batchSize = Math.ceil(ALL_COMPONENTS.length / totalBatches);
const start = batchNum * batchSize;
const end = Math.min(start + batchSize, ALL_COMPONENTS.length);
const batch = ALL_COMPONENTS.slice(start, end);

console.log(`Batch ${batchNum}/${totalBatches}: components ${start}-${end - 1} (${batch.length} components)`);
console.log(`Components: ${batch.map(c => c.name).join(', ')}`);

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

async function loadPage(page, id, viewMode = 'story') {
  const url = `${IFRAME_BASE}?id=${id}&viewMode=${viewMode}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    const hasError = await page.evaluate(() => {
      const errEl = document.querySelector('.sb-errordisplay');
      return errEl && errEl.offsetParent !== null;
    });
    return !hasError;
  } catch (e) {
    console.log(`  Error loading ${id}: ${e.message}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// CSS extraction (runs inside page.evaluate)
// ---------------------------------------------------------------------------

async function extractCssRules(page) {
  return await page.evaluate(() => {
    const rules = {};
    const varValues = {};

    // Pass 1: Extract all stylesheet rules matching .slds-* selectors
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (!(rule instanceof CSSStyleRule)) continue;
          if (!/\.slds[-_]/.test(rule.selectorText)) continue;

          const selector = rule.selectorText;
          if (!rules[selector]) rules[selector] = {};

          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            const val = rule.style.getPropertyValue(prop).trim();
            if (val) rules[selector][prop] = val;
          }
        }
      } catch (_e) {
        // SecurityError for cross-origin stylesheets — skip
      }
    }

    // Pass 2: Resolve CSS custom properties
    const rootStyle = getComputedStyle(document.documentElement);
    const varRe = /var\((--slds[-_][a-zA-Z0-9_-]+)/g;

    for (const selector of Object.keys(rules)) {
      for (const prop of Object.keys(rules[selector])) {
        const val = rules[selector][prop];
        let match;
        while ((match = varRe.exec(val)) !== null) {
          const varName = match[1];
          if (!varValues[varName]) {
            const resolved = rootStyle.getPropertyValue(varName).trim();
            if (resolved) varValues[varName] = resolved;
          }
        }
        varRe.lastIndex = 0;
      }
    }

    // Pass 3: Get classes actually used in rendered HTML
    const root = document.querySelector('#storybook-root') || document.body;
    const html = root.innerHTML;

    // Also check shadow DOM
    function getShadowHtml(el) {
      let c = '';
      if (el.shadowRoot) {
        c += el.shadowRoot.innerHTML;
        el.shadowRoot.querySelectorAll('*').forEach(ch => { c += getShadowHtml(ch); });
      }
      el.querySelectorAll('*').forEach(ch => { c += getShadowHtml(ch); });
      return c;
    }
    const allHtml = html + getShadowHtml(root);
    const usedClasses = [...new Set((allHtml.match(/slds[-_][a-zA-Z0-9_-]+/g) || []))];

    return { rules, varValues, usedClasses };
  });
}

// ---------------------------------------------------------------------------
// Filter and format CSS rules for a component
// ---------------------------------------------------------------------------

function filterRulesForComponent(rawRules, varValues, usedClasses, isPriority) {
  const maxSelectors = isPriority ? 40 : 15;
  const usedClassSet = new Set(usedClasses);

  // Score selectors by relevance to this component
  const scored = [];
  for (const [selector, props] of Object.entries(rawRules)) {
    if (!shouldIncludeSelector(selector)) continue;

    // Check if selector references any class used in the component
    const selectorClasses = selector.match(/slds[-_][a-zA-Z0-9_-]+/g) || [];
    const relevance = selectorClasses.filter(c => usedClassSet.has(c)).length;
    if (relevance === 0) continue;

    // Filter properties
    const filtered = {};
    for (const [prop, val] of Object.entries(props)) {
      if (shouldIncludeProperty(prop, val, props)) {
        filtered[prop] = val;
      }
    }

    if (Object.keys(filtered).length === 0) continue;

    // Score: more relevant classes + more properties = higher priority
    const score = relevance * 10 + Object.keys(filtered).length;
    scored.push({ selector, props: filtered, score });
  }

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxSelectors);
}

function formatCssBlock(selector, props, varValues) {
  let block = `\`${selector}\` {\n`;
  for (const [prop, val] of Object.entries(props)) {
    // Add resolved value as inline comment for var() references
    const varMatch = val.match(/var\((--slds[-_][a-zA-Z0-9_-]+)\)/);
    if (varMatch && varValues[varMatch[1]]) {
      block += `  ${prop}: ${val} /* = ${varValues[varMatch[1]]} */;\n`;
    } else {
      block += `  ${prop}: ${val};\n`;
    }
  }
  block += `}\n`;
  return block;
}

function buildTokenTable(varValues, usedVars) {
  if (usedVars.length === 0) return '';
  let table = '\n#### Resolved Tokens\n\n';
  table += '| Token | Value |\n|-------|-------|\n';
  for (const v of usedVars.sort()) {
    if (varValues[v]) {
      table += `| \`${v}\` | \`${varValues[v]}\` |\n`;
    }
  }
  return table;
}

// ---------------------------------------------------------------------------
// Main scraper
// ---------------------------------------------------------------------------

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1200 } });
  const page = await context.newPage();

  const results = {};

  for (const comp of batch) {
    const isPriority = PRIORITY_SLUGS.has(comp.slug);
    console.log(`\n========== ${comp.name} ${isPriority ? '(PRIORITY)' : ''} ==========`);

    let allRules = {};
    let allVarValues = {};
    let allUsedClasses = new Set();

    // Load each story and extract CSS
    for (const storySlug of comp.stories) {
      const storyId = `components-${comp.slug}--${storySlug}`;
      console.log(`  Story: ${storySlug}`);
      const loaded = await loadPage(page, storyId, 'story');
      if (!loaded) continue;

      try {
        const { rules, varValues, usedClasses } = await extractCssRules(page);

        // Merge rules
        for (const [sel, props] of Object.entries(rules)) {
          if (!allRules[sel]) allRules[sel] = {};
          Object.assign(allRules[sel], props);
        }
        Object.assign(allVarValues, varValues);
        usedClasses.forEach(c => allUsedClasses.add(c));
      } catch (e) {
        console.log(`  CSS extraction error: ${e.message}`);
      }
    }

    // Also try docs page for additional classes
    const docsId = `components-${comp.slug}--documentation`;
    const docsLoaded = await loadPage(page, docsId, 'docs');
    if (docsLoaded) {
      try {
        const { rules, varValues, usedClasses } = await extractCssRules(page);
        for (const [sel, props] of Object.entries(rules)) {
          if (!allRules[sel]) allRules[sel] = {};
          Object.assign(allRules[sel], props);
        }
        Object.assign(allVarValues, varValues);
        usedClasses.forEach(c => allUsedClasses.add(c));
      } catch (_e) { /* ignore */ }
    }

    const usedClassesArr = [...allUsedClasses];
    const filtered = filterRulesForComponent(allRules, allVarValues, usedClassesArr, isPriority);

    // Collect all referenced var names
    const referencedVars = new Set();
    for (const { props } of filtered) {
      for (const val of Object.values(props)) {
        const matches = val.matchAll(/var\((--slds[-_][a-zA-Z0-9_-]+)\)/g);
        for (const m of matches) referencedVars.add(m[1]);
      }
    }

    results[comp.slug] = {
      name: comp.name,
      isPriority,
      usedClasses: usedClassesArr,
      filteredRules: filtered,
      varValues: allVarValues,
      referencedVars: [...referencedVars],
    };

    console.log(`  Found ${Object.keys(allRules).length} total rules, filtered to ${filtered.length} relevant`);
    console.log(`  Classes: ${usedClassesArr.length}, Vars resolved: ${referencedVars.size}`);
  }

  // ---------------------------------------------------------------------------
  // Write output
  // ---------------------------------------------------------------------------

  let output = `# SLDS 2 CSS Definitions - Batch ${batchNum}\n\n`;
  output += `Extracted from SLDS 2 Storybook on ${new Date().toISOString().split('T')[0]}\n`;
  output += `Extraction method: Authored stylesheet rules + CSS custom property resolution\n\n---\n\n`;

  for (const comp of batch) {
    const data = results[comp.slug];
    if (!data) continue;

    output += `## ${data.name}${data.isPriority ? ' ★' : ''}\n\n`;

    if (data.filteredRules.length > 0) {
      output += `#### CSS Definitions\n\n`;
      for (const { selector, props } of data.filteredRules) {
        output += formatCssBlock(selector, props, data.varValues);
        output += '\n';
      }

      if (data.referencedVars.length > 0) {
        output += buildTokenTable(data.varValues, data.referencedVars);
      }
    } else {
      output += `_No authored slds-* CSS rules found (component may use only shadow DOM styling)_\n`;
    }

    output += '\n---\n\n';
  }

  // Write markdown output
  const outFile = `/tmp/slds-css-batch-${batchNum}.md`;
  fs.writeFileSync(outFile, output);
  console.log(`\nMarkdown written to ${outFile} (${output.length} chars)`);

  // Write JSON output for programmatic consumption
  const jsonFile = `/tmp/slds-css-batch-${batchNum}.json`;
  fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2));
  console.log(`JSON written to ${jsonFile}`);

  await browser.close();
})();
