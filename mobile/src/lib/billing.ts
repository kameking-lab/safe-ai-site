import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { z } from 'zod';
import product from '@/lib/mobile/product-policy.json';
import { isGuestSession, siteApi, sessionBinding, SiteApiError } from './session';
import { StoreError } from './store-errors';
import { boundedPreferences as Preferences } from './bounded-storage';
import { assertCurrentMember, currentMemberResponse, invalidateMemberReads, memberGeneration, StaleMemberResponseError } from './member-generation';
import {bounded,billingDiagnostic,OperationTimeoutError,type DiagnosticOperation} from './billing-diagnostics';
const outcomeSchema=z.object({id:z.string().uuid().optional(),attemptId:z.string().uuid(),outcome:z.enum(['cancelled','deferred','unknown','not_opened'])}).refine(r=>!!r.id||r.outcome==='not_opened');
type StoreOutcome=z.infer<typeof outcomeSchema>;
const outcomeKey=(appUserId:string)=>`anzen.apple-outcome.${encodeURIComponent(appUserId)}`;
async function clearReportedOutcome(appUserId:string,report:StoreOutcome){
  const key=outcomeKey(appUserId);const {value}=await Preferences.get({key});
  // An older refresh may finish after a newer attempt has queued its result.
  if(value===JSON.stringify(report))await Preferences.remove({key});
}
const anonymousId=z.string().regex(/^\$RCAnonymousID:[a-f0-9]{32}$/);
const storeReceipt=registerPlugin<{currentPurchase(options:{productId:string}):Promise<{signedTransaction?:string}>}>('NativeStoreReceipt');
const snapshotSchema=z.object({plan:z.enum(['free','pro']),source:z.enum(['stripe','app_store']).nullable(),syncState:z.enum(['verified','pending','unavailable']),expiresAt:z.string().nullable(),appUserId:z.string().min(16),appleGuestAppUserId:anonymousId.optional(),verifiedAt:z.string().datetime(),canManageStripe:z.boolean().default(false),purchasePending:z.boolean().default(false),purchaseIntentId:z.string().nullable().default(null),purchaseSource:z.string().nullable().default(null),purchaseStage:z.string().nullable().default(null),limits:z.object({law_chat:z.number(),chemical_ra:z.number(),weatherLocations:z.number(),notifications:z.boolean()})})
  .refine(s=>JSON.stringify(s.limits)===JSON.stringify(product.limits[s.plan]))
  .refine(s=>s.plan!=='pro' || (!!s.expiresAt && Number.isFinite(Date.parse(s.expiresAt))));
