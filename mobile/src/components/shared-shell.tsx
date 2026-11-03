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
  const pathname=usePathname();
  useEffect(() => {
    installWebTransport();
    const feeds=(event:MouseEvent)=>{const anchor=(event.target as Element|null)?.closest('a');if(!anchor)return;const url=new URL(anchor.href,location.href);if(url.origin===location.origin && url.pathname.startsWith('/feed/')){event.preventDefault();void openSource(SITE+url.pathname+url.search).catch(()=>setMessage('フィードを開けませんでした。'));}};
    document.addEventListener('click',feeds,true);
    return()=>{document.removeEventListener('click',feeds,true);};
  }, []);
  return <><style>{`a[href='/ky'],a[href^='/ky/'],a[href='/safety-diary'],a[href^='/safety-diary/'],a[href='/site-records/near-miss']{display:none!important}`}</style><header hidden={pathname==='/signage/display'} className="sticky top-0 z-50 flex flex-wrap items-center gap-3 border-b bg-white p-3 pt-[max(12px,env(safe-area-inset-top))] text-slate-900 print:hidden">
    <Link href="/">安全AI</Link><Link href="/home">ホーム</Link><Link href="/features">全機能</Link><Link href="/e-learning/exams">過去問</Link><Link href="/e-learning/safety">資格学習</Link><Link href="/notifications">警報通知</Link><Link href="/account">会員・Pro</Link>
    <button className="rounded-lg border px-3 py-2 font-semibold" onClick={() => { void Share.share({ title: document.title, url: 'https://www.anzen-ai-portal.jp' + location.pathname }).catch(()=>{}); }}>共有</button>
  </header>{message?<p role="alert" className="bg-amber-50 p-3 text-amber-950">{message}</p>:null}{pathname==='/chatbot'||pathname==='/chemical-ra'?<SharedUsageMeter/>:null}<main className="pb-[max(24px,env(safe-area-inset-bottom))]">{children}</main></>;
}
