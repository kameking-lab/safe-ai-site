'use client';
import { useEffect,useState } from 'react';
import { loadCapabilities } from '../lib/api';
import type { Capability } from '../lib/contracts';
import { quotaLow,formatDate } from '../lib/policy';
export function SharedUsageMeter(){
  const [cap,setCap]=useState<Capability|null>(null);
  useEffect(()=>{let active=true;const update=()=>{void loadCapabilities().then(c=>{if(active)setCap(c);}).catch(()=>{if(active)setCap(null);});};update();const timer=setInterval(update,60000);window.addEventListener('anzen-usage-changed',update);window.addEventListener('anzen-session-changed',update);return()=>{active=false;clearInterval(timer);window.removeEventListener('anzen-usage-changed',update);window.removeEventListener('anzen-session-changed',update);};},[]);
  // Kept short: on a phone the chat composer must stay reachable below this bar.
  // RA generation is suspended, so only the chat quota means anything to the user.
  const q=cap?.features.law_chat.quota;
  const pending=!!q&&q.remaining===0&&q.reserved>0;
  return <aside aria-label="会員の共通利用枠" className="border-b bg-emerald-50 px-4 py-2 text-sm text-slate-900">{cap&&q?<p>{cap.plan==='pro'?'Pro':'無料'}（ウェブと合算）{q?<span data-quota-low={quotaLow(q.remaining,q.limit)} className={quotaLow(q.remaining,q.limit)?'ml-2 font-bold text-amber-900':'ml-2'}>チャット 残り{q.remaining}／{q.limit}回</span>:null}<span className="ml-2">回復：{formatDate(q.resetAt)}（日本時間）</span>{pending?<span className="ml-2">処理中の操作があります。結果を確認してください。</span>:null}</p>:<p>AIの利用には<a href="/account" className="underline">会員ログイン</a>が必要です。資料の閲覧・検索はログインなしで使えます。</p>}</aside>;
}
