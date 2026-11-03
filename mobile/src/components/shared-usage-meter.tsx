'use client';
import { useEffect,useState } from 'react';
import { loadCapabilities } from '../lib/api';
import type { Capability } from '../lib/contracts';
export function SharedUsageMeter(){
  const [cap,setCap]=useState<Capability|null>(null);
  useEffect(()=>{let active=true;const update=()=>{void loadCapabilities().then(c=>{if(active)setCap(c);}).catch(()=>{if(active)setCap(null);});};update();const timer=setInterval(update,60000);window.addEventListener('anzen-usage-changed',update);window.addEventListener('anzen-session-changed',update);return()=>{active=false;clearInterval(timer);window.removeEventListener('anzen-usage-changed',update);window.removeEventListener('anzen-session-changed',update);};},[]);
  return <aside aria-label="会員の共通利用枠" className="border-b bg-emerald-50 px-4 py-3 text-sm text-slate-900">{cap?<><p>{cap.plan==='pro'?'Pro':'無料'}：安衛法チャット 残り{cap.features.law_chat.quota.remaining}／{cap.features.law_chat.quota.limit}回（処理中{cap.features.law_chat.quota.reserved}）。ウェブとアプリで合算します。</p><p>{cap.features.chemical_ra.available?`RA 残り${cap.features.chemical_ra.quota.remaining}／${cap.features.chemical_ra.quota.limit}件。`:'RA資料検索は利用できます。評価の生成はウェブ版と同じ停止中で、回数は消費しません。'}</p></>:<p>AIを利用するには<a href="/account" className="underline">会員ログイン・権利の確認</a>が必要です。資料の閲覧・検索はログインなしで利用できます。</p>}</aside>;
}
