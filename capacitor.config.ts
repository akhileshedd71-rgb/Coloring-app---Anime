import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'studio.hoshii.coloring',
  appName: 'Hoshii',
  webDir: 'dist',
  backgroundColor: '#fbf8ff',
  android: {
    allowMixedContent: false,
    captureInput: true,
    backgroundColor: '#fbf8ff',
    adjustMarginsForEdgeToEdge: 'auto',
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#fbf8ff',
      overlaysWebView: false,
    },
  },
};

export default config;
