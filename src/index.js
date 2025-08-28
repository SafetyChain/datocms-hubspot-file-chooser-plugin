import React from 'react';
import ReactDOM from 'react-dom/client';
import { connect } from 'datocms-plugin-sdk';
import ConfigScreen from './ConfigScreen.js';
import FileSelector from './FileSelector.js';

const isInIframe = window.parent !== window;

if (isInIframe) {
  connect({
    renderConfigScreen(ctx) {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<ConfigScreen ctx={ctx} />);
    },
    manualFieldExtensions() {
      return [
        {
          id: 'hubspot-pdf-chooser',
          name: 'HubSpot PDF Chooser',
          type: 'editor',
          fieldTypes: ['json', 'string'],
          configurable: false,
        },
      ];
    },
    renderFieldExtension(fieldExtensionId, ctx) {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      if (fieldExtensionId === 'hubspot-pdf-chooser') {
        root.render(<FileSelector ctx={ctx} />);
      }
    },
  });
} else {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h2>DatoCMS HubSpot PDF Chooser</h2>
      <p>
        This plugin renders inside DatoCMS. To test the actual UI, install the plugin in your DatoCMS project
        and open the configuration screen or the field with the extension.
      </p>
    </div>
  );
}