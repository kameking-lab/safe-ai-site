'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { billing,isVerifiedPro,canResumeApplePurchase,type BillingConfig,type MemberEntitlement } from '../lib/billing';
import { logout,startLogin,siteApi,isLoginExchanging } from '../lib/session';
import { openSource } from '../lib/native';
import { NativeAccountDetails } from './native-account-details';
import { AccountDeletionPanel } from './account-deletion-panel';
import { describeStoreError,StoreError } from '../lib/store-errors';
import { StaleMemberResponseError } from '../lib/member-generation';
import {billingDiagnostic} from '../lib/billing-diagnostics';
type Action='purchase'|'restore'|'login'|'logout'|'portal';
const accountConflict='この購入は別のログイン方法（Apple / Google）で使われています。そちらでログインしてください。';
const messages:Record<string,string>={UNAUTHORIZED:'既存の安全AI会員でログインしてください。',BILLING_NOT_CONFIGURED:'少し待ってからもう一度お試しください。',ALREADY_SUBSCRIBED:'購入済みです。',PURCHASE_PENDING:'購入状況を確認中です。',ENTITLEMENT_SYNC_PENDING:'少し待ってからもう一度お試しください。',PURCHASE_OWNED_BY_OTHER_ACCOUNT:accountConflict};
const purchaseMessages:Record<string,string>={PRO_SALES_PAUSED:'今月のPro新規受付は終了しました。来月1日に再開します。',STORE_CANCELLED:'',STORE_DEFERRED:'App Storeで承認待ちです。',STORE_UNKNOWN:'購入状況を確認中です。',STORE_NOT_OPENED:'もう一度お試しください。',PURCHASE_REVIEW_REQUIRED:'購入状況を確認中です。'};
const stageMessages:Record<string,string>={prepared:'購入を再開できます。',store_started:purchaseMessages.STORE_UNKNOWN,store_cancelled_reported:purchaseMessages.STORE_CANCELLED,store_deferred:purchaseMessages.STORE_DEFERRED,store_unknown:purchaseMessages.STORE_UNKNOWN,store_not_opened_reported:purchaseMessages.STORE_NOT_OPENED};
export function AccountPanel(){
  const refreshGeneration=useRef(0);
  const [loginPending,setLoginPending]=useState(false);
  const running=useRef(new Set<Action>());const [operations,setOperations]=useState<Partial<Record<Action,boolean>>>({});
  const begin=(name:Action)=>{if(running.current.has(name))return false;running.current.add(name);setOperations(value=>({...value,[name]:true}));return true;};
  const end=(name:Action)=>{running.current.delete(name);setOperations(value=>({...value,[name]:false}));};
  const [config,setConfig]=useState<BillingConfig|null>(null);const [member,setMember]=useState<MemberEntitlement|null>(null);const [price,setPrice]=useState('');const [message,setMessage]=useState('');const busy=!!operations.purchase;const [refreshing,setRefreshing]=useState(false);const [memberState,setMemberState]=useState<'loading'|'verified'|'unauthenticated'|'unavailable'>('loading');
  const [slow,setSlow]=useState(false);
  const checking=refreshing||busy||!!operations.restore||!!member?.purchasePending||member?.syncState==='pending';
  useEffect(()=>{if(!checking)return;const timer=setTimeout(()=>setSlow(true),2500);return()=>{clearTimeout(timer);setSlow(false);};},[checking]);
  // A failing App Store lookup (RevenueCat offering/price) is a store problem, not a logout:
  // it used to fall into the outer catch and clear the verified member ("ログインしていません").
  const refresh=useCallback(async(manual=false)=>{
    const ticket=++refreshGeneration.current;setRefreshing(true);setMemberState(state=>!manual&&state==='verified'?'verified':'loading');
    if(manual)setMessage('');
    // Membership must not wait for the sales gate or App Store product lookup.
    const configWork=billing.config().then(c=>{if(ticket===refreshGeneration.current)setConfig(c);return c;}).catch(()=>null);
    try{
      const m=await billing.entitlement(false,manual);if(ticket!==refreshGeneration.current)return;
      setMember(m);setMemberState('verified');setMessage(manual?'最新の状態です。':'');
      void billing.recoverSession().catch(error=>{if(ticket===refreshGeneration.current&&!(error instanceof StaleMemberResponseError))setMessage(messages[(error as Error).message]??'購入状況を確認できません。通信を確認して、購入を復元してください。');});
      void configWork.then(c=>{
        if(ticket!==refreshGeneration.current||m.plan!=='free'||m.syncState!=='verified'||!c?.ready)return;
        void billing.offering(c,m).then(p=>{if(ticket===refreshGeneration.current)setPrice(p.product.priceString);}).catch(()=>{});
      });
    }catch(e){
      if(ticket!==refreshGeneration.current||e instanceof StaleMemberResponseError)return;const code=(e as Error).message;
      setMemberState(code==='UNAUTHORIZED'?'unauthenticated':'unavailable');if(code==='UNAUTHORIZED')setMember(null);
      setMessage(manual?(code==='UNAUTHORIZED'?'ログインしてください。':'少し待ってからもう一度お試しください。'):'');
    }finally{if(ticket===refreshGeneration.current)setRefreshing(false);}
  },[]);
  useEffect(()=>{
    let active=true;
    const handler=()=>{if(!active)return;setLoginPending(isLoginExchanging());void refresh();};handler();const sessionChanged=(event:Event)=>{setLoginPending(false);setMember(null);setPrice('');if((event as CustomEvent<{signedIn?:boolean}>).detail?.signedIn===false){refreshGeneration.current++;setMemberState('unauthenticated');setRefreshing(false);return;}setMemberState('loading');void refresh();};const loginStarted=(event:Event)=>{refreshGeneration.current++;setLoginPending(event.type==='anzen-login-exchanging');setRefreshing(false);setMemberState('loading');setMessage('ログインを確認中です…');};
    const loginEnded=(event:Event)=>{refreshGeneration.current++;setLoginPending(false);setRefreshing(false);setMemberState('unavailable');setMessage(event.type==='anzen-login-dismissed'?'ログインを中断しました。もう一度お試しください。':'ログインを完了できませんでした。もう一度お試しください。');void billing.config().then(setConfig).catch(()=>{});};
    window.addEventListener('anzen-session-changed',sessionChanged);window.addEventListener('anzen-login-started',loginStarted);window.addEventListener('anzen-login-exchanging',loginStarted);window.addEventListener('anzen-login-failed',loginEnded);window.addEventListener('anzen-login-dismissed',loginEnded);
    const verified=(event:Event)=>{const m=(event as CustomEvent<MemberEntitlement>).detail;setLoginPending(false);setMember(m);setMemberState('verified');setRefreshing(false);setMessage('');};
    window.addEventListener('anzen-entitlement-changed',verified);window.addEventListener('anzen-app-active',handler);window.addEventListener('online',handler);
    const conflict=()=>setMessage(accountConflict);window.addEventListener('anzen-purchase-account-conflict',conflict);
    const timer=setInterval(handler,60000);
    return()=>{active=false;refreshGeneration.current++;clearInterval(timer);window.removeEventListener('anzen-purchase-account-conflict',conflict);window.removeEventListener('anzen-entitlement-changed',verified);window.removeEventListener('anzen-session-changed',sessionChanged);window.removeEventListener('anzen-login-started',loginStarted);window.removeEventListener('anzen-login-exchanging',loginStarted);window.removeEventListener('anzen-login-failed',loginEnded);window.removeEventListener('anzen-login-dismissed',loginEnded);window.removeEventListener('anzen-app-active',handler);window.removeEventListener('online',handler);};
  },[refresh]);
  async function action(name:Action,fn:()=>Promise<unknown>){
    if(!begin(name))return;
    const ticket=++refreshGeneration.current;setRefreshing(false);setMessage('');
    try{
      const result=await fn();if(ticket!==refreshGeneration.current)return;
      if(result&&typeof result==='object'&&'appUserId' in result){setMember(result as MemberEntitlement);setMemberState('verified');setMessage('');window.dispatchEvent(new Event('anzen-usage-changed'));}else await refresh();
    }catch(e){
      if(ticket!==refreshGeneration.current||e instanceof StaleMemberResponseError)return;
      const err=e as Error;let recovered=false;
      try{const m=await billing.entitlement();if(ticket!==refreshGeneration.current)return;setMember(m);setMemberState('verified');recovered=isVerifiedPro(m);}
      catch(error){if(ticket!==refreshGeneration.current||error instanceof StaleMemberResponseError)return;setMemberState('unavailable');}
      setMessage(recovered?'':err instanceof StoreError?describeStoreError(err):purchaseMessages[err.message]??messages[err.message]??describeStoreError(err));
    }finally{end(name);}
  }
  async function signOutAccount(){
    if(!begin('logout'))return;
    refreshGeneration.current++;setRefreshing(false);setMember(null);setMemberState('unauthenticated');setPrice('');setMessage('ログアウト中…');
    try{await logout();setMessage('');}
    catch{await refresh();setMessage('ログアウトできませんでした。もう一度お試しください。');}
    finally{end('logout');}
  }
  async function login(){if(!begin('login'))return;setMessage('ログインを待っています…');try{await startLogin();}catch{setLoginPending(false);setMemberState('unavailable');setMessage('ログインを開始できませんでした。もう一度お試しください。');}finally{end('login');}}
  const stageMessage=member?.purchasePending?(member.purchaseSource==='app_store'?(stageMessages[member.purchaseStage??'']??purchaseMessages.PURCHASE_REVIEW_REQUIRED):'別の購入元で手続き中です。購入元の状態を確認してください。'):null;
  const pro=isVerifiedPro(member);const pending=memberState!=='verified' || member?.syncState!=='verified' || (!!member&&!canResumeApplePurchase(member));
  useEffect(()=>{billingDiagnostic({operation:'buttons',result:'state',reason:loginPending||operations.login?'login':operations.purchase?'purchase':operations.restore?'restore':!member?'member_required':pending?'server_pending':!price?'price_required':'enabled'});},[loginPending,operations,member,pending,price]);
  // Sign-in first, Pro next, deletion last (collapsed but always present).
  // The member block keeps one fixed shape in every state, so the membership
  // response never moves the buttons below it under a finger.
  const statusLine=memberState==='loading'||memberState==='unavailable'?'会員・Pro':!member?'ログインしていません':pro?'Pro 利用中':pending?'会員・Pro':'無料会員';
  return <section className="native-panel mx-auto max-w-2xl space-y-5 p-5 text-slate-900 dark:text-slate-100"><h1 className="text-2xl font-bold">会員・安全AI Pro</h1>
    <div className="space-y-2">
      <p className="text-lg font-bold">{statusLine}</p>
      <p className="min-h-[1.75em] text-sm">{member?.expiresAt?`更新・有効期限：${new Date(member.expiresAt).toLocaleString('ja-JP')}`:'ウェブの購入も同じアカウントで使えます。'}</p>
      {!member?<button disabled={loginPending || operations.login} onClick={()=>void login()}>Apple / Googleでログイン</button>:<button disabled={operations.logout} onClick={()=>void signOutAccount()}>ログアウト</button>}
      <p role="status" className="min-h-[1.75em] text-sm">{message.includes('確認中')&&!slow?'':message}</p>
    </div>
    {/* RA generation is paused, so the plans list only what Pro actually adds today. */}
    <div className="text-sm"><p className="my-1">無料：AIチャット1日3回・警報1地点</p><p className="my-1">Pro：AIチャット1日50回・警報10地点と通知</p></div>
    <p className="text-xs">全体の月間AI原価上限に達すると、個人の残数があってもAI生成を停止します。</p>
    <p className="text-xs">Pro {price?`${price}`:'価格はApp Storeで確認'}/月（税込）。1か月ごとの自動更新でApple Accountに請求されます。更新の24時間前までにApp Storeで解約できます。</p>
    {config?.salesPaused&&!pro?<p role="status">{config.salesMessage??purchaseMessages.PRO_SALES_PAUSED}</p>:null}
    <div className="flex flex-wrap gap-3">{!pro?<button disabled={busy || !member || pending || !config?.ready || config.salesPaused || !price} onClick={()=>config && void action('purchase',()=>billing.purchase(config))}>{`Proにする（月額${price}）`}</button>:null}
    <button disabled={operations.restore} onClick={()=>void action('restore',async()=>billing.restore(config??await billing.config()))}>購入を復元</button>
    </div>
    {slow&&!pro&&!message?<p role="status" className="text-xs">{stageMessage??'購入状況を確認中です。'}</p>:null}
    <a href="https://apps.apple.com/account/subscriptions" onClick={event=>{event.preventDefault();void openSource('https://apps.apple.com/account/subscriptions');}}>App Storeで購読を管理・解約</a>
    {member?.source==='stripe'||member?.canManageStripe?<><p>ウェブ契約の管理・解約は購入元で行います。</p><button disabled={operations.portal} onClick={()=>void action('portal',async()=>{const result=await siteApi('/api/stripe/portal',{}) as {url:string};const url=new URL(result.url);if(url.origin!=='https://billing.stripe.com'||url.username||url.password)throw new Error('INVALID_ENDPOINT');await openSource(url.href);})}>ウェブ購読の管理・解約</button></>:null}
    <AccountDeletionPanel/>
    {member?<NativeAccountDetails key={member.appUserId}/>:null}
    <p><a href="/terms">利用規約</a> · <a href="/privacy">プライバシーポリシー</a> · <a href="/contact">問い合わせ</a></p>
  </section>;
}