export type MemberEntitlement=z.infer<typeof snapshotSchema>;
export const billingConfigSchema=z.object({ready:z.boolean(),salesPaused:z.boolean().optional(),salesMessage:z.string().nullable().optional(),publicKey:z.string().nullable(),productId:z.string().nullable(),offeringId:z.string().nullable(),policy:z.object({monthlyPrice:z.number(),currency:z.string(),period:z.string(),entitlement:z.string()}),login:z.object({apple:z.boolean(),google:z.boolean()}),terms:z.string().url(),privacy:z.string().url(),manage:z.string().url()});
export type BillingConfig=z.infer<typeof billingConfigSchema>;
export function canResumeApplePurchase(member:MemberEntitlement){
  return !member.purchasePending || member.purchaseSource==='app_store'&&['prepared','store_cancelled_reported','store_unknown','store_not_opened_reported'].includes(member.purchaseStage??'');
}
type Sdk=Pick<typeof Purchases,'isConfigured'|'configure'|'logIn'|'logOut'|'getOfferings'|'purchasePackage'|'restorePurchases'|'invalidateCustomerInfoCache'|'getCustomerInfo'> & Partial<Pick<typeof Purchases,'syncPurchases'>>;
const monthlyProductId = 'jp.anzenaiportal.pro.monthly';
function productIssue({product:storeProduct, packageType}:PurchasesPackage) {
  if (storeProduct.identifier !== monthlyProductId) return 'identifier';
  const monthly = storeProduct.subscriptionPeriod == null
    ? packageType === 'MONTHLY' : storeProduct.subscriptionPeriod === product.period;
  if (!monthly) return 'period';
  if (!storeProduct.priceString?.trim() || !storeProduct.currencyCode ||
      (storeProduct.currencyCode === product.currency && storeProduct.price !== product.monthlyPrice)) return 'price';
  return null;
}
function storeDiagnosticCode(error:unknown) {
  if (error instanceof StoreError) return error.message;
  if (error instanceof OperationTimeoutError) return 'TIMEOUT';
  const code = String((error as {code?:unknown} | null)?.code ?? '');
  return /^(?:[0-9]{1,3}|UNIMPLEMENTED|UNAVAILABLE)$/.test(code) ? code : 'SDK_ERROR';
}
export class BillingController {
  private identified:string|null=null;
  private configuredKey:string|null=null;
  private anonymous=false;
  private busy=false;
  private purchaseUser:string|null=null;
  private identityWork:Promise<void>=Promise.resolve();
  // Native identity mutations cannot be cancelled. Fence a late completion before
  // allowing another store identity, while every caller has a bounded wait.
  private nativeIdentity:Promise<unknown>=Promise.resolve();
  private packages=new Map<string,{until:number;value:Promise<PurchasesPackage>}>();
  private outcomeReports=new Map<string,Promise<MemberEntitlement>>();
  private recovery=new Map<string,Promise<MemberEntitlement>>();
  private send:typeof siteApi;
  constructor(send=siteApi,private sdk:Sdk=Purchases,private native=()=>Capacitor.getPlatform()==='ios',private receipt=storeReceipt){
    this.send=(...args)=>bounded(args[0].endsWith('/billing/config')?'config':args[0].startsWith('/api/me/entitlements')?'entitlement':args[0]==='/api/billing/reconcile'?'reconcile':'store_request',()=>send(...args));
  }
  async config(){
    const response = await this.send('/api/mobile/v1/billing/config').catch(error=>{
      console.warn('[billing] config request failed', {status:error instanceof SiteApiError?error.status:null, timeout:error instanceof OperationTimeoutError});
      throw new StoreError('BILLING_NOT_CONFIGURED');
    });
    const parsed = billingConfigSchema.safeParse(response);
    if (!parsed.success) {
      console.warn('[billing] invalid config response');
      throw new StoreError('BILLING_NOT_CONFIGURED');
    }
    const config = parsed.data;
    if (!config.ready || !config.publicKey || !config.productId) {
      console.warn('[billing] config unavailable', {ready:config.ready, hasKey:!!config.publicKey, hasProduct:!!config.productId});
    }
    return config;
  }
  private async configure(apiKey:string, appUserID?:string){
    this.configuredKey = null;
    if (!apiKey.startsWith('appl_')) {
      console.warn('[billing] expected Apple public SDK key');
      throw new StoreError('BILLING_NOT_CONFIGURED');
    }
    try {
      await this.sdk.configure(appUserID ? {apiKey, appUserID} : {apiKey});
      const status = await bounded('configure', () => this.sdk.isConfigured());
      if (!status.isConfigured) throw new StoreError('SDK_NOT_CONFIGURED');
      this.configuredKey = apiKey;
    } catch (error) {
      console.warn('[billing] SDK initialization failed', {code:storeDiagnosticCode(error)});
      throw new StoreError('SDK_NOT_CONFIGURED');
    }
  }
  /** Rejoin the store identity before asking the server to verify this login. SDK flags never grant access. */
  async recoverSession(){
    if(this.busy)return this.entitlement();
    const binding=await sessionBinding();
    // A purchase/restore can start while Preferences is resolving the binding.
    // Its StoreKit result owns reconciliation until it completes.
    if(this.busy)return this.entitlement();
    const existing=this.recovery.get(binding);if(existing)return existing;
    const work=this.recoverSessionSerial(binding);this.recovery.set(binding,work);
    try{return await work;}finally{if(this.recovery.get(binding)===work)this.recovery.delete(binding);}
  }
  private async recoverSessionSerial(binding:string){
    for(let attempt=0;attempt<3;attempt++){
      const ticket=memberGeneration();
      try{
        const configWork=this.config();void configWork.catch(()=>{});
        // Publish the server ledger immediately, even if the store/config is offline.
        const member=await this.readEntitlement(ticket);
        const config=await configWork.catch(()=>null);
        assertCurrentMember(ticket);
        if(this.busy)return member;
        let latest=member;
        let storeConflict=false;
        if(this.native()&&config?.ready&&config.publicKey){
          const identity=this.identityWork.then(async()=>{
            assertCurrentMember(ticket);
            await this.identifySerial(config,member);assertCurrentMember(ticket);
            // Silent StoreKit receipt sync is required after changing the app
            // account. getCustomerInfo alone only reads the new account cache.
            if(this.sdk.syncPurchases&&!member.appleGuestAppUserId)await this.mutateIdentity('getCustomerInfo',()=>{assertCurrentMember(ticket);return this.sdk.syncPurchases!();});assertCurrentMember(ticket);
            await bounded('invalidateCustomerInfoCache',()=>this.sdk.invalidateCustomerInfoCache());assertCurrentMember(ticket);
            await bounded('getCustomerInfo',()=>this.sdk.getCustomerInfo());assertCurrentMember(ticket);
          });
          this.identityWork=identity.catch(()=>{});
          try{await bounded('identity_queue',()=>identity);}catch(error){if(error instanceof StaleMemberResponseError)throw error;storeConflict=['7','13'].includes(String((error as {code?:unknown})?.code??''));}
        }
        assertCurrentMember(ticket);if(this.busy)return member;
        // The server can verify its own stored purchase even when the native SDK fails.
        if(this.native())latest=await this.reconcile(ticket,member.appUserId);
        if(storeConflict&&latest.plan!=='pro')throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
        const finalTicket=memberGeneration();
        if(await sessionBinding()!==binding)throw new StaleMemberResponseError();
        if(latest.appUserId!==member.appUserId||await sessionBinding()!==binding)throw new StaleMemberResponseError();
        // Session lookup also yields; a newer confirmation/logout may have won meanwhile.
        assertCurrentMember(finalTicket);
        if(typeof window!=='undefined'){
          window.dispatchEvent(new CustomEvent('anzen-membership-recovered',{detail:latest}));
          window.dispatchEvent(new Event('anzen-usage-changed'));
        }
        return latest;
      }catch(error){
        if(await sessionBinding()!==binding)throw new StaleMemberResponseError();
        if(error instanceof Error&&error.message==='PURCHASE_OWNED_BY_OTHER_ACCOUNT'&&typeof window!=='undefined')window.dispatchEvent(new Event('anzen-purchase-account-conflict'));
        if(!(error instanceof StaleMemberResponseError)||attempt===2)throw error;
        await new Promise(resolve=>setTimeout(resolve,attempt===0?300:700));
        if(await sessionBinding()!==binding)throw new StaleMemberResponseError();
      }
    }
    throw new Error('ENTITLEMENT_SYNC_PENDING');
  }
  async entitlement(recoverWhileBusy=false,refresh=false){
    return this.readEntitlement(refresh?invalidateMemberReads():memberGeneration(),recoverWhileBusy,refresh);
  }
  private async readEntitlement(ticket:number,recoverWhileBusy=false,refresh=false){
    assertCurrentMember(ticket);
    let member!:MemberEntitlement;
    // Retry only read-only membership lookups. Never replay StoreKit or a purchase POST.
    for(let attempt=0;attempt<3;attempt++){
      try{
        const response=await currentMemberResponse(ticket,this.send(refresh?'/api/me/entitlements?refresh=1':'/api/me/entitlements'));
        assertCurrentMember(ticket);member=snapshotSchema.parse(response);
        if(member.syncState==='verified'||attempt===2)break;
      }catch(error){
        if(error instanceof OperationTimeoutError||error instanceof StaleMemberResponseError||error instanceof Error&&error.message==='UNAUTHORIZED'||attempt===2)throw error;
      }
      await new Promise(resolve=>setTimeout(resolve,attempt===0?500:1500));
      assertCurrentMember(ticket);
    }
    if(refresh)ticket=invalidateMemberReads();
    this.publish(member);
    // A cancelled purchase must recover even if its first outcome request lost connectivity.
    try {
      const {value}=await Preferences.get({key:outcomeKey(member.appUserId)});
      assertCurrentMember(ticket);
      if(value && (!this.busy || recoverWhileBusy)){
        const report=outcomeSchema.parse(JSON.parse(value));
        if(!report.id || member.purchaseIntentId===report.id){
          const checked=await currentMemberResponse(ticket,this.sendOutcome(member.appUserId,report));
          assertCurrentMember(ticket);this.publish(checked);return checked;
        }
        await clearReportedOutcome(member.appUserId,report);
      }
    } catch(error) { if(error instanceof StaleMemberResponseError)throw error; /* Leave the durable outcome for the next authenticated refresh. */ }
    assertCurrentMember(ticket);
    return member;
  }
  private sendOutcome(appUserId:string,report:StoreOutcome):Promise<MemberEntitlement>{
    const key=JSON.stringify([appUserId,report,memberGeneration()]);
    const pending=this.outcomeReports.get(key);if(pending)return pending;
    const work=this.send('/api/billing/store-outcome',report).then(async value=>{
      const member=snapshotSchema.parse(value);
      // Keep overlapping replays joined until the durable report is cleared.
      await clearReportedOutcome(appUserId,report);return member;
    });
    this.outcomeReports.set(key,work);
    const clear=()=>{if(this.outcomeReports.get(key)===work)this.outcomeReports.delete(key);};
    void work.then(clear,clear);
    return work;
  }
  private async reportOutcome(appUserId:string,report:StoreOutcome){
    const key=outcomeKey(appUserId);
    await Preferences.set({key,value:JSON.stringify(report)}).catch(()=>{});
    try { await this.sendOutcome(appUserId,report); }
    catch { /* Retried automatically by entitlement() after app relaunch or reconnect. */ }
  }
  private publish(member:MemberEntitlement){billingDiagnostic({operation:'entitlement',result:'state',plan:member.plan});if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('anzen-entitlement-changed',{detail:member}));}
  async sync(){return this.reconcile(memberGeneration());}
  private async reconcile(ticket:number,appUserId?:string){
    assertCurrentMember(ticket);
    // Also discard reads started while StoreKit was open, before confirmation.
    const next=invalidateMemberReads();
    const response=await currentMemberResponse(next,this.send('/api/billing/reconcile',appUserId?{appUserId}:{}));
    assertCurrentMember(next);
    const member=snapshotSchema.parse(response);
    if(appUserId&&member.appUserId!==appUserId)throw new StaleMemberResponseError();
    // Reads opened during server reconciliation may still contain the pre-purchase plan.
    invalidateMemberReads();this.publish(member);return member;
  }
  async identify(config:BillingConfig,member:MemberEntitlement){
    if(this.busy && this.purchaseUser && this.purchaseUser!==member.appUserId)throw new Error('PURCHASE_PENDING');
    const ticket=memberGeneration();
    const next=this.identityWork.then(()=>{assertCurrentMember(ticket);return this.identifySerial(config,member);});
    this.identityWork=next.catch(()=>{});return bounded('identity_queue',()=>next);
  }
  private async mutateIdentity<T>(operation:DiagnosticOperation,run:()=>Promise<T>){
    await bounded('sdk_identity_queue',()=>this.nativeIdentity);
    const raw=run();this.nativeIdentity=raw.catch(()=>{});
    return bounded(operation,()=>raw);
  }
  private async identifySerial(config:BillingConfig,member:MemberEntitlement){
    if(!this.native() || !config.publicKey || !config.ready)throw new StoreError('BILLING_NOT_CONFIGURED');
    const ticket=memberGeneration();
    const alias=member.appleGuestAppUserId;
    const guestId=alias && await isGuestSession()?alias:null;
    const storeId=guestId??member.appUserId;
    assertCurrentMember(ticket);
    if(this.identified===storeId && this.configuredKey===config.publicKey)return;
    // An anonymous-to-member login may alias their purchases. Start it only from
    // the guest identity that the server attached to this session.
    if(this.configuredKey!==config.publicKey || guestId || (alias && this.identified!==alias) || (this.anonymous && !alias)){
      const initialId=alias??storeId;
      this.identified=null;
      await this.mutateIdentity('configure',()=>{
        assertCurrentMember(ticket);
        return this.configure(config.publicKey!,initialId).then(()=>{
          // Retain the actual SDK state even if the session changes before this call completes.
          this.anonymous=!!alias;
        });
      });
      assertCurrentMember(ticket);
      this.identified=initialId;
    }
    // A late native identity change leaves identified unset until it completes.
    if(this.identified!==storeId){
      // logIn can complete natively after its caller times out. The previous
      // identity is no longer safe to reuse, including when returning to it.
      this.identified=null;
      await this.mutateIdentity('logIn',()=>{
        assertCurrentMember(ticket);
        return this.sdk.logIn({appUserID:storeId}).then(()=>{this.anonymous=false;});
      });
    }
    assertCurrentMember(ticket);
    this.identified=storeId;
  }
  /**
   * Price before any session (App Store 3.1.2): configure the SDK anonymously, without creating a
   * guest, and read the offering only. Purchase and restore use an identity bound to the session.
   */
  async anonymousOffering(config:BillingConfig):Promise<PurchasesPackage>{
    const next=this.identityWork.then(async()=>{
      if(!this.native() || !config.publicKey || !config.ready)throw new StoreError('BILLING_NOT_CONFIGURED');
      if(this.configuredKey!==config.publicKey){
        await this.mutateIdentity('configure',()=>this.configure(config.publicKey!).then(()=>{this.anonymous=true;this.identified=null;}));
      }
    });
    this.identityWork=next.catch(()=>{});await bounded('identity_queue',()=>next);
    const key=JSON.stringify(['anonymous',config.publicKey,config.offeringId,config.productId,config.policy]);
    const cached=this.packages.get(key);if(cached&&cached.until>Date.now())return cached.value;
    const value=this.loadOffering(config);
    const entry={until:Date.now()+120000,value};this.packages.set(key,entry);
    try{return await value;}catch(error){if(this.packages.get(key)===entry)this.packages.delete(key);throw error;}
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
    if (config.productId !== monthlyProductId || config.policy.monthlyPrice !== product.monthlyPrice ||
        config.policy.entitlement !== product.entitlement || config.policy.period !== product.period ||
        config.policy.currency !== product.currency) {
      console.warn('[billing] catalog configuration mismatch', {productMatches:config.productId === monthlyProductId});
      throw new StoreError('PRODUCT_MISMATCH');
    }
    for (let attempt = 1; ; attempt++) {
      try {
        const offerings = await bounded('getOfferings', () => this.sdk.getOfferings());
        const named = config.offeringId ? offerings.all[config.offeringId] : undefined;
        const choices = new Set([named, offerings.current, ...Object.values(offerings.all)]);
        const rejected = {identifier:0, period:0, price:0};
        for (const offering of choices) {
          if (!offering) continue;
          for (const selected of offering.availablePackages) {
            const issue = productIssue(selected);
            if (issue) { rejected[issue]++; continue; }
            const source = offering === named ? 'configured' : offering === offerings.current ? 'current' : 'other';
            console.info('[billing] monthly product loaded', {source, attempt});
            return selected;
          }
        }
        console.warn('[billing] monthly product missing', {
          attempt, configuredOfferingFound:!!named, currentOfferingFound:!!offerings.current,
          offeringCount:Object.keys(offerings.all).length, rejected,
        });
        throw new StoreError(Object.values(rejected).some(count=>count>0) ? 'PRODUCT_MISMATCH' : 'NO_PACKAGES');
      } catch (error) {
        const code = storeDiagnosticCode(error);
        console.warn('[billing] catalog lookup failed', {attempt, code});
        if (error instanceof OperationTimeoutError) throw new StoreError('STORE_PRODUCT_TIMEOUT');
        if (attempt === 2 || code === '11' || code === 'UNIMPLEMENTED' || code === 'UNAVAILABLE') {
          throw error instanceof StoreError ? error : new StoreError('STORE_CATALOG_UNAVAILABLE');
        }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
  }
  async purchase(config:BillingConfig,onPrice?:(price:string)=>void){
    if(this.busy)throw new Error('PURCHASE_PENDING');this.busy=true;
    const ticket=invalidateMemberReads();
    const started=performance.now();
    try{
      if(config.salesPaused)throw new Error('PRO_SALES_PAUSED');
      const binding=await sessionBinding();
      const member=await this.readEntitlement(ticket,true);
      this.purchaseUser=member.appUserId;
      if(member.plan==='pro')throw new Error('ALREADY_SUBSCRIBED');
      if(member.purchasePending && member.purchaseSource!=='app_store')throw new Error('PURCHASE_PENDING');
      if(!canResumeApplePurchase(member))throw new Error('PURCHASE_PENDING');
      if(member.syncState!=='verified')throw new Error('ENTITLEMENT_SYNC_PENDING');
      const p=await this.offering(config,member);
      assertCurrentMember(ticket);
      onPrice?.(p.product.priceString);
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
        const latest=await this.readEntitlement(ticket);
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
      assertCurrentMember(ticket);
      performance.measure?.('anzen.purchase.before-storekit',{start:started,end:performance.now()});
      try{await bounded('purchasePackage',()=>this.sdk.purchasePackage({aPackage:p}),120000);}catch(e){
        const code=String((e as {code?:string|number}).code??'');
        const outcome=code==='1'?'cancelled':code==='20'?'deferred':'unknown';
        // A userCancelled flag alone is not an SDK-confirmed cancellation.
        await this.reportOutcome(member.appUserId,{id:intent.id,attemptId,outcome});
        assertCurrentMember(ticket);
        throw new Error(outcome==='cancelled'?'STORE_CANCELLED':outcome==='deferred'?'STORE_DEFERRED':'STORE_UNKNOWN');
      }
      // SDK customerInfo is deliberately ignored for authorization.
      try{return await this.reconcile(ticket);}catch(error){if(error instanceof StaleMemberResponseError)throw error;await this.reportOutcome(member.appUserId,{id:intent.id,attemptId,outcome:'unknown'});if(error instanceof Error&&error.message==='PURCHASE_OWNED_BY_OTHER_ACCOUNT')throw error;throw new Error('STORE_UNKNOWN');}
    }finally{this.purchaseUser=null;this.busy=false;}
  }
  async cancelPrepared(){const ticket=invalidateMemberReads();const member=await this.readEntitlement(ticket);if(!member.purchasePending||member.purchaseSource!=='app_store'||member.purchaseStage!=='prepared'||!member.purchaseIntentId)throw new Error('PURCHASE_REVIEW_REQUIRED');return snapshotSchema.parse(await currentMemberResponse(ticket,this.send('/api/billing/cancel-intent',{id:member.purchaseIntentId,source:'app_store'})));}
  async restore(config:BillingConfig){
    if(this.busy)throw new Error('PURCHASE_PENDING');this.busy=true;
    const ticket=invalidateMemberReads();
    try{
      const member=await this.readEntitlement(ticket);
      this.purchaseUser=member.appUserId;
      await this.identify(config,member);
      assertCurrentMember(ticket);
      let storeConflict = false;
      try {
        await this.mutateIdentity('restorePurchases',()=>{assertCurrentMember(ticket);return this.sdk.restorePurchases();});
      } catch (error) {
        const code = String((error as {code?:unknown})?.code);
        if (!['7','13'].includes(code) || !member.appleGuestAppUserId || !await isGuestSession()) throw error;
        storeConflict = true;
      }
      assertCurrentMember(ticket);
      const reconciliation=await this.reconcile(ticket,member.appUserId).then(
        member=>({member,error:null}),
        (error:unknown)=>{
          if(!(error instanceof Error)||error.message!=='PURCHASE_OWNED_BY_OTHER_ACCOUNT')throw error;
          return {member:null,error};
        },
      );
      if(reconciliation.member?.plan==='pro')return reconciliation.member;
      // Another installation may still be RevenueCat's canonical customer after
      // restore. Send StoreKit evidence only for an anonymous session.
      const restoreTicket=memberGeneration();
      if(member.appleGuestAppUserId&&config.productId&&await isGuestSession()){
        assertCurrentMember(restoreTicket);
        const {signedTransaction}=await bounded('restorePurchases',()=>this.receipt.currentPurchase({productId:config.productId!}));
        assertCurrentMember(restoreTicket);
        if(signedTransaction){
          const response=await currentMemberResponse(restoreTicket,this.send('/api/mobile/v1/billing/restore-guest',{appUserId:member.appUserId,signedTransaction}));
          const restored=snapshotSchema.parse(response);
          if(restored.appUserId!==member.appUserId)throw new StaleMemberResponseError();
          invalidateMemberReads();this.publish(restored);
          return restored;
        }
      }
      assertCurrentMember(restoreTicket);
      if(!reconciliation.member)throw reconciliation.error;
      if(storeConflict)throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
      return reconciliation.member;
    }finally{this.purchaseUser=null;this.busy=false;}
  }
  async forget(){
    invalidateMemberReads();
    this.packages.clear();
    // A new login can start while logout runs in the background. Queue its SDK
    // identity after this logout so a late completion cannot erase the new owner.
    if(!this.anonymous)this.identified=null;
    // The SDK does not allow logging out an anonymous store user.
    const next=this.identityWork.then(async()=>{if(this.configuredKey&&!this.anonymous)await this.mutateIdentity('logOut',()=>this.sdk.logOut());});
    this.identityWork=next.catch(()=>{});return bounded('identity_queue',()=>next);
  }
}
export const billing=new BillingController();
export function isVerifiedPro(member:MemberEntitlement|null,now=Date.now()){
  return !!member && member.syncState==='verified' && member.plan==='pro' && !!member.expiresAt && Date.parse(member.expiresAt)>now && now-Date.parse(member.verifiedAt)>=-60000 && now-Date.parse(member.verifiedAt)<300000;
}
