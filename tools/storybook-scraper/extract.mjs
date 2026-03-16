#!/usr/bin/env node
/**
 * Generic Storybook Component Scraper
 *
 * Extracts component documentation, CSS classes, styling hooks, ARIA attributes,
 * and rendered HTML from any Storybook instance using Playwright.
 *
 * Usage:
 *   node extract.mjs <components.json> <storybook-base-url> [batch-number] [total-batches]
 *
 * Examples:
 *   node extract.mjs slds-components.json https://my-storybook.com
 *   node extract.mjs slds-components.json https://my-storybook.com 0 4
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// CSS class prefix regex — adjust per design system
// SLDS: /slds[-_][a-zA-Z0-9_-]+/g
// Material: /(?:Mui[A-Z]|mdc-)[a-zA-Z0-9-]+/g
// Carbon: /(?:bx--|cds--)[a-zA-Z0-9-]+/g
// Ant Design: /ant-[a-zA-Z0-9-]+/g
const CSS_CLASS_REGEX = /slds[-_][a-zA-Z0-9_-]+/g;

// CSS custom property prefix regex — adjust per design system
const CSS_VAR_REGEX = /--slds[-_][a-zA-Z0-9_-]+/g;

// Story ID prefix in the Storybook URL (e.g., "components-", "atoms-", "")
const STORY_ID_PREFIX = 'components-';

// Maximum stories to load per component (to avoid timeouts on large components)
const MAX_STORIES_PER_COMPONENT = 5;

// Wait time after page load for rendering to complete (ms)
const POST_LOAD_WAIT = 3000;

// Navigation timeout (ms)
const NAV_TIMEOUT = 30000;

// Maximum HTML length to capture per story (chars)
const MAX_HTML_LENGTH = 10000;

// ---------------------------------------------------------------------------
// CSS property filtering (Phase 2)
// ---------------------------------------------------------------------------

const ALWAYS_INCLUDE_PROPS = new Set([
  'display', 'flex-direction', 'align-items', 'justify-content', 'gap',
  'grid-template-columns', 'grid-template-rows',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'padding-inline', 'padding-inline-start', 'padding-inline-end',
  'padding-block', 'padding-block-start', 'padding-block-end',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'margin-inline', 'margin-inline-start', 'margin-inline-end',
  'margin-block', 'margin-block-start', 'margin-block-end',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-width', 'border-style', 'border-color',
  'border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  'background-color', 'background',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'overflow', 'overflow-x', 'overflow-y',
]);

const NON_DEFAULT_PROPS = new Set([
  'font-size', 'font-weight', 'line-height', 'color',
  'text-transform', 'letter-spacing', 'text-decoration',
  'box-shadow', 'opacity', 'white-space', 'text-overflow', 'text-align',
]);

const OMIT_PROPS = new Set([
  'transition', 'transition-property', 'transition-duration',
  'transition-timing-function', 'transition-delay',
  'animation', 'animation-name', 'animation-duration',
  'cursor', 'outline', 'outline-offset', 'appearance',
  '-webkit-appearance', 'pointer-events', 'user-select',
  '-webkit-user-select', 'touch-action', 'will-change',
]);

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node extract.mjs <components.json> <storybook-base-url> [batch-number] [total-batches]');
  console.error('');
  console.error('Arguments:');
  console.error('  components.json     Path to JSON file with component definitions');
  console.error('  storybook-base-url  Base URL of the Storybook instance');
  console.error('  batch-number        Zero-indexed batch number (default: 0)');
  console.error('  total-batches       Total number of batches (default: 1)');
  process.exit(1);
}

const componentsFile = args[0];
const storybookBaseUrl = args[1].replace(/\/$/, ''); // strip trailing slash
const batchNum = parseInt(args[2] || '0', 10);
const totalBatches = parseInt(args[3] || '1', 10);

const IFRAME_BASE = `${storybookBaseUrl}/iframe.html`;

// ---------------------------------------------------------------------------
// Load component list
// ---------------------------------------------------------------------------

let ALL_COMPONENTS;
try {
  const raw = fs.readFileSync(componentsFile, 'utf-8');
  ALL_COMPONENTS = JSON.parse(raw);
} catch (err) {
  console.error(`Failed to read component list from ${componentsFile}: ${err.message}`);
  process.exit(1);
}

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

async function loadPage(page, id, viewMode = 'docs') {
  const url = `${IFRAME_BASE}?id=${id}&viewMode=${viewMode}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT });
    await page.waitForTimeout(POST_LOAD_WAIT);
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

/**
 * Extract documentation content from a Storybook docs page.
 * Captures headings, description, code blocks, props tables,
 * CSS classes, styling hooks, and ARIA attributes.
 */
