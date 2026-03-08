/* ========================================================================
   Framework Navigation Data (framework-nav.js) -- docs version

   Same structure as examples/framework-nav.js but with paths relative
   to the docs/ directory.
   ======================================================================== */

(function() {
  'use strict';

  var examplesPrefix = '../examples/';

  window.WF_FRAMEWORK_NAV = {
    examples: [
      { label: 'All Examples',      path: examplesPrefix + 'index.html' },
      { label: 'Sales Portal',      path: examplesPrefix + 'test-project/dashboard.html' },
      { label: 'Data Table',        path: examplesPrefix + 'data-table/index.html' },
      { label: 'Agent Chat',        path: examplesPrefix + 'agent-chat/index.html' },
      { label: 'Newspaper',         path: examplesPrefix + 'newspaper/index.html' },
      { label: 'Pinterest Board',   path: examplesPrefix + 'pinterest-board/index.html' },
      { label: 'Kanban Board',      path: examplesPrefix + 'kanban-board/index.html' },
      { label: 'Charts Dashboard',  path: examplesPrefix + 'charts-dashboard/index.html' }
    ],
    docs: [
      { label: 'Getting Started',  path: 'getting-started.html' },
      { label: 'Philosophy',       path: 'philosophy.html' },
      { label: 'Design Tokens',    path: 'tokens.html' },
      { label: 'Components',       path: 'components.html' },
      { label: 'Surfaces',         path: 'surfaces.html' }
    ]
  };
})();
