/* Newspaper Example — The Daily Wire(frame) */

window.WIREFRAME_CONFIG = {
  title: 'The Daily Wire(frame)',
  subtitle: '1 screen · Newspaper layout',
  fallbackPage: 'index.html',
  emailPrefix: '[Newspaper WF]',
  emailFooter: 'Sent from Newspaper wireframe prototype',
  emailRecipient: ''
};

var SECTIONS = [
  {
    label: 'Newspaper',
    items: [
      { file: 'index', label: 'Front Page', type: 'dashboard' },
      { file: 'article', label: 'Article', type: 'record' }
    ]
  }
];
