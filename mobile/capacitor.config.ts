import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  // CLI generation only. configure-ios.rb restores the registered Apple ID.
  appId: 'jp.anzenaiportal.app', appName: '安全AIポータル', webDir: 'out',
  server: { hostname: 'localhost', iosScheme: 'capacitor', cleartext: false },
  ios: { contentInset: 'never', preferredContentMode: 'mobile', backgroundColor: '#f3f6f7' },
  plugins: { CapacitorHttp: { enabled: false } },
};
export default config;
