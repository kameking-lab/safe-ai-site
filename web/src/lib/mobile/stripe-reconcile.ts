import Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
import { externalCredentialedServicesAllowed } from '../server/deployment-safety';
import { handleSubscriptionUpdated } from '../stripe-webhook-handlers';
import { importStripePurchase,verifyStripeOwnership } from './revenuecat';
/** Purchase starts must refresh a known website subscription, not rely on a delayed JWT/webhook. */
export async function reconcileStripe(tx:Prisma.TransactionClient,userId:string){
  const legacy=await tx.subscription.findUnique({where:{userId}});if(!legacy?.stripeSubscriptionId)return;
  const key=process.env.STRIPE_SECRET_KEY;
  if(!externalCredentialedServicesAllowed() || !key)throw new Error('ENTITLEMENT_SYNC_PENDING');
  const stripe=new Stripe(key,{timeout:8000,maxNetworkRetries:0});
  const subscription=await stripe.subscriptions.retrieve(legacy.stripeSubscriptionId);
  if(subscription.metadata.userId && subscription.metadata.userId!==userId)throw new Error('ENTITLEMENT_SYNC_PENDING');
  await handleSubscriptionUpdated(tx,subscription);
  const identity=await tx.mobileIdentity.findUnique({where:{userId}});if(!identity)throw new Error('ENTITLEMENT_SYNC_PENDING');
  const environment=identity.billingEnvironment==='SANDBOX'?'SANDBOX':'PRODUCTION';
  if(subscription.livemode!==(environment==='PRODUCTION'))throw new Error('ENTITLEMENT_SYNC_PENDING');
  await tx.mobileGrant.updateMany({where:{userId,provider:'stripe',environment},data:{revoked:true,checkedAt:new Date()}});
  await importStripePurchase(identity.appUserId,subscription.id);
  if(legacy.billingHold||!['active','trialing'].includes(subscription.status))return;
  const originalTransactionId=await verifyStripeOwnership(identity.appUserId,environment,[subscription.id,...subscription.items.data.map(item=>item.id)]);
  const owner=await tx.mobileGrant.findUnique({where:{provider_originalTransactionId_environment:{provider:'stripe',originalTransactionId,environment}}});
  if(owner&&owner.userId!==userId)throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
  const end=subscription.items.data[0]?.current_period_end;if(!end)throw new Error('ENTITLEMENT_SYNC_PENDING');
  const data={productId:subscription.items.data[0].price.id,expiresAt:new Date(end*1000),checkedAt:new Date(),revoked:false};
  await tx.mobileGrant.upsert({where:{provider_originalTransactionId_environment:{provider:'stripe',originalTransactionId,environment}},create:{userId,provider:'stripe',originalTransactionId,environment,...data},update:data});
}
