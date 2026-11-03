import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { headers } from 'next/headers';
import { billingDb } from './billing-service';
export const digest = (value:string) => createHash('sha256').update(value).digest('hex');
export async function mobileAuthSession() {
  const authorization=(await headers()).get('authorization');
  if(!authorization?.startsWith('Bearer ')) return null;
  const token=authorization.slice(7);
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const db=billingDb();
  const session=await db.mobileSession.findUnique({where:{tokenHash:digest(token)}});
  if(!session || session.expiresAt<=new Date()) return null;
  const user=await db.user.findUnique({where:{id:session.userId},select:{id:true,name:true,email:true,image:true}});
  return user ? {user,expires:session.expiresAt.toISOString()}:null;
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
export async function exchangeFlow(id:string,code:string,verifier:string) {
  if(!/^[A-Za-z0-9_-]{43,128}$/.test(verifier) || !/^[A-Za-z0-9_-]{43}$/.test(code)) throw new Error('AUTH_FLOW_EXPIRED');
  return billingDb().$transaction(async tx=>{
    const flow=await tx.mobileAuthFlow.findUnique({where:{id}});
    const actual=createHash('sha256').update(verifier).digest('base64url');
    if(!flow?.userId || !flow.authenticatedAt || flow.consumedAt || flow.expiresAt<=new Date() || flow.codeHash!==digest(code) || flow.challenge.length!==actual.length || !timingSafeEqual(Buffer.from(flow.challenge),Buffer.from(actual))) throw new Error('AUTH_FLOW_EXPIRED');
    const taken=await tx.mobileAuthFlow.updateMany({where:{id,consumedAt:null},data:{consumedAt:new Date()}});
    if(taken.count!==1) throw new Error('AUTH_FLOW_EXPIRED');
    const token=randomBytes(32).toString('base64url');
    await tx.mobileSession.create({data:{tokenHash:digest(token),userId:flow.userId,expiresAt:new Date(Date.now()+30*86400000)}});
    return {token};
  });
}
