import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { assertPurchasable, projectEntitlement, type EntitlementSnapshot } from './entitlement';
import { fetchSubscriber, verifiedAppleGrant,fetchAppleOwnership } from './revenuecat';
import { reconcileStripe } from './stripe-reconcile';
import { assertResume,canReleasePrepared,appleOutcomeStage,type ApplePurchaseOutcome,type PurchaseSource } from './purchase-state';
import { expireStripeIntent } from './stripe-purchase';
export function billingDb() { if(!prisma || process.env.MOBILE_LEDGER_ENABLED!=='true') throw new Error('ENTITLEMENT_SYNC_PENDING');return prisma; }
export async function lockMember(tx:Prisma.TransactionClient,userId:string) { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`anzen:${userId}`},0))`; }
export async function lockPushDevice(tx:Prisma.TransactionClient,token:string) { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`anzen-push:${token}`},0))`; }
/**
 * TestFlight / App Review buy in Apple's sandbox. Sandbox rights never reach ordinary production
 * members; only the App Review account and the owner-listed TestFlight testers
 * (MOBILE_SANDBOX_TESTER_EMAILS, comma separated, exact address match) are SANDBOX members.
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
export async function entitlementInTransaction(tx:Prisma.TransactionClient,userId:string):Promise<EntitlementSnapshot> {
  const member=await identity(tx,userId);
  const [legacy,grants,intent]=await Promise.all([tx.subscription.findUnique({where:{userId}}),tx.mobileGrant.findMany({where:{userId}}),tx.mobilePurchaseIntent.findUnique({where:{userId}})]);
  const rights=projectEntitlement(member.appUserId,legacy,grants,new Date(),member.billingEnvironment==='SANDBOX'?'SANDBOX':'PRODUCTION');
  if(rights.source==='stripe'&&!grants.some(g=>g.provider==='stripe'&&!g.revoked&&g.expiresAt>new Date()&&g.environment===(member.billingEnvironment==='SANDBOX'?'SANDBOX':'PRODUCTION')))rights.syncState='pending';
  const pending=intent?.status==='pending';
  return {...rights,purchasePending:pending,purchaseIntentId:pending?intent.id:null,purchaseSource:pending?intent.source:null,purchaseStage:pending?intent.stage:null};
}
export async function getEntitlement(userId:string) {
  const db=billingDb();const now=Date.now();
  const [legacy,grants,intent]=await Promise.all([db.subscription.findUnique({where:{userId}}),db.mobileGrant.findMany({where:{userId}}),db.mobilePurchaseIntent.findUnique({where:{userId}})]);
  let refreshFailed=false;
  // Expired grants and a purchase interrupted before its first grant still need authoritative recovery.
  if(grants.some(g=>now-g.checkedAt.getTime()>300000)||(intent?.status==='pending'&&!grants.length)){try{return await reconcile(userId);}catch{refreshFailed=true;/* bounded previously verified fallback below */}}
  else if(legacy?.stripeSubscriptionId && (now-legacy.updatedAt.getTime()>300000||!grants.some(g=>g.provider==='stripe'))){
    try{return await db.$transaction(async tx=>{await lockMember(tx,userId);await identity(tx,userId);await reconcileStripe(tx,userId);return entitlementInTransaction(tx,userId);},{timeout:30000});}catch{/* unknown rights never become an offer to repurchase */}
  }
  const rights=await db.$transaction(tx=>entitlementInTransaction(tx,userId));
  if(refreshFailed&&rights.plan==='free')rights.syncState='pending';
  return rights;
}
export async function reconcile(userId:string) {
  return billingDb().$transaction(async tx=>{
    await lockMember(tx,userId);let member=await identity(tx,userId);
    let environment:'SANDBOX'|'PRODUCTION'=member.billingEnvironment==='SANDBOX'?'SANDBOX':'PRODUCTION';
    const productId=process.env.REVENUECAT_IOS_PRODUCT_ID;
    if(!productId) throw new Error('ENTITLEMENT_SYNC_PENDING');
    const raw=await fetchSubscriber(member.appUserId);
    // A verified production receipt takes priority, including for a former TestFlight member.
    const production=verifiedAppleGrant(raw,productId,new Date(),'PRODUCTION');
    if(production&&environment==='SANDBOX'){
      member=await tx.mobileIdentity.update({where:{userId},data:{billingEnvironment:'PRODUCTION'}});environment='PRODUCTION';
    }
    let grant=production??verifiedAppleGrant(raw,productId,new Date(),environment);
    // App Review and TestFlight testers who are not on the tester list also buy in Apple's sandbox.
    // An App Store build can never make a sandbox purchase, so a verified sandbox subscription on this
    // member's own app user ID moves a member without production rights to SANDBOX.
    if(!grant&&environment==='PRODUCTION'){
      const sandbox=verifiedAppleGrant(raw,productId,new Date(),'SANDBOX');
      if(sandbox&&(await entitlementInTransaction(tx,userId)).plan==='free'){
        member=await tx.mobileIdentity.update({where:{userId},data:{billingEnvironment:'SANDBOX'}});environment='SANDBOX';grant=sandbox;
      }
    }
    await reconcileStripe(tx,userId);
    const checkedAt=new Date();
    // Fetch the latest authoritative subscriber state, rather than applying event order.
    await tx.mobileGrant.updateMany({where:{userId,provider:'app_store',environment},data:{revoked:true,checkedAt}});
    if(grant) {
      const originalTransactionId=await fetchAppleOwnership(member.appUserId,environment);
      const owner=await tx.mobileGrant.findUnique({where:{provider_originalTransactionId_environment:{provider:'app_store',originalTransactionId,environment}}});
      if(owner && owner.userId!==userId) throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
      await tx.mobileGrant.upsert({where:{provider_originalTransactionId_environment:{provider:'app_store',originalTransactionId,environment}},
        create:{...grant,originalTransactionId,userId,provider:'app_store',environment,checkedAt},update:{...grant,checkedAt,revoked:false}});
      const intent=await tx.mobilePurchaseIntent.findUnique({where:{userId}});
      if(intent?.status==='pending'&&intent.source==='stripe')await expireStripeIntent(tx,intent);
      await tx.mobilePurchaseIntent.updateMany({where:{userId,source:'app_store',status:'pending'},data:{status:'completed',stage:'completed'}});
    }
    return entitlementInTransaction(tx,userId);
  },{timeout:20000});
}
export async function reservePurchase(userId:string,source:PurchaseSource='app_store') {
  // Refresh Apple before reserving. Website rights are always read from the database.
  await reconcile(userId);
  return billingDb().$transaction(async tx=>{
    await lockMember(tx,userId);const current=await entitlementInTransaction(tx,userId);assertPurchasable(current);
    const existing=await tx.mobilePurchaseIntent.findUnique({where:{userId}});
    if(existing?.status==='pending'){assertResume(existing,source);return existing;}
    // Never unlock a potentially pending StoreKit transaction simply because time passed.
    return tx.mobilePurchaseIntent.upsert({where:{userId},create:{userId,source},update:{id:crypto.randomUUID(),source,stage:'prepared',providerSessionId:null,checkoutUrl:null,providerRequest:Prisma.DbNull,status:'pending',createdAt:new Date()}});
  });
}
export async function cancelPurchase(userId:string,id:string,source:PurchaseSource){
  return billingDb().$transaction(async tx=>{await lockMember(tx,userId);
    const intent=await tx.mobilePurchaseIntent.findUnique({where:{userId}});
    if(!intent||intent.id!==id||intent.source!==source)throw new Error('INVALID_REQUEST');
    if(source==='stripe')await expireStripeIntent(tx,intent);
    else if(canReleasePrepared(intent,source))await tx.mobilePurchaseIntent.updateMany({where:{userId,id,status:'pending',stage:'prepared'},data:{status:'cancelled',stage:'cancelled'}});
    else throw new Error('PURCHASE_PENDING');
    return entitlementInTransaction(tx,userId);});
}
export async function markStoreStarted(userId:string,id:string){
  return billingDb().$transaction(async tx=>{await lockMember(tx,userId);const rights=await entitlementInTransaction(tx,userId);assertPurchasable(rights);
    const changed=await tx.mobilePurchaseIntent.updateMany({where:{userId,id,source:'app_store',status:'pending',stage:'prepared'},data:{stage:'store_started'}});
    if(changed.count!==1)throw new Error('INVALID_REQUEST');return {id};});
}
/** Client outcomes describe the UI only. They never release a dispatched reservation. */
export async function reportAppleOutcome(userId:string,id:string,outcome:ApplePurchaseOutcome){
  return billingDb().$transaction(async tx=>{await lockMember(tx,userId);
    const intent=await tx.mobilePurchaseIntent.findUnique({where:{userId}});
    if(!intent||intent.id!==id||intent.source!=='app_store')throw new Error('INVALID_REQUEST');
    if(intent.status==='pending'&&intent.stage!=='prepared'){
      // Deferred approval cannot be downgraded by a later cancellation/unknown claim.
      const stage=intent.stage==='store_deferred'?'store_deferred':appleOutcomeStage[outcome];
      await tx.mobilePurchaseIntent.updateMany({where:{userId,id,status:'pending'},data:{stage}});
    }
    return entitlementInTransaction(tx,userId);
  });
}
export async function processBillingEvents(limit=20,deadline=Date.now()+45000) {
  const db=billingDb();const events=await db.mobileBillingEvent.findMany({where:{status:'pending',nextAttempt:{lte:new Date()}},take:limit,orderBy:{receivedAt:'asc'}});
  for(const event of events) {
    if(Date.now()>deadline)break;
    try {
      const ids=[...new Set([event.appUserId,...(Array.isArray(event.relatedAppUserIds)?event.relatedAppUserIds.filter((id):id is string=>typeof id==='string'):[])].filter((id):id is string=>!!id))];
      const members=await db.mobileIdentity.findMany({where:{appUserId:{in:ids}}});
      if(!members.length) {await db.mobileBillingEvent.update({where:{id:event.id},data:{status:'unassigned'}});continue;}
      // Reconcile both sides without merging accounts or silently moving purchase ownership.
      for(const member of members)await reconcile(member.userId);
      await db.mobileBillingEvent.update({where:{id:event.id},data:{status:'completed'}});
    }catch{
      const attempts=event.attempts+1;
      await db.mobileBillingEvent.update({where:{id:event.id},data:{attempts,status:attempts>=10?'failed':'pending',nextAttempt:new Date(Date.now()+Math.min(3600000,2**attempts*10000))}});
    }
  }
  return {processed:events.length};
}
