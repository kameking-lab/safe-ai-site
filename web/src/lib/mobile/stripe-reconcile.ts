import Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
import { externalCredentialedServicesAllowed } from '../server/deployment-safety';
import { handleSubscriptionUpdated } from '../stripe-webhook-handlers';
import { importStripePurchase,verifyStripeOwnership } from './revenuecat';
/** RevenueCat の Stripe 連携（Stripe 購読を RevenueCat の顧客にも載せる）が設定済みか。 */
export function revenueCatStripeLinked(env:NodeJS.ProcessEnv=process.env){return !!(env.REVENUECAT_STRIPE_PUBLIC_API_KEY&&env.REVENUECAT_STRIPE_V2_PRODUCT_ID&&env.REVENUECAT_V2_SECRET_API_KEY&&env.REVENUECAT_PROJECT_ID);}
/**
 * Purchases must refresh a known website subscription, not rely on a delayed JWT/webhook.
 * The Stripe API read below is the authority. RevenueCat's Stripe link is optional: without it the
 * grant is keyed by the Stripe subscription ID itself (one subscription = one owner), and the app
 * still sees Pro because it authorizes from this server, never from the SDK's customerInfo.
 */
export async function reconcileStripe(tx:Prisma.TransactionClient,userId:string){
  const legacy=await tx.subscription.findUnique({where:{userId}});if(!legacy?.stripeSubscriptionId)return;
  const key=process.env.STRIPE_SECRET_KEY;
  if(!externalCredentialedServicesAllowed() || !key)throw new Error('ENTITLEMENT_SYNC_PENDING');
  const stripe=new Stripe(key,{timeout:8000,maxNetworkRetries:0});
  const subscription=await stripe.subscriptions.retrieve(legacy.stripeSubscriptionId);
  if(subscription.metadata.userId && subscription.metadata.userId!==userId)throw new Error('ENTITLEMENT_SYNC_PENDING');
  await handleSubscriptionUpdated(tx,subscription);
  const identity=await tx.mobileIdentity.findUnique({where:{userId}});if(!identity)throw new Error('ENTITLEMENT_SYNC_PENDING');
  // Stripe's authenticated response, rather than a past TestFlight purchase, selects its environment.
  const environment=subscription.livemode?'PRODUCTION':'SANDBOX';
  if(!subscription.livemode&&identity.billingEnvironment!=='SANDBOX')throw new Error('ENTITLEMENT_SYNC_PENDING');
  if(subscription.livemode&&identity.billingEnvironment==='SANDBOX')await tx.mobileIdentity.update({where:{userId},data:{billingEnvironment:'PRODUCTION'}});
  await tx.mobileGrant.updateMany({where:{userId,provider:'stripe',environment},data:{revoked:true,checkedAt:new Date()}});
  const linked=revenueCatStripeLinked();
  if(linked)await importStripePurchase(identity.appUserId,subscription.id);
  if(legacy.billingHold||!['active','trialing'].includes(subscription.status))return;
  const originalTransactionId=linked?await verifyStripeOwnership(identity.appUserId,environment,[subscription.id,...subscription.items.data.map(item=>item.id)]):subscription.id;
  const owner=await tx.mobileGrant.findUnique({where:{provider_originalTransactionId_environment:{provider:'stripe',originalTransactionId,environment}}});
  if(owner&&owner.userId!==userId)throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
  const end=subscription.items.data[0]?.current_period_end;if(!end)throw new Error('ENTITLEMENT_SYNC_PENDING');
  const data={productId:subscription.items.data[0].price.id,expiresAt:new Date(end*1000),checkedAt:new Date(),revoked:false};
  await tx.mobileGrant.upsert({where:{provider_originalTransactionId_environment:{provider:'stripe',originalTransactionId,environment}},create:{userId,provider:'stripe',originalTransactionId,environment,...data},update:data});
}
