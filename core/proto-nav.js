/* ========================================================================
   Nib Navigation Engine (proto-nav.js)

   Reads data from window.SECTIONS, window.JOURNEYS, window.STORY_MAP,
   window.STORY_TITLES, window.SCENARIOS, window.DESIGN_STORIES,
   window.PROJECT_PHASES (all set by project-data.js).

   Load project-data.js BEFORE this file.
   ======================================================================== */

/* ========================================================================
   Data Structure Initialization — Read from window
   ======================================================================== */

// All data structures now default to empty arrays/objects if not set
var SECTIONS = window.SECTIONS || [];
var JOURNEYS = window.JOURNEYS || [];
var STORY_MAP = window.STORY_MAP || {};
var STORY_TITLES = window.STORY_TITLES || {};
var SCENARIOS = window.SCENARIOS || [];
var DESIGN_STORIES = window.DESIGN_STORIES || [];
var PROJECT_PHASES = window.PROJECT_PHASES || [];

/* ── WIREFRAME_CONFIG ── Project-level branding/defaults ──────────── */
var WF_CONFIG = Object.assign({
  title: 'Wireframes',
  subtitle: '',
  fallbackPage: 'index.html',
  emailPrefix: '[WF]',
  emailFooter: 'Sent from wireframe prototype',
  emailRecipient: ''
}, window.WIREFRAME_CONFIG || {});

/* ── normalizeJourneys ── Accept both array and object formats ──────── */
/**
 * JOURNEYS can be defined as an array (original format) or an object
 * with string keys (more natural for keyed data). This normalizes
 * object format to array format so the rest of the code can use .length
 * and array iteration consistently.
 *
 * Object format: { 'pricing-validation': { label: '...', steps: [...] } }
 * → Array format: [{ id: 'pricing-validation', label: '...', steps: [...] }]
 */
function normalizeJourneys() {
  if (!JOURNEYS) { JOURNEYS = []; return; }
  // Already an array — nothing to do
  if (Array.isArray(JOURNEYS)) return;
  // Object format — convert to array
  var arr = [];
  var keys = Object.keys(JOURNEYS);
  for (var i = 0; i < keys.length; i++) {
    var entry = JOURNEYS[keys[i]];
    entry.id = keys[i];
    arr.push(entry);
  }
  JOURNEYS = arr;
}
normalizeJourneys();

/* ========================================================================
   Utility Functions
   ======================================================================== */

/**
 * Parse current filename from window.location.pathname
 * E.g., "/path/to/04-deal-room-messages.html" → "04-deal-room-messages"
 */
function currentFile() {
  var pathname = window.location.pathname;
  var filename = pathname.split('/').pop(); // "04-deal-room-messages.html"
  return filename.replace(/\.html$/, ''); // "04-deal-room-messages"
}

/**
 * Search SECTIONS to find current page
 * Returns: { section, item, index, pageNum }
 * or null if not found
 */
function findPage(file) {
  var pageNum = 1;
  for (var s = 0; s < SECTIONS.length; s++) {
    var section = SECTIONS[s];
    for (var i = 0; i < section.items.length; i++) {
      var item = section.items[i];
      if (item.file === file) {
        return {
          section: section,
          item: item,
          index: i,
          pageNum: pageNum
        };
      }
      pageNum++;
    }
  }
  return null;
}

/**
 * Format current date/time for timestamp display
 * E.g., "2026-03-04 14:32"
 */
function formatTimestamp() {
  var now = new Date();
  var year = now.getFullYear();
  var month = String(now.getMonth() + 1).padStart(2, '0');
  var day = String(now.getDate()).padStart(2, '0');
  var hours = String(now.getHours()).padStart(2, '0');
  var mins = String(now.getMinutes()).padStart(2, '0');
  return year + '-' + month + '-' + day + ' ' + hours + ':' + mins;
}

/**
 * Build breadcrumb navigation HTML
 * E.g., "Deal Room Workspace › Deal Room Messages"
 */
function buildBreadcrumbs(file) {
  var page = findPage(file);
  if (!page) {
    return '<span class="wf-ctx-breadcrumb-text">Wireframes</span>';
  }

  var section = page.section;
  var item = page.item;

  return (
    '<a href="index.html" class="wf-ctx-breadcrumb-link">' +
      section.label +
    '</a>' +
    '<span class="wf-ctx-breadcrumb-sep">›</span>' +
    '<span class="wf-ctx-breadcrumb-current">' +
      item.label +
    '</span>'
  );
}

/**
 * Detect the surface type for the current page from SECTIONS
 * Returns 'sfdc', 'slack', 'internal', or null
 */
function detectSurface() {
  var file = currentFile();
  var page = findPage(file);
  if (page) return page.item.type || null;
  // Page not in SECTIONS — check variant parent or fallback
  for (var s = 0; s < SECTIONS.length; s++) {
    if (SECTIONS[s].items.length && SECTIONS[s].items[0].type) {
      return SECTIONS[s].items[0].type;
    }
  }
  return null;
}

/**
 * Build surface-specific app header (e.g., Salesforce global nav)
 * Injected AFTER the context bar, BEFORE page content
 */
function buildSurfaceHeader() {
  if (WF_CONFIG.noSurfaceHeader) return;
  if (document.querySelector('.sfdc-global-header')) return; // hand-built header exists
  var surface = detectSurface();
  if (surface !== 'sfdc') return;

  var file = currentFile();
  var page = findPage(file);
  var appName = WF_CONFIG.title || 'App';

  // Build tab items from SECTIONS (top-level only, no variants)
  var tabsHTML = '';
  for (var s = 0; s < SECTIONS.length; s++) {
    var section = SECTIONS[s];
    // Find the first non-variant item in this section for the link
    var firstItem = null;
    for (var i = 0; i < section.items.length; i++) {
      if (!section.items[i].variant) { firstItem = section.items[i]; break; }
    }
    if (!firstItem) continue;

    var isActive = page && page.section.id === section.id;
    tabsHTML += '<a href="' + firstItem.file + '.html" class="sfdc-global-tab' +
      (isActive ? ' sfdc-global-tab--active' : '') + '">' + section.label + '</a>';
  }

  var headerHTML =
    '<header class="sfdc-global-header">' +
      '<div class="sfdc-global-header-inner">' +
        '<div class="sfdc-global-header-left">' +
          '<button class="sfdc-app-launcher" title="App Launcher">⊞</button>' +
          '<span class="sfdc-app-name">' + appName + '</span>' +
        '</div>' +
        '<nav class="sfdc-global-tabs">' + tabsHTML + '</nav>' +
        '<div class="sfdc-global-header-right">' +
          '<span class="sfdc-global-icon" title="Search">⌕</span>' +
          '<span class="sfdc-global-icon" title="Notifications">🔔</span>' +
          '<span class="sfdc-global-avatar" title="User">U</span>' +
        '</div>' +
      '</div>' +
    '</header>';

  var el = document.createElement('div');
  el.innerHTML = headerHTML;
  // Insert after context bar
  var ctxBar = document.querySelector('.wf-ctx-bar');
  if (ctxBar && ctxBar.nextSibling) {
    ctxBar.parentNode.insertBefore(el.firstChild, ctxBar.nextSibling);
  } else {
    document.body.insertBefore(el.firstChild, document.body.firstChild);
  }
}

/**
 * Build and insert context bar as first child of body
 */
