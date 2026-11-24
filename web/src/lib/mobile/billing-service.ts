import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { assertPurchasable, projectEntitlement, type EntitlementSnapshot, type EntitlementSurface, type Grant, type LegacySubscription } from './entitlement';
import { appleGrantForEnvironment,fetchSubscriber,verifiedAppleGrant,fetchAppleOwnership,verifyAppleLegacyPurchase } from './revenuecat';
import { reconcileStripe } from './stripe-reconcile';
import { isGuestUser } from './session';
import { assertResume,canReleasePrepared,appleOutcomeStage,type ApplePurchaseOutcome,type PurchaseSource } from './purchase-state';
import { expireStripeIntent } from './stripe-purchase';
import { assertProSalesOpen } from './pro-sales-gate';
import { recordOperationsAlert,resolveOperationsAlert } from './operations-alerts';
export function billingDb() { if(!prisma || process.env.MOBILE_LEDGER_ENABLED!=='true') throw new Error('ENTITLEMENT_SYNC_PENDING');return prisma; }
export async function lockMember(tx:Prisma.TransactionClient,userId:string) { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`anzen:${userId}`},0))`; }
export async function lockAppleReconciliation(tx:Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('anzen:apple-reconcile',0))`;
}
export async function lockPushDevice(tx:Prisma.TransactionClient,token:string) { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`anzen-push:${token}`},0))`; }
/**
 * The tester allowlist selects the initial reconciliation environment. Verified App Store
 * purchases can also select it. Rights are projected separately for each client surface.
 */
export function sandboxTesterEmails(env:NodeJS.ProcessEnv=process.env){return new Set((env.MOBILE_SANDBOX_TESTER_EMAILS??'').split(',').map(v=>v.trim().toLowerCase()).filter(v=>/^[^\s@]+@[^\s@]+$/.test(v)));}
async function identity(tx:Prisma.TransactionClient,userId:string) {
  const member=await tx.mobileIdentity.upsert({where:{userId},create:{userId},update:{}});
  const testers=sandboxTesterEmails();
  if(member.billingEnvironment==='SANDBOX'||!testers.size)return member;
  const production=await tx.mobileGrant.findMany({where:{userId,environment:'PRODUCTION',revoked:false,expiresAt:{gt:new Date()}}});
  if(production.some(g=>g.environment==='PRODUCTION'&&!g.revoked&&g.expiresAt>new Date()))return member;
  const user=await tx.user.findUnique({where:{id:userId},select:{email:true}});
  if(!user?.email||!testers.has(user.email.toLowerCase()))return member;
  return tx.mobileIdentity.update({where:{userId},data:{billingEnvironment:'SANDBOX'}});
}
function projectMemberEntitlement(
  member:{appUserId:string;billingEnvironment?:string},legacy:LegacySubscription|null,grants:Grant[],surface:EntitlementSurface,now=new Date(),
):EntitlementSnapshot {
  const stripeGrants=grants.filter(g=>g.provider==='stripe');
  const activeGrants=stripeGrants.filter(g=>!g.revoked && g.expiresAt>now);
  const bound=activeGrants.filter(g=>g.originalTransactionId && g.originalTransactionId===legacy?.stripeSubscriptionId);
  // Older RevenueCat rows can be keyed by Stripe item ID. A different subscription ID
  // is never evidence for the contract currently bound to this member.
  const candidates=bound.length?bound:activeGrants.filter(g=>!g.originalTransactionId?.startsWith('sub_'));
  const activeStripe=(environment:BillingEnvironment)=>candidates.some(g=>g.environment===environment);
  const productionStripe=activeStripe('PRODUCTION');
  const sandboxStripe=activeStripe('SANDBOX');
  const ambiguous=productionStripe && sandboxStripe;
  const productionLegacy=(!sandboxStripe && productionStripe) ||
    (member.billingEnvironment!=='SANDBOX' && !stripeGrants.some(g=>g.environment==='SANDBOX')) ? legacy : null;
  let production=projectEntitlement(member.appUserId,productionLegacy,grants,now);
  if(production.source==='stripe' && !productionStripe){
    const independentApple=projectEntitlement(member.appUserId,null,grants,now);
    production={...independentApple,canManageStripe:production.canManageStripe,
      syncState:independentApple.plan==='pro'?'verified':'pending'};
  }
  if(ambiguous && production.plan==='free')production.syncState='pending';
  if(surface==='web' || production.plan==='pro' && production.syncState==='verified')return production;
  const sandboxLegacy=sandboxStripe && !ambiguous ? legacy : null;
  const sandbox=projectEntitlement(member.appUserId,sandboxLegacy,grants,now,'SANDBOX');
  if(sandbox.plan==='pro')return {...sandbox,sandbox:true};
  if(sandbox.syncState==='pending')return {...production,syncState:'pending',sandbox:true};
  return production;
}

export async function entitlementInTransaction(tx:Prisma.TransactionClient,userId:string,surface:EntitlementSurface='web'):Promise<EntitlementSnapshot> {
  const member=await identity(tx,userId);
  const [legacy,grants,intent]=await Promise.all([tx.subscription.findUnique({where:{userId}}),tx.mobileGrant.findMany({where:{userId}}),tx.mobilePurchaseIntent.findUnique({where:{userId}})]);
  const rights=projectMemberEntitlement(member,legacy,grants,surface);
  const pending=intent?.status==='pending';
  return {...rights,appleGuestAppUserId:member.appleGuestAppUserId??undefined,purchasePending:pending,purchaseIntentId:pending?intent.id:null,purchaseSource:pending?intent.source:null,purchaseStage:pending?intent.stage:null};
}
/** Each invocation reads afresh: even an in-flight read may predate a completed purchase/revocation. */
export async function getEntitlement(userId:string,options:{refresh?:boolean;snapshot?:boolean;surface?:EntitlementSurface}={}) {
  return readEntitlement(userId,!!options.refresh,!!options.snapshot,options.surface??'web');
}
async function readEntitlement(userId:string,refresh:boolean,snapshot:boolean,surface:EntitlementSurface) {
  const db=billingDb();const now=Date.now();
  // Display and reservation read the same projection under the same member lock.
  // Reading grants before a pending billing transaction commits can show stale Pro.
  if(snapshot&&!refresh)return db.$transaction(async tx=>{
    await lockMember(tx,userId);
    const rights=await entitlementInTransaction(tx,userId,surface);
    if(rights.plan==='free'&&rights.purchasePending&&rights.purchaseSource==='app_store')rights.syncState='pending';
    return rights;
  });
  const [member,legacy,grants,intent]=await Promise.all([db.$transaction(tx=>identity(tx,userId)),db.subscription.findUnique({where:{userId}}),db.mobileGrant.findMany({where:{userId}}),db.mobilePurchaseIntent.findUnique({where:{userId}})]);
  let refreshFailed=false;let refreshed=false;
  const currentGrants=grants.filter(g=>g.environment==='PRODUCTION' || surface==='app' && g.environment==='SANDBOX' &&
    (member.billingEnvironment==='SANDBOX' || !g.revoked && (g.expiresAt.getTime()>now || !!member.appleGuestAppUserId)));
  // Commit each provider independently: an Apple outage must not roll back a Stripe renewal.
  if(legacy?.stripeSubscriptionId && (refresh||now-legacy.updatedAt.getTime()>300000||!currentGrants.some(g=>g.provider==='stripe')||currentGrants.some(g=>g.provider==='stripe'&&now-g.checkedAt.getTime()>300000))){
    refreshed=true;
    try{await db.$transaction(async tx=>{await lockMember(tx,userId);await identity(tx,userId);await reconcileStripe(tx,userId);},{timeout:30000});}catch{refreshFailed=true;}
  }
  // Historical grants in another environment cannot make every GET refresh forever.
  // Include expired Apple grants and an interrupted first Apple purchase for renewal recovery.
  if((refresh&&!!process.env.REVENUECAT_IOS_PRODUCT_ID)||currentGrants.some(g=>g.provider==='app_store'&&now-g.checkedAt.getTime()>300000)||(intent?.status==='pending'&&intent.source==='app_store'&&!currentGrants.some(g=>g.provider==='app_store'))){
    refreshed=true;
    try{await reconcile(userId,{stripe:false,surface});}catch{refreshFailed=true;}
  }
  // Re-read after provider mutations only. Ordinary reads project the fresh database rows above.
  const rights=refreshed?await db.$transaction(tx=>entitlementInTransaction(tx,userId,surface)):{
    ...projectMemberEntitlement(member,legacy,grants,surface),
    appleGuestAppUserId:member.appleGuestAppUserId??undefined,
    purchasePending:intent?.status==='pending',purchaseIntentId:intent?.status==='pending'?intent.id:null,
    purchaseSource:intent?.status==='pending'?intent.source:null,purchaseStage:intent?.status==='pending'?intent.stage:null,
  };
  if(refreshFailed&&rights.plan==='free')rights.syncState='pending';
  return rights;
}
type AppleOwnership = Awaited<ReturnType<typeof fetchAppleOwnership>>;
type AppleGrant = NonNullable<ReturnType<typeof verifiedAppleGrant>>;
type BillingEnvironment = 'PRODUCTION' | 'SANDBOX';

/** Find the durable grant and positively match any historical transaction keys. */
export async function findAppleLedgerEntries(tx:Prisma.TransactionClient,userId:string,environment:BillingEnvironment,grant:AppleGrant,verified:AppleOwnership,checkedAt:Date) {
  const purchase={provider:'app_store',originalTransactionId:verified.key,environment};
  const where={provider_originalTransactionId_environment:purchase};
  const originalMember=await tx.mobileIdentity.findUnique({where:{appUserId:verified.originalCustomerId}})
    ?? (verified.originalCustomerId.startsWith('$RCAnonymousID:')
      ? await tx.mobileIdentity.findUnique({where:{appleGuestAppUserId:verified.originalCustomerId}})
      : null);
  const owner=await tx.mobileGrant.findUnique({where});
  const previousUsers=[...new Set([userId,...(originalMember?[originalMember.userId]:[])])];
  const candidates=await tx.mobileGrant.findMany({
    where:{provider:purchase.provider,environment,productId:grant.productId,revoked:false,expiresAt:{gt:checkedAt},
      NOT:{originalTransactionId:{startsWith:'rc:'}},OR:[{userId:{in:previousUsers}},{originalTransactionId:verified.storeTransactionId}]},
  });
  const legacy=[];
  for(const row of candidates){
    if(await verifyAppleLegacyPurchase(verified.customerId,environment,verified.key,row.originalTransactionId))legacy.push(row);
  }
  return {purchase,where,owner,originalMember,legacy};
}

export async function recordAppleGrant(tx:Prisma.TransactionClient,entries:Awaited<ReturnType<typeof findAppleLedgerEntries>>,userId:string,grant:AppleGrant,checkedAt:Date) {
  for(const row of entries.legacy){
    await tx.mobileGrant.updateMany({where:{id:row.id,provider:entries.purchase.provider,environment:entries.purchase.environment},data:{revoked:true,checkedAt}});
  }
  await tx.mobileGrant.upsert({where:entries.where,
    create:{...grant,...entries.purchase,userId,checkedAt},update:{...grant,userId,checkedAt,revoked:false}});
}

export async function reconcile(userId:string,options:{stripe?:boolean;appUserId?:string;surface?:EntitlementSurface}={}) {
  const result=await billingDb().$transaction(async tx=>{
    await lockMember(tx,userId);const member=await identity(tx,userId);
    // Serialize Apple verification and ownership changes, including legacy-key
    // migration. Never lock the old member in reverse order (A/B login race).
    await lockAppleReconciliation(tx);
    let transfer:{reason:string;from:string[];to:string[]}|undefined;
    // A delayed native SDK operation must not reconcile under a replacement login.
    if(options.appUserId&&options.appUserId!==member.appUserId)throw new Error('UNAUTHORIZED');
    const previousEnvironment=member.billingEnvironment==='SANDBOX'?'SANDBOX':'PRODUCTION';
    const productId=process.env.REVENUECAT_IOS_PRODUCT_ID;
    if(!productId) throw new Error('ENTITLEMENT_SYNC_PENDING');
    const alias=member.appleGuestAppUserId;
    const ids=alias?[member.appUserId,alias]:[member.appUserId];
    const subscribers=await Promise.all(ids.map(async appUserId=>({appUserId,raw:await fetchSubscriber(appUserId)})));
    const grantsFor=async(env:BillingEnvironment,checkHidden:boolean)=>{
      const candidates=await Promise.all(subscribers.map(async({appUserId,raw})=>{
        if(checkHidden){
          const evidence=await appleGrantForEnvironment(appUserId,raw,productId,env,ids);
          return evidence && {appUserId,...evidence};
        }
        const grant=verifiedAppleGrant(raw,productId,new Date(),env);
        return grant && {appUserId,grant,ownership:null};
      }));
      return candidates.filter(candidate=>candidate!==null);
    };
    // A verified production receipt takes priority, including for a former TestFlight member.
    const production=await grantsFor('PRODUCTION',true);
    const checkSandbox=!production.length || (await tx.mobileGrant.findMany({
      where:{userId,provider:'app_store',environment:'SANDBOX',revoked:false,expiresAt:{gt:new Date()}},take:1,select:{id:true},
    })).length>0;
    const sandbox=await grantsFor('SANDBOX',checkSandbox);
    const environment=production.length?'PRODUCTION':sandbox.length?'SANDBOX':previousEnvironment;
    if(environment!==previousEnvironment){
      // Keep a website subscription in production while reconciling an Apple test purchase.
      // The previous Apple grant can have been revoked since the last local snapshot.
      const keepStripe=environment==='SANDBOX' && (await entitlementInTransaction(tx,userId)).source==='stripe';
      if(!keepStripe)await tx.mobileIdentity.update({where:{userId},data:{billingEnvironment:environment}});
    }
    if(options.stripe!==false)await reconcileStripe(tx,userId);
    const checkedAt=new Date();
    for(const storeEnvironment of ['PRODUCTION','SANDBOX'] as const){
      const grants=storeEnvironment==='PRODUCTION'?production:sandbox;
      const onlyCurrent=storeEnvironment!==environment && !grants.length;
      const checkingMergedSandbox=storeEnvironment==='SANDBOX' && options.surface==='app' && !!alias;
      await tx.mobileGrant.updateMany({
        where:{userId,provider:'app_store',environment:storeEnvironment,
          ...(onlyCurrent ? {revoked:false} : {}),
          ...(onlyCurrent && !checkingMergedSandbox ? {expiresAt:{gt:checkedAt}} : {}),
        },
        data:{revoked:true,checkedAt},
      });
      const verifiedGrants=await Promise.all(grants.map(async ({appUserId,grant,ownership})=>({
        verified:ownership??await fetchAppleOwnership(appUserId,storeEnvironment,fetch,ids),grant,
      })));
      if(!verifiedGrants.length)continue;
      const guest=!!alias&&await isGuestUser(userId,tx);
      const recorded=new Set<string>();
      for(const {verified,grant} of verifiedGrants){
        if(recorded.has(verified.key))continue;
        const entries=await findAppleLedgerEntries(tx,userId,storeEnvironment,grant,verified,checkedAt);
        const {owner,originalMember,legacy}=entries;
        const previousOwner=owner??legacy.find(row=>row.userId!==userId);
        const moved=previousOwner?previousOwner.userId!==userId:!ids.includes(verified.originalCustomerId);
        // Guest-to-guest restoration requires Apple-signed evidence. A member's
        // linked alias may only refresh the rights already attributed to it.
        if((guest||verified.customerId===alias)
          && (moved||legacy.some(row=>row.userId!==userId)))throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
        if(moved){
          const providers=async(id:string|undefined)=>{if(!id)return ['unknown'];const rows=await tx.account.findMany({where:{userId:id},select:{provider:true}});const result=[...new Set(rows.map(r=>r.provider==='apple'?'apple':r.provider==='google'?'google':'other'))].sort();return result.length?result:['unknown'];};
          transfer={reason:'APP_STORE_VERIFIED_TRANSFER',from:await providers(previousOwner?.userId??originalMember?.userId),to:await providers(userId)};
        }
        await recordAppleGrant(tx,entries,userId,grant,checkedAt);
        recorded.add(verified.key);
      }
    }
    if(production.length || sandbox.length){
      const intent=await tx.mobilePurchaseIntent.findUnique({where:{userId}});
      if(environment==='PRODUCTION' && intent?.status==='pending'&&intent.source==='stripe')await expireStripeIntent(tx,intent);
      await tx.mobilePurchaseIntent.updateMany({where:{userId,source:'app_store',status:'pending'},data:{status:'completed',stage:'completed'}});
    }
    return {rights:await entitlementInTransaction(tx,userId,options.surface),transfer};
  },{timeout:20000});
  // Fixed reason/provider codes only, after commit. No user/store identifiers,
  // email addresses, receipts, tokens, or provider error text.
  if(result.transfer)console.warn('[mobile-billing]',JSON.stringify(result.transfer));
  return result.rights;
}
export async function reservePurchase(userId:string,source:PurchaseSource='app_store') {
  // Refresh Apple before reserving. Website rights are always read from the database.
  await reconcile(userId);
  await assertProSalesOpen();
  return billingDb().$transaction(async tx=>{
    await lockMember(tx,userId);const current=await entitlementInTransaction(tx,userId,source==='app_store'?'app':'web');assertPurchasable(current);
    return reserveInTransaction(tx,userId,source,current);
  });
}
async function reserveInTransaction(tx:Prisma.TransactionClient,userId:string,source:PurchaseSource,current:EntitlementSnapshot){
    const existing=await tx.mobilePurchaseIntent.findUnique({where:{userId}});
    if(existing?.status==='pending'){
      assertResume(existing,source);
      if(source==='app_store'&&existing.stage!=='prepared'){
        const previous=existing.providerRequest&&typeof existing.providerRequest==='object'&&!Array.isArray(existing.providerRequest)?existing.providerRequest:{};
        await tx.mobilePurchaseIntent.updateMany({where:{userId,id:existing.id,status:'pending',stage:existing.stage},
          data:{providerRequest:{...previous,source:'server_reconciliation',checkedAt:new Date().toISOString(),appUserId:current.appUserId,plan:current.plan,syncState:current.syncState}}});
      }
      return existing;
    }
    // Never unlock a potentially pending StoreKit transaction simply because time passed.
    return tx.mobilePurchaseIntent.upsert({where:{userId},create:{userId,source},update:{id:crypto.randomUUID(),source,stage:'prepared',providerSessionId:null,checkoutUrl:null,providerRequest:Prisma.DbNull,status:'pending',createdAt:new Date()}});
}
/** One authoritative refresh and one locked transaction before opening StoreKit. */
export async function prepareApplePurchase(userId:string,appUserId:string,attemptId:string){
  try{await reconcile(userId);}catch(error){
    if(error instanceof Error&&['ENTITLEMENT_SYNC_PENDING','PURCHASE_OWNED_BY_OTHER_ACCOUNT'].includes(error.message))throw error;
    throw new Error('BILLING_RECONCILE_UNAVAILABLE');
  }
  await assertProSalesOpen();
  return billingDb().$transaction(async tx=>{
    await lockMember(tx,userId);
    const current=await entitlementInTransaction(tx,userId,'app');
    if(current.appUserId!==appUserId)throw new Error('ENTITLEMENT_SYNC_PENDING');
    assertPurchasable(current);
    const intent=await reserveInTransaction(tx,userId,'app_store',current);
    const previous=intent.providerRequest&&typeof intent.providerRequest==='object'&&!Array.isArray(intent.providerRequest)?intent.providerRequest:{};
    const changed=await tx.mobilePurchaseIntent.updateMany({where:{userId,id:intent.id,source:'app_store',status:'pending',stage:intent.stage},data:{stage:'store_started',providerRequest:{...previous,attemptId}}});
    if(changed.count!==1)throw new Error('INVALID_REQUEST');
    return {id:intent.id,appUserId:current.appUserId,attemptId};
  });
}
export async function cancelPurchase(userId:string,id:string,source:PurchaseSource,surface:EntitlementSurface='web'){
  return billingDb().$transaction(async tx=>{await lockMember(tx,userId);
    const intent=await tx.mobilePurchaseIntent.findUnique({where:{userId}});
    if(!intent||intent.id!==id||intent.source!==source)throw new Error('INVALID_REQUEST');
    if(source==='stripe')await expireStripeIntent(tx,intent);
    else if(canReleasePrepared(intent,source))await tx.mobilePurchaseIntent.updateMany({where:{userId,id,status:'pending',stage:'prepared'},data:{status:'cancelled',stage:'cancelled'}});
    else throw new Error('PURCHASE_PENDING');
    return entitlementInTransaction(tx,userId,surface);});
}
export async function markStoreStarted(userId:string,id:string,attemptId?:string){
  await reconcile(userId);
  await assertProSalesOpen();
  return billingDb().$transaction(async tx=>{await lockMember(tx,userId);const rights=await entitlementInTransaction(tx,userId,'app');assertPurchasable(rights);
    const intent=await tx.mobilePurchaseIntent.findUnique({where:{userId}});
    if(!intent||intent.id!==id)throw new Error('INVALID_REQUEST');
    assertResume(intent,'app_store');
    const previous=intent.providerRequest&&typeof intent.providerRequest==='object'&&!Array.isArray(intent.providerRequest)?intent.providerRequest:{};
    const changed=await tx.mobilePurchaseIntent.updateMany({where:{userId,id,source:'app_store',status:'pending',stage:intent.stage},data:{stage:'store_started',providerRequest:{...previous,attemptId:attemptId??null}}});
    if(changed.count!==1)throw new Error('INVALID_REQUEST');return {id};});
}
/** Client outcomes describe the UI only. They never release a dispatched reservation. */
export async function reportAppleOutcome(userId:string,id:string|undefined,outcome:ApplePurchaseOutcome,attemptId?:string,surface:EntitlementSurface='web'){
  return billingDb().$transaction(async tx=>{await lockMember(tx,userId);
    const intent=await tx.mobilePurchaseIntent.findUnique({where:{userId}});
    if(!id && (outcome!=='not_opened'||!attemptId))throw new Error('INVALID_REQUEST');
    if(!intent || intent.source!=='app_store'){
      if(!id)return entitlementInTransaction(tx,userId,surface);
      throw new Error('INVALID_REQUEST');
    }
    if(id && intent.id!==id)throw new Error('INVALID_REQUEST');
    const evidence=intent.providerRequest;
    const expected=evidence&&typeof evidence==='object'&&!Array.isArray(evidence)?evidence.attemptId:null;
    if(!id && expected!==attemptId)return entitlementInTransaction(tx,userId,surface);
    // An outcome retried after a network loss must not overwrite a newer StoreKit attempt.
    if(expected&&expected!==attemptId)return entitlementInTransaction(tx,userId,surface);
    if(intent.status==='pending'&&intent.stage!=='prepared'){
      // Deferred approval cannot be downgraded by a later cancellation/unknown claim.
      const stage=intent.stage==='store_deferred'?'store_deferred':appleOutcomeStage[outcome];
      await tx.mobilePurchaseIntent.updateMany({where:{userId,id:intent.id,status:'pending'},data:{stage}});
    }
    return entitlementInTransaction(tx,userId,surface);
  });
}
export async function processBillingEvents(limit=20,deadline=Date.now()+45000) {
  const db=billingDb();const events=await db.mobileBillingEvent.findMany({where:{status:'pending',nextAttempt:{lte:new Date()}},take:limit,orderBy:{receivedAt:'asc'}});
  for(const event of events) {
    if(Date.now()>deadline)break;
    try {
      const ids=[...new Set([event.appUserId,...(Array.isArray(event.relatedAppUserIds)?event.relatedAppUserIds.filter((id):id is string=>typeof id==='string'):[])].filter((id):id is string=>!!id))];
      const members=await db.mobileIdentity.findMany({where:{OR:[{appUserId:{in:ids}},{appleGuestAppUserId:{in:ids}}]}});
      if(!members.length) {await db.mobileBillingEvent.update({where:{id:event.id},data:{status:'unassigned'}});continue;}
      // Read each side's current provider ownership; never use webhook order to
      // move a subscription back to its historical original customer.
      for(const member of members)await reconcile(member.userId);
      await db.mobileBillingEvent.update({where:{id:event.id},data:{status:'completed'}});
      await resolveOperationsAlert('billing_reconcile',event.id);
    }catch{
      const attempts=event.attempts+1;
      await db.mobileBillingEvent.update({where:{id:event.id},data:{attempts,status:'pending',nextAttempt:new Date(Date.now()+Math.min(3600000,2**Math.min(attempts,10)*10000))}});
      await recordOperationsAlert('billing_reconcile',event.id);
    }
  }
  return {processed:events.length};
}
