import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { headers } from 'next/headers';
import type { Prisma } from '@prisma/client';
import { billingDb, lockMember } from './billing-service';
import { APP_REVIEW_USER_ID, appReviewConfig } from '../app-review';
export const digest = (value:string) => createHash('sha256').update(value).digest('hex');
export async function mobileAuthSession() {
  const authorization=(await headers()).get('authorization');
  if(!authorization?.startsWith('Bearer ')) return null;
  const token=authorization.slice(7);
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const db=billingDb();
  const session=await db.mobileSession.findUnique({where:{tokenHash:digest(token)}});
  if(!session || session.expiresAt<=new Date()) return null;
  // Disabling or expiring the App Review login also ends the reviewer's native sessions.
  if(session.userId===APP_REVIEW_USER_ID && !appReviewConfig()) return null;
  const user=await db.user.findUnique({where:{id:session.userId},select:{id:true,name:true,email:true,image:true,_count:{select:{accounts:true}}}});
  if(!user) return null;
  const {_count,...identity}=user;
  return {user:{...identity,guest:guestProfile(user.id,user.email,_count?.accounts)},expires:session.expiresAt.toISOString()};
}
/**
 * App Store purchases do not require registration (App Review 5.1.1(v)). A guest is an
 * app-only member created without personal information: no email and no linked sign-in.
 */
export const GUEST_SESSION_DAYS=365;
function guestProfile(id:string,email:string|null,accounts:number|undefined){return id!==APP_REVIEW_USER_ID && !email && (accounts??0)===0;}
export async function isGuestUser(userId:string,db:Pick<Prisma.TransactionClient,'user'>=billingDb()){
  const user=await db.user.findUnique({where:{id:userId},select:{id:true,email:true,_count:{select:{accounts:true}}}});
  return !!user && guestProfile(user.id,user.email,user._count.accounts);
}
export async function createGuestSession(){
  const token=randomBytes(32).toString('base64url');
  await billingDb().$transaction(async tx=>{
    const user=await tx.user.create({data:{},select:{id:true}});
    await tx.mobileSession.create({data:{tokenHash:digest(token),userId:user.id,expiresAt:new Date(Date.now()+GUEST_SESSION_DAYS*86400000)}});
  });
  return {token,guest:true as const};
}
/**
 * Signing in on a device that bought as a guest keeps the purchase with the person.
 * Without an existing store identity on the signed-in member, the guest's identity, grants and
 * purchase intent move over. Otherwise the guest keeps its store identity; restoring purchases
 * lets RevenueCat transfer the receipt and reconcile() records the verified transfer.
 */
