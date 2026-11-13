import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { z } from 'zod';
import product from '@/lib/mobile/product-policy.json';
import { siteApi, sessionBinding, SiteApiError } from './session';
import { StoreError } from './store-errors';
import { Preferences } from '@capacitor/preferences';
const outcomeSchema=z.object({id:z.string().uuid().optional(),attemptId:z.string().uuid(),outcome:z.enum(['cancelled','deferred','unknown','not_opened'])}).refine(r=>!!r.id||r.outcome==='not_opened');
type StoreOutcome=z.infer<typeof outcomeSchema>;
const outcomeKey=(appUserId:string)=>`anzen.apple-outcome.${encodeURIComponent(appUserId)}`;
async function clearReportedOutcome(appUserId:string,report:StoreOutcome){
  const key=outcomeKey(appUserId);const {value}=await Preferences.get({key});
  // An older refresh may finish after a newer attempt has queued its result.
  if(value===JSON.stringify(report))await Preferences.remove({key});
}
const snapshotSchema=z.object({plan:z.enum(['free','pro']),source:z.enum(['stripe','app_store']).nullable(),syncState:z.enum(['verified','pending','unavailable']),expiresAt:z.string().nullable(),appUserId:z.string().min(16),verifiedAt:z.string().datetime(),canManageStripe:z.boolean().default(false),purchasePending:z.boolean().default(false),purchaseIntentId:z.string().nullable().default(null),purchaseSource:z.string().nullable().default(null),purchaseStage:z.string().nullable().default(null),limits:z.object({law_chat:z.number(),chemical_ra:z.number(),weatherLocations:z.number(),notifications:z.boolean()})})
  .refine(s=>JSON.stringify(s.limits)===JSON.stringify(product.limits[s.plan]))
  .refine(s=>s.plan!=='pro' || (!!s.expiresAt && Number.isFinite(Date.parse(s.expiresAt))));
