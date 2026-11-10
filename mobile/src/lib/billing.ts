import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { z } from 'zod';
import product from '@/lib/mobile/product-policy.json';
import { siteApi } from './session';
import { StoreError } from './store-errors';
import { Preferences } from '@capacitor/preferences';
const outcomeSchema=z.object({id:z.string().uuid(),attemptId:z.string().uuid(),outcome:z.enum(['cancelled','deferred','unknown','not_opened'])});
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
  constructor(private send=siteApi,private sdk:Sdk=Purchases,private native=()=>Capacitor.getPlatform()==='ios'){}
  async config(){return billingConfigSchema.parse(await this.send('/api/mobile/v1/billing/config'));}
  async entitlement(){
    const member=snapshotSchema.parse(await this.send('/api/me/entitlements'));
    // A cancelled purchase must recover even if its first outcome request lost connectivity.
    try {
      const {value}=await Preferences.get({key:outcomeKey(member.appUserId)});
      if(value){
        const report=outcomeSchema.parse(JSON.parse(value));
        if(member.purchaseIntentId===report.id){
          const checked=snapshotSchema.parse(await this.send('/api/billing/store-outcome',report));
          await clearReportedOutcome(member.appUserId,report);return checked;
        }
        await clearReportedOutcome(member.appUserId,report);
      }
    } catch { /* Leave the durable outcome for the next authenticated refresh. */ }
    return member;
  }
  private async reportOutcome(appUserId:string,report:StoreOutcome){
    const key=outcomeKey(appUserId);
    await Preferences.set({key,value:JSON.stringify(report)}).catch(()=>{});
    try { await this.send('/api/billing/store-outcome',report);await clearReportedOutcome(appUserId,report); }
    catch { /* Retried automatically by entitlement() after app relaunch or reconnect. */ }
  }
  async sync(){return snapshotSchema.parse(await this.send('/api/billing/reconcile',{}));}
  async identify(config:BillingConfig,member:MemberEntitlement){
    if(!this.native() || !config.publicKey || !config.ready)throw new StoreError('BILLING_NOT_CONFIGURED');
    if(!this.configured){await this.sdk.configure({apiKey:config.publicKey,appUserID:member.appUserId});this.configured=true;}
    else if(this.identified!==member.appUserId)await this.sdk.logIn({appUserID:member.appUserId});
    this.identified=member.appUserId;
  }
  async offering(config:BillingConfig,member:MemberEntitlement):Promise<PurchasesPackage>{
    await this.identify(config,member);
    const offerings=await this.sdk.getOfferings();
    const candidates=offerings.all[config.offeringId??'']?.availablePackages??[];
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
    try{
      if(config.salesPaused)throw new Error('PRO_SALES_PAUSED');
      const member=await this.entitlement();
      if(member.plan==='pro')throw new Error('ALREADY_SUBSCRIBED');
      if(member.purchasePending && member.purchaseSource!=='app_store')throw new Error('PURCHASE_PENDING');
      if(!canResumeApplePurchase(member))throw new Error('PURCHASE_PENDING');
      if(member.syncState!=='verified')throw new Error('ENTITLEMENT_SYNC_PENDING');
      const p=await this.offering(config,member);
      const intent=await this.send('/api/billing/purchase-intents',{}) as {id:string};
      // Re-check identity after the asynchronous reservation and before opening StoreKit.
      const latest=await this.entitlement();
      if(latest.appUserId!==member.appUserId || latest.plan==='pro' || latest.syncState!=='verified' || latest.purchaseIntentId!==intent.id)throw new Error('ENTITLEMENT_SYNC_PENDING');
      const attemptId=crypto.randomUUID();
      try{await this.send('/api/billing/store-started',{id:intent.id,attemptId});}
      catch(error){
        // No SDK call was made. The server may still have committed store_started.
        await this.send('/api/billing/cancel-intent',{id:intent.id,source:'app_store'}).catch(()=>{});
        await this.reportOutcome(member.appUserId,{id:intent.id,attemptId,outcome:'not_opened'});
        if(error instanceof Error&&error.message==='PRO_SALES_PAUSED')throw error;
        throw new Error('STORE_NOT_OPENED');
      }
      try{await this.sdk.purchasePackage({aPackage:p});}catch(e){
        const code=String((e as {code?:string|number}).code??'');
        const outcome=code==='1'?'cancelled':code==='20'?'deferred':'unknown';
        // A userCancelled flag alone is not an SDK-confirmed cancellation.
        await this.reportOutcome(member.appUserId,{id:intent.id,attemptId,outcome});
        throw new Error(outcome==='cancelled'?'STORE_CANCELLED':outcome==='deferred'?'STORE_DEFERRED':'STORE_UNKNOWN');
      }
      // SDK customerInfo is deliberately ignored for authorization.
      try{return await this.sync();}catch{await this.reportOutcome(member.appUserId,{id:intent.id,attemptId,outcome:'unknown'});throw new Error('STORE_UNKNOWN');}
    }finally{this.busy=false;}
  }
  async cancelPrepared(){const member=await this.entitlement();if(!member.purchasePending||member.purchaseSource!=='app_store'||member.purchaseStage!=='prepared'||!member.purchaseIntentId)throw new Error('PURCHASE_REVIEW_REQUIRED');return snapshotSchema.parse(await this.send('/api/billing/cancel-intent',{id:member.purchaseIntentId,source:'app_store'}));}
  async restore(config:BillingConfig){
    if(this.busy)throw new Error('PURCHASE_PENDING');this.busy=true;
    try{const member=await this.entitlement();await this.identify(config,member);await this.sdk.restorePurchases();return await this.sync();}finally{this.busy=false;}
  }
  async forget(){if(this.configured)await this.sdk.logOut();this.identified=null;}
}
export const billing=new BillingController();
export function isVerifiedPro(member:MemberEntitlement|null,now=Date.now()){
  return !!member && member.syncState==='verified' && member.plan==='pro' && !!member.expiresAt && Date.parse(member.expiresAt)>now && now-Date.parse(member.verifiedAt)>=-60000 && now-Date.parse(member.verifiedAt)<300000;
}
