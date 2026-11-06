import { z } from 'zod';
import { billingDb,lockMember,reconcile,entitlementInTransaction } from './billing-service';
export const appleReviewSchema=z.object({
  userId:z.string().min(1).max(200),intentId:z.string().uuid(),appUserId:z.string().min(16).max(200),
  environment:z.enum(['PRODUCTION','SANDBOX']),productId:z.string().min(1).max(200),
  checkedAt:z.string().datetime(),evidenceSource:z.enum(['apple_support','storekit_test_session']),
  evidenceReference:z.string().min(8).max(200),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/),
  resolution:z.enum(['cancelled','failed_before_transaction']),originalAppleAccountConfirmed:z.literal(true),
  pendingTransactionsClosed:z.literal(true),activeSubscriptionAbsent:z.literal(true),
});
export type AppleReview=z.infer<typeof appleReviewSchema>;
/** Only the authenticated operator route may call this, after independent store investigation. */
export async function releaseReviewedApplePurchase(input:AppleReview,reviewerId:string){
  const evidence=appleReviewSchema.parse(input);const checked=Date.parse(evidence.checkedAt);
  if(!reviewerId||checked>Date.now()||Date.now()-checked>900000||evidence.productId!==process.env.REVENUECAT_IOS_PRODUCT_ID||
    (evidence.environment==='PRODUCTION'&&evidence.evidenceSource!=='apple_support'))throw new Error('PURCHASE_REVIEW_REQUIRED');
  // A negative subscriber result alone cannot release Ask to Buy. Independent closure evidence above is mandatory.
  await reconcile(evidence.userId);
  return billingDb().$transaction(async tx=>{
    await lockMember(tx,evidence.userId);
    const [identity,intent,rights]=await Promise.all([tx.mobileIdentity.findUnique({where:{userId:evidence.userId}}),tx.mobilePurchaseIntent.findUnique({where:{userId:evidence.userId}}),entitlementInTransaction(tx,evidence.userId)]);
    if(!identity||identity.appUserId!==evidence.appUserId||identity.billingEnvironment!==evidence.environment||!intent||intent.id!==evidence.intentId||
      intent.source!=='app_store'||intent.status!=='pending'||intent.createdAt.getTime()>checked||rights.plan!=='free'||rights.syncState!=='verified')throw new Error('PURCHASE_REVIEW_REQUIRED');
    const changed=await tx.mobilePurchaseIntent.updateMany({where:{userId:evidence.userId,id:evidence.intentId,source:'app_store',status:'pending'},data:{status:'cancelled',stage:'store_closed_verified',providerRequest:{reviewerId,...evidence}}});
    if(changed.count!==1)throw new Error('PURCHASE_REVIEW_REQUIRED');
    return entitlementInTransaction(tx,evidence.userId);
  });
}
