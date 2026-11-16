import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mendus59.whaletracker',
  appName: 'WhaleTracker',
  webDir: 'dist',
  android: {
    // Firebase Auth and Firestore need an https origin; Capacitor serves https://localhost.
    allowMixedContent: false,
  },
};

export default config;