function buildContextBar() {
  var file = currentFile();
  var timestamp = formatTimestamp();

  var contextBarHTML = (
    '<div class="wf-ctx-bar">' +
      '<div class="wf-ctx-inner">' +
        '<div class="wf-ctx-left">' +
          '<button class="wf-ctx-hamburger" onclick="wfNavOpen()" title="Open navigation">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
          '<nav class="wf-ctx-breadcrumbs">' +
            buildBreadcrumbs(file) +
          '</nav>' +
        '</div>' +
        '<div class="wf-ctx-right">' +
          '<span class="wf-ctx-timestamp">' + timestamp + '</span>' +
          '<button class="wf-ctx-btn" id="wf-story-mode-btn" onclick="wfStoryModeToggle()" title="Story mode — guided scenario walkthroughs">📖 Stories</button>' +
          '<button class="wf-ctx-btn" onclick="wfDnToggle()" title="Show notes">📋 Notes</button>' +
          '<button class="wf-ctx-btn wf-ctx-feedback-btn" onclick="wfFbOpen()" title="Send feedback on this page">💬 Feedback</button>' +
          '<button class="wf-ctx-btn" id="wf-review-mode-btn" onclick="wfReviewToggle()" title="Toggle review mode — annotate elements with feedback">🔍 Review</button>' +
          '<div class="wf-ctx-fidelity">' +
            '<label>Fidelity</label>' +
            '<select id="wf-fidelity-select" onchange="wfFidelityChange(this.value)" title="Wireframe fidelity level">' +
              '<option value="0">Napkin</option>' +
              '<option value="1" selected>Blueprint</option>' +
              '<option value="2">Polished</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );

  var contextBar = document.createElement('div');
  contextBar.innerHTML = contextBarHTML;
  document.body.insertBefore(contextBar.firstChild, document.body.firstChild);
}

/**
 * Build navigation drawer with all sections and pages
 */
function buildDrawer() {
  if (!SECTIONS.length && !window.WF_FRAMEWORK_NAV) return;

  var file = currentFile();
  var drawerHTML = '';

  // Drawer overlay
  drawerHTML += (
    '<div class="wf-nav-overlay" id="wf-nav-overlay" onclick="wfNavClose()"></div>'
  );

  // Drawer panel
  drawerHTML += (
    '<nav class="wf-nav-drawer" id="wf-nav-drawer">' +
      '<div class="wf-nav-drawer-hd">' +
        '<div>' +
          '<div class="wf-nav-drawer-title">' + WF_CONFIG.title + '</div>' +
          '<div class="wf-nav-drawer-subtitle">' + WF_CONFIG.subtitle + '</div>' +
        '</div>' +
        '<button class="wf-nav-drawer-close" onclick="wfNavClose()" title="Close navigation">✕</button>' +
      '</div>' +
      '<div class="wf-nav-drawer-bd">'
  );

  // Sitemap link
  drawerHTML += (
    '<a href="index.html" class="wf-nav-drawer-link wf-nav-sitemap-link"' +
      ' onclick="wfNavClose()">' +
      '🗺 Sitemap & Journeys' +
    '</a>'
  );

  // Sections and items
  var pageNum = 1;
  for (var s = 0; s < SECTIONS.length; s++) {
    var section = SECTIONS[s];

    // Section header
    drawerHTML += (
      '<div class="wf-nav-drawer-section">' +
        (section.epic ? section.epic + ' — ' : '') + section.label +
      '</div>'
    );

    // Items in section
    for (var i = 0; i < section.items.length; i++) {
      var item = section.items[i];
      var isActive = (item.file === file);
      var activeClass = isActive ? ' wf-nav-active' : '';

      var itemHref = item.file + '.html';
      drawerHTML += (
        '<a href="' + itemHref + '" class="wf-nav-drawer-link' + activeClass + '"' +
          ' onclick="wfNavClose()">' +
          '<span class="wf-nav-page-num">' + String(pageNum).padStart(2, '0') + '</span>' +
          '<span class="wf-nav-page-label">' + item.label + '</span>' +
        '</a>'
      );

      pageNum++;
    }
  }

  // Framework navigation — cross-project links from framework-nav.js
  var fwNav = window.WF_FRAMEWORK_NAV;
  if (fwNav) {
    // Divider between project nav and framework nav
    drawerHTML += '<div style="border-top:1px dashed var(--wf-line);margin:12px 20px 8px;"></div>';

    // Examples section
    if (fwNav.examples && fwNav.examples.length) {
      drawerHTML += '<div class="wf-nav-drawer-section">Examples</div>';
      for (var e = 0; e < fwNav.examples.length; e++) {
        var ex = fwNav.examples[e];
        var exActive = (window.location.href.indexOf(ex.path.replace('index.html', '').replace('.html', '')) !== -1 && ex.path !== 'index.html') ? ' active' : '';
        drawerHTML += '<a href="' + ex.path + '" class="wf-nav-drawer-link' + exActive + '"' +
          ' onclick="wfNavClose()">' + ex.label + '</a>';
      }
    }

    // Documentation section
    if (fwNav.docs && fwNav.docs.length) {
      drawerHTML += '<div class="wf-nav-drawer-section">Documentation</div>';
      for (var d = 0; d < fwNav.docs.length; d++) {
        var doc = fwNav.docs[d];
        var docActive = (window.location.href.indexOf(doc.path.replace('.html', '')) !== -1) ? ' active' : '';
        drawerHTML += '<a href="' + doc.path + '" class="wf-nav-drawer-link' + docActive + '"' +
          ' onclick="wfNavClose()">' + doc.label + '</a>';
      }
    }
  }

  drawerHTML += (
    '      </div>' +
    '    </nav>'
  );

  var drawer = document.createElement('div');
  drawer.innerHTML = drawerHTML;

  // Insert drawer elements after body children
  var frag = document.createDocumentFragment();
  while (drawer.firstChild) {
    frag.appendChild(drawer.firstChild);
  }
  document.body.appendChild(frag);
}

/**
 * Build design notes panel overlay and sidebar with 3 tabs:
 * Context (summary, JTBD, personas), Design (spec), Technical (implementation)
 */
function buildDesignNotesPanel() {
  var overlay = document.createElement('div');
  overlay.id = 'wf-dn-overlay';
  overlay.className = 'wf-dn-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('onclick', 'wfDnClose()');

  var panel = document.createElement('aside');
  panel.id = 'wf-dn-panel';
  panel.className = 'wf-dn-panel';
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', 'Notes panel');
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML =
    '<div class="wf-dn-hd">' +
      '<span class="wf-dn-hd-title">📋 Notes</span>' +
      '<button class="wf-dn-close" onclick="wfDnClose()" aria-label="Close notes panel">✕</button>' +
    '</div>' +
    '<div class="wf-dn-tabs" role="tablist">' +
      '<button class="wf-dn-tab active" role="tab" aria-selected="true" aria-controls="wf-dn-tab-context" id="wf-dn-tab-btn-context" onclick="wfDnSwitchTab(\'context\')">Context</button>' +
      '<button class="wf-dn-tab" role="tab" aria-selected="false" aria-controls="wf-dn-tab-design" id="wf-dn-tab-btn-design" onclick="wfDnSwitchTab(\'design\')">Design</button>' +
      '<button class="wf-dn-tab" role="tab" aria-selected="false" aria-controls="wf-dn-tab-impl" id="wf-dn-tab-btn-impl" onclick="wfDnSwitchTab(\'impl\')">Technical</button>' +
      '<button class="wf-dn-tab" role="tab" aria-selected="false" aria-controls="wf-dn-tab-reviews" id="wf-dn-tab-btn-reviews" onclick="wfDnSwitchTab(\'reviews\')">Reviews</button>' +
    '</div>' +
    '<div class="wf-dn-body" id="wf-dn-body">' +
      '<div class="wf-dn-tab-content active" id="wf-dn-tab-context" role="tabpanel" aria-labelledby="wf-dn-tab-btn-context"></div>' +
      '<div class="wf-dn-tab-content" id="wf-dn-tab-design" role="tabpanel" aria-labelledby="wf-dn-tab-btn-design"></div>' +
      '<div class="wf-dn-tab-content" id="wf-dn-tab-impl" role="tabpanel" aria-labelledby="wf-dn-tab-btn-impl"></div>' +
      '<div class="wf-dn-tab-content" id="wf-dn-tab-reviews" role="tabpanel" aria-labelledby="wf-dn-tab-btn-reviews"></div>' +
    '</div>';

  document.body.appendChild(overlay);
  document.body.appendChild(panel);
}

/* ========================================================================
   Control Functions — Toggle Drawer & Design Notes
   ======================================================================== */

/**
 * Open navigation drawer
 */
function wfNavOpen() {
  var drawer = document.getElementById('wf-nav-drawer');
  var overlay = document.getElementById('wf-nav-overlay');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
}

/**
 * Close navigation drawer
 */
function wfNavClose() {
  var drawer = document.getElementById('wf-nav-drawer');
  var overlay = document.getElementById('wf-nav-overlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

/**
 * Toggle design notes panel open/closed
 */
function wfDnToggle() {
  var panel = document.getElementById('wf-dn-panel');
  var overlay = document.getElementById('wf-dn-overlay');

  if (panel && panel.classList.contains('open')) {
    wfDnClose();
  } else {
    wfDnOpen();
  }
}

/**
 * Open design notes panel with 3-tab auto-split
 * Pulls content from .wf-design-notes (preferred) or #spec-panel (legacy)
 * Splits into Context / Design / Technical tabs by detecting h3 headings
 */
function wfDnOpen() {
  var panel = document.getElementById('wf-dn-panel');
  var overlay = document.getElementById('wf-dn-overlay');
  if (!panel) return;

  // Push main content left so it doesn't clip behind the panel
  document.documentElement.classList.add('wf-dn-open');

  // Populate Context tab (summary, JTBD, personas)
  var contextTab = document.getElementById('wf-dn-tab-context');
  if (contextTab) {
    var ctxSrc = document.querySelector('.wf-context-notes');
    if (ctxSrc) {
      contextTab.innerHTML = ctxSrc.innerHTML;
    } else {
      var dnSrc = document.querySelector('.wf-design-notes');
      var legacySrc = !dnSrc ? document.getElementById('spec-panel') : null;
      var sourceEl = dnSrc || legacySrc;
      if (sourceEl) {
        var html = sourceEl.innerHTML;
        var splitIdx = html.search(/<h3[^>]*>\s*(Design Spec|Design Notes|Design Specification)/i);
        if (splitIdx > 0) {
          contextTab.innerHTML = html.substring(0, splitIdx);
        } else {
          contextTab.innerHTML = html;
        }
      } else {
        contextTab.innerHTML = '<p class="wf-dn-placeholder">No context notes have been added to this page yet.</p>';
      }
    }

    // Inject AC badges from STORY_MAP into Context tab
    var file = currentFile();
    var stories = STORY_MAP[file];
    if (stories && stories.length && contextTab) {
      var badgesHTML = '<div class="wf-dn-ac-badges">';
      for (var i = 0; i < stories.length; i++) {
        var sid = stories[i];
        var title = STORY_TITLES[sid] || '';
        if (DESIGN_STORIES.length) {
          var anchor = sid.replace(/\./g, '-');
          badgesHTML += '<a class="wf-dn-ac-badge" href="design-stories.html#story-' + anchor + '" title="' + title + '">' + sid + '</a>';
        } else {
          badgesHTML += '<span class="wf-dn-ac-badge" title="' + title + '">' + sid + '</span>';
        }
      }
      badgesHTML += '</div>';
      contextTab.innerHTML = badgesHTML + contextTab.innerHTML;
    }
  }

  // Populate Design tab (spec, components, interactions)
  var designTab = document.getElementById('wf-dn-tab-design');
  if (designTab) {
    var desSrc = document.querySelector('.wf-design-notes-spec');
    if (desSrc) {
      designTab.innerHTML = desSrc.innerHTML;
    } else {
      var dnSrc2 = document.querySelector('.wf-design-notes');
      var legacySrc2 = !dnSrc2 ? document.getElementById('spec-panel') : null;
      var sourceEl2 = dnSrc2 || legacySrc2;
      if (sourceEl2) {
        var html2 = sourceEl2.innerHTML;
        var designStart = html2.search(/<h3[^>]*>\s*(Design Spec|Design Notes|Design Specification)/i);
        var techStart = html2.search(/<h3[^>]*>\s*Technical Details/i);
        if (designStart > 0) {
          designTab.innerHTML = html2.substring(designStart, techStart > designStart ? techStart : undefined);
        } else {
          designTab.innerHTML = '<p class="wf-dn-placeholder">No design specifications have been added to this page yet.</p>';
        }
      } else {
        designTab.innerHTML = '<p class="wf-dn-placeholder">No design specifications have been added to this page yet.</p>';
      }
    }
  }

  // Populate Technical tab (implementation details, SF objects, validation)
  var implTab = document.getElementById('wf-dn-tab-impl');
  if (implTab) {
    var implSrc = document.querySelector('.wf-impl-notes');
    if (implSrc) {
      implTab.innerHTML = implSrc.innerHTML;
    } else {
      var dnSrc3 = document.querySelector('.wf-design-notes');
      var legacySrc3 = !dnSrc3 ? document.getElementById('spec-panel') : null;
      var sourceEl3 = dnSrc3 || legacySrc3;
      if (sourceEl3) {
        var html3 = sourceEl3.innerHTML;
        var techIdx = html3.search(/<h3[^>]*>\s*Technical Details/i);
        if (techIdx > 0) {
          implTab.innerHTML = html3.substring(techIdx);
        } else {
          implTab.innerHTML = '<p class="wf-dn-placeholder">No technical details have been added to this page yet.</p>';
        }
      } else {
        implTab.innerHTML = '<p class="wf-dn-placeholder">No technical details have been added to this page yet.</p>';
      }
    }
  }

  // Populate Reviews tab
  var reviewsTab = document.getElementById('wf-dn-tab-reviews');
  if (reviewsTab) {
    wfReviewPopulateTab(reviewsTab);
  }

  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  if (overlay) { overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); }
  var closeBtn = panel.querySelector('.wf-dn-close');
  if (closeBtn) closeBtn.focus();
}

/**
 * Close design notes panel
 */
function wfDnClose() {
  var panel = document.getElementById('wf-dn-panel');
  var overlay = document.getElementById('wf-dn-overlay');
  if (panel) { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); }
  if (overlay) { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); }
  document.documentElement.classList.remove('wf-dn-open');
}

/**
 * Switch between Context / Design / Technical tabs
 */
function wfDnSwitchTab(tab) {
  var tabs = document.querySelectorAll('.wf-dn-tab');
  var panels = document.querySelectorAll('.wf-dn-tab-content');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('active');
    tabs[i].setAttribute('aria-selected', 'false');
  }
  for (var j = 0; j < panels.length; j++) {
    panels[j].classList.remove('active');
  }
  var activeBtn = document.getElementById('wf-dn-tab-btn-' + tab);
  var activePanel = document.getElementById('wf-dn-tab-' + tab);
  if (activeBtn) { activeBtn.classList.add('active'); activeBtn.setAttribute('aria-selected', 'true'); }
  if (activePanel) { activePanel.classList.add('active'); }
}

/* ========================================================================
   Story Mode — User Journey Highlighting
   ======================================================================== */

var _storyModeDropdownOpen = false;

/**
 * Build the story mode selector dropdown from SCENARIOS.
 * Lists each scenario with persona badge, label, and step count.
 * If no SCENARIOS defined, the Stories button is hidden entirely.
 */
function buildStoryModeSelector() {
  var btn = document.getElementById('wf-story-mode-btn');

  if (!SCENARIOS.length) {
    // No scenarios — hide the Stories button entirely
    if (btn) btn.style.display = 'none';
    return;
  }

  // Build dropdown
  var dd = document.createElement('div');
  dd.className = 'wf-story-mode-dropdown';
  dd.id = 'wf-story-mode-dropdown';
  dd.style.display = 'none';
  dd.innerHTML = '<div class="wf-story-mode-dropdown-title">Scenarios</div>';

  for (var i = 0; i < SCENARIOS.length; i++) {
    var s = SCENARIOS[i];
    dd.innerHTML +=
      '<button class="wf-story-mode-item" onclick="wfScenarioStart(\'' + s.id + '\')">' +
        '<span class="wf-story-mode-item-persona">' + s.persona + '</span>' +
        s.label +
        '<span class="wf-story-mode-item-steps">' + s.steps.length + ' steps</span>' +
      '</button>';
  }

  document.body.appendChild(dd);

  // If a scenario is currently active, mark the button
  var raw = sessionStorage.getItem('wf_scenario');
  if (raw) {
    if (btn) btn.classList.add('wf-ctx-btn--active');
  }

  // Also build the journey story bar (hidden until journey highlighting is active)
  var bar = document.createElement('div');
  bar.className = 'wf-story-bar';
  bar.id = 'wf-story-bar';
  bar.style.display = 'none';
  bar.innerHTML =
    '<span class="wf-story-bar-label" id="wf-story-bar-label"></span>' +
    '<button class="wf-story-bar-close" onclick="wfStoryClear()" title="Exit story mode">\u2715 Exit</button>';

  var ctxBar = document.querySelector('.wf-ctx-bar');
  if (ctxBar && ctxBar.nextSibling) {
    ctxBar.parentNode.insertBefore(bar, ctxBar.nextSibling);
  } else {
    document.body.appendChild(bar);
  }
}

