import { randomBytes,timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { billingDb,lockMember } from './billing-service';
import { digest } from './session';
import { externalCredentialedServicesAllowed } from '../server/deployment-safety';
import { stopDeletedAccountRenewal } from './stripe-account-deletion';
import { recordOperationsAlert,resolveOperationsAlert } from './operations-alerts';

const token=()=>randomBytes(32).toString('base64url');
const validToken=(value:string)=>/^[A-Za-z0-9_-]{43}$/.test(value);
function matches(value:string,hash:string){return validToken(value)&&timingSafeEqual(Buffer.from(digest(value)),Buffer.from(hash));}
async function recentSession(request:Request,userId:string){
  const credential=request.headers.get('authorization')?.replace(/^Bearer /,'')??'';
  if(!validToken(credential))throw new Error('REAUTH_REQUIRED');
  const hash=digest(credential);const session=await billingDb().mobileSession.findUnique({where:{tokenHash:hash}});
  if(!session||session.userId!==userId||session.expiresAt<=new Date()||Date.now()-session.createdAt.getTime()>300000)throw new Error('REAUTH_REQUIRED');
  return hash;
}
export async function prepareAccountDeletion(request:Request,userId:string){
  const sessionHash=await recentSession(request,userId);const confirmation=token(),receipt=token();
  const record=await billingDb().$transaction(async tx=>{
    await lockMember(tx,userId);
    const apple=await tx.account.findFirst({where:{userId,provider:'apple'}});
    if(apple&&!apple.refresh_token&&!apple.access_token)throw new Error('REAUTH_REQUIRED');
    const previous=await tx.mobileAccountDeletion.findUnique({where:{userId}});
    if(previous?.status==='pending')throw new Error('DELETION_PENDING');
    const data={confirmationHash:digest(confirmation),receiptHash:digest(receipt),sessionHash,expiresAt:new Date(Date.now()+600000),status:'prepared',auditRetainUntil:new Date(Date.now()+7*365.25*86400000)};
    return tx.mobileAccountDeletion.upsert({where:{userId},create:{userId,...data},update:data});
  });
  return {id:record.id,confirmation,receipt,expiresAt:record.expiresAt.toISOString(),subject:userId};
}
export async function confirmAccountDeletion(request:Request,userId:string,id:string,confirmation:string){
  const sessionHash=await recentSession(request,userId);
  await billingDb().$transaction(async tx=>{
    await lockMember(tx,userId);const record=await tx.mobileAccountDeletion.findUnique({where:{id}});
    if(!record||record.userId!==userId||record.sessionHash!==sessionHash||record.expiresAt<=new Date()||record.status!=='prepared'||!matches(confirmation,record.confirmationHash))throw new Error('INVALID_REQUEST');
    const devices=await tx.mobilePushDevice.findMany({where:{userId},select:{id:true}});
    await tx.mobilePushOutbox.deleteMany({where:{deviceId:{in:devices.map(d=>d.id)}}});
    await tx.mobilePushDevice.deleteMany({where:{userId}});
    await tx.mobileSession.deleteMany({where:{userId}});await tx.session.deleteMany({where:{userId}});
    await tx.mobileAuthFlow.deleteMany({where:{userId}});
    await tx.mobileAccountDeletion.update({where:{id},data:{status:'pending'}});
  });
  // A temporary provider failure leaves a durable job, not a misleading success message.
  try{await processAccountDeletion(id);}catch{/* Retried by authenticated maintenance. No credentials/input are logged. */}
  return deletionStatusById(id);
}
async function revokeApple(account:{refresh_token:string|null;access_token:string|null}){
  const refresh=account.refresh_token;const value=refresh??account.access_token;
  if(!value||!externalCredentialedServicesAllowed()||!process.env.AUTH_APPLE_ID||!process.env.AUTH_APPLE_SECRET)throw new Error('DELETION_PENDING');
  const response=await fetch('https://appleid.apple.com/auth/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.AUTH_APPLE_ID,client_secret:process.env.AUTH_APPLE_SECRET,token:value,token_type_hint:refresh?'refresh_token':'access_token'}),signal:AbortSignal.timeout(8000),redirect:'error'});
  if(!response.ok)throw new Error('DELETION_PENDING');
}
export async function processAccountDeletion(id:string){
  try { await billingDb().$transaction(async tx=>{
    const job=await tx.mobileAccountDeletion.findUnique({where:{id}});if(!job?.userId||job.status!=='pending')return;
    const userId=job.userId;await lockMember(tx,userId);
    const current=await tx.mobileAccountDeletion.findUnique({where:{id}});if(current?.status!=='pending')return;
    await stopDeletedAccountRenewal(tx,userId);
    const accounts=await tx.account.findMany({where:{userId,provider:'apple'}});
    for(const account of accounts)await revokeApple(account);
    const identity=await tx.mobileIdentity.findUnique({where:{userId}});
    if(identity)await tx.mobileBillingEvent.deleteMany({where:{OR:[{appUserId:identity.appUserId},{relatedAppUserIds:{array_contains:[identity.appUserId]}}]}});
    // Personal app data is removed. Purchase ownership remains pseudonymous for fraud/audit checks.
    await tx.mobileGrant.updateMany({where:{userId},data:{userId:job.auditSubject,revoked:true}});
    await tx.mobileUsageOperation.deleteMany({where:{userId}});
    await tx.mobileWeatherLocation.deleteMany({where:{userId}});
    await tx.mobilePurchaseIntent.deleteMany({where:{userId}});
    await tx.mobileIdentity.deleteMany({where:{userId}});
    await tx.examAttempt.deleteMany({where:{userId}});await tx.sdsSearch.deleteMany({where:{userId}});
    await tx.safetyMembership.deleteMany({where:{userId}});
    // Shared organization records survive with anonymized actor/owner references.
    // Derive the complete field list from the checked-in Prisma schema so new *UserId fields are covered.
    for(const model of Prisma.dmmf.datamodel.models){
      const fields=model.fields.filter(f=>f.type==='String'&&(f.name.endsWith('UserId')||f.name==='resolvedBy'));
      if(!fields.length)continue;
      const delegate=(tx as unknown as Record<string,{updateMany(args:{where:Record<string,string>;data:Record<string,string>}):Promise<unknown>}>)[model.name[0].toLowerCase()+model.name.slice(1)];
      for(const field of fields)await delegate.updateMany({where:{[field.name]:userId},data:{[field.name]:job.auditSubject}});
    }
    await tx.user.delete({where:{id:userId}}); // Account, Session and Subscription cascade.
    await tx.mobileAccountDeletion.update({where:{id},data:{userId:null,confirmationHash:'',sessionHash:'',status:'completed',completedAt:new Date()}});
  },{timeout:30000});
  } catch(error) { await recordOperationsAlert('account_deletion',id);throw error; }
  await resolveOperationsAlert('account_deletion',id);
}
async function deletionStatusById(id:string){const job=await billingDb().mobileAccountDeletion.findUnique({where:{id}});return {status:job?.status==='completed'?'completed':job?.status==='prepared'?'prepared':'pending',completedAt:job?.completedAt?.toISOString()??null};}
export async function accountDeletionStatus(receipt:string){
  if(!validToken(receipt))throw new Error('INVALID_REQUEST');
  const job=await billingDb().mobileAccountDeletion.findUnique({where:{receiptHash:digest(receipt)}});
  if(!job)throw new Error('INVALID_REQUEST');return deletionStatusById(job.id);
}
export async function processAccountDeletions(deadline=Date.now()+20000){
  const db=billingDb();const jobs=await db.mobileAccountDeletion.findMany({where:{status:'pending'},take:5,orderBy:{requestedAt:'asc'}});
  for(const job of jobs){if(Date.now()>deadline-10000)break;try{await processAccountDeletion(job.id);}catch{/* Remains pending; retry later. */}}
  const expired=await db.mobileAccountDeletion.findMany({where:{status:'completed',auditRetainUntil:{lt:new Date()}}});
  for(const job of expired){await db.mobileGrant.deleteMany({where:{userId:job.auditSubject}});await db.mobileAccountDeletion.delete({where:{id:job.id}});}
  return {checked:jobs.length};
}
