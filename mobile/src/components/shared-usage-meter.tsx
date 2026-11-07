'use client';
import { useEffect,useState } from 'react';
import { loadCapabilities } from '../lib/api';
import type { Capability } from '../lib/contracts';
import { quotaLow,formatDate } from '../lib/policy';
export function SharedUsageMeter(){
  const [cap,setCap]=useState<Capability|null>(null);
  useEffect(()=>{let active=true;const update=()=>{void loadCapabilities().then(c=>{if(active)setCap(c);}).catch(()=>{if(active)setCap(null);});};update();const timer=setInterval(update,60000);window.addEventListener('anzen-usage-changed',update);window.addEventListener('anzen-session-changed',update);return()=>{active=false;clearInterval(timer);window.removeEventListener('anzen-usage-changed',update);window.removeEventListener('anzen-session-changed',update);};},[]);
  // Kept short: on a phone the chat composer must stay reachable below this bar.
  const pending=cap?(['law_chat','chemical_ra'] as const).some(f=>cap.features[f].quota.remaining===0&&cap.features[f].quota.reserved>0):false;
  return <aside aria-label="会員の共通利用枠" className="border-b bg-emerald-50 px-4 py-2 text-sm text-slate-900">{cap?<p>{cap.plan==='pro'?'Pro':'無料'}（ウェブと合算）{(['law_chat','chemical_ra'] as const).map(feature=>{const q=cap.features[feature].quota;return <span key={feature} data-quota-low={quotaLow(q.remaining,q.limit)} className={quotaLow(q.remaining,q.limit)?'ml-2 font-bold text-amber-900':'ml-2'}>{feature==='law_chat'?'チャット':'RA'} 残り{q.remaining}／{q.limit}{feature==='law_chat'?'回':'件'}</span>;})}<span className="ml-2">回復：{formatDate(cap.features.law_chat.quota.resetAt)}（日本時間）</span>{pending?<span className="ml-2">処理中の操作があります。結果を確認してください。</span>:null}</p>:<p>AIの利用には<a href="/account" className="underline">会員ログイン</a>が必要です。資料の閲覧・検索はログインなしで使えます。</p>}</aside>;
}