/**
 * Toggle the story mode selector dropdown.
 * If a scenario is active, exit it instead of opening the dropdown.
 */
function wfStoryModeToggle() {
  // If scenario is active, exit it
  var raw = sessionStorage.getItem('wf_scenario');
  if (raw) {
    wfScenarioExit();
    return;
  }

  var dd = document.getElementById('wf-story-mode-dropdown');
  if (!dd) return;

  _storyModeDropdownOpen = !_storyModeDropdownOpen;
  dd.style.display = _storyModeDropdownOpen ? 'block' : 'none';

  if (_storyModeDropdownOpen) {
    setTimeout(function() {
      document.addEventListener('click', _storyModeOutsideClick);
    }, 10);
  }
}

function _storyModeOutsideClick(e) {
  var dd = document.getElementById('wf-story-mode-dropdown');
  var btn = document.getElementById('wf-story-mode-btn');
  if (dd && !dd.contains(e.target) && btn && !btn.contains(e.target)) {
    dd.style.display = 'none';
    _storyModeDropdownOpen = false;
    document.removeEventListener('click', _storyModeOutsideClick);
  }
}

/* Journey selection is now triggered automatically by scenario mode.
   wfStoryApply/wfStoryClear/wfStoryCleanDOM are kept for journey highlighting. */

/**
 * Apply story mode for a specific journey
 */
function wfStoryApply(journeyId) {
  // Find the journey definition
  var journey = null;
  for (var i = 0; i < JOURNEYS.length; i++) {
    if (JOURNEYS[i].id === journeyId) { journey = JOURNEYS[i]; break; }
  }
  if (!journey) return;

  // Clear any previous story mode
  wfStoryCleanDOM();

  // Activate story mode
  document.documentElement.classList.add('story-active');

  // Mark matching elements
  var els = document.querySelectorAll('[data-journey]');
  for (var i = 0; i < els.length; i++) {
    var journeys = els[i].getAttribute('data-journey').split(/\s+/);
    if (journeys.indexOf(journeyId) !== -1) {
      els[i].classList.add('story-hit');

      // Add annotation label
      var label = els[i].getAttribute('data-journey-label');
      var step = els[i].getAttribute('data-journey-step');
      if (label) {
        // Ensure positioned parent
        var pos = window.getComputedStyle(els[i]).position;
        if (pos === 'static') els[i].style.position = 'relative';

        var chip = document.createElement('span');
        chip.className = 'story-label';
        chip.textContent = (step ? step + '. ' : '') + label;
        els[i].appendChild(chip);
      }
    }
  }

  // Show story bar
  var bar = document.getElementById('wf-story-bar');
  var barLabel = document.getElementById('wf-story-bar-label');
  if (bar) bar.style.display = 'flex';
  if (barLabel) barLabel.textContent = '📖 Journey: ' + journey.label;

}

/**
 * Clear story mode
 */
function wfStoryClear() {
  sessionStorage.removeItem('wf_story_journey');
  wfStoryCleanDOM();

  var bar = document.getElementById('wf-story-bar');
  if (bar) bar.style.display = 'none';
}

/**
 * Clean DOM of story mode artifacts
 */
function wfStoryCleanDOM() {
  document.documentElement.classList.remove('story-active');

  var hits = document.querySelectorAll('.story-hit');
  for (var i = 0; i < hits.length; i++) {
    hits[i].classList.remove('story-hit');
    if (hits[i].style.position === 'relative') hits[i].style.position = '';
  }

  var labels = document.querySelectorAll('.story-label');
  for (var i = 0; i < labels.length; i++) {
    labels[i].parentNode.removeChild(labels[i]);
  }
}

/* ========================================================================
   MODAL INTERACTIONS — close, save, check-actions
   ======================================================================== */

/**
 * Close the current modal and return to the originating page.
 * Falls back to 04-deal-room-messages.html if no referrer.
 */
function wfModalClose() {
  var ref = document.referrer;
  if (ref && ref.indexOf(location.host) !== -1 && ref !== location.href) {
    wfNavigate(ref);
  } else {
    wfNavigate(WF_CONFIG.fallbackPage);
  }
}

/**
 * Save action: set a sessionStorage flag, then close modal.
 * Optionally navigate to a specific page instead of referrer.
 * @param {string} actionKey — e.g. 'meddpicc_updated'
 * @param {string} [dest] — optional destination URL (overrides referrer)
 */
function wfModalSave(actionKey, dest) {
  sessionStorage.setItem('wf_action', actionKey);
  if (dest) {
    wfNavigate(dest);
  } else {
    wfModalClose();
  }
}

/**
 * On page load, check for pending action flags and swap DOM accordingly.
 * Elements use data-wf-show="actionKey" (hidden by default, revealed on match)
 * and data-wf-hide="actionKey" (visible by default, hidden on match).
 * Supports space-separated action keys on a single attribute.
 */
function wfCheckActions() {
  var action = sessionStorage.getItem('wf_action');
  if (!action) return;
  sessionStorage.removeItem('wf_action');

  // Show elements tagged for this action
  document.querySelectorAll('[data-wf-show]').forEach(function(el) {
    var keys = el.getAttribute('data-wf-show').split(/\s+/);
    if (keys.indexOf(action) !== -1) {
      el.classList.remove('wf-hidden');
      el.classList.add('wf-just-updated');
    }
  });

  // Hide elements tagged for this action
  document.querySelectorAll('[data-wf-hide]').forEach(function(el) {
    var keys = el.getAttribute('data-wf-hide').split(/\s+/);
    if (keys.indexOf(action) !== -1) {
      el.classList.add('wf-hidden');
    }
  });
}

/**
 * Auto-wire modal escape hatches on any page that has .slack-modal-overlay.
 * Handles: overlay click, X button, Cancel button, ESC key.
 */
function wfInitModals() {
  var overlays = document.querySelectorAll('.slack-modal-overlay');
  if (!overlays.length) return;

  // Wire overlay click (click outside modal to close)
  overlays.forEach(function(overlay) {
    // Don't double-bind if already has onclick
    if (overlay.getAttribute('onclick')) return;
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) wfModalClose();
    });
  });

  // Wire all X close buttons
  document.querySelectorAll('.slack-modal-close').forEach(function(btn) {
    if (btn.getAttribute('onclick')) return;
    btn.addEventListener('click', function() { wfModalClose(); });
    btn.setAttribute('aria-label', 'Close modal');
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
  });

  // Wire Cancel buttons (buttons in modal footer that are NOT primary)
  document.querySelectorAll('.slack-modal-footer .slack-btn:not(.slack-btn-primary)').forEach(function(btn) {
    if (btn.getAttribute('onclick')) return;
    if (btn.textContent.trim().toLowerCase() === 'cancel') {
      btn.addEventListener('click', function() { wfModalClose(); });
    }
  });

  // ESC key listener
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var visible = document.querySelector('.slack-modal-overlay');
      if (visible && visible.offsetParent !== null) {
        wfModalClose();
      }
    }
  });
}

/* ========================================================================
   TOAST NOTIFICATIONS
   ======================================================================== */

/**
 * Show a temporary toast notification at the bottom of the screen.
 * @param {string} msg — Text to display
 * @param {number} [duration=3000] — How long the toast is visible (ms)
 */
function wfToast(msg, duration) {
  duration = duration || 3000;
  var el = document.createElement('div');
  el.className = 'wf-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function() { el.classList.add('wf-toast-out'); }, duration - 300);
  setTimeout(function() { el.remove(); }, duration);
}

/* ========================================================================
   SCROLL-TO-THREAD — MEDDPICC chip strip → thread stub
   ======================================================================== */

/**
 * Smooth-scroll to the thread stub matching a chip's href anchor,
 * then flash-highlight it so the user sees which thread they landed on.
 * Called from onclick on .meddpicc-chip links in the strip.
 */
function wfScrollToThread(chipEl) {
  var id = chipEl.getAttribute('href').replace('#', '');
  var target = document.getElementById(id);
  if (!target) return;

  // If the target is hidden (wf-hidden), try the "-after" variant
  if (target.classList.contains('wf-hidden')) {
    var alt = document.getElementById(id + '-after');
    if (alt && !alt.classList.contains('wf-hidden')) target = alt;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Flash highlight
  target.classList.add('wf-scroll-highlight');
  setTimeout(function() { target.classList.remove('wf-scroll-highlight'); }, 1500);

  // Also open thread panel if present
  wfThreadOpen();
}

/**
 * Open / close the thread panel.
 * Thread stubs in the feed call wfThreadOpen() on click.
 * The ✕ button in the thread header calls wfThreadClose().
 */
function wfThreadOpen() {
  var panel = document.querySelector('.slack-thread-panel');
  if (panel) panel.classList.add('open');
}

function wfThreadClose() {
  var panel = document.querySelector('.slack-thread-panel');
  if (panel) panel.classList.remove('open');
}

/**
 * Auto-wire thread stubs → open panel on click,
 * and close button → close panel.
 * Called from wfNavInit.
 */
function wfInitThreadPanel() {
  // Thread stubs open the panel
  var stubs = document.querySelectorAll('.slack-message--thread-stub');
  for (var i = 0; i < stubs.length; i++) {
    stubs[i].style.cursor = 'pointer';
    stubs[i].addEventListener('click', function(e) {
      // Don't hijack clicks on links inside the stub
      if (e.target.tagName === 'A') return;
      wfThreadOpen();
    });
  }
  // Close button
  var closeBtn = document.querySelector('.slack-thread-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      wfThreadClose();
    });
  }
}

/* Design Stories dropdown removed — AC badges now injected into Notes Context tab */

/* ========================================================================
   FEEDBACK PANEL — Screenshot Paste, Page Context, Email
   ======================================================================== */

var _wfFbScreenshot = null;

/**
 * Build page context string for feedback emails
 */
function wfFbPageContext() {
  var file = currentFile();
  var page = findPage(file);
  var lines = [];

  lines.push('Page: ' + file);
  if (page) {
    lines.push('Section: ' + page.section.label);
    lines.push('Screen: ' + page.item.label);
  }

  var stories = STORY_MAP[file];
  if (stories && stories.length) {
    var storyLines = stories.map(function(sid) {
      return sid + ' — ' + (STORY_TITLES[sid] || '');
    });
    lines.push('Design Stories: ' + storyLines.join(', '));
  }

  lines.push('URL: ' + window.location.href);
  return lines.join('\n');
}

/**
 * Build and inject the feedback panel DOM
 */
