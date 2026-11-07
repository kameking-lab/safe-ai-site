'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect,useState, type ReactNode } from 'react';
import { Share } from '@capacitor/share';
import { installWebTransport } from '../lib/web-transport';
import { openSource } from '../lib/native';
import { SITE } from '../lib/api';
import { SharedUsageMeter } from './shared-usage-meter';
export function SharedShell({ children }: { children: ReactNode }) {
  const [message,setMessage]=useState('');
  const pathname=usePathname().replace(/\/$/,'')||'/';
  useEffect(() => {
    installWebTransport();
    const feeds=(event:MouseEvent)=>{const anchor=(event.target as Element|null)?.closest('a');if(!anchor)return;const url=new URL(anchor.href,location.href);if(url.origin===location.origin && url.pathname.startsWith('/feed/')){event.preventDefault();void openSource(SITE+url.pathname+url.search).catch(()=>setMessage('フィードを開けませんでした。'));}};
    document.addEventListener('click',feeds,true);
    return()=>{document.removeEventListener('click',feeds,true);};
  }, []);
  return <><style>{`a[href='/ky'],a[href^='/ky/'],a[href='/safety-diary'],a[href^='/safety-diary/'],a[href='/site-records/near-miss']{display:none!important}`}</style><header hidden={pathname==='/signage/display'} className="sticky top-[env(safe-area-inset-top)] z-50 flex items-center gap-1 whitespace-nowrap border-b bg-white px-2 py-1 text-slate-900 print:hidden">
    {/* No browser chrome in the app: one row, a real back button, 44pt targets. Other screens are one tap away in 全機能. */}
    <button aria-label="戻る" className="min-h-11 min-w-11 shrink-0 rounded-lg px-2 font-semibold" onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.assign('/'); }}>‹ 戻る</button>
    <Link className="inline-flex min-h-11 shrink-0 items-center px-2" href="/">安全AI</Link><Link className="inline-flex min-h-11 shrink-0 items-center px-2" href="/features">全機能</Link><Link className="inline-flex min-h-11 shrink-0 items-center px-2" href="/account">会員・Pro</Link>
    <button className="ml-auto min-h-11 shrink-0 rounded-lg border px-3 font-semibold" onClick={() => { void Share.share({ title: document.title, url: SITE + location.pathname + location.search }).catch(()=>{}); }}>共有</button>
  </header>{message?<p role="alert" className="bg-amber-50 p-3 text-amber-950">{message}</p>:null}{pathname==='/chatbot'||pathname==='/chemical-ra'?<SharedUsageMeter/>:null}<main className="pb-[max(24px,env(safe-area-inset-bottom))]">{children}</main></>;
}
