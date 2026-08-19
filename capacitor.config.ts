import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ie.nasouth.android.naireland',
  appName: 'NA Ireland',
  webDir: 'build',
  backgroundColor: '#000090',
  plugins: {
    // Native HTTP for the BMLT calls. The root servers do not send permissive
    // CORS headers, so an in-webview fetch() is blocked on device; CapacitorHttp
    // routes through the native stack instead. See src/lib/api/http.ts.
    CapacitorHttp: {
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#000090'
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000090'
    }
  },
  ios: {
    scheme: 'NA Ireland',
    backgroundColor: '#000090'
  },
  android: {
    backgroundColor: '#000090'
  }
  // For on-device HMR, run `npm run dev:host` and uncomment the block below with
  // your workstation IP (`ipconfig getifaddr en0`). Android emulators can use
  // http://10.0.2.2:5001. Remove it again before any production build.
  //
  // server: {
  //   url: 'http://192.168.1.100:5001',
  //   cleartext: true
  // }
};

export default config;