function buildFeedbackPanel() {
  if (document.getElementById('wf-fb-overlay')) return;

  var file = currentFile();
  var page = findPage(file);
  var pageLabel = page ? page.item.label : file;

  // Story chips for this page
  var stories = STORY_MAP[file] || [];
  var storyChipsHTML = '';
  if (stories.length) {
    storyChipsHTML = '<div class="wf-fb-stories">';
    for (var i = 0; i < stories.length; i++) {
      storyChipsHTML += '<span class="wf-fb-story-chip" title="' +
        (STORY_TITLES[stories[i]] || '') + '">' + stories[i] + '</span>';
    }
    storyChipsHTML += '</div>';
  }

  var typeDefs = [
    { val: 'question',   label: 'Question',   icon: '❓' },
    { val: 'issue',      label: 'Issue',       icon: '🔴' },
    { val: 'suggestion', label: 'Suggestion',  icon: '💡' },
    { val: 'approved',   label: 'Approved',    icon: '✅' }
  ];

  var typePillsHTML = '';
  for (var t = 0; t < typeDefs.length; t++) {
    var td = typeDefs[t];
    typePillsHTML += '<label class="wf-fb-type-pill">' +
      '<input type="radio" name="wf-fb-type" value="' + td.val + '"' +
      (td.val === 'question' ? ' checked' : '') + '>' +
      '<span>' + td.icon + '\u00a0' + td.label + '</span>' +
      '</label>';
  }

  var html =
    '<div class="wf-fb-overlay" id="wf-fb-overlay" onclick="if(event.target===this)wfFbClose()">' +
      '<div class="wf-fb-panel" role="dialog" aria-modal="true" aria-label="Feedback">' +

        '<div class="wf-fb-hd">' +
          '<div class="wf-fb-hd-left">' +
            '<span class="wf-fb-hd-title">💬 Feedback</span>' +
            '<span class="wf-fb-page-badge">' + pageLabel + '</span>' +
          '</div>' +
          '<button class="wf-fb-hd-close" onclick="wfFbClose()" aria-label="Close feedback">✕</button>' +
        '</div>' +

        storyChipsHTML +

        '<form id="wf-fb-form" class="wf-fb-body" onsubmit="wfFbSubmit(event)" novalidate>' +

          '<div class="wf-fb-field">' +
            '<div class="wf-fb-label">Type</div>' +
            '<div class="wf-fb-type-pills">' + typePillsHTML + '</div>' +
          '</div>' +

          '<div class="wf-fb-field">' +
            '<label class="wf-fb-label" for="wf-fb-desc">Description</label>' +
            '<textarea id="wf-fb-desc" class="wf-fb-textarea" rows="4" ' +
              'placeholder="Describe the feedback, question, or issue\u2026" required></textarea>' +
          '</div>' +

          '<div class="wf-fb-field">' +
            '<div class="wf-fb-label">Screenshot <span class="wf-fb-optional">(optional)</span></div>' +
            '<div class="wf-fb-drop" id="wf-fb-img-drop" ' +
              'ondragover="event.preventDefault()" ondrop="wfFbDropImage(event)" ' +
              'onclick="document.getElementById(\'wf-fb-img-input\').click()" ' +
              'role="button" tabindex="0" aria-label="Upload screenshot">' +
              '<span id="wf-fb-img-drop-text" class="wf-fb-drop-hint">' +
                'Paste, drop, or click to upload a screenshot' +
              '</span>' +
              '<img id="wf-fb-img-preview" class="wf-fb-img-preview" alt="Screenshot preview" style="display:none">' +
            '</div>' +
            '<div class="wf-fb-img-actions">' +
              '<button type="button" class="wf-fb-paste-btn" onclick="wfFbPasteClipboard()">\u2318V Paste screenshot</button>' +
              '<button type="button" class="wf-fb-clear-btn" id="wf-fb-clear-btn" ' +
                'onclick="wfFbClearImage()" style="display:none">\u00d7 Remove</button>' +
            '</div>' +
            '<input type="file" id="wf-fb-img-input" accept="image/*" ' +
              'style="display:none" onchange="wfFbImageFile(event)">' +
          '</div>' +

          '<div class="wf-fb-actions">' +
            '<button type="submit" class="wf-fb-submit-btn">Send Feedback</button>' +
          '</div>' +

        '</form>' +

      '</div>' +
    '</div>';

  document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Open feedback panel
 */
function wfFbOpen() {
  var overlay = document.getElementById('wf-fb-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.classList.add('wf-fb-open');
  setTimeout(function() {
    var desc = document.getElementById('wf-fb-desc');
    if (desc) desc.focus();
  }, 150);
}

/**
 * Close feedback panel
 */
function wfFbClose() {
  var overlay = document.getElementById('wf-fb-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.classList.remove('wf-fb-open');
}

/**
 * Image handling — drop, file picker, paste
 */
function wfFbDropImage(e) {
  e.preventDefault();
  var f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) wfFbReadImage(f);
}

function wfFbImageFile(e) {
  var f = e.target.files[0];
  if (f) wfFbReadImage(f);
}

function wfFbReadImage(f) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    _wfFbScreenshot = ev.target.result;
    var preview  = document.getElementById('wf-fb-img-preview');
    var hint     = document.getElementById('wf-fb-img-drop-text');
    var clearBtn = document.getElementById('wf-fb-clear-btn');
    if (preview)  { preview.src = _wfFbScreenshot; preview.style.display = ''; }
    if (hint)     { hint.style.display = 'none'; }
    if (clearBtn) { clearBtn.style.display = ''; }
  };
  reader.readAsDataURL(f);
}

function wfFbClearImage() {
  _wfFbScreenshot = null;
  var preview   = document.getElementById('wf-fb-img-preview');
  var hint      = document.getElementById('wf-fb-img-drop-text');
  var clearBtn  = document.getElementById('wf-fb-clear-btn');
  var fileInput = document.getElementById('wf-fb-img-input');
  if (preview)   { preview.style.display = 'none'; preview.src = ''; }
  if (hint)      { hint.style.display = ''; }
  if (clearBtn)  { clearBtn.style.display = 'none'; }
  if (fileInput) { fileInput.value = ''; }
}

/**
 * Paste from clipboard button — focuses the panel so the global paste handler catches it
 */
function wfFbPasteClipboard() {
  // If the Clipboard API is available, read directly
  if (navigator.clipboard && navigator.clipboard.read) {
    navigator.clipboard.read().then(function(items) {
      for (var i = 0; i < items.length; i++) {
        var types = items[i].types;
        for (var t = 0; t < types.length; t++) {
          if (types[t].startsWith('image/')) {
            items[i].getType(types[t]).then(function(blob) {
              wfFbReadImage(blob);
            });
            return;
          }
        }
      }
      wfToast('No image found in clipboard');
    }).catch(function() {
      wfToast('Paste an image with \u2318V / Ctrl+V');
    });
  } else {
    wfToast('Paste an image with \u2318V / Ctrl+V');
  }
}

/**
 * Submit feedback via mailto with page context
 */
function wfFbSubmit(e) {
  e.preventDefault();
  var typeEl = document.querySelector('input[name="wf-fb-type"]:checked');
  var descEl = document.getElementById('wf-fb-desc');

  var type = typeEl ? typeEl.value : 'question';
  var desc = descEl ? descEl.value.trim() : '';
  if (!desc) { if (descEl) descEl.focus(); return; }

  var context = wfFbPageContext();
  var typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  var file = currentFile();

  var subject = WF_CONFIG.emailPrefix + ' ' + typeLabel + ': ' + file;
  var bodyParts = [context, '', 'Type: ' + typeLabel, '', desc];

  if (_wfFbScreenshot) {
    bodyParts.push('');
    bodyParts.push('[Screenshot attached — paste into email from clipboard]');
  }

  bodyParts.push('');
  bodyParts.push('---');
  bodyParts.push(WF_CONFIG.emailFooter);

  var mailtoUrl = 'mailto:' + WF_CONFIG.emailRecipient + '?subject=' +
    encodeURIComponent(subject) + '&body=' +
    encodeURIComponent(bodyParts.join('\n'));

  // If we have a screenshot, copy it to clipboard so user can paste into email
  if (_wfFbScreenshot && navigator.clipboard && navigator.clipboard.write) {
    fetch(_wfFbScreenshot)
      .then(function(r) { return r.blob(); })
      .then(function(blob) {
        return navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
      })
      .then(function() {
        window.open(mailtoUrl, '_blank');
        wfToast('Screenshot copied to clipboard — paste into email with \u2318V');
      })
      .catch(function() {
        window.open(mailtoUrl, '_blank');
      });
  } else {
    window.open(mailtoUrl, '_blank');
  }

  // Reset form
  if (descEl) descEl.value = '';
  wfFbClearImage();
  var defaultType = document.querySelector('input[name="wf-fb-type"][value="question"]');
  if (defaultType) defaultType.checked = true;

  wfToast('Feedback sent \u2713');
  setTimeout(wfFbClose, 500);
}

/* ========================================================================
   Scenario Walkthroughs — Persona-Driven Guided Tours
   ======================================================================== */

/**
 * Build the scenario walkthrough banner if a scenario is active.
 *
 * Story mode is a distinct navigation state:
 * - Context bar is hidden (via html.scenario-active CSS)
 * - Scenario banner is the only nav (prev/next/exit)
 * - Non-essential UI is dimmed automatically
 * - Exit returns to the sitemap personas tab
 *
 * Normal navigation (menu, sitemap cards, direct links) always shows
 * the full experience with context bar and no dimming.
 */
function buildScenarioBanner() {
  if (!SCENARIOS.length) return;

  var raw = sessionStorage.getItem('wf_scenario');
  if (!raw) return;

  var state;
  try { state = JSON.parse(raw); } catch (e) { return; }

  var scenario = null;
  for (var i = 0; i < SCENARIOS.length; i++) {
    if (SCENARIOS[i].id === state.id) { scenario = SCENARIOS[i]; break; }
  }
  if (!scenario) { sessionStorage.removeItem('wf_scenario'); return; }

  var step = state.step || 0;
  if (step >= scenario.steps.length) step = scenario.steps.length - 1;
  var current = scenario.steps[step];

  // Enter story mode — hides context bar, applies dimming
  document.documentElement.classList.add('scenario-active');

  var banner = document.createElement('div');
  banner.className = 'wf-scenario-banner';
  banner.id = 'wf-scenario-banner';
  banner.setAttribute('role', 'navigation');
  banner.setAttribute('aria-label', 'Scenario walkthrough');
  // Build friction callout if present
  var frictionHTML = '';
  if (current.friction) {
    frictionHTML = '<div class="wf-scenario-friction">' +
      '<span class="wf-scenario-friction-icon">\u26a0</span>' +
      current.friction +
    '</div>';
  }

  banner.innerHTML =
    '<div class="wf-scenario-controls">' +
      '<span class="wf-scenario-persona">' + scenario.persona + '</span>' +
      '<span class="wf-scenario-progress">Step ' + (step + 1) + ' of ' + scenario.steps.length + '</span>' +
      '<div class="wf-scenario-nav">' +
        '<button onclick="wfScenarioPrev()" aria-label="Previous step"' + (step === 0 ? ' disabled style="opacity:0.3;cursor:default"' : '') + '>\u2190 Prev</button>' +
        '<button onclick="wfScenarioNext()" aria-label="Next step"' + (step >= scenario.steps.length - 1 ? ' disabled style="opacity:0.3;cursor:default"' : '') + '>Next \u2192</button>' +
        '<button onclick="wfScenarioExit()" class="wf-scenario-exit" aria-label="Exit walkthrough">\u2715 Exit</button>' +
      '</div>' +
    '</div>' +
    '<div class="wf-scenario-narrative">' + current.narrative + '</div>' +
    frictionHTML;

  // Insert banner as first child of body (context bar is hidden via CSS)
  document.body.insertBefore(banner, document.body.firstChild);

  // If scenario.id matches a JOURNEYS key, activate journey highlighting
  if (JOURNEYS.length) {
    for (var j = 0; j < JOURNEYS.length; j++) {
      if (JOURNEYS[j].id === scenario.id) {
        var hasElements = document.querySelectorAll('[data-journey~="' + scenario.id + '"]').length > 0;
        if (hasElements) {
          wfStoryApply(scenario.id);
        }
        break;
      }
    }
  }
}