export type MemberEntitlement=z.infer<typeof snapshotSchema>;
export const billingConfigSchema=z.object({ready:z.boolean(),salesPaused:z.boolean().optional(),salesMessage:z.string().nullable().optional(),publicKey:z.string().nullable(),productId:z.string().nullable(),offeringId:z.string().nullable(),policy:z.object({monthlyPrice:z.number(),currency:z.string(),period:z.string(),entitlement:z.string()}),login:z.object({apple:z.boolean(),google:z.boolean()}),terms:z.string().url(),privacy:z.string().url(),manage:z.string().url()});
export type BillingConfig=z.infer<typeof billingConfigSchema>;
export function canResumeApplePurchase(member:MemberEntitlement){
  return !member.purchasePending || member.purchaseSource==='app_store'&&['prepared','store_cancelled_reported','store_unknown','store_not_opened_reported'].includes(member.purchaseStage??'');
}
type Sdk=Pick<typeof Purchases,'configure'|'logIn'|'logOut'|'getOfferings'|'purchasePackage'|'restorePurchases'>;
export class BillingController {
  private identified:string|null=null;
  private configured=false;
  private busy=false;
  private purchaseUser:string|null=null;
  private identityWork:Promise<void>=Promise.resolve();
  private packages=new Map<string,{until:number;value:Promise<PurchasesPackage>}>();
  private outcomeReports=new Map<string,Promise<MemberEntitlement>>();
  constructor(private send=siteApi,private sdk:Sdk=Purchases,private native=()=>Capacitor.getPlatform()==='ios'){}
  async config(){return billingConfigSchema.parse(await this.send('/api/mobile/v1/billing/config'));}
  async entitlement(recoverWhileBusy=false){
    const member=snapshotSchema.parse(await this.send('/api/me/entitlements'));
    this.publish(member);
    // A cancelled purchase must recover even if its first outcome request lost connectivity.
    try {
      const {value}=await Preferences.get({key:outcomeKey(member.appUserId)});
      if(value && (!this.busy || recoverWhileBusy)){
        const report=outcomeSchema.parse(JSON.parse(value));
        if(!report.id || member.purchaseIntentId===report.id){
          const checked=await this.sendOutcome(member.appUserId,report);
          await clearReportedOutcome(member.appUserId,report);this.publish(checked);return checked;
        }
        await clearReportedOutcome(member.appUserId,report);
      }
    } catch { /* Leave the durable outcome for the next authenticated refresh. */ }
    return member;
  }
  private sendOutcome(appUserId:string,report:StoreOutcome):Promise<MemberEntitlement>{
    const key=JSON.stringify([appUserId,report]);
    const pending=this.outcomeReports.get(key);if(pending)return pending;
    const work=this.send('/api/billing/store-outcome',report).then(value=>snapshotSchema.parse(value));
    this.outcomeReports.set(key,work);
    const clear=()=>{if(this.outcomeReports.get(key)===work)this.outcomeReports.delete(key);};
    void work.then(clear,clear);
    return work;
  }
  private async reportOutcome(appUserId:string,report:StoreOutcome){
    const key=outcomeKey(appUserId);
    await Preferences.set({key,value:JSON.stringify(report)}).catch(()=>{});
    try { await this.sendOutcome(appUserId,report);await clearReportedOutcome(appUserId,report); }
    catch { /* Retried automatically by entitlement() after app relaunch or reconnect. */ }
  }
  private publish(member:MemberEntitlement){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('anzen-entitlement-changed',{detail:member}));}
  async sync(){const member=snapshotSchema.parse(await this.send('/api/billing/reconcile',{}));this.publish(member);return member;}
  async identify(config:BillingConfig,member:MemberEntitlement){
    if(this.busy && this.purchaseUser && this.purchaseUser!==member.appUserId)throw new Error('PURCHASE_PENDING');
    const next=this.identityWork.then(()=>this.identifySerial(config,member));
    this.identityWork=next.catch(()=>{});return next;
  }
  private async identifySerial(config:BillingConfig,member:MemberEntitlement){
    if(!this.native() || !config.publicKey || !config.ready)throw new StoreError('BILLING_NOT_CONFIGURED');
    if(!this.configured){await this.sdk.configure({apiKey:config.publicKey,appUserID:member.appUserId});this.configured=true;}
    else if(this.identified!==member.appUserId)await this.sdk.logIn({appUserID:member.appUserId});
    this.identified=member.appUserId;
  }
  async offering(config:BillingConfig,member:MemberEntitlement):Promise<PurchasesPackage>{
    await this.identify(config,member);
    const key=JSON.stringify([member.appUserId,config.publicKey,config.offeringId,config.productId,config.policy]);
    const cached=this.packages.get(key);if(cached&&cached.until>Date.now())return cached.value;
    const value=this.loadOffering(config);
    const entry={until:Date.now()+120000,value};this.packages.set(key,entry);
    try{return await value;}catch(error){if(this.packages.get(key)===entry)this.packages.delete(key);throw error;}
  }
  private async loadOffering(config:BillingConfig):Promise<PurchasesPackage>{
    let timer:ReturnType<typeof setTimeout>|undefined;
    const offerings=await Promise.race([this.sdk.getOfferings(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new StoreError('STORE_PRODUCT_TIMEOUT')),12000);})]).finally(()=>clearTimeout(timer));
    const candidates=(config.offeringId?offerings.all[config.offeringId]:offerings.current)?.availablePackages??[];
    // Name what App Store actually returned, so a real device shows the exact mismatch.
    if(!candidates.length)throw new StoreError('NO_PACKAGES',`offering=${config.offeringId??'-'} / 取得=${Object.keys(offerings.all).join(',')||'なし'}`);
    // The yen price is enforced only on the Japanese storefront. Other storefronts (sandbox testers,
    // App Review in the US) see Apple's converted price, which the UI shows via priceString.
    const match=candidates.filter(p=>p.product.identifier===config.productId && p.packageType==='MONTHLY' && p.product.subscriptionPeriod===product.period && (p.product.currencyCode!==product.currency || p.product.price===config.policy.monthlyPrice));
    if(match.length!==1 || config.policy.monthlyPrice!==product.monthlyPrice || config.policy.entitlement!==product.entitlement)
      throw new StoreError('PRODUCT_MISMATCH',candidates.map(p=>`${p.product.identifier} ${p.packageType} ${p.product.subscriptionPeriod??'-'} ${p.product.currencyCode} ${p.product.price}`).join(' / '));
    return match[0];
  }
  async purchase(config:BillingConfig){
    if(this.busy)throw new Error('PURCHASE_PENDING');this.busy=true;
    const started=performance.now();
    try{
      if(config.salesPaused)throw new Error('PRO_SALES_PAUSED');
      const binding=await sessionBinding();
      const member=await this.entitlement(true);
      this.purchaseUser=member.appUserId;
      if(member.plan==='pro')throw new Error('ALREADY_SUBSCRIBED');
      if(member.purchasePending && member.purchaseSource!=='app_store')throw new Error('PURCHASE_PENDING');
      if(!canResumeApplePurchase(member))throw new Error('PURCHASE_PENDING');
      if(member.syncState!=='verified')throw new Error('ENTITLEMENT_SYNC_PENDING');
      const p=await this.offering(config,member);
      const attemptId=crypto.randomUUID();
      if(await sessionBinding()!==binding)throw new Error('UNAUTHORIZED');
      // If preparation commits but its response is lost, the next refresh can
      // report this exact attempt as not dispatched. Remove BEFORE the SDK call.
      const preparedOutcome:StoreOutcome={attemptId,outcome:'not_opened'};
      await Preferences.set({key:outcomeKey(member.appUserId),value:JSON.stringify(preparedOutcome)});
      let intent:{id:string;appUserId?:string;attemptId?:string};
      try{
        intent=await this.send('/api/billing/purchase-intents',{appUserId:member.appUserId,attemptId}) as typeof intent;
      }catch(error){
        void this.reportOutcome(member.appUserId,preparedOutcome);
        console.warn('[billing] purchase preparation failed',{stage:'purchase-intents',code:error instanceof SiteApiError?error.code:'REQUEST_FAILED',status:error instanceof SiteApiError?error.status:null});
        if(error instanceof Error&&['PRO_SALES_PAUSED','ALREADY_SUBSCRIBED','PURCHASE_PENDING','UNAUTHORIZED','ENTITLEMENT_SYNC_PENDING'].includes(error.message))throw error;
        throw new StoreError('STORE_NOT_OPENED',error instanceof SiteApiError?`購入予約API: ${error.code} / HTTP ${error.status}`:'購入予約APIの応答を確認できません');
      }
      // Compatibility with a server released before atomic preparation. Never replay the POST.
      if(!intent.attemptId){
        const latest=await this.entitlement();
        if(latest.appUserId!==member.appUserId || latest.plan==='pro' || latest.syncState!=='verified' || latest.purchaseIntentId!==intent.id)throw new Error('ENTITLEMENT_SYNC_PENDING');
        try{await this.send('/api/billing/store-started',{id:intent.id,attemptId});}
        catch(error){
          void this.reportOutcome(member.appUserId,{id:intent.id,attemptId,outcome:'not_opened'});
          console.warn('[billing] purchase preparation failed',{stage:'store-started',code:error instanceof SiteApiError?error.code:'REQUEST_FAILED',status:error instanceof SiteApiError?error.status:null});
          if(error instanceof Error&&error.message==='PRO_SALES_PAUSED')throw error;
          throw new StoreError('STORE_NOT_OPENED',error instanceof SiteApiError?`購入開始API: ${error.code} / HTTP ${error.status}`:'購入開始APIの応答を確認できません');
        }
      }else if(intent.attemptId!==attemptId || intent.appUserId!==member.appUserId)throw new Error('ENTITLEMENT_SYNC_PENDING');
      if(await sessionBinding()!==binding){
        void this.reportOutcome(member.appUserId,{id:intent.id,attemptId,outcome:'not_opened'});
        throw new Error('UNAUTHORIZED');
      }
      await clearReportedOutcome(member.appUserId,preparedOutcome);
      performance.measure?.('anzen.purchase.before-storekit',{start:started,end:performance.now()});
      try{await this.sdk.purchasePackage({aPackage:p});}catch(e){
        const code=String((e as {code?:string|number}).code??'');
        const outcome=code==='1'?'cancelled':code==='20'?'deferred':'unknown';
        // A userCancelled flag alone is not an SDK-confirmed cancellation.
        await this.reportOutcome(member.appUserId,{id:intent.id,attemptId,outcome});
        throw new Error(outcome==='cancelled'?'STORE_CANCELLED':outcome==='deferred'?'STORE_DEFERRED':'STORE_UNKNOWN');
      }
      // SDK customerInfo is deliberately ignored for authorization.
      try{return await this.sync();}catch{await this.reportOutcome(member.appUserId,{id:intent.id,attemptId,outcome:'unknown'});throw new Error('STORE_UNKNOWN');}
    }finally{this.purchaseUser=null;this.busy=false;}
  }
  async cancelPrepared(){const member=await this.entitlement();if(!member.purchasePending||member.purchaseSource!=='app_store'||member.purchaseStage!=='prepared'||!member.purchaseIntentId)throw new Error('PURCHASE_REVIEW_REQUIRED');return snapshotSchema.parse(await this.send('/api/billing/cancel-intent',{id:member.purchaseIntentId,source:'app_store'}));}
  async restore(config:BillingConfig){
    if(this.busy)throw new Error('PURCHASE_PENDING');this.busy=true;
    try{const member=await this.entitlement();await this.identify(config,member);await this.sdk.restorePurchases();return await this.sync();}finally{this.busy=false;}
  }
  async forget(){this.packages.clear();await this.identityWork;if(this.configured)await this.sdk.logOut();this.identified=null;}
}
export const billing=new BillingController();
export function isVerifiedPro(member:MemberEntitlement|null,now=Date.now()){
  return !!member && member.syncState==='verified' && member.plan==='pro' && !!member.expiresAt && Date.parse(member.expiresAt)>now && now-Date.parse(member.verifiedAt)>=-60000 && now-Date.parse(member.verifiedAt)<300000;
}
