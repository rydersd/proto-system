/* ========================================================================
   Framework Navigation Data (framework-nav.js)

   Defines cross-project navigation links shown in the drawer.
   Load BEFORE proto-nav.js. Auto-detects depth for correct relative paths.
   ======================================================================== */

(function() {
  'use strict';

  /* Detect depth: are we in examples/ or examples/subdir/ ? */
  var loc = window.location.pathname;
  var prefix = '';
  var docsPrefix = '';
  var exIdx = loc.indexOf('/examples/');
  if (exIdx !== -1) {
    var afterExamples = loc.substring(exIdx + '/examples/'.length);
    if (afterExamples.indexOf('/') > 0) {
      prefix = '../';       /* We're in a subdirectory like examples/kanban-board/ */
      docsPrefix = '../../docs/';
    } else {
      prefix = '';           /* We're at examples/ root */
      docsPrefix = '../docs/';
    }
  }

  window.WF_FRAMEWORK_NAV = {
    examples: [
      { label: 'All Examples',      path: prefix + 'index.html' },
      { label: 'Sales Portal',      path: prefix + 'test-project/dashboard.html' },
      { label: 'Data Table',        path: prefix + 'data-table/index.html' },
      { label: 'Agent Chat',        path: prefix + 'agent-chat/index.html' },
      { label: 'Newspaper',         path: prefix + 'newspaper/index.html' },
      { label: 'Pinterest Board',   path: prefix + 'pinterest-board/index.html' },
      { label: 'Kanban Board',      path: prefix + 'kanban-board/index.html' },
      { label: 'Charts Dashboard',  path: prefix + 'charts-dashboard/index.html' }
    ],
    docs: [
      { label: 'Getting Started',  path: docsPrefix + 'getting-started.html' },
      { label: 'Philosophy',       path: docsPrefix + 'philosophy.html' },
      { label: 'Design Tokens',    path: docsPrefix + 'tokens.html' },
      { label: 'Components',       path: docsPrefix + 'components.html' },
      { label: 'Surfaces',         path: docsPrefix + 'surfaces.html' }
    ]
  };
})();
