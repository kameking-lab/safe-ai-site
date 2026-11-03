import Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
import { externalCredentialedServicesAllowed } from '../server/deployment-safety';
import { handleSubscriptionUpdated } from '../stripe-webhook-handlers';
/** Purchase starts must refresh a known website subscription, not rely on a delayed JWT/webhook. */
export async function reconcileStripe(tx:Prisma.TransactionClient,userId:string){
  const legacy=await tx.subscription.findUnique({where:{userId}});if(!legacy?.stripeSubscriptionId)return;
  const key=process.env.STRIPE_SECRET_KEY;
  if(!externalCredentialedServicesAllowed() || !key)throw new Error('ENTITLEMENT_SYNC_PENDING');
  const stripe=new Stripe(key,{timeout:8000,maxNetworkRetries:0});
  const subscription=await stripe.subscriptions.retrieve(legacy.stripeSubscriptionId);
  if(subscription.metadata.userId && subscription.metadata.userId!==userId)throw new Error('ENTITLEMENT_SYNC_PENDING');
  await handleSubscriptionUpdated(tx,subscription);
}
