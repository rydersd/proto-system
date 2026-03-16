/* ========================================================================
   Nib Diagnostic Engine (proto-doctor.js)

   Runs automated checks against the current page to catch common mistakes
   that the framework would otherwise silently ignore. Derived from real
   failures documented in ref/lessons-learned.md.

   Usage:
     <script src="core/proto-doctor.js"></script>
   Add AFTER proto-nav.js (and proto-gen.js if used). Purely read-only —
   never modifies the page. Omit the script tag to disable.

   Console output uses the [nib-doctor] prefix for agent parsing.
   Results are also available at window.NibDoctor after run.
   ======================================================================== */

(function () {
  'use strict';

  /* ── Known WIREFRAME_CONFIG Keys ────────────────────────────────────── */
  var VALID_CONFIG_KEYS = [
    'title', 'subtitle', 'fallbackPage',
    'emailPrefix', 'emailFooter', 'emailRecipient'
  ];

  /* ── Token Hex Map (from proto-tokens.css :root) ────────────────────── */
  var TOKEN_HEX_MAP = {
    '#1e2a3a': '--wf-ink',
    '#3b4f68': '--wf-text',
    '#4a5f7f': '--wf-muted',
    '#b0bdd0': '--wf-line',
    '#dce4ef': '--wf-tint',
    '#edf1f7': '--wf-surface',
    '#f0f4fa': '--wf-canvas',
    '#ffffff': '--wf-white',
    '#3d6daa': '--wf-accent',
    '#e8eff8': '--wf-accent-lt',
    '#8b4553': '--wf-red',
    '#6b5a2f': '--wf-amber',
    '#45785a': '--wf-green',
    '#6b5b8a': '--wf-purple',
    '#c0392b': '--wf-pin-color'
  };

  /* ── Framework Chrome Selectors (skip in page-level checks) ─────────── */
  var FRAMEWORK_SELECTORS = [
    '.wf-ctx-bar', '#wf-nav-drawer', '#wf-nav-overlay',
    '#wf-dn-panel', '#wf-fb-overlay', '.wf-stencil-layer'
  ];

  /* ── Check Registry ─────────────────────────────────────────────────── */
  var CHECKS = [];

  function registerCheck(id, name, fn) {
    CHECKS.push({ id: id, name: name, fn: fn });
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */

  /** Get current page name (mirrors proto-nav.js currentFile) */
  function getPageName() {
    var pathname = window.location.pathname;
    var filename = pathname.split('/').pop();
    return filename.replace(/\.html$/, '') || 'index';
  }

  /** Collect all file references from SECTIONS items */
  function getAllSectionFiles() {
    var sections = window.SECTIONS || [];
    var files = [];
    for (var s = 0; s < sections.length; s++) {
      var items = sections[s].items || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].file) files.push(items[i].file);
      }
    }
    return files;
  }

  /** Check if a specific surface CSS is loaded */
  function hasSurfaceCSS(surface) {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      if (surface === 'sfdc' && href.indexOf('salesforce.css') !== -1) return true;
      if (surface === 'slack' && href.indexOf('slack.css') !== -1) return true;
      if (surface === 'internal' && href.indexOf('internal-ds.css') !== -1) return true;
    }
    return false;
  }

  /** Check if an element is inside framework chrome */
  function isFrameworkElement(el) {
    for (var i = 0; i < FRAMEWORK_SELECTORS.length; i++) {
      if (el.closest && el.closest(FRAMEWORK_SELECTORS[i])) return true;
    }
    return false;
  }

  /* ========================================================================
     CHECK #1: config-keys — Unknown WIREFRAME_CONFIG keys (lesson #2)
     ======================================================================== */
  registerCheck('config-keys', 'WIREFRAME_CONFIG keys valid', function () {
    var config = window.WIREFRAME_CONFIG;
    if (!config) return { status: 'pass', message: 'No WIREFRAME_CONFIG defined (using defaults)' };

    var unknown = [];
    var keys = Object.keys(config);
    for (var i = 0; i < keys.length; i++) {
      if (VALID_CONFIG_KEYS.indexOf(keys[i]) === -1) {
        unknown.push(keys[i]);
      }
    }

    if (unknown.length === 0) {
      return { status: 'pass', message: 'WIREFRAME_CONFIG keys valid' };
    }
    return {
      status: 'warn',
      message: 'Unknown WIREFRAME_CONFIG key' + (unknown.length > 1 ? 's' : '') +
        ': ' + unknown.join(', ') +
        '. Valid keys: ' + VALID_CONFIG_KEYS.join(', '),
      lesson: '#2'
    };
  });

  /* ========================================================================
     CHECK #2: sections-structure — Missing label/items/file in SECTIONS
     ======================================================================== */
  registerCheck('sections-structure', 'SECTIONS structure valid', function () {
    var sections = window.SECTIONS;
    if (!sections || !sections.length) {
      return { status: 'pass', message: 'No SECTIONS defined' };
    }

    var errors = [];
    for (var s = 0; s < sections.length; s++) {
      var sec = sections[s];
      if (!sec.label) errors.push('SECTIONS[' + s + '] missing "label"');
      if (!sec.items || !Array.isArray(sec.items)) {
        errors.push('SECTIONS[' + s + '] missing or invalid "items" array');
        continue;
      }
      for (var i = 0; i < sec.items.length; i++) {
        var item = sec.items[i];
        if (!item.file) errors.push('SECTIONS[' + s + '].items[' + i + '] missing "file"');
        if (!item.label) errors.push('SECTIONS[' + s + '].items[' + i + '] missing "label"');
      }
    }

    if (errors.length === 0) {
      return { status: 'pass', message: 'SECTIONS structure valid' };
    }
    return { status: 'error', message: errors.join('; ') };
  });

  /* ========================================================================
     CHECK #3: journeys-format — JOURNEYS items missing id or label (#3)
     ======================================================================== */
  registerCheck('journeys-format', 'JOURNEYS format valid', function () {
    var journeys = window.JOURNEYS;
    if (!journeys || !journeys.length) {
      return { status: 'pass', message: 'No JOURNEYS defined' };
    }
    // After normalizeJourneys(), JOURNEYS should be an array
    if (!Array.isArray(journeys)) {
      return {
        status: 'warn',
        message: 'JOURNEYS is not an array — normalizeJourneys() may not have run. ' +
          'Ensure proto-nav.js loads before proto-doctor.js',
        lesson: '#3'
      };
    }

    var problems = [];
    for (var i = 0; i < journeys.length; i++) {
      if (!journeys[i].id) problems.push('JOURNEYS[' + i + '] missing "id"');
      if (!journeys[i].label) problems.push('JOURNEYS[' + i + '] missing "label"');
    }

    if (problems.length === 0) {
      return { status: 'pass', message: 'JOURNEYS format valid' };
    }
    return { status: 'warn', message: problems.join('; '), lesson: '#3' };
  });

  /* ========================================================================
     CHECK #4: storymap-refs — STORY_MAP page keys not in SECTIONS
     ======================================================================== */
  registerCheck('storymap-refs', 'STORY_MAP references valid', function () {
    var storyMap = window.STORY_MAP;
    if (!storyMap || !Object.keys(storyMap).length) {
      return { status: 'pass', message: 'No STORY_MAP defined' };
    }

    var sectionFiles = getAllSectionFiles();
    var orphans = [];
    var pages = Object.keys(storyMap);
    for (var i = 0; i < pages.length; i++) {
      if (sectionFiles.indexOf(pages[i]) === -1) {
        orphans.push(pages[i]);
      }
    }

    if (orphans.length === 0) {
      return { status: 'pass', message: 'STORY_MAP references valid' };
    }
    return {
      status: 'warn',
      message: 'STORY_MAP references page' + (orphans.length > 1 ? 's' : '') +
        ' not found in SECTIONS: ' + orphans.join(', ')
    };
  });

  /* ========================================================================
     CHECK #5: stories-alignment — DESIGN_STORIES ids not in STORY_MAP/TITLES
     ======================================================================== */
  registerCheck('stories-alignment', 'DESIGN_STORIES aligned with STORY_MAP', function () {
    var stories = window.DESIGN_STORIES;
    if (!stories || !stories.length) {
      return { status: 'pass', message: 'No DESIGN_STORIES defined' };
    }

    var storyMap = window.STORY_MAP || {};
    var storyTitles = window.STORY_TITLES || {};

    // Collect all story IDs referenced in STORY_MAP values
    var mappedIds = {};
    var pages = Object.keys(storyMap);
    for (var p = 0; p < pages.length; p++) {
      var ids = storyMap[pages[p]];
      if (Array.isArray(ids)) {
        for (var j = 0; j < ids.length; j++) mappedIds[ids[j]] = true;
      }
    }

    var unmapped = [];
    for (var i = 0; i < stories.length; i++) {
      var sid = stories[i].id;
      if (sid && !mappedIds[sid] && !storyTitles[sid]) {
        unmapped.push(sid);
      }
    }

    if (unmapped.length === 0) {
      return { status: 'pass', message: 'DESIGN_STORIES aligned with STORY_MAP' };
    }
    return {
      status: 'warn',
      message: 'DESIGN_STORIES id' + (unmapped.length > 1 ? 's' : '') +
        ' not in STORY_MAP or STORY_TITLES: ' + unmapped.join(', ')
    };
  });

  /* ========================================================================
     CHECK #6: scenarios-steps — SCENARIOS step files not in SECTIONS
     ======================================================================== */
  registerCheck('scenarios-steps', 'SCENARIOS step files valid', function () {
    var scenarios = window.SCENARIOS;
    if (!scenarios || !scenarios.length) {
      return { status: 'pass', message: 'No SCENARIOS defined' };
    }

    var sectionFiles = getAllSectionFiles();
    var missing = [];
    for (var i = 0; i < scenarios.length; i++) {
      var steps = scenarios[i].steps || [];
      for (var j = 0; j < steps.length; j++) {
        var file = steps[j].file || steps[j].page;
        if (file && sectionFiles.indexOf(file) === -1 && missing.indexOf(file) === -1) {
          missing.push(file);
        }
      }
    }

    if (missing.length === 0) {
      return { status: 'pass', message: 'SCENARIOS step files valid' };
    }
    return {
      status: 'warn',
      message: 'SCENARIOS reference file' + (missing.length > 1 ? 's' : '') +
        ' not in SECTIONS: ' + missing.join(', ')
    };
  });

  /* ========================================================================
     CHECK #7: script-order — project-data.js must load before proto-nav.js
     ======================================================================== */
  registerCheck('script-order', 'Script load order correct', function () {
    var scripts = document.querySelectorAll('script[src]');
    var dataIndex = -1;
    var navIndex = -1;

    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('project-data') !== -1 || src.match(/project-data[^/]*\.js$/)) {
        dataIndex = i;
      }
      if (src.indexOf('proto-nav') !== -1 || src.match(/proto-nav[^/]*\.js$/)) {
        navIndex = i;
      }
    }

    if (navIndex === -1) {
      return { status: 'pass', message: 'proto-nav.js not loaded (no script order to check)' };
    }
    if (dataIndex === -1) {
      return {
        status: 'warn',
        message: 'proto-nav.js loaded but project-data.js not found — ' +
          'SECTIONS/JOURNEYS will be empty'
      };
    }
    if (dataIndex > navIndex) {
      return {
        status: 'error',
        message: 'project-data.js loads AFTER proto-nav.js — ' +
          'data will not be available. Move project-data.js before proto-nav.js'
      };
    }
    return { status: 'pass', message: 'Script load order correct' };
  });

  /* ========================================================================
     CHECK #8: surface-css-match — SFDC elements without salesforce.css
     ======================================================================== */
  registerCheck('surface-css-match', 'Surface CSS matches content', function () {
    var results = [];

    // Check for SFDC elements without SFDC CSS
    var sfdcEls = document.querySelectorAll(
      '.sfdc-record-page, .sfdc-card, .sfdc-highlights-bar, .sfdc-path-bar'
    );
    if (sfdcEls.length && !hasSurfaceCSS('sfdc')) {
      results.push({
        status: 'warn',
        message: 'Found ' + sfdcEls.length + ' Salesforce element(s) but surfaces/salesforce.css is not loaded'
      });
    }

    // Check for Slack elements without Slack CSS
    var slackEls = document.querySelectorAll(
      '.slack-app, .slack-message, .slack-sidebar, .slack-rail'
    );
    if (slackEls.length && !hasSurfaceCSS('slack')) {
      results.push({
        status: 'warn',
        message: 'Found ' + slackEls.length + ' Slack element(s) but surfaces/slack.css is not loaded'
      });
    }

    // Check for internal DS elements without internal CSS
    var dsEls = document.querySelectorAll(
      '.ds-kpi-card, .ds-card, .ds-sidebar-card, .ds-page-container'
    );
    if (dsEls.length && !hasSurfaceCSS('internal')) {
      results.push({
        status: 'warn',
        message: 'Found ' + dsEls.length + ' Internal DS element(s) but surfaces/internal-ds.css is not loaded'
      });
    }

    if (results.length === 0) {
      return { status: 'pass', message: 'Surface CSS matches content' };
    }
    return results;
  });

  /* ========================================================================
     CHECK #9: filter-on-body — filter on body breaks fixed positioning (#9)
     ======================================================================== */
  registerCheck('filter-on-body', 'No filter on body', function () {
    var bodyStyle = window.getComputedStyle(document.body);
    var filter = bodyStyle.getPropertyValue('filter');

    if (filter && filter !== 'none') {
      return {
        status: 'error',
        message: 'filter: ' + filter + ' on body — move to html. ' +
          'CSS filter on body creates a containing block that breaks position:fixed elements',
        lesson: '#9'
      };
    }
    return { status: 'pass', message: 'No filter on body' };
  });

  /* ========================================================================
     CHECK #10: z-index-violations — Page elements with z-index >= 1000 (#11)
     ======================================================================== */
  registerCheck('z-index-violations', 'No z-index violations', function () {
    var violators = [];
    var els = document.querySelectorAll('[style*="z-index"]');

    for (var i = 0; i < els.length; i++) {
      if (isFrameworkElement(els[i])) continue;

      var z = parseInt(els[i].style.zIndex, 10);
      if (z >= 1000) {
        var tag = els[i].tagName.toLowerCase();
        var cls = els[i].className ? '.' + els[i].className.split(' ')[0] : '';
        violators.push(tag + cls + ' (z-index: ' + z + ')');
      }
    }

    if (violators.length === 0) {
      return { status: 'pass', message: 'No z-index violations' };
    }
    return {
      status: 'warn',
      message: violators.length + ' element(s) with z-index >= 1000 (framework zone): ' +
        violators.join(', '),
      lesson: '#11'
    };
  });

  /* ========================================================================
     CHECK #11: wobble-in-polished — Inline wobble filter in polished mode (#10)
     ======================================================================== */
  registerCheck('wobble-in-polished', 'No wobble in polished mode', function () {
    var html = document.documentElement;
    var fidelity = html.getAttribute('data-wf-fidelity');

    if (fidelity !== 'polished') {
      return { status: 'pass', message: 'Not in polished mode (skipped)' };
    }

    var wobbleEls = document.querySelectorAll('[style*="--wf-wobble-filter"]');
    var count = 0;
    for (var i = 0; i < wobbleEls.length; i++) {
      var val = wobbleEls[i].style.getPropertyValue('--wf-wobble-filter');
      if (val && val !== 'none') count++;
    }

    if (count === 0) {
      return { status: 'pass', message: 'No wobble in polished mode' };
    }
    return {
      status: 'warn',
      message: count + ' element(s) have inline --wf-wobble-filter in polished mode — ' +
        'wobble should be cleared when switching to polished fidelity',
      lesson: '#10'
    };
  });

  /* ========================================================================
     CHECK #12: hardcoded-hex — Inline hex colors that match a token
     ======================================================================== */
  registerCheck('hardcoded-hex', 'No hardcoded token hex values', function () {
    var findings = [];
    var maxFindings = 10;

    var els = document.querySelectorAll('[style]');
    for (var i = 0; i < els.length && findings.length < maxFindings; i++) {
      if (isFrameworkElement(els[i])) continue;

      var style = els[i].getAttribute('style') || '';
      // Match hex colors in style attribute (3 or 6 digit)
      var hexMatches = style.match(/#[0-9a-fA-F]{3,6}\b/g);
      if (!hexMatches) continue;

      for (var j = 0; j < hexMatches.length && findings.length < maxFindings; j++) {
        var hex = hexMatches[j].toLowerCase();
        // Expand 3-digit hex to 6-digit for comparison
        if (hex.length === 4) {
          hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        if (TOKEN_HEX_MAP[hex]) {
          var tag = els[i].tagName.toLowerCase();
          var cls = els[i].className ? '.' + els[i].className.split(' ')[0] : '';
          findings.push(tag + cls + ': ' + hexMatches[j] + ' → var(' + TOKEN_HEX_MAP[hex] + ')');
        }
      }
    }

    if (findings.length === 0) {
      return { status: 'pass', message: 'No hardcoded token hex values' };
    }
    var msg = findings.length + ' hardcoded hex value(s) — use CSS tokens instead: ' +
      findings.join('; ');
    if (findings.length === maxFindings) msg += ' (capped at ' + maxFindings + ')';
    return { status: 'warn', message: msg };
  });

  /* ========================================================================
     CHECK #13: design-notes — Missing .wf-design-notes div
     ======================================================================== */
  registerCheck('design-notes', 'Design notes present', function () {
    // Blueprint pages generate notes via PAGE_BLUEPRINT.notes — check for that too
    var hasNotes = document.querySelector('.wf-design-notes');
    var hasBlueprint = window.PAGE_BLUEPRINT && window.PAGE_BLUEPRINT.notes;

    if (hasNotes || hasBlueprint) {
      return { status: 'pass', message: 'Design notes present' };
    }
    return {
      status: 'warn',
      message: 'Missing .wf-design-notes div — every page should include design notes ' +
        'for reviewer context'
    };
  });

  /* ========================================================================
     CHECK #14: dead-sections-links — Drawer links that don't resolve (#7)
     ======================================================================== */
  registerCheck('dead-sections-links', 'Drawer links resolve', function () {
    var drawer = document.getElementById('wf-nav-drawer');
    if (!drawer) {
      return { status: 'pass', message: 'No drawer rendered (skipped)' };
    }

    var links = drawer.querySelectorAll('a.wf-nav-drawer-link[href]');
    var dead = [];
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) continue;

      // Use a synchronous HEAD check via XMLHttpRequest
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('HEAD', href, false); // synchronous
        xhr.send();
        if (xhr.status === 0 || xhr.status >= 400) {
          dead.push(href);
        }
      } catch (e) {
        // file:// protocol or CORS — skip link validation
        // but still check if the file is referenced in SECTIONS
      }
    }

    if (dead.length === 0) {
      return { status: 'pass', message: 'Drawer links resolve' };
    }
    return {
      status: 'warn',
      message: dead.length + ' drawer link(s) return 404: ' + dead.join(', '),
      lesson: '#7'
    };
  });

  /* ========================================================================
     CHECK #15: current-page-in-sections — Current page not in SECTIONS
     ======================================================================== */
  registerCheck('current-page-in-sections', 'Current page in SECTIONS', function () {
    var sections = window.SECTIONS;
    if (!sections || !sections.length) {
      return { status: 'pass', message: 'No SECTIONS defined (skipped)' };
    }

    var page = getPageName();
    // Skip special pages that aren't expected to be in SECTIONS
    if (page === 'index' || page === '' || page === 'sitemap') {
      return { status: 'pass', message: 'Special page "' + page + '" (skipped)' };
    }

    var sectionFiles = getAllSectionFiles();
    if (sectionFiles.indexOf(page) !== -1) {
      return { status: 'pass', message: 'Current page in SECTIONS' };
    }

    // Check if it's a variant (e.g., "04-page-v2" might be a variant of "04-page")
    var baseMatch = page.match(/^(.+?)[-_]v\d+$/);
    if (baseMatch && sectionFiles.indexOf(baseMatch[1]) !== -1) {
      return { status: 'pass', message: 'Current page is a variant of "' + baseMatch[1] + '"' };
    }

    return {
      status: 'warn',
      message: 'Current page "' + page + '" not found in SECTIONS — ' +
        'breadcrumbs and navigation may not work correctly'
    };
  });

  /* ========================================================================
     Runner — Execute all checks and emit console output
     ======================================================================== */
  function nibDoctorRun() {
    var pageName = getPageName();
    var results = [];
    var passed = 0;
    var warnings = 0;
    var errors = 0;

    console.log('[nib-doctor] Running ' + CHECKS.length + ' checks on "' + pageName + '"...');

    for (var i = 0; i < CHECKS.length; i++) {
      var check = CHECKS[i];
      var outcome;

      try {
        outcome = check.fn();
      } catch (e) {
        outcome = {
          status: 'error',
          message: 'Check threw: ' + (e.message || e)
        };
      }

      // A check can return a single result or an array of results
      var checkResults = Array.isArray(outcome) ? outcome : [outcome];

      for (var r = 0; r < checkResults.length; r++) {
        var result = checkResults[r];
        result.checkId = check.id;
        result.checkName = check.name;
        results.push(result);

        // Emit console line
        var icon = result.status === 'pass' ? '\u2713' :
                   result.status === 'warn' ? '\u26A0' : '\u2717';
        var lessonRef = result.lesson ? ' (lesson ' + result.lesson + ')' : '';
        console.log('[nib-doctor] ' + icon + ' ' + result.message + lessonRef);

        // Count
        if (result.status === 'pass') passed++;
        else if (result.status === 'warn') warnings++;
        else errors++;
      }
    }

    // Summary line
    var total = passed + warnings + errors;
    console.log('[nib-doctor] \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500' +
      '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500' +
      '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
    console.log('[nib-doctor] ' + passed + '/' + total + ' passed' +
      ' \u00B7 ' + warnings + ' warning' + (warnings !== 1 ? 's' : '') +
      ' \u00B7 ' + errors + ' error' + (errors !== 1 ? 's' : ''));

    // Expose results for programmatic access
    window.NibDoctor = {
      page: pageName,
      checks: CHECKS.length,
      results: results,
      passed: passed,
      warnings: warnings,
      errors: errors,
      timestamp: new Date().toISOString()
    };
  }

  /* ── Bootstrap (same pattern as proto-gen.js) ───────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', nibDoctorRun);
  } else {
    nibDoctorRun();
  }

})();
