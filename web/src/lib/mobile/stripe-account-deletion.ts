import Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
import { externalCredentialedServicesAllowed } from '../server/deployment-safety';
import { expireStripeIntent } from './stripe-purchase';

/** Do not erase the local subscription mapping until Stripe confirms that renewal is off. */
export async function stopDeletedAccountRenewal(tx:Prisma.TransactionClient,userId:string){
  const intent=await tx.mobilePurchaseIntent.findUnique({where:{userId}});
  // Close in-flight Checkout before listing subscriptions (it may already have completed).
  if(intent?.status==='pending'&&intent.source==='stripe')await expireStripeIntent(tx,intent);
  const saved=await tx.subscription.findUnique({where:{userId}});
  if(!saved?.stripeSubscriptionId&&!saved?.stripeCustomerId)return;
  if(!externalCredentialedServicesAllowed()||!process.env.STRIPE_SECRET_KEY)throw new Error('DELETION_PENDING');
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:5000,maxNetworkRetries:0});
  const subscriptions=new Map<string,Stripe.Subscription>();
  if(saved.stripeCustomerId){
    const page=await stripe.subscriptions.list({customer:saved.stripeCustomerId,status:'all',limit:100});
    if(page.has_more)throw new Error('DELETION_PENDING');
    for(const subscription of page.data)subscriptions.set(subscription.id,subscription);
  }
  if(saved.stripeSubscriptionId&&!subscriptions.has(saved.stripeSubscriptionId)){
    const subscription=await stripe.subscriptions.retrieve(saved.stripeSubscriptionId);
    subscriptions.set(subscription.id,subscription);
  }
  for(const subscription of subscriptions.values()){
    const customer=typeof subscription.customer==='string'?subscription.customer:subscription.customer.id;
    if((saved.stripeCustomerId&&customer!==saved.stripeCustomerId)||(subscription.metadata.userId&&subscription.metadata.userId!==userId))throw new Error('DELETION_PENDING');
    if(['canceled','incomplete_expired'].includes(subscription.status))continue;
    if(subscription.schedule){
      const schedule=typeof subscription.schedule==='string'?subscription.schedule:subscription.schedule.id;
      await stripe.subscriptionSchedules.release(schedule);
    }
    const confirmed=await stripe.subscriptions.update(subscription.id,{cancel_at_period_end:true},{idempotencyKey:`delete-renewal:${userId}:${subscription.id}`});
    if(!confirmed.cancel_at_period_end)throw new Error('DELETION_PENDING');
  }
}
