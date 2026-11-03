"use client";
import { useState } from 'react';
import { PricingMatrix } from '@/components/PricingMatrix';
import product from '@/lib/mobile/product-policy.json';
export function PricingContent({ready=false}:{ready?:boolean}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [intent,setIntent]=useState<string|null>(null);
 async function checkout(){if(busy)return;setBusy(true);setMessage('');try{
  const response=await fetch('/api/stripe/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:'pro'})});
  if(response.status===401){location.assign('/auth/signin');return;}
  const data=await response.json();
  if(!response.ok||!data.url){setMessage(data.state==='expired'?'前の購入手続きは失効しました。もう一度開始できます。':'購入元での処理中、または権利を確認できません。追加購入をせず会員画面で確認してください。');return;}
  const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw new Error();location.assign(url.href);
 }catch{setMessage('通信できません。再試行時は同じ購入手続きを再開します。');}finally{setBusy(false);}}
 async function cancel(){if(busy)return;setBusy(true);try{
  const rights=await fetch('/api/me/entitlements',{cache:'no-store'}).then(r=>r.json());setIntent(rights.purchaseIntentId??null);
  if(!rights.purchasePending){setMessage('取消が必要な購入手続きはありません。購読の解約は会員画面で行ってください。');return;}
  const response=await fetch('/api/billing/cancel-intent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:rights.purchaseIntentId,source:'stripe'})});
  setMessage(response.ok?'決済側で購入手続きの終了を確認しました。会員画面で最新の権利を確認してください。':'決済側で取消を確認できません。追加購入をせず、購入元で状態を確認してください。');
 }catch{setMessage('取消結果を確認できません。購入予約は維持されます。');}finally{setBusy(false);}}
 return <section className="mx-auto max-w-4xl space-y-5 p-6"><h1 className="text-2xl font-bold">無料・安全AI Pro</h1>
 <p>安全AI Proは月額{product.monthlyPrice}円（税込）、1か月ごとの自動更新です。ウェブとiOSは同じ会員で利用し、回数を合算します。年払い・無料体験・複数名プランは提供しません。</p>
 <p className="rounded border border-amber-300 bg-amber-50 p-4">化学物質RAの評価生成は現在停止中です。Proでも生成できません。資料検索は利用でき、停止中の評価は回数を消費しません。</p>
 <PricingMatrix/>
 <p>AIは補助情報です。責任者・専門家と公式原文で判断してください。日次枠と別に月間原価上限や安全上の停止があります。通知の必達は保証されません。</p>
 <button disabled={busy||!ready} className="rounded bg-emerald-700 p-3 text-white disabled:opacity-50" onClick={()=>void checkout()}>{busy?'確認中…':ready?'ウェブのPro購入・中断した手続きの再開':'販売の準備中'}</button>
 <button disabled={busy||!ready} className="ml-3 rounded border p-3" onClick={()=>void cancel()}>中断したウェブ購入手続きを取り消す</button>
 {intent?<span className="sr-only">購入手続きを確認済み</span>:null}<p role="status">{message}</p>
 <p>既に購入した方は<a href="/account" className="underline">会員画面</a>で権利・購入元の管理をご確認ください。購読は購入元で解約できます。アカウント削除だけでは購読は解約されません。</p>
 <p><a href="/terms" className="underline">利用規約</a>・<a href="/privacy" className="underline">プライバシーポリシー</a></p></section>;
}
