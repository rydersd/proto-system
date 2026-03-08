/* ========================================================================
   Example Navigation Dropdown (example-nav.js)

   Injects a small dropdown next to the first <h1> on any example page,
   letting users jump between examples without going back to the index.

   Include AFTER proto-nav.js. Paths are resolved relative to examples/.
   Uses wfNavigate() for scatter transitions in napkin mode,
   with fallback to direct navigation if proto-nav.js isn't loaded.
   ======================================================================== */

(function() {
  'use strict';

  var EXAMPLES = [
    { label: 'Sales Portal',      path: 'test-project/dashboard.html' },
    { label: 'Data Table',        path: 'data-table/index.html' },
    { label: 'Agent Chat',        path: 'agent-chat/index.html' },
    { label: 'Newspaper',         path: 'newspaper/index.html' },
    { label: 'Pinterest Board',   path: 'pinterest-board/index.html' },
    { label: 'Kanban Board',      path: 'kanban-board/index.html' },
    { label: 'Charts Dashboard',  path: 'charts-dashboard/index.html' }
  ];

  /* Detect depth: are we in examples/ or examples/subdir/ ? */
  var loc = window.location.pathname;
  var inSubdir = false;
  var exIdx = loc.indexOf('/examples/');
  if (exIdx !== -1) {
    var afterExamples = loc.substring(exIdx + '/examples/'.length);
    inSubdir = afterExamples.indexOf('/') > 0;
  }
  var prefix = inSubdir ? '../' : '';

  /* Figure out which example is current */
  function currentKey() {
    for (var i = 0; i < EXAMPLES.length; i++) {
      if (loc.indexOf(EXAMPLES[i].path.replace('index.html', '').replace('.html', '')) !== -1) {
        return EXAMPLES[i].path;
      }
    }
    return '';
  }
  var activeKey = currentKey();

  /* Build the dropdown */
  var select = document.createElement('select');
  select.style.cssText =
    'font-size:13px;padding:4px 8px;border:1.5px solid var(--wf-line);' +
    'border-radius:var(--wf-radius);background:var(--wf-white);' +
    'color:var(--wf-text);cursor:pointer;margin-left:12px;' +
    'font-family:var(--wf-font);vertical-align:middle;';

  var defaultOpt = document.createElement('option');
  defaultOpt.textContent = 'Jump to example\u2026';
  defaultOpt.value = '';
  defaultOpt.disabled = true;
  defaultOpt.selected = true;
  select.appendChild(defaultOpt);

  EXAMPLES.forEach(function(ex) {
    var opt = document.createElement('option');
    opt.value = prefix + ex.path;
    opt.textContent = ex.label;
    if (ex.path === activeKey) {
      opt.disabled = true;
      opt.textContent = ex.label + ' (current)';
    }
    select.appendChild(opt);
  });

  select.addEventListener('change', function() {
    var url = this.value;
    if (!url) return;
    window.location.href = url;
  });

  /* Insert next to the first h1 */
  function insertDropdown() {
    var h1 = document.querySelector('h1');
    if (h1 && !select.parentNode) {
      h1.style.display = 'inline';
      h1.parentNode.insertBefore(select, h1.nextSibling);
    }
  }

  /* Handle both pre- and post-DOMContentLoaded execution */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertDropdown);
  } else {
    insertDropdown();
  }
})();
