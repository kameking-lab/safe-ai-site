import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '安全AIポータル', description: '事故速報・統計・法改正・学習・安全AIを手元で確認するアプリ' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0c574d' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ja"><body>{children}</body></html>; }
