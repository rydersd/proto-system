/* ========================================================================
   Nib Design Stories Renderer (proto-stories.js)

   Reads window.DESIGN_STORIES and window.PROJECT_PHASES and generates
   the design stories page: auto-validation warnings, project metrics,
   implementation roadmap, status filters, and story cards.

   Also cross-references window.STORY_MAP, window.STORY_TITLES,
   window.SECTIONS, and window.JOURNEYS for validation and linking.

   Load order: project-data.js -> proto-nav.js -> proto-stories.js
   Container: <div id="wf-ds-root"></div>
   ======================================================================== */

/* ========================================================================
   IIFE Wrapper
   ======================================================================== */

(function () {
  'use strict';

  function wfDesignStoriesInit() {

  /* ======================================================================
     Data Structure Initialization — Read from window
     ====================================================================== */

  var DESIGN_STORIES = window.DESIGN_STORIES || [];
  var PROJECT_PHASES = window.PROJECT_PHASES || [];
  var STORY_MAP = window.STORY_MAP || {};
  var STORY_TITLES = window.STORY_TITLES || {};
  var SECTIONS = window.SECTIONS || [];
  var JOURNEYS = window.JOURNEYS || [];

  /* Normalize JOURNEYS if it was passed as an object */
  if (JOURNEYS && !Array.isArray(JOURNEYS)) {
    var jKeys = Object.keys(JOURNEYS);
    var jArr = [];
    for (var jk = 0; jk < jKeys.length; jk++) {
      var jEntry = JOURNEYS[jKeys[jk]];
      jEntry.id = jKeys[jk];
      jArr.push(jEntry);
    }
    JOURNEYS = jArr;
  }

  /* ======================================================================
     Utility: DOM Element Factory
     Matches proto-gen.js wfGenEl pattern — create element with attrs
     and children in a single call.
     ====================================================================== */

  /**
   * Create a DOM element with optional attributes and children.
   * @param {string} tag - HTML tag name
   * @param {Object} [attrs] - Attribute key/value pairs
   * @param {Array|string|HTMLElement} [children] - Child elements or text
   * @returns {HTMLElement}
   */
  function wfGenEl(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      var keys = Object.keys(attrs);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = attrs[key];
        if (val === null || val === undefined) continue;
        if (key === 'className') {
          node.className = val;
        } else if (key === 'innerHTML') {
          node.innerHTML = val;
        } else if (key === 'textContent') {
          node.textContent = val;
        } else if (key === 'style' && typeof val === 'object') {
          var sKeys = Object.keys(val);
          for (var s = 0; s < sKeys.length; s++) {
            node.style[sKeys[s]] = val[sKeys[s]];
          }
        } else if (key === 'onclick' && typeof val === 'function') {
          node.addEventListener('click', val);
        } else {
          node.setAttribute(key, val);
        }
      }
    }
    if (children !== undefined && children !== null) {
      if (typeof children === 'string') {
        node.textContent = children;
      } else if (Array.isArray(children)) {
        for (var c = 0; c < children.length; c++) {
          if (children[c] === null || children[c] === undefined) continue;
          if (typeof children[c] === 'string') {
            node.appendChild(document.createTextNode(children[c]));
          } else {
            node.appendChild(children[c]);
          }
        }
      } else if (children instanceof HTMLElement) {
        node.appendChild(children);
      }
    }
    return node;
  }

  /* ======================================================================
     Utility: Build a lookup map from DESIGN_STORIES by ID
     ====================================================================== */

  /**
   * Build an object keyed by story ID for O(1) lookups.
   * @returns {Object} Map of storyId -> story object
   */
  function buildStoryIndex() {
    var index = {};
    for (var i = 0; i < DESIGN_STORIES.length; i++) {
      index[DESIGN_STORIES[i].id] = DESIGN_STORIES[i];
    }
    return index;
  }

  /* ======================================================================
     Utility: Collect all page filenames from SECTIONS
     ====================================================================== */

  /**
   * Flatten SECTIONS into a set-like object of page filenames.
   * @returns {Object} Keys are filenames, values are true
   */
  function buildSectionsPageSet() {
    var pages = {};
    for (var s = 0; s < SECTIONS.length; s++) {
      var section = SECTIONS[s];
      var items = section.items || [];
      for (var i = 0; i < items.length; i++) {
        pages[items[i].file] = true;
      }
    }
    return pages;
  }

  /* ======================================================================
     Utility: Collect all journey IDs
     ====================================================================== */

  /**
   * Build a set-like object of journey IDs.
   * @returns {Object} Keys are journey IDs, values are true
   */
  function buildJourneyIdSet() {
    var ids = {};
    for (var j = 0; j < JOURNEYS.length; j++) {
      var id = JOURNEYS[j].id;
      if (id) ids[id] = true;
    }
    return ids;
  }

  /* ======================================================================
     Utility: Collect all pages that have STORY_MAP entries
     ====================================================================== */

  /**
   * Build a set of page filenames that appear in STORY_MAP.
   * @returns {Object} Keys are filenames, values are true
   */
  function buildMappedPageSet() {
    var mapped = {};
    var keys = Object.keys(STORY_MAP);
    for (var k = 0; k < keys.length; k++) {
      mapped[keys[k]] = true;
    }
    return mapped;
  }

  /* ======================================================================
     Utility: Anchor ID from story ID (dots -> hyphens)
     ====================================================================== */

  /**
   * Convert a story ID like "1.3" into an anchor-safe string "story-1-3".
   * @param {string} storyId
   * @returns {string}
   */
  function storyAnchor(storyId) {
    return 'story-' + String(storyId).replace(/\./g, '-');
  }

  /* ======================================================================
     Utility: Approach badge helper
     ====================================================================== */

  /**
   * Create an approach badge element.
   * @param {string} approach - 'oob' | 'config' | 'custom-lwc'
   * @returns {HTMLElement}
   */
  function approachBadge(approach) {
    var label = '';
    var cls = 'wf-ds-approach';
    if (approach === 'oob') {
      label = 'OOB';
      cls += ' wf-ds-approach--oob';
    } else if (approach === 'config') {
      label = 'Config';
      cls += ' wf-ds-approach--config';
    } else if (approach === 'custom-lwc') {
      label = 'Custom LWC';
      cls += ' wf-ds-approach--custom-lwc';
    } else {
      label = approach || 'Unknown';
    }
    return wfGenEl('span', { className: cls }, label);
  }

  /* ======================================================================
     Utility: Status badge helper
     ====================================================================== */

  /**
   * Create a status badge element.
   * @param {string} status - 'draft' | 'in-progress' | 'accepted' | 'deferred'
   * @returns {HTMLElement}
   */
  function statusBadge(status) {
    var cls = 'wf-ds-status';
    var label = status || 'unknown';
    if (status === 'draft') {
      cls += ' wf-ds-status--draft';
      label = 'Draft';
    } else if (status === 'in-progress') {
      cls += ' wf-ds-status--in-progress';
      label = 'In Progress';
    } else if (status === 'accepted') {
      cls += ' wf-ds-status--accepted';
      label = 'Accepted';
    } else if (status === 'deferred') {
      cls += ' wf-ds-status--deferred';
      label = 'Deferred';
    }
    return wfGenEl('span', { className: cls }, label);
  }

  /* ======================================================================
     Section: Auto-Validation Warnings
     Cross-references data structures to surface issues.
     ====================================================================== */

  /**
   * Run cross-reference validation and return an array of warning strings.
   * @param {Object} storyIndex - Story ID -> story object map
   * @param {Object} sectionPages - Set of page filenames from SECTIONS
   * @param {Object} journeyIds - Set of journey IDs
   * @param {Object} mappedPages - Set of pages in STORY_MAP
   * @returns {Array<string>}
   */
  function computeWarnings(storyIndex, sectionPages, journeyIds, mappedPages) {
    var warnings = [];

    /* 1. STORY_MAP IDs not found in DESIGN_STORIES */
    var smKeys = Object.keys(STORY_MAP);
    for (var sk = 0; sk < smKeys.length; sk++) {
      var pageStories = STORY_MAP[smKeys[sk]];
      if (!pageStories) continue;
      for (var ps = 0; ps < pageStories.length; ps++) {
        var sid = pageStories[ps];
        if (!storyIndex[sid]) {
          warnings.push('Orphan story reference: ' + sid + ' mapped to pages but has no story definition');
        }
      }
    }

    /* 2. pages[] entries in DESIGN_STORIES not in SECTIONS */
    for (var ds = 0; ds < DESIGN_STORIES.length; ds++) {
      var story = DESIGN_STORIES[ds];
      var storyPages = story.pages || [];
      for (var sp = 0; sp < storyPages.length; sp++) {
        if (!sectionPages[storyPages[sp]]) {
          warnings.push('Dead link: story ' + story.id + ' references page \'' + storyPages[sp] + '\' not found in SECTIONS');
        }
      }
    }

    /* 3. journeyId in DESIGN_STORIES not in JOURNEYS */
    for (var dj = 0; dj < DESIGN_STORIES.length; dj++) {
      var jStory = DESIGN_STORIES[dj];
      if (jStory.journeyId && !journeyIds[jStory.journeyId]) {
        warnings.push('Missing journey: story ' + jStory.id + ' references journey \'' + jStory.journeyId + '\' not defined');
      }
    }

    /* 4. Wireframe pages in SECTIONS with no STORY_MAP entries */
    var uncoveredPages = [];
    var allSectionPages = Object.keys(sectionPages);
    for (var ap = 0; ap < allSectionPages.length; ap++) {
      var pageName = allSectionPages[ap];
      if (!mappedPages[pageName]) {
        uncoveredPages.push(pageName);
      }
    }
    if (uncoveredPages.length > 0) {
      warnings.push('No stories: pages \'' + uncoveredPages.join('\', \'') + '\' have no STORY_MAP entries');
    }

    return warnings;
  }

  /**
   * Render warnings section into a container element.
   * @param {Array<string>} warnings
   * @returns {HTMLElement|null} Returns null if no warnings
   */
  function renderWarnings(warnings) {
    if (!warnings || warnings.length === 0) return null;

    var section = wfGenEl('div', { className: 'wf-section wf-ds-warnings' });
    section.appendChild(wfGenEl('div', { className: 'wf-section-title' }, [
      wfGenEl('span', null, 'Validation Warnings'),
      wfGenEl('span', { className: 'wf-badge wf-badge-amber' }, String(warnings.length))
    ]));

    for (var w = 0; w < warnings.length; w++) {
      section.appendChild(wfGenEl('div', { className: 'wf-ds-warning' }, warnings[w]));
    }

    return section;
  }

  /* ======================================================================
     Section: Auto-Calculated Project Metrics
     ====================================================================== */

  /**
   * Compute project-level metrics from DESIGN_STORIES and STORY_MAP.
   * @param {Object} storyIndex - Story ID -> story object map
   * @param {Object} sectionPages - Set of page filenames from SECTIONS
   * @param {Object} mappedPages - Set of pages in STORY_MAP
   * @returns {Object} Metrics data
   */
  function computeMetrics(storyIndex, sectionPages, mappedPages) {
    /* Status counts */
    var statusCounts = { draft: 0, 'in-progress': 0, accepted: 0, deferred: 0 };
    for (var i = 0; i < DESIGN_STORIES.length; i++) {
      var st = DESIGN_STORIES[i].status || 'draft';
      if (statusCounts[st] !== undefined) {
        statusCounts[st]++;
      } else {
        statusCounts[st] = 1;
      }
    }

    /* Approach mix — count all phase-level approaches across all stories */
    var approachCounts = { oob: 0, config: 0, 'custom-lwc': 0 };
    var totalApproaches = 0;
    for (var a = 0; a < DESIGN_STORIES.length; a++) {
      var phases = DESIGN_STORIES[a].phases || [];
      for (var p = 0; p < phases.length; p++) {
        var appr = phases[p].approach;
        if (appr && approachCounts[appr] !== undefined) {
          approachCounts[appr]++;
        }
        totalApproaches++;
      }
    }

    var approachMix = {
      oob: approachCounts.oob,
      config: approachCounts.config,
      customLwc: approachCounts['custom-lwc']
    };

    /* Phase readiness — a phase is "ready" when all its story dependencies are met
       (all stories from previous phases are 'accepted') */
    var phaseReadiness = [];
    var acceptedStoryIds = {};
    for (var ac = 0; ac < DESIGN_STORIES.length; ac++) {
      if (DESIGN_STORIES[ac].status === 'accepted') {
        acceptedStoryIds[DESIGN_STORIES[ac].id] = true;
      }
    }
    for (var pr = 0; pr < PROJECT_PHASES.length; pr++) {
      var phase = PROJECT_PHASES[pr];
      var allDepsMet = true;
      /* Check that system deps from previous phases are tracked as notes only,
         but story-level deps: all stories in earlier phases must be accepted */
      for (var ep = 0; ep < pr; ep++) {
        var earlierStories = PROJECT_PHASES[ep].stories || [];
        for (var es = 0; es < earlierStories.length; es++) {
          if (!acceptedStoryIds[earlierStories[es]]) {
            allDepsMet = false;
            break;
          }
        }
        if (!allDepsMet) break;
      }
      phaseReadiness.push({
        phase: phase.phase,
        label: phase.label,
        ready: allDepsMet
      });
    }

    /* Coverage: how many SECTIONS pages have STORY_MAP entries */
    var totalPages = Object.keys(sectionPages).length;
    var coveredPages = Object.keys(mappedPages).length;

    return {
      statusCounts: statusCounts,
      totalStories: DESIGN_STORIES.length,
      approachMix: approachMix,
      phaseReadiness: phaseReadiness,
      coveredPages: coveredPages,
      totalPages: totalPages
    };
  }

  /**
   * Render the metrics section.
   * @param {Object} metrics
   * @returns {HTMLElement}
   */
  function renderMetrics(metrics) {
    var section = wfGenEl('div', { className: 'wf-section' });
    section.appendChild(wfGenEl('div', { className: 'wf-section-title' }, 'Project Metrics'));

    var metricsGrid = wfGenEl('div', { className: 'wf-ds-metrics' });

    /* Status breakdown */
    var statusLabels = [
      { key: 'draft', label: 'Draft' },
      { key: 'in-progress', label: 'In Progress' },
      { key: 'accepted', label: 'Accepted' },
      { key: 'deferred', label: 'Deferred' }
    ];
    for (var sl = 0; sl < statusLabels.length; sl++) {
      var item = statusLabels[sl];
      var count = metrics.statusCounts[item.key] || 0;
      var metric = wfGenEl('div', { className: 'wf-ds-metric' });
      metric.appendChild(wfGenEl('div', { className: 'wf-ds-metric-value' }, String(count)));
      metric.appendChild(wfGenEl('div', { className: 'wf-ds-metric-label' }, item.label));
      metricsGrid.appendChild(metric);
    }

    /* Approach mix — show counts to avoid rounding errors */
    var mixMetric = wfGenEl('div', { className: 'wf-ds-metric' });
    mixMetric.appendChild(wfGenEl('div', { className: 'wf-ds-metric-value' }, [
      wfGenEl('span', { className: 'wf-ds-approach wf-ds-approach--oob', style: { marginRight: '4px' } }, metrics.approachMix.oob + ' OOB'),
      wfGenEl('span', { className: 'wf-ds-approach wf-ds-approach--config', style: { marginRight: '4px' } }, metrics.approachMix.config + ' Config'),
      wfGenEl('span', { className: 'wf-ds-approach wf-ds-approach--custom-lwc' }, metrics.approachMix.customLwc + ' Custom LWC')
    ]));
    mixMetric.appendChild(wfGenEl('div', { className: 'wf-ds-metric-label' }, 'Approach Mix'));
    metricsGrid.appendChild(mixMetric);

    /* Coverage */
    var coverageMetric = wfGenEl('div', { className: 'wf-ds-metric' });
    coverageMetric.appendChild(wfGenEl('div', { className: 'wf-ds-metric-value' }, metrics.coveredPages + ' / ' + metrics.totalPages));
    coverageMetric.appendChild(wfGenEl('div', { className: 'wf-ds-metric-label' }, 'Pages with Story Assignments'));
    metricsGrid.appendChild(coverageMetric);

    /* Phase readiness */
    if (metrics.phaseReadiness.length > 0) {
      var readinessMetric = wfGenEl('div', { className: 'wf-ds-metric', style: { gridColumn: '1 / -1' } });
      var readinessVal = wfGenEl('div', { className: 'wf-ds-metric-value' });
      for (var pr = 0; pr < metrics.phaseReadiness.length; pr++) {
        var phReady = metrics.phaseReadiness[pr];
        var phBadgeColor = phReady.ready ? 'green' : 'amber';
        var phBadgeClass = 'wf-badge wf-badge-' + phBadgeColor;
        var phLabel = 'Phase ' + phReady.phase + ': ' + phReady.label;
        var readyText = phReady.ready ? 'Ready' : 'Blocked';
        readinessVal.appendChild(wfGenEl('span', { className: phBadgeClass, style: { marginRight: '8px' } }, phLabel + ' — ' + readyText));
      }
      readinessMetric.appendChild(readinessVal);
      readinessMetric.appendChild(wfGenEl('div', { className: 'wf-ds-metric-label' }, 'Phase Readiness'));
      metricsGrid.appendChild(readinessMetric);
    }

    section.appendChild(metricsGrid);
    return section;
  }

  /* ======================================================================
     Section: Implementation Roadmap
     Visual dependency map showing phases with story IDs, approach badges,
     dependency arrows, and system dependency callouts.
     ====================================================================== */

  /**
   * Render the implementation roadmap section.
   * @param {Object} storyIndex - Story ID -> story object map
   * @returns {HTMLElement|null} Returns null if no PROJECT_PHASES
   */
  function renderRoadmap(storyIndex) {
    if (!PROJECT_PHASES || PROJECT_PHASES.length === 0) return null;

    var section = wfGenEl('div', { className: 'wf-section' });
    section.appendChild(wfGenEl('div', { className: 'wf-section-title' }, 'Implementation Roadmap'));

    var roadmapInner = wfGenEl('div', { className: 'wf-ds-roadmap' });

    var container = wfGenEl('div', {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0',
        overflowX: 'auto',
        padding: '16px 0'
      }
    });

    for (var p = 0; p < PROJECT_PHASES.length; p++) {
      var phase = PROJECT_PHASES[p];
      var stories = phase.stories || [];
      var systemDeps = phase.systemDeps || [];

      /* Phase card */
      var phaseCard = wfGenEl('div', { className: 'wf-ds-roadmap-phase wf-card' });

      /* Phase header */
      var phaseHeader = wfGenEl('div', { className: 'wf-card-header' });
      phaseHeader.appendChild(wfGenEl('h3', null, 'Phase ' + phase.phase + ': ' + phase.label));
      phaseCard.appendChild(phaseHeader);

      var phaseBody = wfGenEl('div', { className: 'wf-card-body' });

      /* Story IDs with approach badges */
      for (var si = 0; si < stories.length; si++) {
        var storyId = stories[si];
        var story = storyIndex[storyId];
        var storyRow = wfGenEl('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '4px 0',
            borderBottom: '1px solid var(--wf-tint)',
            fontSize: '12px'
          }
        });

        /* Story ID as anchor link */
        var storyLink = wfGenEl('a', { href: '#' + storyAnchor(storyId) }, storyId);
        storyRow.appendChild(storyLink);

        /* Story title if known */
        if (story && story.title) {
          storyRow.appendChild(wfGenEl('span', { className: 'text-muted', style: { flex: '1', fontSize: '11px', marginLeft: '4px' } }, story.title));
        } else if (STORY_TITLES[storyId]) {
          storyRow.appendChild(wfGenEl('span', { className: 'text-muted', style: { flex: '1', fontSize: '11px', marginLeft: '4px' } }, STORY_TITLES[storyId]));
        } else {
          storyRow.appendChild(wfGenEl('span', { style: { flex: '1' } }));
        }

        /* Find the approach for this story in this specific phase */
        if (story && story.phases) {
          for (var spa = 0; spa < story.phases.length; spa++) {
            if (story.phases[spa].phase === phase.phase) {
              storyRow.appendChild(approachBadge(story.phases[spa].approach));
              break;
            }
          }
        }

        phaseBody.appendChild(storyRow);
      }

      /* System dependency callouts */
      if (systemDeps.length > 0) {
        var depsContainer = wfGenEl('div', { className: 'wf-ds-roadmap-deps', style: { marginTop: '8px' } });
        depsContainer.appendChild(wfGenEl('div', { className: 'overline', style: { marginBottom: '4px' } }, 'System Dependencies'));
        for (var sd = 0; sd < systemDeps.length; sd++) {
          depsContainer.appendChild(wfGenEl('div', {
            style: {
              fontSize: '11px',
              color: 'var(--wf-amber)',
              padding: '2px 0'
            }
          }, systemDeps[sd]));
        }
        phaseBody.appendChild(depsContainer);
      }

      /* Approach mix summary for this phase */
      var phaseApproaches = { oob: 0, config: 0, 'custom-lwc': 0 };
      var phaseApproachTotal = 0;
      for (var psi = 0; psi < stories.length; psi++) {
        var pStory = storyIndex[stories[psi]];
        if (pStory && pStory.phases) {
          for (var psp = 0; psp < pStory.phases.length; psp++) {
            if (pStory.phases[psp].phase === phase.phase) {
              var pa = pStory.phases[psp].approach;
              if (pa && phaseApproaches[pa] !== undefined) {
                phaseApproaches[pa]++;
              }
              phaseApproachTotal++;
              break;
            }
          }
        }
      }
      if (phaseApproachTotal > 0) {
        var mixRow = wfGenEl('div', {
          style: {
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid var(--wf-tint)',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            fontSize: '10px'
          }
        });
        if (phaseApproaches.oob > 0) {
          mixRow.appendChild(wfGenEl('span', { className: 'wf-ds-approach wf-ds-approach--oob' }, 'OOB: ' + phaseApproaches.oob));
        }
        if (phaseApproaches.config > 0) {
          mixRow.appendChild(wfGenEl('span', { className: 'wf-ds-approach wf-ds-approach--config' }, 'Config: ' + phaseApproaches.config));
        }
        if (phaseApproaches['custom-lwc'] > 0) {
          mixRow.appendChild(wfGenEl('span', { className: 'wf-ds-approach wf-ds-approach--custom-lwc' }, 'Custom: ' + phaseApproaches['custom-lwc']));
        }
        phaseBody.appendChild(mixRow);
      }

      phaseCard.appendChild(phaseBody);
      container.appendChild(phaseCard);

      /* Dependency arrow between phases (except after last) */
      if (p < PROJECT_PHASES.length - 1) {
        var arrow = wfGenEl('div', { className: 'wf-ds-roadmap-arrow' });
        arrow.appendChild(wfGenEl('span', {
          style: {
            fontSize: '20px',
            color: 'var(--wf-muted)',
            fontWeight: '700',
            padding: '0 8px'
          }
        }, '\u2192'));
        container.appendChild(arrow);
      }
    }

    roadmapInner.appendChild(container);
    section.appendChild(roadmapInner);
    return section;
  }

  /* ======================================================================
     Section: Status Filter Pills
     ====================================================================== */

  /**
   * Render the filter pill bar and wire up click handlers for filtering.
   * @returns {HTMLElement}
   */
  function renderFilterPills() {
    var section = wfGenEl('div', { className: 'wf-ds-filter-pills', role: 'group', 'aria-label': 'Filter stories by status' });

    var statuses = [
      { key: 'all', label: 'All' },
      { key: 'draft', label: 'Draft' },
      { key: 'in-progress', label: 'In Progress' },
      { key: 'accepted', label: 'Accepted' },
      { key: 'deferred', label: 'Deferred' }
    ];

    for (var i = 0; i < statuses.length; i++) {
      (function (statusKey, statusLabel) {
        var cls = 'wf-ds-filter-pill';
        if (statusKey === 'all') cls += ' active';

        var pill = wfGenEl('button', {
          className: cls,
          'data-filter': statusKey,
          onclick: function () {
            filterStories(statusKey);
          }
        }, statusLabel);
        section.appendChild(pill);
      })(statuses[i].key, statuses[i].label);
    }

    return section;
  }

  /**
   * Filter story cards by status. Updates pill active state and card visibility.
   * @param {string} statusKey - 'all' or a specific status
   */
  function filterStories(statusKey) {
    /* Update pill active states */
    var pills = document.querySelectorAll('.wf-ds-filter-pill');
    for (var p = 0; p < pills.length; p++) {
      if (pills[p].getAttribute('data-filter') === statusKey) {
        pills[p].className = 'wf-ds-filter-pill active';
      } else {
        pills[p].className = 'wf-ds-filter-pill';
      }
    }

    /* Show/hide story cards */
    var cards = document.querySelectorAll('.wf-ds-story-card');
    for (var c = 0; c < cards.length; c++) {
      var cardStatus = cards[c].getAttribute('data-status');
      if (statusKey === 'all' || cardStatus === statusKey) {
        cards[c].style.display = '';
      } else {
        cards[c].style.display = 'none';
      }
    }
  }

  /* ======================================================================
     Section: Story Cards
     One card per DESIGN_STORIES entry with full detail rendering.
     ====================================================================== */

  /**
   * Render a single story card.
   * @param {Object} story - A DESIGN_STORIES entry
   * @param {Object} sectionPages - Set of page filenames from SECTIONS
   * @returns {HTMLElement}
   */
  function renderStoryCard(story, sectionPages) {
    var card = wfGenEl('div', {
      className: 'wf-ds-story-card wf-card',
      id: storyAnchor(story.id),
      'data-status': story.status || 'draft'
    });

    /* ── Header row: ID badge + title + status badge + version ── */
    var headerRow = wfGenEl('div', {
      className: 'wf-card-header',
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }
    });

    headerRow.appendChild(wfGenEl('span', { className: 'wf-ds-story-id' }, story.id));
    headerRow.appendChild(wfGenEl('h3', { style: { flex: '1', margin: '0' } }, story.title || 'Untitled Story'));
    headerRow.appendChild(statusBadge(story.status));
    if (story.version) {
      headerRow.appendChild(wfGenEl('span', { className: 'wf-ds-version' }, 'v' + story.version));
    }

    card.appendChild(headerRow);

    /* ── Card body: all story detail sections ── */
    var body = wfGenEl('div', { className: 'wf-card-body' });

    /* User story statement */
    if (story.userStory) {
      var userStoryBlock = wfGenEl('blockquote', { className: 'wf-ds-user-story' }, story.userStory);
      body.appendChild(userStoryBlock);
    }

    /* Journey link */
    if (story.journeyId) {
      var journeyLink = wfGenEl('div', { className: 'wf-ds-journey-link' });
      journeyLink.appendChild(wfGenEl('span', { className: 'overline' }, 'Journey: '));
      journeyLink.appendChild(wfGenEl('a', { href: 'user-flows.html#journey-' + story.journeyId }, story.journeyId));
      body.appendChild(journeyLink);
    }

    /* Page links */
    var storyPages = story.pages || [];
    if (storyPages.length > 0) {
      var pageLinksContainer = wfGenEl('div', { className: 'wf-ds-page-links' });
      pageLinksContainer.appendChild(wfGenEl('span', { className: 'overline' }, 'Pages: '));
      for (var pl = 0; pl < storyPages.length; pl++) {
        var pageName = storyPages[pl];
        if (pl > 0) {
          pageLinksContainer.appendChild(document.createTextNode(', '));
        }
        if (sectionPages[pageName]) {
          pageLinksContainer.appendChild(wfGenEl('a', { href: pageName + '.html' }, pageName));
        } else {
          /* Page not found in SECTIONS — render as plain text */
          pageLinksContainer.appendChild(wfGenEl('span', { className: 'text-muted' }, pageName));
        }
      }
      body.appendChild(pageLinksContainer);
    }

    /* Acceptance criteria */
    var acceptance = story.acceptance || [];
    if (acceptance.length > 0) {
      var acSection = wfGenEl('div', { className: 'wf-ds-acceptance' });
      acSection.appendChild(wfGenEl('div', { className: 'overline', style: { marginBottom: '6px' } }, 'Acceptance Criteria'));
      var acList = wfGenEl('ul', { style: { margin: '0', paddingLeft: '18px' } });
      for (var ac = 0; ac < acceptance.length; ac++) {
        acList.appendChild(wfGenEl('li', {
          style: { fontSize: '12px', color: 'var(--wf-text)', lineHeight: '1.6' }
        }, acceptance[ac]));
      }
      acSection.appendChild(acList);
      body.appendChild(acSection);
    }

    /* Per-story phased implementation table */
    var storyPhases = story.phases || [];
    if (storyPhases.length > 0) {
      var phasesSection = wfGenEl('div', { className: 'wf-ds-phases' });
      phasesSection.appendChild(wfGenEl('div', { className: 'overline', style: { marginBottom: '6px' } }, 'Phased Implementation'));

      var phaseTable = wfGenEl('table', { className: 'wf-table' });

      /* Thead */
      var thead = wfGenEl('thead');
      var headRow = wfGenEl('tr');
      headRow.appendChild(wfGenEl('th', null, 'Phase'));
      headRow.appendChild(wfGenEl('th', null, 'Scope'));
      headRow.appendChild(wfGenEl('th', null, 'Dependencies'));
      headRow.appendChild(wfGenEl('th', null, 'Approach'));
      thead.appendChild(headRow);
      phaseTable.appendChild(thead);

      /* Tbody */
      var tbody = wfGenEl('tbody');
      for (var ph = 0; ph < storyPhases.length; ph++) {
        var phaseData = storyPhases[ph];
        var phaseRow = wfGenEl('tr', { className: 'wf-ds-phase-row' });

        /* Phase label */
        phaseRow.appendChild(wfGenEl('td', null, 'Phase ' + phaseData.phase + ': ' + (phaseData.label || '')));

        /* Scope */
        var scopeItems = phaseData.scope || [];
        var scopeCell = wfGenEl('td', { className: 'wf-ds-phase-scope' });
        if (scopeItems.length > 0) {
          var scopeList = wfGenEl('ul', { style: { margin: '0', paddingLeft: '14px', fontSize: '11px' } });
          for (var sc = 0; sc < scopeItems.length; sc++) {
            scopeList.appendChild(wfGenEl('li', null, scopeItems[sc]));
          }
          scopeCell.appendChild(scopeList);
        }
        phaseRow.appendChild(scopeCell);

        /* Dependencies */
        var deps = phaseData.dependencies || [];
        var depsCell = wfGenEl('td');
        if (deps.length > 0) {
          var depsList = wfGenEl('ul', { style: { margin: '0', paddingLeft: '14px', fontSize: '11px' } });
          for (var dp = 0; dp < deps.length; dp++) {
            depsList.appendChild(wfGenEl('li', null, deps[dp]));
          }
          depsCell.appendChild(depsList);
        } else {
          depsCell.appendChild(wfGenEl('span', { className: 'text-muted', style: { fontSize: '11px' } }, 'None'));
        }
        phaseRow.appendChild(depsCell);

        /* Approach badge */
        var approachCell = wfGenEl('td');
        approachCell.appendChild(approachBadge(phaseData.approach));
        phaseRow.appendChild(approachCell);

        tbody.appendChild(phaseRow);
      }
      phaseTable.appendChild(tbody);
      phasesSection.appendChild(phaseTable);
      body.appendChild(phasesSection);
    }

    /* SFDC implementation suggestions */
    if (story.sfdc && story.sfdc.suggestions && story.sfdc.suggestions.length > 0) {
      var sfdcSection = wfGenEl('div', { className: 'wf-ds-sfdc-suggestions' });
      sfdcSection.appendChild(wfGenEl('div', { className: 'overline', style: { marginBottom: '6px' } }, 'SFDC Implementation Suggestions'));
      var sfdcList = wfGenEl('ul', { style: { margin: '0', paddingLeft: '18px' } });
      for (var sf = 0; sf < story.sfdc.suggestions.length; sf++) {
        sfdcList.appendChild(wfGenEl('li', {
          style: { fontSize: '12px', color: 'var(--wf-text)', lineHeight: '1.6' }
        }, story.sfdc.suggestions[sf]));
      }
      sfdcSection.appendChild(sfdcList);
      body.appendChild(sfdcSection);
    }

    /* Decision log — expandable accordion */
    var decisions = story.decisions || [];
    if (decisions.length > 0) {
      var decisionsSection = wfGenEl('div', { className: 'wf-ds-decisions' });
      decisionsSection.appendChild(wfGenEl('div', { className: 'overline', style: { marginBottom: '6px' } }, 'Decision Log'));

      /* Sort decisions reverse-chronologically by date string */
      var sortedDecisions = decisions.slice().sort(function (a, b) {
        /* Simple string comparison works for ISO-format dates (YYYY-MM-DD) */
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        return 0;
      });

      for (var d = 0; d < sortedDecisions.length; d++) {
        (function (decision) {
          var entry = wfGenEl('div', { className: 'wf-ds-decision-entry' });

          /* Toggle row — shows date + decision text, clickable */
          var toggleRow = wfGenEl('button', {
            className: 'wf-ds-accordion-toggle',
            onclick: function () {
              var bodyEl = entry.querySelector('.wf-ds-accordion-body');
              var isOpen = bodyEl.style.display !== 'none';
              bodyEl.style.display = isOpen ? 'none' : 'block';
              /* Update toggle indicator */
              var indicator = entry.querySelector('.wf-ds-accordion-indicator');
              if (indicator) {
                indicator.textContent = isOpen ? '\u25B6' : '\u25BC';
              }
            }
          });

          toggleRow.appendChild(wfGenEl('span', { className: 'wf-ds-accordion-indicator' }, '\u25B6'));
          toggleRow.appendChild(wfGenEl('span', { className: 'wf-ds-decision-date' }, decision.date || ''));
          toggleRow.appendChild(wfGenEl('span', { className: 'wf-ds-decision-text' }, decision.decision || ''));
          entry.appendChild(toggleRow);

          /* Collapsible body — rationale (hidden by default) */
          var rationaleBody = wfGenEl('div', { className: 'wf-ds-accordion-body', style: { display: 'none' } });
          rationaleBody.appendChild(wfGenEl('div', { className: 'wf-ds-decision-rationale' }, decision.rationale || ''));
          entry.appendChild(rationaleBody);

          decisionsSection.appendChild(entry);
        })(sortedDecisions[d]);
      }

      body.appendChild(decisionsSection);
    }

    card.appendChild(body);
    return card;
  }

  /* ======================================================================
     Empty State
     Shown when DESIGN_STORIES is not defined or empty.
     ====================================================================== */

  /**
   * Render a helpful empty state message.
   * @returns {HTMLElement}
   */
  function renderEmptyState() {
    var container = wfGenEl('div', {
      style: {
        textAlign: 'center',
        padding: '48px 24px',
        color: 'var(--wf-muted)'
      }
    });
    container.appendChild(wfGenEl('div', { style: { fontSize: '36px', marginBottom: '12px' } }, '\uD83D\uDCCB'));
    container.appendChild(wfGenEl('h2', { style: { color: 'var(--wf-ink)', marginBottom: '8px' } }, 'No Design Stories Defined'));
    container.appendChild(wfGenEl('p', { style: { fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px', lineHeight: '1.6' } },
      'Define DESIGN_STORIES in your project-data.js to populate this page. ' +
      'Each story includes a user story statement, acceptance criteria, phased implementation plan, ' +
      'decision log, and SFDC suggestions. See the starter template for the complete data structure.'
    ));
    container.appendChild(wfGenEl('p', { style: { fontSize: '12px', maxWidth: '480px', margin: '0 auto' } }, [
      wfGenEl('span', { className: 'text-muted' }, 'Reference: '),
      wfGenEl('code', { style: { fontSize: '11px', background: 'var(--wf-surface)', padding: '2px 6px', borderRadius: '3px' } }, 'starters/project-data.js')
    ]));
    return container;
  }

  /* ======================================================================
     Main Initialization
     ====================================================================== */

  /**
   * Entry point. Finds #wf-ds-root, validates data, and renders all sections.
   */
  function wfStoriesInit() {
    var root = document.getElementById('wf-ds-root');
    if (!root) {
      /* No container on this page — silently skip */
      return;
    }

    /* Handle empty state */
    if (!DESIGN_STORIES || DESIGN_STORIES.length === 0) {
      root.appendChild(renderEmptyState());
      return;
    }

    /* Build lookup indices */
    var storyIndex = buildStoryIndex();
    var sectionPages = buildSectionsPageSet();
    var journeyIds = buildJourneyIdSet();
    var mappedPages = buildMappedPageSet();

    /* 1. Auto-validation warnings */
    var warnings = computeWarnings(storyIndex, sectionPages, journeyIds, mappedPages);
    var warningsEl = renderWarnings(warnings);
    if (warningsEl) {
      root.appendChild(warningsEl);
    }

    /* 2. Project metrics */
    var metrics = computeMetrics(storyIndex, sectionPages, mappedPages);
    root.appendChild(renderMetrics(metrics));

    /* 3. Implementation roadmap */
    var roadmapEl = renderRoadmap(storyIndex);
    if (roadmapEl) {
      root.appendChild(roadmapEl);
    }

    /* 4. Status filter pills */
    root.appendChild(renderFilterPills());

    /* 5. Story cards */
    var storiesContainer = wfGenEl('div', {
      style: { display: 'flex', flexDirection: 'column', gap: '16px' }
    });
    for (var i = 0; i < DESIGN_STORIES.length; i++) {
      storiesContainer.appendChild(renderStoryCard(DESIGN_STORIES[i], sectionPages));
    }
    root.appendChild(storiesContainer);
  }

  /* ── Run ── */
  wfStoriesInit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wfDesignStoriesInit);
  } else {
    wfDesignStoriesInit();
  }
})();
