'use client';
import { useEffect,useState } from 'react';
import { ApiError,loadCapabilities } from '../lib/api';
import type { Capability } from '../lib/contracts';
import { quotaLow,formatDate } from '../lib/policy';
export function SharedUsageMeter(){
  const [cap,setCap]=useState<Capability|null>(null);const [state,setState]=useState<'loading'|'verified'|'unavailable'|'offline'|'unauthenticated'>('loading');
  useEffect(()=>{let generation=0;const update=()=>{const ticket=++generation;if(!navigator.onLine){setState('offline');return;}void loadCapabilities().then(c=>{if(ticket===generation){setCap(c);setState('verified');}}).catch(error=>{if(ticket===generation){setCap(null);setState(!navigator.onLine?'offline':error instanceof ApiError&&error.code==='UNAUTHORIZED'?'unauthenticated':'unavailable');}});};const changed=()=>{setCap(null);setState('loading');update();};update();const timer=setInterval(update,60000);window.addEventListener('online',update);window.addEventListener('offline',update);window.addEventListener('anzen-usage-changed',update);window.addEventListener('anzen-session-changed',changed);return()=>{generation++;clearInterval(timer);window.removeEventListener('online',update);window.removeEventListener('offline',update);window.removeEventListener('anzen-usage-changed',update);window.removeEventListener('anzen-session-changed',changed);};},[]);
  // Kept short: on a phone the chat composer must stay reachable below this bar.
  // RA generation is suspended, so only the chat quota means anything to the user.
  const q=cap?.features.law_chat.quota;
  const pending=!!q&&q.remaining===0&&q.reserved>0;
  return <aside aria-label="会員の共通利用枠" className="border-b bg-emerald-50 px-4 py-2 text-sm text-slate-900">{state==='loading'?<p>利用枠を確認中です。</p>:state==='offline'?<p>オフラインです。通信回復後に利用枠を再確認します。</p>:state==='unavailable'?<p>残り回数を表示できません。質問は送信時に利用枠を確認します。</p>:cap&&q&&cap.session==='member'?<p>{cap.plan==='pro'?'Pro':'無料'}（ウェブと合算）{q?<span data-quota-low={quotaLow(q.remaining,q.limit)} className={quotaLow(q.remaining,q.limit)?'ml-2 font-bold text-amber-900':'ml-2'}>チャット 残り{q.remaining}／{q.limit}回</span>:null}<span className="ml-2">回復：{formatDate(q.resetAt)}（日本時間）</span>{pending?<span className="ml-2">処理中の操作があります。結果を確認してください。</span>:null}</p>:<p>AIの利用には<a href="/account" className="underline">会員ログイン</a>が必要です。資料の閲覧・検索はログインなしで使えます。</p>}</aside>;
}
