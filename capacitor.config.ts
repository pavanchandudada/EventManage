/**
 * Capacitor Native Wrapper Configuration (Android & iOS)
 *
 * After cloning this repository locally:
 *   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
 *   npm run build
 *   npx cap add android
 *   npx cap add ios
 *   npx cap sync
 *   npx cap open android   # or ios
 */
const config = {
  appId: 'in.utsavgrid.app',
  appName: 'UtsavGrid',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#1e3a8a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e3a8a',
    },
  },
};

export default config;
