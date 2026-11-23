'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { billing,isVerifiedPro,canResumeApplePurchase,type BillingConfig,type MemberEntitlement } from '../lib/billing';
import { logout,startLogin,isLoginExchanging,ensureSession,isGuestSession } from '../lib/session';
import { openSource } from '../lib/native';
import { restoreProPurchases } from '../lib/pro-purchase';
import { NativeAccountDetails } from './native-account-details';
import { AccountDeletionPanel } from './account-deletion-panel';
import { describeStoreError,StoreError,purchaseAccountConflictMessage as accountConflict } from '../lib/store-errors';
import { StaleMemberResponseError } from '../lib/member-generation';
import {billingDiagnostic} from '../lib/billing-diagnostics';
const catalogErrors=new Set(['BILLING_NOT_CONFIGURED','SDK_NOT_CONFIGURED','NO_PACKAGES','PRODUCT_MISMATCH','STORE_PRODUCT_TIMEOUT','STORE_CATALOG_UNAVAILABLE']);
type Action='purchase'|'restore'|'login'|'logout';
const messages:Record<string,string>={UNAUTHORIZED:'もう一度お試しください。',BILLING_NOT_CONFIGURED:'少し待ってからもう一度お試しください。',ALREADY_SUBSCRIBED:'購入済みです。',PURCHASE_PENDING:'購入状況を確認中です。',ENTITLEMENT_SYNC_PENDING:'少し待ってからもう一度お試しください。',PURCHASE_OWNED_BY_OTHER_ACCOUNT:accountConflict};
const purchaseMessages:Record<string,string>={PRO_SALES_PAUSED:'今月のPro新規受付は終了しました。来月1日に再開します。',STORE_CANCELLED:'',STORE_DEFERRED:'App Storeで承認待ちです。',STORE_UNKNOWN:'購入状況を確認中です。',STORE_NOT_OPENED:'もう一度お試しください。',PURCHASE_REVIEW_REQUIRED:'購入状況を確認中です。'};
const stageMessages:Record<string,string>={prepared:'購入を再開できます。',store_started:purchaseMessages.STORE_UNKNOWN,store_cancelled_reported:purchaseMessages.STORE_CANCELLED,store_deferred:purchaseMessages.STORE_DEFERRED,store_unknown:purchaseMessages.STORE_UNKNOWN,store_not_opened_reported:purchaseMessages.STORE_NOT_OPENED};
export function AccountPanel(){
  const refreshGeneration=useRef(0);
  const [loginPending,setLoginPending]=useState(false);
  // A guest bought or restored without registering: Pro works, sign-in stays offered.
  const [guest,setGuest]=useState(false);
  const running=useRef(new Set<Action>());const [operations,setOperations]=useState<Partial<Record<Action,boolean>>>({});
  const begin=(name:Action)=>{if(running.current.has(name))return false;running.current.add(name);setOperations(value=>({...value,[name]:true}));return true;};
  const end=(name:Action)=>{running.current.delete(name);setOperations(value=>({...value,[name]:false}));};
  const [config,setConfig]=useState<BillingConfig|null>(null);const [member,setMember]=useState<MemberEntitlement|null>(null);const [price,setPrice]=useState('');const [message,setMessage]=useState('');const busy=!!operations.purchase;const [refreshing,setRefreshing]=useState(false);const [memberState,setMemberState]=useState<'loading'|'verified'|'unauthenticated'|'unavailable'>('loading');
  const [slow,setSlow]=useState(false);
  const checking=refreshing||busy||!!operations.restore||!!member?.purchasePending||member?.syncState==='pending';
  useEffect(()=>{if(!checking)return;const timer=setTimeout(()=>setSlow(true),2500);return()=>{clearTimeout(timer);setSlow(false);};},[checking]);
  const [priceFailed,setPriceFailed]=useState(false);
  const [reloadingPrice,setReloadingPrice]=useState(false);
  const loadPrice=useCallback(async(c:BillingConfig|null,m:MemberEntitlement|null,ticket:number)=>{
    if(ticket!==refreshGeneration.current)return;
    try{
      if(!c?.ready)throw new StoreError('BILLING_NOT_CONFIGURED');
      const offer=m?await billing.offering(c,m):await billing.anonymousOffering(c);
      if(ticket!==refreshGeneration.current)return;
      setPrice(offer.product.priceString);
      setPriceFailed(false);
    }catch(error){
      if(ticket!==refreshGeneration.current||error instanceof StaleMemberResponseError)return;
      setPrice('');
      setPriceFailed(true);
    }
  },[]);
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
        if(ticket!==refreshGeneration.current||m.plan!=='free'||m.syncState!=='verified')return;
        void loadPrice(c,m,ticket);
      });
    }catch(e){
      if(ticket!==refreshGeneration.current||e instanceof StaleMemberResponseError)return;const code=(e as Error).message;
      setMemberState(code==='UNAUTHORIZED'?'unauthenticated':'unavailable');if(code==='UNAUTHORIZED')setMember(null);
      void configWork.then(c=>loadPrice(c,null,ticket));
      setMessage(manual&&code!=='UNAUTHORIZED'?'少し待ってからもう一度お試しください。':'');
    }finally{if(ticket===refreshGeneration.current)setRefreshing(false);}
  },[loadPrice]);
  useEffect(()=>{
    let active=true;
    const handler=()=>{if(!active)return;setLoginPending(isLoginExchanging());void isGuestSession().then(value=>{if(active)setGuest(value);}).catch(()=>{});void refresh();};handler();const sessionChanged=(event:Event)=>{const detail=(event as CustomEvent<{signedIn?:boolean;guest?:boolean}>).detail;setGuest(detail?.guest===true);setLoginPending(false);setMember(null);setPrice('');setPriceFailed(false);if(detail?.signedIn===false){const ticket=++refreshGeneration.current;setMemberState('unauthenticated');setRefreshing(false);void billing.config().catch(()=>null).then(c=>{if(ticket===refreshGeneration.current){setConfig(c);void loadPrice(c,null,ticket);}});return;}setMemberState('loading');void refresh();};const loginStarted=(event:Event)=>{refreshGeneration.current++;setLoginPending(event.type==='anzen-login-exchanging');setRefreshing(false);setMemberState('loading');setMessage('ログインを確認中です…');};
    const loginEnded=(event:Event)=>{refreshGeneration.current++;setLoginPending(false);setRefreshing(false);setMemberState('unavailable');setMessage(event.type==='anzen-login-dismissed'?'ログインを中断しました。もう一度お試しください。':'ログインを完了できませんでした。もう一度お試しください。');void billing.config().then(setConfig).catch(()=>{});};
    window.addEventListener('anzen-session-changed',sessionChanged);window.addEventListener('anzen-login-started',loginStarted);window.addEventListener('anzen-login-exchanging',loginStarted);window.addEventListener('anzen-login-failed',loginEnded);window.addEventListener('anzen-login-dismissed',loginEnded);
    const verified=(event:Event)=>{const m=(event as CustomEvent<MemberEntitlement>).detail;setLoginPending(false);setMember(m);setMemberState('verified');setRefreshing(false);setMessage('');};
    window.addEventListener('anzen-entitlement-changed',verified);window.addEventListener('anzen-app-active',handler);window.addEventListener('online',handler);
    const conflict=()=>setMessage(accountConflict);window.addEventListener('anzen-purchase-account-conflict',conflict);
    const timer=setInterval(handler,60000);
    return()=>{active=false;refreshGeneration.current++;clearInterval(timer);window.removeEventListener('anzen-purchase-account-conflict',conflict);window.removeEventListener('anzen-entitlement-changed',verified);window.removeEventListener('anzen-session-changed',sessionChanged);window.removeEventListener('anzen-login-started',loginStarted);window.removeEventListener('anzen-login-exchanging',loginStarted);window.removeEventListener('anzen-login-failed',loginEnded);window.removeEventListener('anzen-login-dismissed',loginEnded);window.removeEventListener('anzen-app-active',handler);window.removeEventListener('online',handler);};
  },[refresh,loadPrice]);
  async function action(name:Action,fn:()=>Promise<unknown>){
    if(!begin(name))return;
    const ticket=++refreshGeneration.current;setRefreshing(false);setMessage('');
    try{
      const result=await fn();if(ticket!==refreshGeneration.current)return;
      if(result&&typeof result==='object'&&'appUserId' in result){const rights=result as MemberEntitlement;
        setMember(rights);setMemberState('verified');
        setMessage(name==='restore' && rights.plan==='free' && rights.syncState==='verified' && !rights.purchasePending ? '復元できる有効な購読はありません。' : '');
        window.dispatchEvent(new Event('anzen-usage-changed'));}else await refresh();
    }catch(e){
      if(ticket!==refreshGeneration.current||e instanceof StaleMemberResponseError)return;
      const err=e as Error;let recovered=false;
      if(name==='purchase' && err instanceof StoreError && catalogErrors.has(err.message)){
        setPrice('');setPriceFailed(true);
      }
      try{const m=await billing.entitlement();if(ticket!==refreshGeneration.current)return;setMember(m);setMemberState('verified');recovered=isVerifiedPro(m);}
      catch(error){if(ticket!==refreshGeneration.current||error instanceof StaleMemberResponseError)return;setMemberState('unavailable');}
      setMessage(recovered?'':err instanceof StoreError?describeStoreError(err):purchaseMessages[err.message]??messages[err.message]??describeStoreError(err));
    }finally{end(name);}
  }
  // Purchase and restore never require registration (App Store 5.1.1(v)): without a session,
  // a guest session with no personal data is created first, then the same flow continues.
  async function withSession(name:Action,fn:()=>Promise<unknown>){
    if(!begin(name))return;
    try{await ensureSession();}catch{end(name);setMessage('購入を始められませんでした。通信を確認して、もう一度お試しください。');return;}
    end(name);await action(name,fn);
  }
  async function reloadPrice(){
    if(reloadingPrice)return;
    setReloadingPrice(true);
    setMessage('');
    const ticket=++refreshGeneration.current;
    try{
      const c=await billing.config().catch(()=>null);
      if(ticket!==refreshGeneration.current)return;
      setConfig(c);
      await loadPrice(c,member,ticket);
    }finally{setReloadingPrice(false);}
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
  // The first tap starts the guest flow even if the price or membership lookup has not finished.
  const purchaseDisabled=reloadingPrice || busy || !!operations.restore || loginPending || !!config?.salesPaused || (!priceFailed && !!member && pending);
  let purchaseLabel=price ? `Proにする（月額${price}）` : 'Proにする（月額プラン）';
  if(priceFailed)purchaseLabel='月額プランを再読み込み';
  if(reloadingPrice)purchaseLabel='商品を読み込み中…';
  function handlePurchase(){
    if(priceFailed){void reloadPrice();return;}
    void withSession('purchase',async()=>billing.purchase(await billing.config(),setPrice));
  }
  useEffect(()=>{billingDiagnostic({operation:'buttons',result:'state',reason:loginPending||operations.login?'login':operations.purchase?'purchase':operations.restore?'restore':config?.salesPaused?'store_unavailable':purchaseDisabled?'server_pending':'enabled'});},[loginPending,operations,config?.salesPaused,purchaseDisabled]);
  // App Store 5.1.1(v): Pro is bought and restored without registering. Purchase comes first;
  // sign-in is an optional link for other devices and the website, placed after the purchase.
  // The status block keeps one fixed shape in every state, so the membership response never
  // moves the buttons below it under a finger.
  const signedInMember=!!member&&!guest;
  const statusLine=memberState==='loading'||memberState==='unavailable'?'安全AI Pro':pro?'Pro 利用中':pending&&signedInMember?'安全AI Pro':signedInMember?'無料プラン':'無料プラン（登録不要）';
  return <section className="native-panel mx-auto max-w-2xl space-y-5 p-5 text-slate-900 dark:text-slate-100"><h1 className="text-2xl font-bold">安全AI Pro</h1>
    <div className="space-y-2">
      <p className="text-lg font-bold">{statusLine}</p>
      <p className="min-h-[1.75em] text-sm">{member?.expiresAt?`更新・有効期限：${new Date(member.expiresAt).toLocaleString('ja-JP')}`:''}</p>
      <p role="status" className="min-h-[1.75em] text-sm">{message.includes('確認中')&&!slow?'':message || (priceFailed&&!pro&&!config?.salesPaused?'App Storeの商品を読み込めませんでした。':'')}</p>
    </div>
    {/* RA generation is paused, so the plans list only what Pro actually adds today. */}
    <div className="text-sm"><p className="my-1">無料：AIチャット1日3回・警報1地点</p><p className="my-1">Pro：AIチャット1日50回・警報10地点と通知</p></div>
    <p className="text-xs">全体の月間AI原価上限に達すると、個人の残数があってもAI生成を停止します。</p>
    <p className="text-xs">Pro {price?`${price}`:'価格はApp Storeで確認'}/月（税込）。1か月ごとの自動更新でApple Accountに請求されます。更新の24時間前までにApp Storeで解約できます。アカウント登録なしで購入・復元できます。</p>
    {config?.salesPaused&&!pro?<p role="status">{config.salesMessage??purchaseMessages.PRO_SALES_PAUSED}</p>:null}
    <div className="flex flex-wrap gap-3">{!pro?<button disabled={purchaseDisabled} onClick={handlePurchase}>{purchaseLabel}</button>:null}
    <button disabled={busy || operations.restore || loginPending} onClick={()=>void withSession('restore',restoreProPurchases)}>購入を復元</button>
    </div>
    {slow&&!pro&&!message?<p role="status" className="text-xs">{stageMessage??'購入状況を確認中です。'}</p>:null}
    <a href="https://apps.apple.com/account/subscriptions" onClick={event=>{event.preventDefault();void openSource('https://apps.apple.com/account/subscriptions');}}>App Storeで購読を管理・解約</a>
    {/* Optional: only to use the same Pro on other devices or the website. Never a step before purchase. */}
    <div className="space-y-2 border-t pt-4 text-sm">
      {signedInMember?<><p>ログイン中。ウェブの購入も同じアカウントで使えます。</p>{!pro?<p className="muted">購入済みの方は、購入したときと同じ方法（Google / Apple）でログインしてください。</p>:null}<button disabled={operations.logout} onClick={()=>void signOutAccount()}>ログアウト</button></>
        :<><p className="muted">任意：ほかの端末やWebでも同じProを使う場合だけ連携できます。</p><button disabled={loginPending || operations.login || busy || operations.restore} onClick={()=>void login()}>Apple / Googleで連携（任意）</button></>}
    </div>
    {/* No web-checkout or web-billing entry inside the iOS app (App Store 3.1.1). */}
    {member?.source==='stripe'||member?.canManageStripe?<p className="text-xs">ウェブで契約した購読の管理・解約は、ウェブサイトの会員ページで行えます。</p>:null}
    <AccountDeletionPanel guest={guest} hasAccount={memberState!=='unauthenticated'}/>
    {member?<NativeAccountDetails key={member.appUserId}/>:null}
    <p><a href="/terms">利用規約</a> · <a href="/privacy">プライバシーポリシー</a> · <a href="/contact">問い合わせ</a></p>
  </section>;
}