function wfScenarioStart(scenarioId) {
  var scenario = null;
  for (var i = 0; i < SCENARIOS.length; i++) {
    if (SCENARIOS[i].id === scenarioId) { scenario = SCENARIOS[i]; break; }
  }
  if (!scenario) return;
  sessionStorage.setItem('wf_scenario', JSON.stringify({ id: scenarioId, step: 0 }));
  wfNavigate(scenario.steps[0].file + '.html');
}

function wfScenarioNext() {
  var raw = sessionStorage.getItem('wf_scenario');
  if (!raw) return;
  var state = JSON.parse(raw);
  var scenario = null;
  for (var i = 0; i < SCENARIOS.length; i++) {
    if (SCENARIOS[i].id === state.id) { scenario = SCENARIOS[i]; break; }
  }
  if (!scenario) return;
  var next = (state.step || 0) + 1;
  if (next >= scenario.steps.length) return;
  sessionStorage.setItem('wf_scenario', JSON.stringify({ id: state.id, step: next }));
  wfNavigate(scenario.steps[next].file + '.html');
}

function wfScenarioPrev() {
  var raw = sessionStorage.getItem('wf_scenario');
  if (!raw) return;
  var state = JSON.parse(raw);
  var scenario = null;
  for (var i = 0; i < SCENARIOS.length; i++) {
    if (SCENARIOS[i].id === state.id) { scenario = SCENARIOS[i]; break; }
  }
  if (!scenario) return;
  var prev = (state.step || 0) - 1;
  if (prev < 0) return;
  sessionStorage.setItem('wf_scenario', JSON.stringify({ id: state.id, step: prev }));
  wfNavigate(scenario.steps[prev].file + '.html');
}

/**
 * Exit story mode — clear state and return to sitemap personas tab
 */
function wfScenarioExit() {
  sessionStorage.removeItem('wf_scenario');
  document.documentElement.classList.remove('scenario-active');
  wfNavigate('index.html');
}

/* ========================================================================
   CLEANUP — Hide Legacy Elements
   ======================================================================== */

/**
 * Hide old chrome elements from previous prototypes
 */
function hideOldChrome() {
  var oldElements = document.querySelectorAll(
    '.spec-tab-anchor, .page-context-bar'
  );
  for (var i = 0; i < oldElements.length; i++) {
    oldElements[i].style.display = 'none';
  }

  // Hide legacy #spec-panel if there's a .wf-design-notes present
  var specPanel = document.getElementById('spec-panel');
  var designNotes = document.querySelector('.wf-design-notes');
  if (specPanel && designNotes) {
    specPanel.style.display = 'none';
  }
}

/* ========================================================================
   INITIALIZATION
   ======================================================================== */

/**
 * Inject SVG filter definitions for paper texture and line wobble effects.
 * These are zero-dimension SVGs used purely for CSS filter references.
 */
function injectSVGFilters() {
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('style', 'position:absolute');
  svg.innerHTML =
    '<defs>' +
      '<filter id="wf-paper-texture">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" stitchTiles="stitch" result="noise"/>' +
        '<feDiffuseLighting in="noise" lighting-color="#fff" surfaceScale="1.5" result="lit">' +
          '<feDistantLight azimuth="45" elevation="55"/>' +
        '</feDiffuseLighting>' +
      '</filter>' +
      '<filter id="wf-line-wobble">' +
        '<feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" seed="1" result="noise"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' +
      '<filter id="wf-heavy-wobble">' +
        '<feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="3" seed="2" result="noise"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' +
      // Copic marker sketch: poster color wash (20%) with traced outlines ON TOP.
      // Outlines are converted to black-on-transparent so white doesn't blow out the color.
      '<filter id="wf-pencil-sketch" color-interpolation-filters="sRGB" x="-2%" y="-2%" width="104%" height="104%">' +
        // Layer 1: Posterize at full color → fade to 35% → on white paper
        '<feComponentTransfer in="SourceGraphic" result="poster">' +
          '<feFuncR type="discrete" tableValues="0.15 0.35 0.55 0.75 0.95"/>' +
          '<feFuncG type="discrete" tableValues="0.12 0.32 0.52 0.72 0.92"/>' +
          '<feFuncB type="discrete" tableValues="0.10 0.28 0.48 0.68 0.85"/>' +
        '</feComponentTransfer>' +
        '<feColorMatrix in="poster" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.35 0" result="wash"/>' +
        '<feFlood flood-color="#ffffff" flood-opacity="1" result="paper"/>' +
        '<feComposite in="wash" in2="paper" operator="over" result="tinted"/>' +
        // Layer 2: Edge detection — finer detail (lower blur), stronger lines
        '<feColorMatrix in="SourceGraphic" type="saturate" values="0" result="gray"/>' +
        '<feGaussianBlur in="gray" stdDeviation="0.6" result="blurred"/>' +
        '<feBlend in="gray" in2="blurred" mode="difference" result="edges"/>' +
        '<feColorMatrix in="edges" type="matrix" values="-6 0 0 0 1.2  0 -6 0 0 1.2  0 0 -6 0 1.2  0 0 0 1 0" result="lines"/>' +
        // Convert: RGB→black, alpha from line darkness (white→transparent, black→opaque)
        '<feColorMatrix in="lines" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.33 -0.33 -0.33 1 0" result="outlines"/>' +
        // Composite: outlines on top of color wash
        '<feComposite in="outlines" in2="tinted" operator="over"/>' +
      '</filter>' +
      // 50 wobble + 50 heavy variants generated by injectWobbleVariants() after SVG is in DOM
      // Torn paper edge fallback (static seed — randomizeTornEdges overrides per-element).
      // Layered shadow: 5 passes at increasing distance/blur, decreasing opacity.
      // Each shadow layer is curl-displaced so depth varies along the edge.
      '<filter id="wf-torn-edge" x="-5%" y="-20%" width="110%" height="150%">' +
        // Tear noise + displacement
        '<feTurbulence type="turbulence" baseFrequency="0.04 0.12" numOctaves="4" seed="7" result="tear"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="tear" scale="8" xChannelSelector="R" yChannelSelector="G" result="torn"/>' +
        // Curl noise for shadow depth variation
        '<feTurbulence type="fractalNoise" baseFrequency="0.01 0.04" numOctaves="2" seed="42" result="curl"/>' +
        // Shadow layer 1: contact — tight, sharp
        '<feOffset in="torn" dx="0" dy="0.5" result="s1o"/>' +
        '<feGaussianBlur in="s1o" stdDeviation="0.4" result="s1b"/>' +
        '<feDisplacementMap in="s1b" in2="curl" scale="1" xChannelSelector="R" yChannelSelector="G" result="s1d"/>' +
        '<feColorMatrix in="s1d" type="matrix" values="0 0 0 0 0.118  0 0 0 0 0.137  0 0 0 0 0.235  0 0 0 0.14 0" result="s1"/>' +
        // Shadow layer 2: close
        '<feOffset in="torn" dx="0" dy="1.5" result="s2o"/>' +
        '<feGaussianBlur in="s2o" stdDeviation="1.2" result="s2b"/>' +
        '<feDisplacementMap in="s2b" in2="curl" scale="2" xChannelSelector="R" yChannelSelector="G" result="s2d"/>' +
        '<feColorMatrix in="s2d" type="matrix" values="0 0 0 0 0.118  0 0 0 0 0.137  0 0 0 0 0.235  0 0 0 0.10 0" result="s2"/>' +
        // Shadow layer 3: mid
        '<feOffset in="torn" dx="0" dy="3" result="s3o"/>' +
        '<feGaussianBlur in="s3o" stdDeviation="2.5" result="s3b"/>' +
        '<feDisplacementMap in="s3b" in2="curl" scale="3" xChannelSelector="R" yChannelSelector="G" result="s3d"/>' +
        '<feColorMatrix in="s3d" type="matrix" values="0 0 0 0 0.118  0 0 0 0 0.137  0 0 0 0 0.235  0 0 0 0.07 0" result="s3"/>' +
        // Shadow layer 4: soft spread
        '<feOffset in="torn" dx="0" dy="4" result="s4o"/>' +
        '<feGaussianBlur in="s4o" stdDeviation="3" result="s4b"/>' +
        '<feDisplacementMap in="s4b" in2="curl" scale="3" xChannelSelector="R" yChannelSelector="G" result="s4d"/>' +
        '<feColorMatrix in="s4d" type="matrix" values="0 0 0 0 0.118  0 0 0 0 0.137  0 0 0 0 0.235  0 0 0 0.04 0" result="s4"/>' +
        // Shadow layer 5: ambient lift glow
        '<feOffset in="torn" dx="0" dy="6" result="s5o"/>' +
        '<feGaussianBlur in="s5o" stdDeviation="5" result="s5b"/>' +
        '<feDisplacementMap in="s5b" in2="curl" scale="4" xChannelSelector="R" yChannelSelector="G" result="s5d"/>' +
        '<feColorMatrix in="s5d" type="matrix" values="0 0 0 0 0.118  0 0 0 0 0.137  0 0 0 0 0.235  0 0 0 0.025 0" result="s5"/>' +
        // Composite all layers: furthest shadow first, torn shape on top
        '<feMerge>' +
          '<feMergeNode in="s5"/>' +
          '<feMergeNode in="s4"/>' +
          '<feMergeNode in="s3"/>' +
          '<feMergeNode in="s2"/>' +
          '<feMergeNode in="s1"/>' +
          '<feMergeNode in="torn"/>' +
        '</feMerge>' +
      '</filter>' +
    '</defs>';
  document.body.appendChild(svg);
}

/**
 * Give each torn-edge element its own SVG filter with unique random seeds
 * for both the tear displacement and the shadow curl variation.
 * Real paper never tears the same way twice, and the curl/lift varies too.
 *
 * Filter chain per element:
 *   1. feTurbulence (tear shape, unique random seed)
 *   2. feDisplacementMap (create organic torn contour)
 *   3. feTurbulence (curl noise, second unique seed, low freq)
 *   4. x5 shadow layers at increasing distance/blur, each curl-displaced:
 *      - Contact (0.5px / 0.4blur / 0.14 alpha)
 *      - Close   (1.5px / 1.2blur / 0.10 alpha)
 *      - Mid     (3px   / 2.5blur / 0.07 alpha)
 *      - Spread  (6px   / 5blur   / 0.04 alpha)
 *      - Ambient (10px  / 8blur   / 0.025 alpha)
 *   5. feMerge (all shadow layers + torn shape)
 */