async function extractDocsContent(page) {
  const classRegexSource = CSS_CLASS_REGEX.source;
  const varRegexSource = CSS_VAR_REGEX.source;

  return await page.evaluate(({ classRe, varRe }) => {
    const classRegex = new RegExp(classRe, 'g');
    const varRegex = new RegExp(varRe, 'g');

    const root = document.querySelector('#storybook-docs') || document.body;
    const result = {};

    // Title
    const h1 = root.querySelector('h1');
    result.title = h1 ? h1.innerText.trim() : '';

    // Headings
    result.headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5')).map(h => ({
      level: h.tagName, text: h.innerText.trim()
    }));

    // Description (first 10 paragraphs with meaningful content)
    result.description = Array.from(root.querySelectorAll('p')).slice(0, 10)
      .map(p => p.innerText.trim()).filter(t => t.length > 5).join('\n\n');

    // Code blocks
    result.codeBlocks = Array.from(root.querySelectorAll('pre code, .docblock-source pre, pre'))
      .map(el => el.innerText.trim())
      .filter(t => t.length > 5);

    // Full text for fallback searches
    result.fullText = root.innerText;

    // Extract design-system-specific classes and variables from rendered HTML
    const html = root.innerHTML;
    result.sldsClasses = [...new Set((html.match(classRegex) || []))].sort();
    result.cssVars = [...new Set((html.match(varRegex) || []))].sort();
    result.ariaAttrs = [...new Set((html.match(/aria-[a-z]+="[^"]*"/g) || []))].sort();
    result.roles = [...new Set((html.match(/role="[^"]*"/g) || []))].sort();

    // Props / API tables
    result.tables = Array.from(root.querySelectorAll('table')).map(table => {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
      const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
      );
      return { headers, rows };
    });

    return result;
  }, { classRe: classRegexSource, varRe: varRegexSource });
}

/**
 * Extract rendered HTML from a single story view.
 * Recursively traverses shadow DOM to capture Web Component internals.
 */
async function extractStoryHtml(page, maxLen) {
  const classRegexSource = CSS_CLASS_REGEX.source;
  const varRegexSource = CSS_VAR_REGEX.source;

  return await page.evaluate(({ classRe, varRe, maxLength }) => {
    const classRegex = new RegExp(classRe, 'g');
    const varRegex = new RegExp(varRe, 'g');

    const root = document.querySelector('#storybook-root') || document.body;
    const html = root.innerHTML;

    // Recursively collect shadow DOM content
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

    const shadowContent = getShadowContent(root);
    const allHtml = html + shadowContent;

    return {
      html: allHtml.substring(0, maxLength),
      text: root.innerText,
      sldsClasses: [...new Set((allHtml.match(classRegex) || []))].sort(),
      cssVars: [...new Set((allHtml.match(varRegex) || []))].sort(),
      ariaAttrs: [...new Set((allHtml.match(/aria-[a-z]+="[^"]*"/g) || []))].sort(),
      roles: [...new Set((allHtml.match(/role="[^"]*"/g) || []))].sort(),
    };
  }, { classRe: classRegexSource, varRe: varRegexSource, maxLength: maxLen });
}

/**
 * Extract classes/vars/ARIA from sub-iframes embedded in docs pages.
 * Storybook embeds story previews as iframes within docs.
 */
async function extractFromSubFrames(page) {
  const classRegexSource = CSS_CLASS_REGEX.source;
  const varRegexSource = CSS_VAR_REGEX.source;
  const collected = { sldsClasses: [], cssVars: [], ariaAttrs: [], roles: [] };

  const frames = page.frames();
  for (const frame of frames) {
    if (frame === page.mainFrame()) continue;
    try {
      const frameData = await frame.evaluate(({ classRe, varRe }) => {
        const classRegex = new RegExp(classRe, 'g');
        const varRegex = new RegExp(varRe, 'g');
        const root = document.body;
        const html = root.innerHTML;

        function getShadowContent(el) {
          let c = '';
          if (el.shadowRoot) {
            c += el.shadowRoot.innerHTML;
            el.shadowRoot.querySelectorAll('*').forEach(ch => { c += getShadowContent(ch); });
          }
          el.querySelectorAll('*').forEach(ch => { c += getShadowContent(ch); });
          return c;
        }

        const all = html + getShadowContent(root);
        return {
          sldsClasses: [...new Set((all.match(classRegex) || []))],
          cssVars: [...new Set((all.match(varRegex) || []))],
          ariaAttrs: [...new Set((all.match(/aria-[a-z]+="[^"]*"/g) || []))],
          roles: [...new Set((all.match(/role="[^"]*"/g) || []))],
        };
      }, { classRe: classRegexSource, varRe: varRegexSource });

      collected.sldsClasses.push(...frameData.sldsClasses);
      collected.cssVars.push(...frameData.cssVars);
      collected.ariaAttrs.push(...frameData.ariaAttrs);
      collected.roles.push(...frameData.roles);
    } catch (_e) {
      // Cross-origin iframe — silently skip
    }
  }

  return collected;
}

// ---------------------------------------------------------------------------
// CSS extraction (Phase 2)
// ---------------------------------------------------------------------------

/**
 * Extract authored stylesheet rules and resolve CSS custom properties.
 * Returns { rules: {selector: {prop: val}}, varValues: {varName: resolvedVal}, usedClasses: string[] }
 */
async function extractCssRules(page) {
  const classRegexSource = CSS_CLASS_REGEX.source;

  return await page.evaluate(({ classRe }) => {
    const classRegex = new RegExp('\\.' + classRe.replace(/^/, ''));
    const rules = {};
    const varValues = {};

    // Pass 1: Extract stylesheet rules matching design-system selectors
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (!(rule instanceof CSSStyleRule)) continue;
          // Test if selector contains a design-system class
          if (!new RegExp('\\.' + classRe).test(rule.selectorText)) continue;

          const selector = rule.selectorText;
          if (!rules[selector]) rules[selector] = {};
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            const val = rule.style.getPropertyValue(prop).trim();
            if (val) rules[selector][prop] = val;
          }
        }
      } catch (_e) { /* SecurityError for cross-origin — skip */ }
    }

    // Pass 2: Resolve CSS custom properties referenced in values
    const rootStyle = getComputedStyle(document.documentElement);
    const varRe = /var\((--[a-zA-Z0-9_-]+)/g;
    for (const props of Object.values(rules)) {
      for (const val of Object.values(props)) {
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
    function getShadowHtml(el) {
      let c = '';
      if (el.shadowRoot) {
        c += el.shadowRoot.innerHTML;
        el.shadowRoot.querySelectorAll('*').forEach(ch => { c += getShadowHtml(ch); });
      }
      el.querySelectorAll('*').forEach(ch => { c += getShadowHtml(ch); });
      return c;
    }
    const allHtml = root.innerHTML + getShadowHtml(root);
    const usedClasses = [...new Set((allHtml.match(new RegExp(classRe, 'g')) || []))];

    return { rules, varValues, usedClasses };
  }, { classRe: classRegexSource });
}

/**
 * Filter extracted CSS rules to component-relevant ones.
 * Keeps rules whose selectors reference classes found in the rendered HTML.
 * Applies property filtering to remove noise.
 */
function filterCssRules(rawRules, varValues, usedClasses, maxSelectors = 20) {
  const usedSet = new Set(usedClasses);
  const scored = [];

  for (const [selector, props] of Object.entries(rawRules)) {
    // Skip interaction-state selectors
    if (/:hover|:focus(?!-visible)|:active|:visited/.test(selector)) continue;

    // Check relevance
    const selectorClasses = selector.match(new RegExp(CSS_CLASS_REGEX.source, 'g')) || [];
    const relevance = selectorClasses.filter(c => usedSet.has(c)).length;
    if (relevance === 0) continue;

    // Filter properties
    const filtered = {};
    for (const [prop, val] of Object.entries(props)) {
      if (prop.startsWith('-webkit-') || prop.startsWith('-moz-')) continue;
      if (OMIT_PROPS.has(prop)) continue;
      if (ALWAYS_INCLUDE_PROPS.has(prop) || NON_DEFAULT_PROPS.has(prop) || prop.startsWith('--')) {
        filtered[prop] = val;
      }
    }
    if (Object.keys(filtered).length === 0) continue;

    scored.push({
      selector,
      props: filtered,
      score: relevance * 10 + Object.keys(filtered).length,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxSelectors);
}

function formatCssDefinitions(filteredRules, varValues) {
  if (filteredRules.length === 0) return '';

  let md = `### CSS Definitions\n\n`;
  for (const { selector, props } of filteredRules) {
    // Truncate long selectors
    let sel = selector;
    if (sel.length > 100) {
      const parts = sel.split(',');
      sel = parts[0].trim();
      if (parts.length > 1) sel += `, /* +${parts.length - 1} more */`;
    }
    md += `\`${sel}\` {\n`;
    for (const [prop, val] of Object.entries(props)) {
      const varMatch = val.match(/var\((--[a-zA-Z0-9_-]+)\)/);
      if (varMatch && varValues[varMatch[1]]) {
        md += `  ${prop}: ${val} /* = ${varValues[varMatch[1]]} */;\n`;
      } else {
        md += `  ${prop}: ${val};\n`;
      }
    }
    md += `}\n\n`;
  }

  // Token table
  const referencedVars = new Set();
  for (const { props } of filteredRules) {
    for (const val of Object.values(props)) {
      const matches = val.matchAll(/var\((--[a-zA-Z0-9_-]+)\)/g);
      for (const m of matches) referencedVars.add(m[1]);
    }
  }
  const usedVars = [...referencedVars].filter(v => varValues[v]).sort();
  if (usedVars.length > 0) {
    md += `#### Resolved Tokens\n\n| Token | Value |\n|-------|-------|\n`;
    for (const v of usedVars) md += `| \`${v}\` | \`${varValues[v]}\` |\n`;
    md += '\n';
  }

  return md;
}

// ---------------------------------------------------------------------------
// Markdown generation helpers
// ---------------------------------------------------------------------------

function titleCase(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildComponentMarkdown(comp, docsData, allSldsClasses, allCssVars, allAriaAttrs, allRoles, allStoryHtml) {
  let md = `## ${comp.name}\n\n`;

  // Description from docs
  if (docsData) {
    if (docsData.title && docsData.title !== 'Storybook') {
      md += `**Component:** ${docsData.title}\n\n`;
    }
    if (docsData.description && docsData.description.length > 10) {
      md += `### Description\n\n${docsData.description}\n\n`;
    }
  }

  // Story variants
  md += `### Variants / Stories\n\n`;
  for (const s of comp.stories) {
    md += `- ${titleCase(s)}\n`;
  }
  md += '\n';

  // CSS classes
  const sortedClasses = [...allSldsClasses].sort();
  md += `### CSS Classes\n\n`;
  if (sortedClasses.length > 0) {
    for (const cls of sortedClasses) md += `- \`${cls}\`\n`;
  } else {
    md += `_No design-system classes found_\n`;
  }
  md += '\n';

  // Styling hooks (CSS custom properties)
  const sortedVars = [...allCssVars].sort();
  if (sortedVars.length > 0) {
    md += `### Styling Hooks\n\n`;
    for (const v of sortedVars) md += `- \`${v}\`\n`;
    md += '\n';
  }

  // Accessibility
  const sortedAria = [...allAriaAttrs].sort();
  const sortedRoles = [...allRoles].sort();
  if (sortedAria.length > 0 || sortedRoles.length > 0) {
    md += `### Accessibility\n\n`;
    if (sortedRoles.length > 0) {
      md += `**Roles:** ${sortedRoles.map(r => `\`${r}\``).join(', ')}\n\n`;
    }
    if (sortedAria.length > 0) {
      for (const a of sortedAria) md += `- \`${a}\`\n`;
      md += '\n';
    }
  }

  // Properties / API tables
  if (docsData && docsData.tables && docsData.tables.length > 0) {
    md += `### Properties / API\n\n`;
    for (const table of docsData.tables) {
      if (table.headers.length === 0 && table.rows.length === 0) continue;
      if (table.headers.length > 0) {
        md += '| ' + table.headers.join(' | ') + ' |\n';
        md += '| ' + table.headers.map(() => '---').join(' | ') + ' |\n';
      }
      for (const row of table.rows.slice(0, 20)) {
        md += '| ' + row.map(c => c.replace(/\n/g, ' ').substring(0, 80)).join(' | ') + ' |\n';
      }
      md += '\n';
    }
  }

  // Base story rendered HTML
  if (allStoryHtml['base']) {
    const html = allStoryHtml['base'].html;
    if (html.length > 30) {
      const truncated = html.length > 6000
        ? html.substring(0, 6000) + '\n...(truncated)'
        : html;
      md += `### Base Markup\n\n\`\`\`html\n${truncated}\n\`\`\`\n\n`;
    }
  }

  md += '---\n\n';
  return md;
}

// ---------------------------------------------------------------------------
// Main scraper
// ---------------------------------------------------------------------------

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1200 } });
  const page = await context.newPage();

  let output = `# Component Documentation - Batch ${batchNum}\n\n`;
  output += `Source: ${storybookBaseUrl}\n`;
  output += `Extracted on ${new Date().toISOString().split('T')[0]}\n\n---\n\n`;

  for (const comp of batch) {
    console.log(`\n========== ${comp.name} ==========`);
    const allSldsClasses = new Set();
    const allCssVars = new Set();
    const allAriaAttrs = new Set();
    const allRoles = new Set();
    const allStoryHtml = {};
    let docsData = null;

    // ---- Load docs page ----
    const docsId = `${STORY_ID_PREFIX}${comp.slug}--documentation`;
    console.log(`  Loading docs: ${docsId}`);
    const docsLoaded = await loadPage(page, docsId, 'docs');

    if (docsLoaded) {
      docsData = await extractDocsContent(page);
      console.log(`  Docs: "${docsData.title}", Classes: ${docsData.sldsClasses.length}`);

      docsData.sldsClasses.forEach(c => allSldsClasses.add(c));
      docsData.cssVars.forEach(c => allCssVars.add(c));
      docsData.ariaAttrs.forEach(c => allAriaAttrs.add(c));
      docsData.roles.forEach(c => allRoles.add(c));

      // Extract from sub-iframes (story previews embedded in docs)
      const frameData = await extractFromSubFrames(page);
      frameData.sldsClasses.forEach(c => allSldsClasses.add(c));
      frameData.cssVars.forEach(c => allCssVars.add(c));
      frameData.ariaAttrs.forEach(c => allAriaAttrs.add(c));
      frameData.roles.forEach(c => allRoles.add(c));
    }

    // ---- Load individual stories ----
    const storiesToLoad = comp.stories.slice(0, MAX_STORIES_PER_COMPONENT);
    for (const storySlug of storiesToLoad) {
      const storyId = `${STORY_ID_PREFIX}${comp.slug}--${storySlug}`;
      console.log(`  Story: ${storySlug}`);
      const loaded = await loadPage(page, storyId, 'story');
      if (loaded) {
        const storyData = await extractStoryHtml(page, MAX_HTML_LENGTH);
        allStoryHtml[storySlug] = storyData;
        storyData.sldsClasses.forEach(c => allSldsClasses.add(c));
        storyData.cssVars.forEach(c => allCssVars.add(c));
        storyData.ariaAttrs.forEach(c => allAriaAttrs.add(c));
        storyData.roles.forEach(c => allRoles.add(c));
      }
    }

    console.log(`  TOTAL - Classes: ${allSldsClasses.size}, Vars: ${allCssVars.size}, Aria: ${allAriaAttrs.size}`);

    // ---- Extract CSS rules (Phase 2) ----
    let cssDefinitions = '';
    if (allStoryHtml['base'] || Object.keys(allStoryHtml).length > 0) {
      // Use the first loaded story page for CSS extraction
      const firstStory = comp.stories[0];
      const storyId = `${STORY_ID_PREFIX}${comp.slug}--${firstStory}`;
      const cssLoaded = await loadPage(page, storyId, 'story');
      if (cssLoaded) {
        try {
          const { rules, varValues, usedClasses } = await extractCssRules(page);
          const filtered = filterCssRules(rules, varValues, usedClasses);
          cssDefinitions = formatCssDefinitions(filtered, varValues);
          console.log(`  CSS: ${filtered.length} relevant rules extracted`);
        } catch (e) {
          console.log(`  CSS extraction error: ${e.message}`);
        }
      }
    }

    // ---- Build markdown ----
    let compMd = buildComponentMarkdown(comp, docsData, allSldsClasses, allCssVars, allAriaAttrs, allRoles, allStoryHtml);
    // Insert CSS definitions before the --- separator
    if (cssDefinitions) {
      compMd = compMd.replace(/---\n\n$/, cssDefinitions + '---\n\n');
    }
    output += compMd;
  }

  // ---- Write output ----
  const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `batch-${batchNum}.md`);
  fs.writeFileSync(outFile, output);
  console.log(`\nDone! Written to ${outFile} (${output.length} chars, ${batch.length} components)`);

  await browser.close();
})();
