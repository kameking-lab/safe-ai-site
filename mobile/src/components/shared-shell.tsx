'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect,useState, type ReactNode } from 'react';
import { Share } from '@capacitor/share';
import { installWebTransport } from '../lib/web-transport';
import { openSource } from '../lib/native';
import { SITE } from '../lib/api';
import { SharedUsageMeter } from './shared-usage-meter';
// The website's mobile tab bar (ホーム・化学RA・法令AI・学ぶ・メニュー), same component as the web.
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ProPurchasePresentationContext } from '@/components/pro-upsell-card';
import { billing } from '../lib/billing';
import { DisplaySettings } from './display-settings';
import { startProPurchase, resumeProPurchaseAfterLogin, type ProPurchaseResult } from '../lib/pro-purchase';
export function SharedShell({ children }: { children: ReactNode }) {
  const [message,setMessage]=useState('');
  const [price,setPrice]=useState<string|null>(null);
  useEffect(()=>{let generation=0;const update=()=>{const ticket=++generation;setPrice(null);void (async()=>{const c=await billing.config();const m=await billing.entitlement();if(m.plan==='free'&&m.syncState==='verified'&&c.ready){const p=await billing.offering(c,m);if(ticket===generation)setPrice(p.product.priceString);}})().catch(()=>{});};update();window.addEventListener('anzen-session-changed',update);return()=>{generation++;window.removeEventListener('anzen-session-changed',update);};},[]);
  const pathname=usePathname().replace(/\/$/,'')||'/';
  useEffect(() => {
    installWebTransport();
    const show=(result:ProPurchaseResult|null)=>{if(result)setMessage(result.message);};
    const feeds=(event:MouseEvent)=>{const anchor=(event.target as Element|null)?.closest('a');if(!anchor)return;const url=new URL(anchor.href,location.href);if(url.origin!==location.origin)return;
      if(url.pathname.startsWith('/feed/')){event.preventDefault();void openSource(SITE+url.pathname+url.search).catch(()=>setMessage('フィードを開けませんでした。'));return;}
      // 「月額980円で続ける」: the website's Stripe start becomes the App Store purchase sheet here.
      if(/^\/pricing\/start\/?$/.test(url.pathname)){event.preventDefault();setMessage('App Store の購入画面を開いています…');void startProPurchase().then(show);return;}
      // Conditions/特商法 is a website page; open it as such instead of a retired in-app route.
      if(/^\/pricing\/terms\/?$/.test(url.pathname)){event.preventDefault();void openSource(SITE+'/pricing/terms').catch(()=>setMessage('条件のページを開けませんでした。'));}
    };
    // A sign-in started from the purchase button continues straight to the purchase sheet.
    const signedIn=()=>{void resumeProPurchaseAfterLogin().then(show);};
    document.addEventListener('click',feeds,true);window.addEventListener('anzen-session-changed',signedIn);
    return()=>{document.removeEventListener('click',feeds,true);window.removeEventListener('anzen-session-changed',signedIn);};
  }, []);
  return <ProPurchasePresentationContext.Provider value={{price}}><style>{`a[href='/ky'],a[href^='/ky/'],a[href='/safety-diary'],a[href^='/safety-diary/'],a[href='/site-records/near-miss']{display:none!important}`}</style><header hidden={pathname==='/signage/display'} className="sticky top-[env(safe-area-inset-top)] z-50 flex items-center gap-1 whitespace-nowrap border-b bg-white px-2 py-1 text-slate-900 print:hidden">
    {/* No browser chrome in the app: one row, a real back button, 44pt targets. */}
    <button aria-label="戻る" className="min-h-11 min-w-11 shrink-0 rounded-lg px-2 font-semibold" onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.assign('/'); }}>‹ 戻る</button>
    {/* ホーム・全機能は下のタブにあるので上には置かない。今いる画面は色で示す。 */}
    <Link className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 font-semibold aria-[current=page]:bg-emerald-50 aria-[current=page]:text-emerald-800" href="/account" aria-current={pathname==='/account'?'page':undefined}>会員・Pro</Link>
    <button className="min-h-11 shrink-0 rounded-lg border px-3 font-semibold" onClick={() => { void Share.share({ title: document.title, url: SITE + location.pathname + location.search }).catch(()=>{}); }}>共有</button>
  </header>{message?<p role="alert" className="flex items-start gap-2 bg-amber-50 p-3 text-amber-950"><span className="flex-1">{message} <Link href="/account" className="underline">会員・Proで確認</Link></span><button aria-label="閉じる" className="min-h-11 min-w-11 shrink-0" onClick={()=>setMessage('')}>×</button></p>:null}{pathname==='/chatbot'?<SharedUsageMeter/>:null}{pathname==='/features'?<DisplaySettings/>:null}<main className={pathname==='/chatbot'?'':'pb-[calc(var(--mobile-bottom-nav-h)+env(safe-area-inset-bottom)+24px)]'}>{children}</main>{pathname==="/signage/display"?null:<MobileBottomNav />}</ProPurchasePresentationContext.Provider>;
}
