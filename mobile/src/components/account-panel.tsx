'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { billing,isVerifiedPro,type BillingConfig,type MemberEntitlement } from '../lib/billing';
import { logout,startLogin,siteApi } from '../lib/session';
import { openSource } from '../lib/native';
import { NativeAccountDetails } from './native-account-details';
import { AccountDeletionPanel } from './account-deletion-panel';
const messages:Record<string,string>={UNAUTHORIZED:'既存の安全AI会員でログインしてください。',BILLING_NOT_CONFIGURED:'App Store商品の設定待ちです。購入はまだできません。',ALREADY_SUBSCRIBED:'購入済みです。追加の購入は不要です。',PURCHASE_PENDING:'購入処理が保留中です。購入を繰り返さず「権利を再確認」または復元をお試しください。',ENTITLEMENT_SYNC_PENDING:'権利を確認できません。二重購入を避けるため、新規購入を停止しています。',PRODUCT_MISMATCH:'App Storeの商品・価格が設定と一致しないため販売を停止しています。',PURCHASE_OWNED_BY_OTHER_ACCOUNT:'この購入は別の会員に紐付いています。元の会員でログインしてください。'};
const purchaseMessages:Record<string,string>={STORE_CANCELLED:'App Storeから取消結果を受け取りました。購入予約は確認待ちです。取消申告だけではWeb購入を再開できません。',STORE_DEFERRED:'App Storeで承認待ちです（Ask to Buy等）。追加購入せず、承認後に復元・再確認してください。',STORE_UNKNOWN:'購入結果を確認できません。復元・再確認でストア状態を照合するまで新規購入を停止します。',STORE_NOT_OPENED:'購入画面は起動していません。通信が途切れたため予約の状態を再確認してください。',PURCHASE_REVIEW_REQUIRED:'購入予約の調査が必要です。購入時のApple Accountで復元・再確認し、解消しない場合は問い合わせてください。'};
const stageMessages:Record<string,string>={prepared:'App Store起動前の購入予約があります。再開または予約の取消ができます。',store_started:purchaseMessages.STORE_UNKNOWN,store_cancelled_reported:purchaseMessages.STORE_CANCELLED,store_deferred:purchaseMessages.STORE_DEFERRED,store_unknown:purchaseMessages.STORE_UNKNOWN,store_not_opened_reported:purchaseMessages.STORE_NOT_OPENED};
export function AccountPanel(){
  const refreshGeneration=useRef(0);
  const [config,setConfig]=useState<BillingConfig|null>(null);const [member,setMember]=useState<MemberEntitlement|null>(null);const [price,setPrice]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  const refresh=useCallback(async()=>{const ticket=++refreshGeneration.current;setPrice('');setMember(null);try{const c=await billing.config();if(ticket!==refreshGeneration.current)return;setConfig(c);const m=await billing.entitlement();if(ticket!==refreshGeneration.current)return;setMember(m);if(m.plan==='free' && m.syncState==='verified' && c.ready){const p=await billing.offering(c,m);if(ticket!==refreshGeneration.current)return;setPrice(p.product.priceString);}setMessage('会員の権利を確認しました。');}catch(e){if(ticket!==refreshGeneration.current)return;setMember(null);setMessage(messages[(e as Error).message]??'会員情報を確認できません。時間をおいて再確認してください。');}},[]);
  useEffect(()=>{
    void refresh();const handler=()=>{void refresh();};window.addEventListener('anzen-session-changed',handler);
    window.addEventListener('anzen-app-active',handler);
    const timer=setInterval(()=>{void refresh();},60000);
    return()=>{refreshGeneration.current++;clearInterval(timer);window.removeEventListener('anzen-session-changed',handler);window.removeEventListener('anzen-app-active',handler);};
  },[refresh]);
  async function action(fn:()=>Promise<unknown>){if(busy)return;setBusy(true);try{await fn();await refresh();}catch(e){const err=e as Error;setMember(await billing.entitlement().catch(()=>null));setMessage(purchaseMessages[err.message]??messages[err.message]??'処理を完了できません。購入が完了している場合は復元・再確認をお試しください。');}finally{setBusy(false);}}
  const pro=isVerifiedPro(member);const pending=member?.syncState!=='verified' || (member?.purchasePending && (member.purchaseSource!=='app_store'||member.purchaseStage!=='prepared'));
  return <section className="native-panel mx-auto max-w-2xl space-y-5 p-5 text-slate-900"><h1 className="text-2xl font-bold">会員・安全AI Pro</h1><p role="status">{message}</p>
    {!member?<><p>ウェブで購入済みの会員は同じアカウントでログインするとProを利用できます。</p><button disabled={busy || !config?.login.apple} onClick={()=>void action(startLogin)}>Apple / Googleでログイン</button></>:<><p>{pro?'Pro 購入済み':pending?'権利の確認待ち':'無料会員'}{member.source==='stripe'?'（ウェブ購読）':member.source==='app_store'?'（App Store購読）':''}</p>{member.expiresAt?<p>確認済み有効期限：{new Date(member.expiresAt).toLocaleString('ja-JP')}</p>:null}<button disabled={busy} onClick={()=>void action(async()=>{setMember(null);await logout();await billing.forget();})}>ログアウト</button></>}
    <p className="rounded border border-amber-400 bg-amber-50 p-3">化学物質RAの評価生成は現在提供停止中です。Proでも生成できません。資料検索は利用でき、停止中の評価は回数を消費しません。</p>
    <p>無料：チャット1日3回・RA1日1件・警報1地点（通知なし）。Pro：チャット1日50回・RA1日10件・警報10地点と通知。ウェブとアプリの利用回数は合算します。</p>
    <p>Proは1か月ごとの自動更新サブスクリプションです。{price?`月額${price}（税込）`:`月額${config?.policy.monthlyPrice?.toLocaleString('ja-JP')??'—'}円（税込）`}。解約しない限り自動更新され、料金はApple Accountへ請求されます。更新日の24時間前までにApp Storeの管理画面から解約できます。解約後も確認済み期限まで利用できます。</p>
    <p>AIには日次枠に加えて運営の月間原価上限・障害による停止があります。評価機能が提供停止中の場合は回数を消費しません。通知の即時到達・必達は保証されません。</p>
    <div className="flex flex-wrap gap-3"><button disabled={busy || !member || pro || pending || !config?.ready || !price} onClick={()=>config && void action(async()=>{const m=await billing.purchase(config);setMember(m);})}>{pro?'購入済み':busy?'確認中…':member?.purchasePending?'App Storeの購入手続きを再開':'App StoreでProを購入'}</button>
    <button disabled={busy || !member || !config?.ready} onClick={()=>config && void action(async()=>{setMember(await billing.restore(config));})}>購入を復元</button>
    <button disabled={busy || !member} onClick={()=>void action(async()=>{setMember(await billing.sync());})}>権利を再確認</button></div>
    {member?.purchasePending?<p role="status">{member.purchaseSource==='app_store'?(stageMessages[member.purchaseStage??'']??purchaseMessages.PURCHASE_REVIEW_REQUIRED):'別の購入元で手続き中です。購入元の状態を確認してください。'}</p>:null}
    {member?.purchasePending&&member.purchaseSource==='app_store'&&member.purchaseStage==='prepared'?<button disabled={busy} onClick={()=>void action(async()=>{setMember(await billing.cancelPrepared());})}>ストア起動前の購入予約を取り消す</button>:null}
    {member?.purchasePending?<p>同じ会員・購入時のApple Accountで「購入を復元」「権利を再確認」を実行してください。解消しない場合は<a href="/contact">問い合わせ</a>へ。ストアの取消・未決済の終了を運営が確認するまで、Webでの新規購入も停止します。</p>:null}
    <button onClick={()=>void openSource('https://apps.apple.com/account/subscriptions')}>App Storeの購読管理・解約</button>
    {member?.source==='stripe'?<><p>ウェブ契約の管理・解約は購入元で行います。アプリでの追加購入は不要です。</p><button disabled={busy} onClick={()=>void action(async()=>{const result=await siteApi('/api/stripe/portal',{}) as {url:string};const url=new URL(result.url);if(url.origin!=='https://billing.stripe.com'||url.username||url.password)throw new Error('INVALID_ENDPOINT');await openSource(url.href);})}>ウェブ購読の管理・解約</button></>:null}
    {member?<NativeAccountDetails key={member.appUserId}/>:null}
    <AccountDeletionPanel/>
    <p><a href="/terms">利用規約</a> · <a href="/privacy">プライバシーポリシー</a> · <a href="/contact">問い合わせ</a></p>
  </section>;
}