async function mergeGuest(tx:Prisma.TransactionClient,guestToken:string,targetUserId:string){
  if(!/^[A-Za-z0-9_-]{43}$/.test(guestToken)) return false;
  const session=await tx.mobileSession.findUnique({where:{tokenHash:digest(guestToken)}});
  if(!session || session.expiresAt<=new Date() || session.userId===targetUserId) return false;
  const guestId=session.userId;
  // Stable order: purchase/reconcile take the same per-member locks one member at a time.
  for(const id of [guestId,targetUserId].sort()) await lockMember(tx,id);
  if(!await isGuestUser(guestId,tx)) return false;
  const deletion=await tx.mobileAccountDeletion.findUnique({where:{userId:guestId}});
  if(deletion && deletion.status!=='prepared') return false;
  const now=new Date();
  const [guestIdentity,targetIdentity,guestGrants]=await Promise.all([
    tx.mobileIdentity.findUnique({where:{userId:guestId}}),
    tx.mobileIdentity.findUnique({where:{userId:targetUserId}}),
    tx.mobileGrant.findMany({where:{userId:guestId}}),
  ]);
  // Per-person app data follows the member. Today's AI usage stays counted.
  await tx.mobileUsageOperation.updateMany({where:{userId:guestId},data:{userId:targetUserId}});
  if(await tx.mobileWeatherLocation.count({where:{userId:targetUserId}})===0) await tx.mobileWeatherLocation.updateMany({where:{userId:guestId},data:{userId:targetUserId}});
  else await tx.mobileWeatherLocation.deleteMany({where:{userId:guestId}});
  await tx.examAttempt.updateMany({where:{userId:guestId},data:{userId:targetUserId}});
  await tx.sdsSearch.updateMany({where:{userId:guestId},data:{userId:targetUserId}});
  // Push registrations are bound to the guest session being retired; the app registers again.
  const devices=await tx.mobilePushDevice.findMany({where:{userId:guestId},select:{id:true}});
  await tx.mobilePushOutbox.deleteMany({where:{deviceId:{in:devices.map(d=>d.id)}}});
  await tx.mobilePushDevice.deleteMany({where:{userId:guestId}});
  await tx.mobileSession.deleteMany({where:{userId:guestId}});
  let restoreRecommended=false;
  if(guestIdentity && !targetIdentity){
    await tx.mobileIdentity.update({where:{userId:guestId},data:{userId:targetUserId}});
    await tx.mobileGrant.updateMany({where:{userId:guestId},data:{userId:targetUserId}});
    const [guestIntent,targetIntent]=await Promise.all([tx.mobilePurchaseIntent.findUnique({where:{userId:guestId}}),tx.mobilePurchaseIntent.findUnique({where:{userId:targetUserId}})]);
    if(guestIntent && (!targetIntent || guestIntent.status==='pending'&&targetIntent.status!=='pending')){
      if(targetIntent) await tx.mobilePurchaseIntent.delete({where:{userId:targetUserId}});
      await tx.mobilePurchaseIntent.update({where:{userId:guestId},data:{userId:targetUserId}});
    }else if(guestIntent) await tx.mobilePurchaseIntent.delete({where:{userId:guestId}});
  }else if(guestIdentity && guestGrants.some(g=>!g.revoked&&g.expiresAt>now)){
    restoreRecommended=true;
  }else if(guestIdentity && !guestGrants.length){
    await tx.mobilePurchaseIntent.deleteMany({where:{userId:guestId}});
    await tx.mobileIdentity.delete({where:{userId:guestId}});
  }
  // Delete the guest only when no purchase record still points at it.
  const [identityLeft,grantsLeft,intentLeft]=await Promise.all([tx.mobileIdentity.count({where:{userId:guestId}}),tx.mobileGrant.count({where:{userId:guestId}}),tx.mobilePurchaseIntent.count({where:{userId:guestId}})]);
  if(!identityLeft && !grantsLeft && !intentLeft){
    await tx.mobileAccountDeletion.deleteMany({where:{userId:guestId}});
    await tx.user.delete({where:{id:guestId}}); // Account, Session and Subscription cascade.
  }
  return restoreRecommended;
}
export async function startFlow(challenge:string) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(challenge)) throw new Error('INVALID_REQUEST');
  return billingDb().mobileAuthFlow.create({data:{challenge,expiresAt:new Date(Date.now()+10*60000)}});
}
export async function authorizeFlow(id:string,userId:string,authenticatedAt?:Date) {
  const flow=await billingDb().mobileAuthFlow.findUnique({where:{id}});
  if(!flow || !authenticatedAt || !Number.isFinite(authenticatedAt.getTime()) || authenticatedAt<flow.createdAt || Date.now()-authenticatedAt.getTime()>300000)throw new Error('REAUTH_REQUIRED');
  const code=randomBytes(32).toString('base64url');
  const result=await billingDb().mobileAuthFlow.updateMany({where:{id,expiresAt:{gt:new Date()},consumedAt:null,codeHash:null},data:{userId,codeHash:digest(code),authenticatedAt}});
  if(result.count!==1) throw new Error('AUTH_FLOW_EXPIRED');
  return code;
}
export async function exchangeFlow(id:string,code:string,verifier:string,guestToken?:string) {
  if(!/^[A-Za-z0-9_-]{43,128}$/.test(verifier) || !/^[A-Za-z0-9_-]{43}$/.test(code)) throw new Error('AUTH_FLOW_EXPIRED');
  return billingDb().$transaction(async tx=>{
    const flow=await tx.mobileAuthFlow.findUnique({where:{id}});
    const actual=createHash('sha256').update(verifier).digest('base64url');
    if(!flow?.userId || !flow.authenticatedAt || flow.consumedAt || flow.expiresAt<=new Date() || flow.codeHash!==digest(code) || flow.challenge.length!==actual.length || !timingSafeEqual(Buffer.from(flow.challenge),Buffer.from(actual))) throw new Error('AUTH_FLOW_EXPIRED');
    const taken=await tx.mobileAuthFlow.updateMany({where:{id,consumedAt:null},data:{consumedAt:new Date()}});
    if(taken.count!==1) throw new Error('AUTH_FLOW_EXPIRED');
    const token=randomBytes(32).toString('base64url');
    await tx.mobileSession.create({data:{tokenHash:digest(token),userId:flow.userId,expiresAt:new Date(Date.now()+30*86400000)}});
    const restoreRecommended=guestToken ? await mergeGuest(tx,guestToken,flow.userId) : false;
    return restoreRecommended ? {token,restoreRecommended:true} : {token};
  },{timeout:20000});
}
