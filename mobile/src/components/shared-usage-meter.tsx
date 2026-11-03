'use client';
import { useEffect,useState } from 'react';
import { loadCapabilities } from '../lib/api';
import type { Capability } from '../lib/contracts';
import { quotaLow,formatDate } from '../lib/policy';
export function SharedUsageMeter(){
  const [cap,setCap]=useState<Capability|null>(null);
  useEffect(()=>{let active=true;const update=()=>{void loadCapabilities().then(c=>{if(active)setCap(c);}).catch(()=>{if(active)setCap(null);});};update();const timer=setInterval(update,60000);window.addEventListener('anzen-usage-changed',update);window.addEventListener('anzen-session-changed',update);return()=>{active=false;clearInterval(timer);window.removeEventListener('anzen-usage-changed',update);window.removeEventListener('anzen-session-changed',update);};},[]);
  return <aside aria-label="会員の共通利用枠" className="border-b bg-emerald-50 px-4 py-3 text-sm text-slate-900">{cap?<><p>{cap.plan==='pro'?'Pro':'無料'}。ウェブとアプリで合算します。</p>{(['law_chat','chemical_ra'] as const).map(feature=>{const q=cap.features[feature].quota;return <p key={feature} data-quota-low={quotaLow(q.remaining,q.limit)} className={quotaLow(q.remaining,q.limit)?'rounded border border-amber-400 bg-amber-50 p-2 font-bold':''}>{feature==='law_chat'?'安衛法チャット':'RA'} 残り{q.remaining}／{q.limit}{feature==='law_chat'?'回':'件'}（処理中{q.reserved}）。回復：{formatDate(q.resetAt)}（日本時間）。{q.remaining===0&&q.reserved>0?'処理中の操作があります。結果を確認してください。':''}</p>;})}<p>{cap.features.chemical_ra.available?'':'RA資料検索は利用できます。評価の生成はウェブ版と同じ停止中で、回数は消費しません。'}</p></>:<p>AIを利用するには<a href="/account" className="underline">会員ログイン・権利の確認</a>が必要です。資料の閲覧・検索はログインなしで利用できます。</p>}</aside>;
}
