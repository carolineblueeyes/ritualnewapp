import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ritual.app',
  appName: 'Ritual',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Health: {},
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#e8e0d4',
    },
  },
  android: {
    backgroundColor: '#070709',
  },
};

export default config;
