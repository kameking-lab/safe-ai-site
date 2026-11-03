import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'jp.anzen-ai-portal.app', appName: '安全AIポータル', webDir: 'out',
  server: { hostname: 'localhost', iosScheme: 'capacitor', cleartext: false },
  ios: { contentInset: 'never', preferredContentMode: 'mobile', backgroundColor: '#f3f6f7' },
  plugins: { CapacitorHttp: { enabled: false } },
};
export default config;
