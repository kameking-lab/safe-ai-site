'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { billing,isVerifiedPro,canResumeApplePurchase,type BillingConfig,type MemberEntitlement } from '../lib/billing';
import { logout,startLogin,siteApi } from '../lib/session';
import { openSource } from '../lib/native';
import { NativeAccountDetails } from './native-account-details';
import { AccountDeletionPanel } from './account-deletion-panel';
import { describeStoreError } from '../lib/store-errors';
const messages:Record<string,string>={UNAUTHORIZED:'既存の安全AI会員でログインしてください。',BILLING_NOT_CONFIGURED:'App Storeの販売設定がサーバーでそろっていません［BILLING_NOT_CONFIGURED］。',ALREADY_SUBSCRIBED:'購入済みです。追加の購入は不要です。',PURCHASE_PENDING:'購入処理が保留中です。購入を繰り返さず「権利を再確認」または復元をお試しください。',ENTITLEMENT_SYNC_PENDING:'権利を確認できません。二重購入を避けるため、新規購入を停止しています。',PURCHASE_OWNED_BY_OTHER_ACCOUNT:'この購入は別の会員に紐付いています。元の会員でログインしてください。'};
const purchaseMessages:Record<string,string>={PRO_SALES_PAUSED:'今月のPro新規受付は終了しました。来月1日に再開します。',STORE_CANCELLED:'購入を取り消しました。もう一度購入できます。',STORE_DEFERRED:'App Storeで承認待ちです。承認後に自動で反映されます。',STORE_UNKNOWN:'購入結果を再確認します。購入済みの場合は「購入を復元」をお試しください。',STORE_NOT_OPENED:'購入画面を開けませんでした。もう一度お試しください。',PURCHASE_REVIEW_REQUIRED:'購入状況を確認しています。「権利を再確認」をお試しください。'};
const stageMessages:Record<string,string>={prepared:'App Store起動前の購入予約があります。再開または予約の取消ができます。',store_started:purchaseMessages.STORE_UNKNOWN,store_cancelled_reported:purchaseMessages.STORE_CANCELLED,store_deferred:purchaseMessages.STORE_DEFERRED,store_unknown:purchaseMessages.STORE_UNKNOWN,store_not_opened_reported:purchaseMessages.STORE_NOT_OPENED};
export function AccountPanel(){
  const refreshGeneration=useRef(0);
  const [config,setConfig]=useState<BillingConfig|null>(null);const [member,setMember]=useState<MemberEntitlement|null>(null);const [price,setPrice]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [memberState,setMemberState]=useState<'loading'|'verified'|'unauthenticated'|'unavailable'>('loading');
  // A failing App Store lookup (RevenueCat offering/price) is a store problem, not a logout:
  // it used to fall into the outer catch and clear the verified member ("ログインしていません").
  const refresh=useCallback(async()=>{const ticket=++refreshGeneration.current;setPrice('');try{const c=await billing.config();if(ticket!==refreshGeneration.current)return;setConfig(c);const m=await billing.entitlement();if(ticket!==refreshGeneration.current)return;setMember(m);setMemberState('verified');if(m.plan==='free' && m.syncState==='verified' && c.ready){try{const p=await billing.offering(c,m);if(ticket!==refreshGeneration.current)return;setPrice(p.product.priceString);}catch(e){if(ticket!==refreshGeneration.current)return;const code=(e as Error).message;setMessage(messages[code]??describeStoreError(e));return;}}setMessage('');}catch(e){if(ticket!==refreshGeneration.current)return;const code=(e as Error).message;setMemberState(code==='UNAUTHORIZED'?'unauthenticated':'unavailable');if(code==='UNAUTHORIZED')setMember(null);setMessage(code==='UNAUTHORIZED'?'':messages[code]??'会員情報を確認できません。時間をおいて再確認してください。');}},[]);
  useEffect(()=>{
    void refresh();const handler=()=>{void refresh();};const sessionChanged=()=>{setMember(null);void refresh();};window.addEventListener('anzen-session-changed',sessionChanged);
    window.addEventListener('anzen-app-active',handler);
    const timer=setInterval(()=>{void refresh();},60000);
    return()=>{refreshGeneration.current++;clearInterval(timer);window.removeEventListener('anzen-session-changed',sessionChanged);window.removeEventListener('anzen-app-active',handler);};
  },[refresh]);
  async function action(fn:()=>Promise<unknown>){if(busy)return;setBusy(true);setMessage('');try{await fn();await refresh();}catch(e){const err=e as Error;try{setMember(await billing.entitlement());}catch{setMemberState('unavailable');}setMessage(purchaseMessages[err.message]??messages[err.message]??describeStoreError(err));}finally{setBusy(false);}}
  const stageMessage=member?.purchasePending?(member.purchaseSource==='app_store'?(stageMessages[member.purchaseStage??'']??purchaseMessages.PURCHASE_REVIEW_REQUIRED):'別の購入元で手続き中です。購入元の状態を確認してください。'):null;
  const pro=isVerifiedPro(member);const pending=memberState!=='verified' || member?.syncState!=='verified' || (!!member&&!canResumeApplePurchase(member));
  // Sign-in first, Pro next, deletion last (collapsed but always present).
  // The member block keeps one fixed shape in every state, so the membership
  // response never moves the buttons below it under a finger.
  const statusLine=memberState==='loading'?'会員情報を読み込み中です':memberState==='unavailable'?'会員状態を確認できません':!member?'ログインしていません':`${pro?'Pro 購入済み':pending?'権利の確認待ち':'無料会員'}${member.source==='stripe'?'（ウェブ購読）':member.source==='app_store'?'（App Store購読）':''}`;
  return <section className="native-panel mx-auto max-w-2xl space-y-5 p-5 text-slate-900 dark:text-slate-100"><h1 className="text-2xl font-bold">会員・安全AI Pro</h1>
    <div className="space-y-2">
      <p className="text-lg font-bold">{statusLine}</p>
      <p className="min-h-[1.75em] text-sm">{member?.expiresAt?`有効期限：${new Date(member.expiresAt).toLocaleString('ja-JP')}`:'ウェブの購入も同じアカウントで使えます。'}</p>
      {!member?<button disabled={busy || !config?.login.apple} onClick={()=>void action(startLogin)}>Apple / Googleでログイン</button>:<button disabled={busy} onClick={()=>void action(async()=>{await logout();setMember(null);setMemberState('unauthenticated');await billing.forget();})}>ログアウト</button>}
      <p role="status" className="min-h-[1.75em] text-sm">{message}</p>
    </div>
    <button disabled={busy} onClick={()=>void refresh()}>会員情報を再読み込み</button>
    {/* RA generation is paused, so the plans list only what Pro actually adds today. */}
    <div className="text-sm"><p className="my-1">無料：AIチャット1日3回・警報1地点</p><p className="my-1">Pro：AIチャット1日50回・警報10地点と通知</p></div>
    <p className="text-xs">全体の月間AI原価上限に達すると、個人の残数があってもAI生成を停止します。</p>
    <p className="text-xs">Pro {price?`${price}`:'価格はApp Storeで確認'}/月（税込）・1か月ごとの自動更新。更新日の24時間前までにApp Storeで解約しない限り自動で更新され、Apple Accountに請求されます。</p>
    {config?.salesPaused&&!pro?<p role="status">{config.salesMessage??purchaseMessages.PRO_SALES_PAUSED}</p>:null}
    <div className="flex flex-wrap gap-3"><button disabled={busy || !member || pro || pending || !config?.ready || config.salesPaused || !price} onClick={()=>config && void action(async()=>{const m=await billing.purchase(config);setMember(m);})}>{pro?'購入済み':busy?'確認中…':member?.purchasePending?'App Storeの購入手続きを再開':price?`月額${price}で続ける`:'App Storeの価格を確認中'}</button>
    <button disabled={busy || !member || !config?.ready} onClick={()=>config && void action(async()=>{setMember(await billing.restore(config));})}>購入を復元</button>
    <button disabled={busy || !member} onClick={()=>void action(async()=>{setMember(await billing.sync());})}>権利を再確認</button></div>
    {!busy && stageMessage && stageMessage!==message?<p role="status">{stageMessage}</p>:null}
    {member?.purchasePending&&member.purchaseSource==='app_store'&&member.purchaseStage==='prepared'?<button disabled={busy} onClick={()=>void action(async()=>{setMember(await billing.cancelPrepared());})}>ストア起動前の購入予約を取り消す</button>:null}
    {member?.purchasePending&&pending?<p>購入済みの場合は、購入時のApple Accountで「購入を復元」をお試しください。</p>:null}
    <button onClick={()=>void openSource('https://apps.apple.com/account/subscriptions')}>App Storeの購読管理・解約</button>
    {member?.source==='stripe'||member?.canManageStripe?<><p>ウェブ契約の管理・解約は購入元で行います。アプリでの追加購入は不要です。</p><button disabled={busy} onClick={()=>void action(async()=>{const result=await siteApi('/api/stripe/portal',{}) as {url:string};const url=new URL(result.url);if(url.origin!=='https://billing.stripe.com'||url.username||url.password)throw new Error('INVALID_ENDPOINT');await openSource(url.href);})}>ウェブ購読の管理・解約</button></>:null}
    <AccountDeletionPanel/>
    {member?<NativeAccountDetails key={member.appUserId}/>:null}
    <p><a href="/terms">利用規約</a> · <a href="/privacy">プライバシーポリシー</a> · <a href="/contact">問い合わせ</a></p>
  </section>;
}
