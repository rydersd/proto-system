/* ========================================================================
   Nib Compose Flow (compose-flow.js)

   Wires multi-page compose screens into a clickable prototype.
   Reads window.COMPOSE_FLOW to:
   1. Inject navigation URLs into wizard action-bar blocks
   2. Auto-generate SCENARIOS for proto-nav.js guided walkthroughs
   3. Sync wizard stepper state across pages via sessionStorage
   4. Wire list-view action buttons to flow entry points

   Load order: project-data.js → proto-nav.js → compose-data.js →
               proto-compose.js → compose-flow.js → proto-gen.js

   COMPOSE_FLOW is optional. Without it, pages render normally as islands.
   ======================================================================== */

(function () {
  'use strict';

  /* ======================================================================
     COMPOSE_FLOW Data Structure
     ====================================================================== */

  /*
   * window.COMPOSE_FLOW = {
   *   flows: {
   *     'deal-registration': {
   *       label: 'Deal Registration',
   *       persona: 'Jordan Reeves, Partner Sales Rep',
   *       steps: [
   *         { file: 'deal-reg-step1', label: 'Prospect Information', narrative: '...' },
   *         { file: 'deal-reg-step2', label: 'Deal Details', narrative: '...' },
   *         ...
   *       ]
   *     }
   *   },
   *   links: {
   *     'Register New Deal': 'deal-reg-step1.html',
   *     'Register Your First Deal': 'deal-reg-step1.html'
   *   }
   * };
   */

  var flow = window.COMPOSE_FLOW;
  if (!flow) return;

  var currentFile = location.pathname.split('/').pop().replace('.html', '');

  /* ======================================================================
     1. Inject navigation URLs into PAGE_BLUEPRINT action-bar blocks
     ====================================================================== */

  function wireActionBar() {
    var bp = window.PAGE_BLUEPRINT;
    if (!bp || !bp.columns) return;

    var blocks = bp.columns.center || bp.columns.left || [];
    var flows = flow.flows || {};
    var flowIds = Object.keys(flows);

    for (var f = 0; f < flowIds.length; f++) {
      var flowDef = flows[flowIds[f]];
      var steps = flowDef.steps || [];

      /* Find which step this page is */
      var stepIdx = -1;
      for (var s = 0; s < steps.length; s++) {
        if (steps[s].file === currentFile) { stepIdx = s; break; }
      }
      if (stepIdx === -1) continue;

      /* Find the action-bar block and inject URLs */
      for (var b = 0; b < blocks.length; b++) {
        if (blocks[b].type === 'action-bar') {
          if (stepIdx > 0) {
            blocks[b].backUrl = steps[stepIdx - 1].file + '.html';
          }
          if (stepIdx < steps.length - 1) {
            blocks[b].nextUrl = steps[stepIdx + 1].file + '.html';
          }
          /* Save & Exit goes to the list/entry page */
          if (flowDef.entry) {
            blocks[b].exitUrl = flowDef.entry + '.html';
          }
          break;
        }
      }

      /* Store current step index for stepper sync */
      sessionStorage.setItem('wf_compose_flow', JSON.stringify({
        flowId: flowIds[f], step: stepIdx, total: steps.length
      }));
      break;
    }
  }

  /* ======================================================================
     2. Sync stepper state across pages
     ====================================================================== */

  function syncStepper() {
    var bp = window.PAGE_BLUEPRINT;
    if (!bp || !bp.columns) return;

    var blocks = bp.columns.center || [];
    var raw = sessionStorage.getItem('wf_compose_flow');
    if (!raw) return;

    var state;
    try { state = JSON.parse(raw); } catch (e) { return; }

    /* Find the stepper block and update step statuses */
    for (var b = 0; b < blocks.length; b++) {
      if (blocks[b].type === 'stepper' && blocks[b].steps) {
        var steps = blocks[b].steps;
        for (var s = 0; s < steps.length; s++) {
          if (s < state.step) steps[s].status = 'complete';
          else if (s === state.step) steps[s].status = 'current';
          else steps[s].status = 'upcoming';
        }
        blocks[b].current = state.step;
        break;
      }
    }
  }

  /* ======================================================================
     3. Auto-generate SCENARIOS for proto-nav.js
     ====================================================================== */

  function generateScenarios() {
    var flows = flow.flows || {};
    var flowIds = Object.keys(flows);
    var scenarios = window.SCENARIOS || [];

    for (var f = 0; f < flowIds.length; f++) {
      var flowDef = flows[flowIds[f]];
      var steps = flowDef.steps || [];

      /* Skip if this scenario ID already exists (user-defined takes priority) */
      var exists = false;
      for (var e = 0; e < scenarios.length; e++) {
        if (scenarios[e].id === flowIds[f]) { exists = true; break; }
      }
      if (exists) continue;

      /* Build scenario steps from flow steps */
      var scenarioSteps = [];
      for (var s = 0; s < steps.length; s++) {
        scenarioSteps.push({
          file: steps[s].file,
          narrative: steps[s].narrative || 'Step ' + (s + 1) + ': ' + (steps[s].label || ''),
          friction: steps[s].friction || null
        });
      }

      /* If flow has an entry page, prepend it as step 0 */
      if (flowDef.entry) {
        var entryExists = false;
        for (var se = 0; se < scenarioSteps.length; se++) {
          if (scenarioSteps[se].file === flowDef.entry) { entryExists = true; break; }
        }
        if (!entryExists) {
          scenarioSteps.unshift({
            file: flowDef.entry,
            narrative: flowDef.entryNarrative || 'Starting point: ' + (flowDef.label || 'flow'),
            friction: null
          });
        }
      }

      scenarios.push({
        id: flowIds[f],
        label: flowDef.label || flowIds[f],
        persona: flowDef.persona || 'User',
        steps: scenarioSteps
      });
    }

    window.SCENARIOS = scenarios;
  }

  /* ======================================================================
     4. Wire action buttons on list/entry pages (after DOM renders)
     ====================================================================== */

  function wireButtons() {
    var links = flow.links || {};
    var labels = Object.keys(links);
    if (!labels.length) return;

    /* Find all buttons on the page and match by text content */
    var buttons = document.querySelectorAll('button, .btn, [role="button"]');
    for (var b = 0; b < buttons.length; b++) {
      var btnText = (buttons[b].textContent || '').trim();
      for (var l = 0; l < labels.length; l++) {
        if (btnText === labels[l]) {
          (function (url) {
            buttons[b].addEventListener('click', function (e) {
              e.preventDefault();
              /* Clear any previous flow state when starting fresh */
              sessionStorage.removeItem('wf_compose_flow');
              if (window.wfNavigate) window.wfNavigate(url);
              else location.href = url;
            });
          })(links[labels[l]]);
          break;
        }
      }
    }
  }

  /* ======================================================================
     Execute
     ====================================================================== */

  /* Steps 1-3 run synchronously before proto-gen.js renders */
  wireActionBar();
  syncStepper();
  generateScenarios();

  /* Step 4 runs after DOM is rendered (proto-gen.js has built the page) */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      /* Slight delay to ensure proto-gen.js has finished rendering */
      setTimeout(wireButtons, 10);
    });
  } else {
    setTimeout(wireButtons, 10);
  }

})();
