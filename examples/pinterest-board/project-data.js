/* Mood Board — project configuration */

window.WIREFRAME_CONFIG = {
  title: 'Mood Board',
  subtitle: '1 screen \u00b7 Pinterest-style inspiration',
  fallbackPage: 'index.html',
  emailPrefix: '[Mood Board WF]',
  emailFooter: 'Sent from Mood Board wireframe prototype',
  emailRecipient: '',
  surface: 'pinterest'
};

var SECTIONS = [
  {
    label: 'Mood Board',
    items: [
      { file: 'index', label: 'Design Inspiration', type: 'dashboard' },
      { file: 'pin-detail', label: 'Pin Detail', type: 'record' }
    ]
  }
];
