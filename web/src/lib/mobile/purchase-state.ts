export type PurchaseSource='app_store'|'stripe';
export type PurchaseState={id:string;status:string;source:string;stage:string;providerSessionId:string|null;createdAt:Date};
/** A negative subscriber lookup does not prove Ask to Buy or an open checkout was cancelled. */
export function canReleasePrepared(intent:PurchaseState,source:PurchaseSource){
  return intent.status==='pending'&&intent.source===source&&intent.stage==='prepared'&&!intent.providerSessionId;
}
export function assertResume(intent:PurchaseState,source:PurchaseSource){
  if(intent.source!==source)throw new Error('PURCHASE_PENDING');
  // Stripe may evict idempotency keys after 24h. Never recreate an ambiguous old checkout.
  if(source==='stripe' && intent.stage==='creating' && Date.now()-intent.createdAt.getTime()>23*3600000)throw new Error('PURCHASE_REVIEW_REQUIRED');
}
