/* ========================================================================
   PROJECT DATA — Partner Central: Deal Registration
   8 screens demonstrating compose-flow.js clickable prototyping.
   ======================================================================== */

window.WIREFRAME_CONFIG = {
  title: 'Partner Central',
  subtitle: '8 screens · Deal Registration Flow',
  fallbackPage: 'deal-registration-list.html',
  defaultTheme: 'slds'
};

var SECTIONS = [
  {
    id: 'deal-reg',
    label: 'Deal Registration',
    theme: 'slds',
    items: [
      { file: 'deal-registration-list', label: 'Deal Registrations',       type: 'sfdc' },
      { file: 'deal-reg-empty',         label: 'Empty State',              type: 'sfdc' },
      { file: 'deal-reg-loading',       label: 'Loading State',            type: 'sfdc' },
      { file: 'deal-reg-error',         label: 'Error State',              type: 'sfdc' },
      { file: 'deal-detail',            label: 'Deal Detail',              type: 'sfdc' },
      { file: 'deal-reg-step1',         label: 'Step 1: Prospect',         type: 'sfdc' },
      { file: 'deal-reg-step2',         label: 'Step 2: Deal Details',     type: 'sfdc' },
      { file: 'deal-reg-step3',         label: 'Step 3: Sales Contact',    type: 'sfdc' },
      { file: 'deal-reg-step4',         label: 'Step 4: Review & Submit',  type: 'sfdc' }
    ]
  }
];

/* ── COMPOSE_FLOW ── Wires wizard steps into a clickable prototype ───── */

window.COMPOSE_FLOW = {
  flows: {
    'deal-registration': {
      label: 'Register a New Deal',
      persona: 'Jordan Reeves, Partner Sales Rep',
      entry: 'deal-registration-list',
      entryNarrative: 'Jordan opens the Deal Registrations list to register a new deal for Meridian Capital Group.',
      steps: [
        {
          file: 'deal-reg-step1',
          label: 'Prospect Information',
          narrative: 'Jordan searches for the prospect company using the D&B lookup. Meridian Capital Group is found and company details auto-populate.'
        },
        {
          file: 'deal-reg-step2',
          label: 'Deal Details',
          narrative: 'Jordan fills in deal details — name, value, close date, services. Selects SG1 and DC6 locations via the dual listbox. Adds a deal description.',
          friction: 'The dual listbox requires scrolling to find specific IBX locations. Region filter pills help but the list is long.'
        },
        {
          file: 'deal-reg-step3',
          label: 'Sales Contact',
          narrative: 'Jordan checks "I am the sales contact" and the form auto-populates from their profile. They verify the Equinix Partner ID.'
        },
        {
          file: 'deal-reg-step4',
          label: 'Review & Submit',
          narrative: 'Jordan reviews all sections. Everything looks correct. They click "Submit Deal Registration" and receive confirmation.'
        }
      ]
    }
  },
  links: {
    'Register New Deal': 'deal-reg-step1.html',
    'Register Your First Deal': 'deal-reg-step1.html'
  }
};
