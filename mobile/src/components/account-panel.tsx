'use client';
import { useCallback,useEffect,useState } from 'react';
import { billing,isVerifiedPro,type BillingConfig,type MemberEntitlement } from '../lib/billing';
import { logout,startLogin,siteApi } from '../lib/session';
import { openSource } from '../lib/native';
import { NativeAccountDetails } from './native-account-details';
const messages:Record<string,string>={UNAUTHORIZED:'既存の安全AI会員でログインしてください。',BILLING_NOT_CONFIGURED:'App Store商品の設定待ちです。購入はまだできません。',ALREADY_SUBSCRIBED:'購入済みです。追加の購入は不要です。',PURCHASE_PENDING:'購入処理が保留中です。購入を繰り返さず「権利を再確認」または復元をお試しください。',ENTITLEMENT_SYNC_PENDING:'権利を確認できません。二重購入を避けるため、新規購入を停止しています。',PRODUCT_MISMATCH:'App Storeの商品・価格が設定と一致しないため販売を停止しています。',PURCHASE_OWNED_BY_OTHER_ACCOUNT:'この購入は別の会員に紐付いています。元の会員でログインしてください。'};
export function AccountPanel(){
  const [config,setConfig]=useState<BillingConfig|null>(null);const [member,setMember]=useState<MemberEntitlement|null>(null);const [price,setPrice]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  const refresh=useCallback(async()=>{setPrice('');try{const c=await billing.config();setConfig(c);const m=await billing.entitlement();setMember(m);if(m.plan==='free' && m.syncState==='verified' && c.ready){const p=await billing.offering(c,m);setPrice(p.product.priceString);}setMessage('会員の権利を確認しました。');}catch(e){setMember(null);setMessage(messages[(e as Error).message]??'会員情報を確認できません。時間をおいて再確認してください。');}},[]);
  useEffect(()=>{
    void refresh();const handler=()=>{void refresh();};window.addEventListener('anzen-session-changed',handler);
    window.addEventListener('anzen-app-active',handler);
    const timer=setInterval(()=>{void refresh();},60000);
    return()=>{clearInterval(timer);window.removeEventListener('anzen-session-changed',handler);window.removeEventListener('anzen-app-active',handler);};
  },[refresh]);
  async function action(fn:()=>Promise<unknown>){if(busy)return;setBusy(true);try{await fn();await refresh();}catch(e){const err=e as {message?:string;userCancelled?:boolean;code?:string};setMember(await billing.entitlement().catch(()=>null));setMessage(err.userCancelled || err.code==='1'?'購入をキャンセルしました。権利は変更していません。':err.code==='20'?'App Storeで購入が保留されています。承認後に権利を再確認してください。':messages[err.message??'']??'処理を完了できません。購入が完了している場合は復元・再確認をお試しください。');}finally{setBusy(false);}}
  const pro=isVerifiedPro(member);const pending=member?.syncState!=='verified' || member?.purchasePending;
  return <section className="native-panel mx-auto max-w-2xl space-y-5 p-5 text-slate-900"><h1 className="text-2xl font-bold">会員・安全AI Pro</h1><p role="status">{message}</p>
    {!member?<><p>ウェブで購入済みの会員は同じアカウントでログインするとProを利用できます。</p><button disabled={busy || !config?.login.apple} onClick={()=>void action(startLogin)}>Apple / Googleでログイン</button></>:<><p>{pro?'Pro 購入済み':pending?'権利の確認待ち':'無料会員'}{member.source==='stripe'?'（ウェブ購読）':member.source==='app_store'?'（App Store購読）':''}</p>{member.expiresAt?<p>確認済み有効期限：{new Date(member.expiresAt).toLocaleString('ja-JP')}</p>:null}<button disabled={busy} onClick={()=>void action(async()=>{setMember(null);await logout();await billing.forget();})}>ログアウト</button></>}
    <p>無料：チャット1日3回・RA1日1件・警報1地点（通知なし）。Pro：チャット1日50回・RA1日10件・警報10地点と通知。ウェブとアプリの利用回数は合算します。</p>
    <p>Proは1か月ごとの自動更新サブスクリプションです。{price?`月額${price}（税込）`:`月額${config?.policy.monthlyPrice?.toLocaleString('ja-JP')??'—'}円（税込）`}。解約しない限り自動更新され、料金はApple Accountへ請求されます。更新日の24時間前までにApp Storeの管理画面から解約できます。解約後も確認済み期限まで利用できます。</p>
    <p>AIには日次枠に加えて運営の月間原価上限・障害による停止があります。評価機能が提供停止中の場合は回数を消費しません。通知の即時到達・必達は保証されません。</p>
    <div className="flex flex-wrap gap-3"><button disabled={busy || !member || pro || pending || !config?.ready || !price} onClick={()=>config && void action(async()=>{const m=await billing.purchase(config);setMember(m);})}>{pro?'購入済み':busy?'確認中…':'App StoreでProを購入'}</button>
    <button disabled={busy || !member || !config?.ready} onClick={()=>config && void action(async()=>{setMember(await billing.restore(config));})}>購入を復元</button>
    <button disabled={busy || !member} onClick={()=>void action(async()=>{setMember(await billing.sync());})}>権利を再確認</button></div>
    <button onClick={()=>void openSource('https://apps.apple.com/account/subscriptions')}>App Storeの購読管理・解約</button>
    {member?.source==='stripe'?<><p>ウェブ契約の管理・解約は購入元で行います。アプリでの追加購入は不要です。</p><button disabled={busy} onClick={()=>void action(async()=>{const result=await siteApi('/api/stripe/portal',{}) as {url:string};const url=new URL(result.url);if(url.origin!=='https://billing.stripe.com'||url.username||url.password)throw new Error('INVALID_ENDPOINT');await openSource(url.href);})}>ウェブ購読の管理・解約</button></>:null}
    {member?<NativeAccountDetails key={member.appUserId}/>:null}
    <p><a href="/terms">利用規約</a> · <a href="/privacy">プライバシーポリシー</a> · <a href="/contact">問い合わせ・アカウント削除依頼</a></p>
  </section>;
}
