import Stripe from 'stripe';
import type { Prisma,MobilePurchaseIntent } from '@prisma/client';
import { externalCredentialedServicesAllowed } from '../server/deployment-safety';
import { handleCheckoutCompleted } from '../stripe-webhook-handlers';
import { assertResume,canReleasePrepared } from './purchase-state';
function client(){
  if(!externalCredentialedServicesAllowed()||!process.env.STRIPE_SECRET_KEY)throw new Error('ENTITLEMENT_SYNC_PENDING');
  return new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:8000,maxNetworkRetries:0});
}
async function sessionFor(tx:Prisma.TransactionClient,intent:MobilePurchaseIntent){
  assertResume(intent,'stripe');const stripe=client();
  let session:Stripe.Checkout.Session;
  if(intent.providerSessionId)session=await stripe.checkout.sessions.retrieve(intent.providerSessionId);
  else {
    if(!intent.providerRequest)throw new Error('ENTITLEMENT_SYNC_PENDING');
    session=await stripe.checkout.sessions.create(intent.providerRequest as unknown as Stripe.Checkout.SessionCreateParams,{idempotencyKey:intent.id});
    await tx.mobilePurchaseIntent.update({where:{userId:intent.userId},data:{providerSessionId:session.id,checkoutUrl:session.url,stage:'checkout_open'}});
  }
  if(session.metadata?.userId!==intent.userId||session.metadata?.purchaseIntentId!==intent.id)throw new Error('ENTITLEMENT_SYNC_PENDING');
  return {stripe,session};
}
/** Caller holds the member advisory lock throughout provider verification/expiration. */
export async function expireStripeIntent(tx:Prisma.TransactionClient,intent:MobilePurchaseIntent){
  if(intent.status!=='pending')return;
  if(canReleasePrepared(intent,'stripe')){await tx.mobilePurchaseIntent.update({where:{userId:intent.userId},data:{status:'cancelled',stage:'cancelled'}});return;}
  const {stripe,session}=await sessionFor(tx,intent);
  if(session.status==='complete'){
    await handleCheckoutCompleted(tx,session);
    await tx.mobilePurchaseIntent.update({where:{userId:intent.userId},data:{status:'completed',stage:'completed'}});return;
  }
  const closed=session.status==='expired'?session:await stripe.checkout.sessions.expire(session.id);
  if(closed.status!=='expired')throw new Error('PURCHASE_PENDING');
  await tx.mobilePurchaseIntent.update({where:{userId:intent.userId},data:{status:'cancelled',stage:'expired',checkoutUrl:null}});
}
export async function resumeStripeIntent(tx:Prisma.TransactionClient,intent:MobilePurchaseIntent){
  const {session}=await sessionFor(tx,intent);
  if(session.status==='complete'){
    await handleCheckoutCompleted(tx,session);
    await tx.mobilePurchaseIntent.update({where:{userId:intent.userId},data:{status:'completed',stage:'completed'}});
    return {state:'completed' as const,url:null};
  }
  if(session.status==='expired'){
    await tx.mobilePurchaseIntent.update({where:{userId:intent.userId},data:{status:'cancelled',stage:'expired',checkoutUrl:null}});
    return {state:'expired' as const,url:null};
  }
  if(session.status!=='open'||!session.url)throw new Error('PURCHASE_PENDING');
  return {state:'open' as const,url:session.url};
}
