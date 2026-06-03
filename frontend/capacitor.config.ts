import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gnefolo.tennisaipro',
  appName: 'TennisAI Pro',
  webDir: 'dist',

  // Android specifics
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // true solo in dev
  },

  // Server: in produzione usa l'API remota
  server: {
    // Lascia commentato per usare i file locali (produzione)
    // url: 'http://192.168.1.X:5173', // dev su rete locale
    androidScheme: 'https',
    cleartext: false,
  },

  plugins: {
    // Keep screen awake durante le sessioni live
    KeepAwake: {
      // La logica di attivazione/disattivazione è gestita nel codice React
    },

    // Splash screen
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0B1220',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