function randomizeTornEdges() {
  var svgNS = 'http://www.w3.org/2000/svg';
  var tornEls = document.querySelectorAll('.wf-torn-top, .wf-torn-bottom');
  if (!tornEls.length) return;

  var defs = document.querySelector('svg[style="position:absolute"] defs');
  if (!defs) return;

  // Helper to create an SVG element with attributes
  function el(tag, attrs) {
    var node = document.createElementNS(svgNS, tag);
    for (var k in attrs) { node.setAttribute(k, attrs[k]); }
    return node;
  }

  // Shadow layer definitions: [dy-offset, blur-stddev, curl-scale, opacity]
  // Builds up from tight contact shadow to soft ambient glow
  var shadowLayers = [
    { dy: '0.5', blur: '0.4', curl: '1',  alpha: '0.14' },  // contact
    { dy: '1.5', blur: '1.2', curl: '2',  alpha: '0.10' },  // close
    { dy: '3',   blur: '2.5', curl: '3',  alpha: '0.07' },  // mid
    { dy: '4',   blur: '3',   curl: '3',  alpha: '0.04' },  // soft spread
    { dy: '6',   blur: '5',   curl: '4',  alpha: '0.025' }   // ambient lift
  ];

  for (var i = 0; i < tornEls.length; i++) {
    var tearSeed = Math.floor(Math.random() * 9999);
    var curlSeed = Math.floor(Math.random() * 9999);
    var filterId = 'wf-torn-edge-' + i;

    var filter = el('filter', {
      id: filterId, x: '-5%', y: '-20%', width: '110%', height: '150%'
    });

    // Tear noise + displacement
    filter.appendChild(el('feTurbulence', {
      type: 'turbulence', baseFrequency: '0.04 0.12', numOctaves: '4',
      seed: String(tearSeed), result: 'tear'
    }));
    filter.appendChild(el('feDisplacementMap', {
      'in': 'SourceGraphic', in2: 'tear', scale: '8',
      xChannelSelector: 'R', yChannelSelector: 'G', result: 'torn'
    }));

    // Curl noise (unique seed — controls where shadow deepens/lightens)
    filter.appendChild(el('feTurbulence', {
      type: 'fractalNoise', baseFrequency: '0.01 0.04', numOctaves: '2',
      seed: String(curlSeed), result: 'curl'
    }));

    // Build 5 layered shadow passes
    for (var s = 0; s < shadowLayers.length; s++) {
      var L = shadowLayers[s];
      var pfx = 's' + s;
      filter.appendChild(el('feOffset', {
        'in': 'torn', dx: '0', dy: L.dy, result: pfx + 'o'
      }));
      filter.appendChild(el('feGaussianBlur', {
        'in': pfx + 'o', stdDeviation: L.blur, result: pfx + 'b'
      }));
      filter.appendChild(el('feDisplacementMap', {
        'in': pfx + 'b', in2: 'curl', scale: L.curl,
        xChannelSelector: 'R', yChannelSelector: 'G', result: pfx + 'd'
      }));
      filter.appendChild(el('feColorMatrix', {
        'in': pfx + 'd', type: 'matrix',
        values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ' + L.alpha + ' 0',
        result: pfx
      }));
    }

    // Merge: furthest shadow first, torn shape on top
    var merge = el('feMerge', {});
    for (var s = shadowLayers.length - 1; s >= 0; s--) {
      merge.appendChild(el('feMergeNode', { 'in': 's' + s }));
    }
    merge.appendChild(el('feMergeNode', { 'in': 'torn' }));
    filter.appendChild(merge);

    defs.appendChild(filter);
    tornEls[i].style.setProperty('--wf-torn-filter', 'url(#' + filterId + ')');
  }
}

/**
 * Inject 50 wobble + 50 heavy-wobble SVG filter variants, each with a unique
 * seed so no two elements warp the same way. Called after injectSVGFilters().
 */
var WF_WOBBLE_COUNT = 50;
function injectWobbleVariants() {
  var defs = document.querySelector('svg[style="position:absolute"] defs');
  if (!defs) return;
  var svgNS = 'http://www.w3.org/2000/svg';
  // Generate 50 unique seeds (shuffled to avoid patterns)
  var seeds = [];
  for (var s = 1; s <= WF_WOBBLE_COUNT; s++) seeds.push(s * 37 + 13); // spread seeds
  for (var i = seeds.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = seeds[i]; seeds[i] = seeds[j]; seeds[j] = tmp;
  }
  for (var k = 0; k < WF_WOBBLE_COUNT; k++) {
    // Light wobble variant
    var f1 = document.createElementNS(svgNS, 'filter');
    f1.setAttribute('id', 'wf-wobble-' + (k + 1));
    f1.innerHTML =
      '<feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" seed="' + seeds[k] + '" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G"/>';
    defs.appendChild(f1);
    // Heavy wobble variant
    var f2 = document.createElementNS(svgNS, 'filter');
    f2.setAttribute('id', 'wf-heavy-' + (k + 1));
    f2.innerHTML =
      '<feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="3" seed="' + (seeds[k] + 500) + '" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/>';
    defs.appendChild(f2);
  }
}

/**
 * Assign a unique wobble filter to every element that uses the wobble CSS var.
 * No repeats — each element gets its own variant from the pool of 50.
 * If there are more elements than variants, wraps around with shuffle.
 */
var WF_WOBBLE_SELECTORS = [
  '.wf-card', '.ds-card', '.ds-kpi-card', '.sfdc-card', '.sfdc-chart-card',
  '.btn', '.wf-badge', '.wf-input', '.wf-select', '.wf-textarea',
  '.wf-table', '.slack-bot-card', '.slack-lane-header',
  '.slack-message-avatar', '.slack-composer-input', '.slack-thread-count',
  '.slack-rail', '.slack-sidebar', '.ds-sidebar-card',
  '.sfdc-btn', '.sfdc-btn-primary', '.sfdc-related-icon', '.sfdc-feed-avatar'
];

function randomizeWobble() {
  // Skip in polished mode — no wobble effects needed, and inline
  // custom properties would override the CSS declaration of none
  var fidelity = document.documentElement.getAttribute('data-wf-fidelity');
  if (fidelity === 'polished') return;

  var els = document.querySelectorAll(WF_WOBBLE_SELECTORS.join(','));
  // Build shuffled assignment array — no repeats until pool exhausted
  var assignments = [];
  while (assignments.length < els.length) {
    var batch = [];
    for (var i = 1; i <= WF_WOBBLE_COUNT; i++) batch.push(i);
    // Fisher-Yates shuffle
    for (var j = batch.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = batch[j]; batch[j] = batch[k]; batch[k] = tmp;
    }
    assignments = assignments.concat(batch);
  }
  for (var e = 0; e < els.length; e++) {
    var v = assignments[e];
    els[e].style.setProperty('--wf-wobble-filter', 'url(#wf-wobble-' + v + ')');
  }
}

/**
 * Remove inline --wf-wobble-filter from all elements so CSS declarations
 * (e.g. polished mode's `--wf-wobble-filter: none`) take effect.
 */
function clearWobbleOverrides() {
  var els = document.querySelectorAll(WF_WOBBLE_SELECTORS.join(','));
  for (var e = 0; e < els.length; e++) {
    els[e].style.removeProperty('--wf-wobble-filter');
  }
}

/**
 * Fidelity dropdown handler — sets data attribute on html element
 * and persists to sessionStorage.
 * 0=napkin, 1=blueprint, 2=polished
 */
var _wfFidelityLabels = ['Napkin', 'Blueprint', 'Polished'];
var _wfFidelityValues = ['napkin', 'blueprint', 'polished'];

function wfFidelityChange(val) {
  val = parseInt(val, 10);
  var fidelity = _wfFidelityValues[val] || 'blueprint';
  document.documentElement.setAttribute('data-wf-fidelity', fidelity);
  sessionStorage.setItem('wf_fidelity', String(val));

  // Polished mode: clear inline wobble overrides so CSS `none` takes effect.
  // Other modes: re-randomize wobble assignments.
  if (fidelity === 'polished') {
    clearWobbleOverrides();
  } else {
    randomizeWobble();
  }
}

function wfFidelityRestore() {
  var saved = sessionStorage.getItem('wf_fidelity');
  if (saved !== null) {
    var val = parseInt(saved, 10);
    wfFidelityChange(val);
    // Sync dropdown selection
    var select = document.getElementById('wf-fidelity-select');
    if (select) select.value = val;
  }
}

/* ========================================================================
   Paper Scatter Page Transition
   ======================================================================== */

var WF_SCATTER_SELECTORS = [
  '.wf-card', '.ds-card', '.ds-kpi-card', '.sfdc-card', '.sfdc-chart-card',
  '.slack-bot-card', '.slack-lane-header', '.ds-sidebar-card',
  '.wf-table',
  '.slack-rail', '.slack-sidebar', '.slack-messages',
  '.sfdc-header-bar', '.sfdc-highlights-bar', '.sfdc-path-bar',
  '.ds-sidebar', '.ds-main',
  '.wf-ctx-bar'
];

/**
 * Sort elements by position along a wind axis so wind "hits" near-side first.
 * Returns array of {el, dist} sorted by projected distance along wind vector.
 */
function wfSortByWind(els, angle) {
  var windX = Math.cos(angle);
  var windY = Math.sin(angle);
  var sorted = [];
  for (var i = 0; i < els.length; i++) {
    var rect = els[i].getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    // Project center onto wind direction — elements upwind get hit first
    // Negative wind vector = where wind comes FROM
    var proj = (-windX * cx) + (-windY * cy);
    sorted.push({ el: els[i], dist: proj });
  }
  sorted.sort(function(a, b) { return b.dist - a.dist; });
  return sorted;
}

/**
 * Navigate to a URL with paper scatter animation.
 * Wind picks up papers — near side lifts first, papers curl and tumble away.
 */
function wfNavigate(url) {
  if (document.documentElement.getAttribute('data-wf-fidelity') !== 'napkin') {
    location.href = url;
    return;
  }

  var angle = Math.random() * Math.PI * 2;
  sessionStorage.setItem('wf_scatter_angle', String(angle));

  var els = document.querySelectorAll(WF_SCATTER_SELECTORS.join(','));
  if (els.length === 0) {
    location.href = url;
    return;
  }

  // Sort by wind direction — upwind elements scatter first
  var sorted = wfSortByWind(els, angle);

  // Prefer WebGL vertex-deformed paper curl when available
  if (window._wfGLAvailable && window.wfScatterOutGL) {
    wfScatterOutGL(url, angle, sorted);
    return;
  }

  // CSS fallback — rigid-body rotation (no mesh deformation)
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  var distance = Math.sqrt(vw * vw + vh * vh) * 0.9;
  var baseX = Math.cos(angle) * distance;
  var baseY = Math.sin(angle) * distance;

  // Enable 3D perspective on body for paper curl
  document.body.style.perspective = '1200px';
  document.body.style.perspectiveOrigin = '50% 50%';

  var baseDuration = 550;
  var maxStagger = 250; // ms spread between first and last element

  for (var i = 0; i < sorted.length; i++) {
    var el = sorted[i].el;
    var progress = sorted.length > 1 ? i / (sorted.length - 1) : 0;
    var delay = progress * maxStagger + Math.random() * 40;
    var dur = baseDuration + Math.random() * 100;
    var vary = 0.8 + Math.random() * 0.4;

    // Paper curl: rotateX/Y based on wind direction + random flutter
    var curlX = (Math.sin(angle) * 35 + (Math.random() - 0.5) * 20);
    var curlY = (-Math.cos(angle) * 25 + (Math.random() - 0.5) * 15);
    var spin = (Math.random() - 0.5) * 20;

    el.classList.add('wf-scattering');
    el.style.transformOrigin = 'center center';
    el.style.transition =
      'transform ' + dur + 'ms cubic-bezier(0.3, 0, 0.7, 0.15) ' + delay + 'ms, ' +
      'opacity ' + dur + 'ms ease ' + delay + 'ms';
    el.style.transform =
      'translate(' + (baseX * vary) + 'px, ' + (baseY * vary) + 'px) ' +
      'rotateX(' + curlX + 'deg) rotateY(' + curlY + 'deg) ' +
      'rotate(' + spin + 'deg) scale(0.85)';
    el.style.opacity = '0';
  }

  var totalTime = baseDuration + maxStagger + 140;
  setTimeout(function() {
    location.href = url;
  }, totalTime);
}

/**
 * On page load: if we arrived via scatter, animate elements floating down
 * and settling into place like papers landing on a desk.
 */
