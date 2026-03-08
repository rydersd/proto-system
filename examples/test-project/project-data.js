/* Test Project — Sales Portal (3 pages) */

window.WIREFRAME_CONFIG = {
  title: 'Sales Portal Wireframes',
  subtitle: '3 screens · Internal + Slack + SFDC',
  fallbackPage: 'dashboard.html',
  emailPrefix: '[Sales Portal WF]',
  emailFooter: 'Sent from Sales Portal wireframe prototype',
  emailRecipient: ''
};

var SECTIONS = [
  {
    label: 'Sales Portal',
    items: [
      { file: 'dashboard', label: 'Partner Dashboard', type: 'dashboard' },
      { file: 'deal-room', label: 'Deal Room Channel', type: 'channel' },
      { file: 'opp-record', label: 'Opportunity Record', type: 'sfdc' }
    ]
  }
];