function wfScatterIn() {
  var angleStr = sessionStorage.getItem('wf_scatter_angle');
  if (!angleStr) return;
  sessionStorage.removeItem('wf_scatter_angle');

  if (document.documentElement.getAttribute('data-wf-fidelity') !== 'napkin') return;

  var angle = parseFloat(angleStr);

  // Prefer WebGL vertex-deformed paper curl when available
  if (window._wfGLAvailable && window.wfScatterInGL) {
    wfScatterInGL(angle);
    return;
  }
  var distance = Math.max(window.innerWidth, window.innerHeight) * 0.25;
  var baseX = Math.cos(angle) * distance;
  var baseY = Math.sin(angle) * distance;

  var els = document.querySelectorAll(WF_SCATTER_SELECTORS.join(','));
  if (els.length === 0) return;

  // Enable 3D perspective
  document.body.style.perspective = '1200px';
  document.body.style.perspectiveOrigin = '50% 50%';

  // Sort by wind — papers land in reverse order (far side settles first)
  var sorted = wfSortByWind(els, angle);

  var maxStagger = 200;

  // Start elements offset (no transition) — curled and displaced
  for (var i = 0; i < sorted.length; i++) {
    var el = sorted[i].el;
    var vary = 0.6 + Math.random() * 0.8;
    var curlX = (Math.sin(angle) * 15 + (Math.random() - 0.5) * 10);
    var curlY = (-Math.cos(angle) * 10 + (Math.random() - 0.5) * 8);
    var spin = (Math.random() - 0.5) * 5;

    el.style.transition = 'none';
    el.style.transformOrigin = 'center center';
    el.style.transform =
      'translate(' + (baseX * vary * 0.4) + 'px, ' + (baseY * vary * 0.4) + 'px) ' +
      'rotateX(' + curlX + 'deg) rotateY(' + curlY + 'deg) ' +
      'rotate(' + spin + 'deg) scale(0.95)';
    el.style.opacity = '0.15';
    el.classList.add('wf-scattering');
  }

  // Double rAF then animate to rest — papers float down and flatten
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      for (var i = 0; i < sorted.length; i++) {
        var el = sorted[i].el;
        // Reverse order — last in sorted (downwind) lands first
        var progress = sorted.length > 1 ? (sorted.length - 1 - i) / (sorted.length - 1) : 0;
        var delay = progress * maxStagger + Math.random() * 60;
        var dur = 500 + Math.random() * 150;

        el.style.transition =
          'transform ' + dur + 'ms cubic-bezier(0.15, 0.8, 0.3, 1.03) ' + delay + 'ms, ' +
          'opacity ' + dur + 'ms ease-out ' + delay + 'ms';
        el.style.transform = '';
        el.style.opacity = '';
      }

      // Clean up after all animations settle
      setTimeout(function() {
        document.body.style.perspective = '';
        document.body.style.perspectiveOrigin = '';
        var scattered = document.querySelectorAll('.wf-scattering');
        for (var j = 0; j < scattered.length; j++) {
          scattered[j].classList.remove('wf-scattering');
          scattered[j].style.transition = '';
          scattered[j].style.transformOrigin = '';
        }
      }, 800);
    });
  });
}

/**
 * Intercept internal <a> clicks for scatter transition.
 */
function wfInitScatterTransition() {
  wfScatterIn();

  document.addEventListener('click', function(e) {
    // Only intercept in napkin mode — blueprint/polished use native <a> navigation
    if (document.documentElement.getAttribute('data-wf-fidelity') !== 'napkin') return;

    // Don't interfere with modifier-key clicks (new tab, etc.)
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;

    var link = e.target.closest('a[href]');
    if (!link) return;

    // Never intercept framework chrome links (drawer, context bar, etc.)
    if (link.closest('#wf-nav-drawer, .wf-ctx-bar, #wf-dn-panel, #wf-fb-overlay')) return;

    var href = link.getAttribute('href');
    if (!href) return;
    // Only intercept relative .html links (internal navigation)
    if (href.indexOf('://') !== -1) return;
    if (href.indexOf('.html') === -1) return;
    if (href.charAt(0) === '#') return;

    e.preventDefault();
    wfNavigate(href);
  });
}

/**
 * Build napkin stencil layer — scribble marks.
 * Only visible in napkin fidelity mode via CSS.
 */
function buildStencilLayer() {
  /* Resolve path to textures/ relative to proto-nav.js location. */
  var scripts = document.getElementsByTagName('script');
  var corePath = '';
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].getAttribute('src') || '';
    if (src.indexOf('proto-nav.js') !== -1) {
      corePath = src.replace('proto-nav.js', '');
      break;
    }
  }
  var tex = corePath + 'textures/';

  /* Scribble stencils — randomized position/rotation every page load.
     Each scribble gets a random spot, rotation, and size. Not all 3
     appear on every page (~70% chance each). */
  var scribbles = [
    { cls: 'wf-stencil--scribble-1', file: 'scribble-1.svg', w: 130, h: 65 },
    { cls: 'wf-stencil--scribble-2', file: 'scribble-2.svg', w: 100, h: 85 },
    { cls: 'wf-stencil--scribble-3', file: 'scribble-3.svg', w: 115, h: 50 }
  ];

  var layer = document.createElement('div');
  layer.className = 'wf-stencil-layer';

  for (var s = 0; s < scribbles.length; s++) {
    /* ~70% chance each scribble appears */
    if (Math.random() > 0.7) continue;

    var sc = scribbles[s];
    var img = document.createElement('img');
    img.className = 'wf-stencil ' + sc.cls;
    img.src = tex + sc.file;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');

    /* Random size: 80–120% of base */
    var scale = 0.8 + Math.random() * 0.4;
    img.style.width = Math.round(sc.w * scale) + 'px';
    img.style.height = Math.round(sc.h * scale) + 'px';

    /* Random position anywhere in viewport */
    img.style.left = (-5 + Math.random() * 90) + '%';
    img.style.top = (5 + Math.random() * 80) + '%';

    /* Random rotation */
    var rot = -8 + Math.random() * 16;
    img.style.transform = 'rotate(' + rot.toFixed(1) + 'deg)';

    layer.appendChild(img);
  }

  document.body.appendChild(layer);

  /* ── Coffee ring accents ──────────────────────────────────────────── */
  /* Separate from stencil layer: inserted as direct body children at
     z-index:-1 so they render BEHIND all page content (body creates a
     stacking context via z-index:0 in napkin mode).
     Uses Math.random() — every refresh gets a different placement.
     Not every page gets one (~60% chance). */
  buildCoffeeRings(tex);
}

/**
 * Build coffee ring background accents.
 * Created as direct body children with class .wf-coffee-ring.
 * CSS shows them only in napkin fidelity mode at z-index:-1.
 */
function buildCoffeeRings(texPath) {
  /* ~60% of page loads get a coffee ring */
  if (Math.random() > 0.6) return;

  /* 1 or 2 rings (70/30 split) */
  var count = Math.random() < 0.7 ? 1 : 2;

  for (var i = 0; i < count; i++) {
    var ring = document.createElement('img');
    ring.className = 'wf-coffee-ring';
    ring.src = texPath + 'coffee-ring.svg';
    ring.alt = '';
    ring.setAttribute('aria-hidden', 'true');

    /* Random size: 250–400px, then scaled 85–100% */
    var baseSize = 250 + Math.random() * 150;
    var scale = 0.85 + Math.random() * 0.15;
    var size = Math.round(baseSize * scale);
    ring.style.width = size + 'px';
    ring.style.height = size + 'px';

    /* Random rotation: full 360 degrees */
    var rotation = Math.floor(Math.random() * 360);
    ring.style.transform = 'rotate(' + rotation + 'deg)';

    /* Random position: pick a random spot within viewport margins.
       Use top/left with percentage values for viewport-relative placement.
       Offset by up to -15% of ring size so it can bleed off edges. */
    var x = -10 + Math.random() * 95;  /* -10% to 85% from left */
    var y = -10 + Math.random() * 95;  /* -10% to 85% from top */
    ring.style.left = x + '%';
    ring.style.top = y + '%';

    document.body.appendChild(ring);
  }
}

/**
 * Initialize all wireframe navigation chrome on page load
 */
/* ========================================================================
   REVIEW MODE — Confidence Negotiation Protocol
   ======================================================================== */

var _reviewMode = false;
var REVIEW_ANNOTATIONS = [];
var _reviewToolbarTimer = null;
var _reviewCurrentEl = null;

/**
 * Toggle review mode on/off
 */
function wfReviewToggle() {
  _reviewMode = !_reviewMode;
  var btn = document.getElementById('wf-review-mode-btn');

  if (_reviewMode) {
    document.documentElement.classList.add('wf-review-active');
    if (btn) btn.classList.add('wf-ctx-btn--active');

    // Set up event delegation for hover on confidence elements
    document.body.addEventListener('mouseover', _reviewMouseOver);
    document.body.addEventListener('mouseout', _reviewMouseOut);

    wfToast('Review mode ON — hover elements to annotate');
  } else {
    document.documentElement.classList.remove('wf-review-active');
    if (btn) btn.classList.remove('wf-ctx-btn--active');

    // Remove event delegation
    document.body.removeEventListener('mouseover', _reviewMouseOver);
    document.body.removeEventListener('mouseout', _reviewMouseOut);

    // Remove any open toolbar
    _reviewRemoveToolbar();

    wfToast('Review mode OFF');
  }
}

function _reviewMouseOver(e) {
  var el = e.target.closest('[data-wf-confidence]');
  if (!el) return;
  if (_reviewCurrentEl === el) return;

  clearTimeout(_reviewToolbarTimer);
  _reviewCurrentEl = el;
  wfReviewShowToolbar(el);
}

function _reviewMouseOut(e) {
  var el = e.target.closest('[data-wf-confidence]');
  var toolbar = document.getElementById('wf-review-toolbar');

  // Small delay to prevent flicker when moving between element and toolbar
  _reviewToolbarTimer = setTimeout(function() {
    // Check if mouse is over toolbar or the element
    var hovered = document.querySelectorAll(':hover');
    for (var i = 0; i < hovered.length; i++) {
      if (hovered[i] === _reviewCurrentEl) return;
      if (hovered[i].id === 'wf-review-toolbar' || (toolbar && toolbar.contains(hovered[i]))) return;
    }
    _reviewRemoveToolbar();
    _reviewCurrentEl = null;
  }, 150);
}

function _reviewRemoveToolbar() {
  var existing = document.getElementById('wf-review-toolbar');
  if (existing) existing.parentNode.removeChild(existing);
}

/**
 * Show floating reaction toolbar near the given element
 */
function wfReviewShowToolbar(el) {
  _reviewRemoveToolbar();

  var rect = el.getBoundingClientRect();
  var toolbar = document.createElement('div');
  toolbar.className = 'wf-review-toolbar';
  toolbar.id = 'wf-review-toolbar';

  toolbar.innerHTML =
    '<button class="wf-review-confirm" onclick="wfReviewReact(_reviewCurrentEl,\'confirm\')" title="Confirm — this works">✓</button>' +
    '<button class="wf-review-question" onclick="wfReviewReact(_reviewCurrentEl,\'question\')" title="Question — needs discussion">?</button>' +
    '<button class="wf-review-reject" onclick="wfReviewReact(_reviewCurrentEl,\'reject\')" title="Reject — doesn\'t work">✗</button>';

  // Prevent toolbar mouseout from dismissing itself
  toolbar.addEventListener('mouseover', function() {
    clearTimeout(_reviewToolbarTimer);
  });
  toolbar.addEventListener('mouseout', function() {
    _reviewToolbarTimer = setTimeout(function() {
      var hovered = document.querySelectorAll(':hover');
      for (var i = 0; i < hovered.length; i++) {
        if (hovered[i] === _reviewCurrentEl) return;
        if (hovered[i].id === 'wf-review-toolbar') return;
      }
      _reviewRemoveToolbar();
      _reviewCurrentEl = null;
    }, 150);
  });

  document.body.appendChild(toolbar);

  // Position above the element, centered
  var tbRect = toolbar.getBoundingClientRect();
  var left = rect.left + (rect.width / 2) - (tbRect.width / 2);
  var top = rect.top - tbRect.height - 8;

  // If toolbar would go off-screen top, position below
  if (top < 4) {
    top = rect.bottom + 8;
  }
  // Keep within viewport horizontally
  if (left < 4) left = 4;
  if (left + tbRect.width > window.innerWidth - 4) {
    left = window.innerWidth - tbRect.width - 4;
  }

  toolbar.style.left = left + 'px';
  toolbar.style.top = top + 'px';
}

/**
 * Build a reasonable CSS selector for an element
 */
function buildSelector(el) {
  var parts = [];
  parts.push(el.tagName.toLowerCase());
  if (el.id) {
    parts.push('#' + el.id);
    return parts.join('');
  }
  if (el.className && typeof el.className === 'string') {
    var classes = el.className.split(/\s+/);
    for (var i = 0; i < classes.length; i++) {
      if (classes[i] && classes[i].indexOf('wf-review') === -1) {
        parts.push('.' + classes[i]);
      }
    }
  }
  var journey = el.getAttribute('data-journey');
  if (journey) {
    parts.push('[data-journey="' + journey + '"]');
  }
  var confidence = el.getAttribute('data-wf-confidence');
  if (confidence) {
    parts.push('[data-wf-confidence="' + confidence + '"]');
  }
  return parts.join('');
}

/**
 * Capture a review reaction on an element
 */
function wfReviewReact(el, reaction) {
  if (!el) return;

  var noteText = '';
  if (reaction === 'question' || reaction === 'reject') {
    noteText = prompt(reaction === 'question' ? 'What needs discussion?' : 'What doesn\'t work?') || '';
  }

  var annotation = {
    elementSelector: buildSelector(el),
    elementText: el.textContent.substring(0, 80).trim(),
    previousConfidence: el.getAttribute('data-wf-confidence'),
    reaction: reaction,
    note: noteText,
    reviewer: sessionStorage.getItem('wf_reviewer') || 'anonymous',
    timestamp: new Date().toISOString(),
    page: currentFile()
  };

  REVIEW_ANNOTATIONS.push(annotation);

  // Merge with existing sessionStorage annotations
  var existing = [];
  try {
    var raw = sessionStorage.getItem('wf_review_annotations');
    if (raw) existing = JSON.parse(raw);
  } catch (e) { /* ignore */ }
  existing.push(annotation);
  sessionStorage.setItem('wf_review_annotations', JSON.stringify(existing));

  // Apply visual indicator
  el.setAttribute('data-wf-review', reaction);

  // Remove toolbar
  _reviewRemoveToolbar();
  _reviewCurrentEl = null;

  // Try POST to API
  fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(annotation)
  }).catch(function() { /* silent — offline fallback is sessionStorage */ });

  var icons = { confirm: '✓', question: '?', reject: '✗' };
  wfToast('Review: ' + (icons[reaction] || reaction) + ' ' + annotation.elementText.substring(0, 40));
}

/**
 * Export review annotations as a downloadable JSON file
 */
function wfReviewExport() {
  var annotations = [];
  try {
    var raw = sessionStorage.getItem('wf_review_annotations');
    if (raw) annotations = JSON.parse(raw);
  } catch (e) { /* ignore */ }

  // Filter to current page
  var file = currentFile();
  var pageAnnotations = [];
  for (var i = 0; i < annotations.length; i++) {
    if (annotations[i].page === file) {
      pageAnnotations.push(annotations[i]);
    }
  }

  var blob = new Blob([JSON.stringify(pageAnnotations, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = 'review-' + file + '-' + date + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  wfToast('Exported ' + pageAnnotations.length + ' review annotations');
}

/**
 * Toggle heat map mode for review annotations
 */
function wfReviewHeatMap() {
  document.documentElement.classList.toggle('wf-review-heatmap');
}

/**
 * Load existing annotations from sessionStorage on page load
 */
function wfReviewLoadAnnotations() {
  var file = currentFile();

  // Load from sessionStorage
  var annotations = [];
  try {
    var raw = sessionStorage.getItem('wf_review_annotations');
    if (raw) annotations = JSON.parse(raw);
  } catch (e) { /* ignore */ }

  // Re-apply data-wf-review attributes for current page
  for (var i = 0; i < annotations.length; i++) {
    var ann = annotations[i];
    if (ann.page !== file) continue;

    // Push to in-memory array
    REVIEW_ANNOTATIONS.push(ann);

    // Try to find the element
    try {
      var els = document.querySelectorAll(ann.elementSelector);
      for (var j = 0; j < els.length; j++) {
        els[j].setAttribute('data-wf-review', ann.reaction);
      }
    } catch (e) { /* selector might be invalid */ }
  }

  // Also try to fetch from API and merge
  fetch('/api/reviews?page=' + encodeURIComponent(file))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!Array.isArray(data)) return;
      for (var i = 0; i < data.length; i++) {
        var ann = data[i];
        // Check if already in local annotations
        var isDupe = false;
        for (var j = 0; j < REVIEW_ANNOTATIONS.length; j++) {
          if (REVIEW_ANNOTATIONS[j].timestamp === ann.timestamp &&
              REVIEW_ANNOTATIONS[j].elementSelector === ann.elementSelector) {
            isDupe = true;
            break;
          }
        }
        if (!isDupe) {
          REVIEW_ANNOTATIONS.push(ann);
          try {
            var els = document.querySelectorAll(ann.elementSelector);
            for (var k = 0; k < els.length; k++) {
              els[k].setAttribute('data-wf-review', ann.reaction);
            }
          } catch (e) { /* ignore */ }
        }
      }
    })
    .catch(function() { /* silent — no API available */ });
}

/**
 * Populate the Reviews tab in the design notes panel
 */
function wfReviewPopulateTab(container) {
  var file = currentFile();
  var annotations = [];
  try {
    var raw = sessionStorage.getItem('wf_review_annotations');
    if (raw) annotations = JSON.parse(raw);
  } catch (e) { /* ignore */ }

  // Filter to current page
  var pageAnnotations = [];
  for (var i = 0; i < annotations.length; i++) {
    if (annotations[i].page === file) {
      pageAnnotations.push(annotations[i]);
    }
  }

  // Count by reaction
  var counts = { confirm: 0, question: 0, reject: 0 };
  for (var i = 0; i < pageAnnotations.length; i++) {
    var r = pageAnnotations[i].reaction;
    if (counts[r] !== undefined) counts[r]++;
  }

  var html = '';

  // Reviewer name input
  var savedReviewer = sessionStorage.getItem('wf_reviewer') || '';
  html +=
    '<div class="wf-review-reviewer">' +
      '<label for="wf-review-reviewer-input">Reviewer Name</label>' +
      '<input type="text" id="wf-review-reviewer-input" value="' + savedReviewer + '" ' +
        'placeholder="Your name" onchange="sessionStorage.setItem(\'wf_reviewer\',this.value)">' +
    '</div>';

  // Summary counts
  html +=
    '<div class="wf-review-summary">' +
      '<div class="wf-review-stat">' +
        '<div class="wf-review-stat-count" style="color:var(--wf-green)">' + counts.confirm + '</div>' +
        '<div class="wf-review-stat-label">Confirmed</div>' +
      '</div>' +
      '<div class="wf-review-stat">' +
        '<div class="wf-review-stat-count" style="color:var(--wf-amber)">' + counts.question + '</div>' +
        '<div class="wf-review-stat-label">Questioned</div>' +
      '</div>' +
      '<div class="wf-review-stat">' +
        '<div class="wf-review-stat-count" style="color:var(--wf-red)">' + counts.reject + '</div>' +
        '<div class="wf-review-stat-label">Rejected</div>' +
      '</div>' +
    '</div>';

  // Heat map toggle
  var heatmapChecked = document.documentElement.classList.contains('wf-review-heatmap') ? ' checked' : '';
  html +=
    '<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--wf-text);margin-bottom:12px;cursor:pointer;">' +
      '<input type="checkbox" onchange="wfReviewHeatMap()"' + heatmapChecked + '>' +
      'Heat Map mode' +
    '</label>';

  // Annotation list
  if (pageAnnotations.length === 0) {
    html += '<p class="wf-dn-placeholder">No review annotations yet. Enable Review mode from the context bar to start annotating elements.</p>';
  } else {
    var icons = { confirm: '✓', question: '?', reject: '✗' };
    for (var i = 0; i < pageAnnotations.length; i++) {
      var ann = pageAnnotations[i];
      var icon = icons[ann.reaction] || ann.reaction;
      var time = '';
      try {
        var d = new Date(ann.timestamp);
        time = d.toLocaleString();
      } catch (e) {
        time = ann.timestamp;
      }

      html +=
        '<div class="wf-review-item">' +
          '<div class="wf-review-item-header">' +
            '<span class="wf-review-item-reaction">' + icon + '</span>' +
            '<span class="wf-review-item-text">' + (ann.elementText || '').substring(0, 60) + '</span>' +
          '</div>' +
          (ann.note ? '<div class="wf-review-item-note">' + ann.note + '</div>' : '') +
          '<div class="wf-review-item-meta">' + ann.reviewer + ' · ' + time + '</div>' +
        '</div>';
    }
  }

  // Action buttons
  html +=
    '<div class="wf-review-actions">' +
      '<button class="btn" onclick="wfReviewExport()">Export JSON</button>' +
      '<button class="btn" onclick="wfReviewClearPage()">Clear Page Reviews</button>' +
    '</div>';

  container.innerHTML = html;
}

/**
 * Clear review annotations for the current page
 */
function wfReviewClearPage() {
  var file = currentFile();

  // Remove from sessionStorage
  var annotations = [];
  try {
    var raw = sessionStorage.getItem('wf_review_annotations');
    if (raw) annotations = JSON.parse(raw);
  } catch (e) { /* ignore */ }

  var remaining = [];
  for (var i = 0; i < annotations.length; i++) {
    if (annotations[i].page !== file) {
      remaining.push(annotations[i]);
    }
  }
  sessionStorage.setItem('wf_review_annotations', JSON.stringify(remaining));

  // Clear in-memory
  REVIEW_ANNOTATIONS = [];

  // Remove data-wf-review attributes from DOM
  var reviewed = document.querySelectorAll('[data-wf-review]');
  for (var i = 0; i < reviewed.length; i++) {
    reviewed[i].removeAttribute('data-wf-review');
  }

  // Refresh the tab content
  var reviewsTab = document.getElementById('wf-dn-tab-reviews');
  if (reviewsTab) wfReviewPopulateTab(reviewsTab);

  wfToast('Cleared review annotations for this page');
}

function wfNavInit() {
  injectSVGFilters();
  injectWobbleVariants();
  buildContextBar();
  buildSurfaceHeader();
  wfFidelityRestore();
  buildDrawer();
  buildDesignNotesPanel();
  buildFeedbackPanel();

  // Defensive: ensure .wf-design-notes source div stays hidden (NE-002)
  var dnSource = document.querySelector('.wf-design-notes');
  if (dnSource) dnSource.style.display = 'none';

  wfReviewLoadAnnotations();
  buildStoryModeSelector();
  buildScenarioBanner();
  hideOldChrome();
  wfInitModals();
  wfInitThreadPanel();
  wfCheckActions();
  randomizeTornEdges();
  randomizeWobble();
  wfInitScatterTransition();
  buildStencilLayer();

  // Global paste handler — capture pasted images when feedback panel is open
  document.addEventListener('paste', function(e) {
    var overlay = document.getElementById('wf-fb-overlay');
    if (!overlay || !overlay.classList.contains('open')) return;
    var items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        var blob = items[i].getAsFile();
        if (blob) wfFbReadImage(blob);
        return;
      }
    }
  });

  // ESC to close panels and dropdowns
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      // Close feedback panel
      var overlay = document.getElementById('wf-fb-overlay');
      if (overlay && overlay.classList.contains('open')) {
        wfFbClose();
        return;
      }
      // Close design notes
      var dnPanel = document.getElementById('wf-dn-panel');
      if (dnPanel && dnPanel.classList.contains('open')) {
        wfDnClose();
        return;
      }
      // Close navigation drawer
      var drawer = document.getElementById('wf-nav-drawer');
      if (drawer && drawer.classList.contains('open')) {
        wfNavClose();
        return;
      }
      // Close story mode dropdown
      var smdd = document.getElementById('wf-story-mode-dropdown');
      if (smdd && smdd.style.display !== 'none') {
        smdd.style.display = 'none';
        _storyModeDropdownOpen = false;
        document.removeEventListener('click', _storyModeOutsideClick);
        return;
      }
    }
  });
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wfNavInit);
} else {
  // DOM already loaded (script is deferred or at end of body)
  wfNavInit();
}
