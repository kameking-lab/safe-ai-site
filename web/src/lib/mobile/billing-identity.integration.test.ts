// @vitest-environment node
import {PrismaClient} from '@prisma/client';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({db:null as PrismaClient|null,userId:'current',checkout:vi.fn(),create:vi.fn()}));
vi.mock('@/lib/prisma',()=>({get prisma(){return state.db;}}));
vi.mock('@/auth',()=>({auth:async()=>({user:{id:state.userId}})}));
vi.mock('./revenuecat',()=>({
  fetchSubscriber:async(appUserId:string)=>({grant:await state.db!.mobileGrant.findFirst({where:{userId:appUserId.replace('fixture-member-',''),provider:'app_store',revoked:false}})}),
  verifiedAppleGrant:(raw:{grant:null|{productId:string;expiresAt:Date;environment:string}},_p:string,_n:Date,environment:string)=>raw.grant?.environment===environment?{productId:raw.grant.productId,expiresAt:raw.grant.expiresAt}:null,
  fetchAppleOwnership:async(appUserId:string)=>({key:`fixture-${appUserId.replace('fixture-member-','')}`,originalCustomerId:appUserId}),verifyAppleLegacyPurchase:async()=>true,
}));
vi.mock('./stripe-reconcile',()=>({reconcileStripe:async()=>{}}));
vi.mock('./pro-sales-gate',()=>({assertProSalesOpen:async()=>{},lockProSalesOpen:async()=>{},PRO_SALES_PAUSED_MESSAGE:''}));
vi.mock('@/lib/stripe-price-policy',()=>({isPaidModeReady:()=>true,resolveStripePlan:()=> 'pro'}));
vi.mock('stripe',()=>({default:class{customers={create:state.create};checkout={sessions:{create:state.checkout}};}}));

describe.skipIf(process.env.ANZEN_BILLING_INTEGRATION!=='1')('purchase routes with disposable PostgreSQL',()=>{
  let db:PrismaClient;
  const expiry=()=>new Date(Date.now()+86400000);
  beforeAll(()=>{
    const port=process.env.ANZEN_DUP_BILLING_TEST_PORT==='55437'?'55437':'55447';
    db=new PrismaClient({datasourceUrl:`postgresql://postgres@127.0.0.1:${port}/postgres?schema=dpa1_billing`});state.db=db;
    vi.stubEnv('MOBILE_LEDGER_ENABLED','true');vi.stubEnv('REVENUECAT_IOS_PRODUCT_ID','fixture-product');
    vi.stubEnv('STRIPE_SECRET_KEY','synthetic-test-only');vi.stubEnv('STRIPE_ANZEN_PRO_MONTHLY_PRICE_ID','price_fixture');
  });
  beforeEach(async()=>{
    state.userId='current';vi.clearAllMocks();state.create.mockResolvedValue({id:'cus_fixture'});
    state.checkout.mockImplementation(async(p:{metadata:unknown})=>({id:'cs_fixture',url:'https://checkout.stripe.com/fixture',status:'open',metadata:p.metadata}));
    await db.mobileGrant.deleteMany();await db.mobilePurchaseIntent.deleteMany();await db.mobileIdentity.deleteMany();await db.account.deleteMany();await db.subscription.deleteMany();await db.user.deleteMany();
    await db.user.create({data:{id:'current',email:' OWNER@Example.test ',emailVerified:new Date(),accounts:{create:{provider:'apple',providerAccountId:'current',type:'oauth'}}}});
    await db.user.create({data:{id:'other',email:'owner@example.test',accounts:{create:{provider:'google',providerAccountId:'other',type:'oauth'}}}});
    for(const id of ['current','other'])await db.mobileIdentity.create({data:{userId:id,appUserId:`fixture-member-${id}`}});
  });
  afterAll(async()=>{await db?.$disconnect();state.db=null;vi.unstubAllEnvs();vi.restoreAllMocks();});
  const apple=async(atomic=true)=>{
    const {POST}=await import('@/app/api/billing/purchase-intents/route');
    return POST(new Request('http://localhost/api/billing/purchase-intents',{method:'POST',headers:{origin:'http://localhost'},body:JSON.stringify(atomic?{appUserId:'fixture-member-current',attemptId:crypto.randomUUID()}: {})}));
  };
  const stripe=async()=>{
    const {POST}=await import('@/app/api/stripe/checkout/route');
    return POST(new Request('http://localhost/api/stripe/checkout',{method:'POST',headers:{'content-type':'application/json'},body:'{"plan":"pro","priceId":"price_fixture"}'}));
  };
  const paid=async(provider:string,userId='other')=>{
    if(provider==='stripe'){
      await db.subscription.create({data:{userId,planName:'pro',status:'active',stripeSubscriptionId:`fixture-${userId}`,currentPeriodEnd:expiry()}});
      await db.mobileGrant.create({data:{userId,provider:'stripe',originalTransactionId:`fixture-stripe-${userId}`,productId:'price_fixture',environment:'PRODUCTION',expiresAt:expiry(),checkedAt:new Date()}});
    }
    else await db.mobileGrant.create({data:{userId,provider:'app_store',originalTransactionId:`fixture-${userId}`,productId:'fixture-product',environment:'PRODUCTION',expiresAt:expiry(),checkedAt:new Date()}});
  };
  it.each(['stripe','app_store'])('blocks reservations, StoreKit preparation, and Checkout for a paid %s peer',async provider=>{
    await paid(provider);
    for(const request of [()=>apple(false),()=>apple(),stripe]){
      const res=await request();expect(res.status).toBe(409);
      expect(await res.json()).toEqual({error:{code:'DUPLICATE_SUBSCRIPTION_GOOGLE',message:'このメールアドレスの別のアカウント（Google）で購入済みです。そちらでログインしてください。'}});
    }
    expect(await db.mobilePurchaseIntent.count()).toBe(0);expect(state.checkout).not.toHaveBeenCalled();expect(state.create).not.toHaveBeenCalled();
  });
  it('allows unmatched emails and rechecks before the compatibility StoreKit endpoint',async()=>{
    await db.user.update({where:{id:'other'},data:{email:'different@example.test'}});await paid('stripe');
    const reservation=await apple(false);expect(reservation.status).toBe(200);const {id}=await reservation.json();
    await db.user.update({where:{id:'other'},data:{email:'owner@example.test'}});
    const {POST}=await import('@/app/api/billing/store-started/route');
    const started=await POST(new Request('http://localhost/api/billing/store-started',{method:'POST',headers:{origin:'http://localhost'},body:JSON.stringify({id})}));
    expect(started.status).toBe(409);expect((await db.mobilePurchaseIntent.findUnique({where:{userId:'current'}}))?.stage).toBe('prepared');
  });
  it('normalizes old rows with tabs and fullwidth boundary spaces',async()=>{
    await db.user.update({where:{id:'other'},data:{email:'\t owner@EXAMPLE.test\u3000'}});await paid('stripe');
    expect((await apple()).status).toBe(409);
  });
  it.each(['expired','revoked','sandbox'])('ignores another account’s %s App Store grant',async condition=>{
    await paid('app_store');await db.mobileGrant.updateMany({where:{userId:'other'},data:condition==='expired'?{expiresAt:new Date(Date.now()-1)}:condition==='revoked'?{revoked:true}:{environment:'SANDBOX'}});
    expect((await apple()).status).toBe(200);
  });
  it('allows a normal Stripe Checkout when email does not match',async()=>{
    await db.user.update({where:{id:'other'},data:{email:'different@example.test'}});await paid('app_store');
    expect((await stripe()).status).toBe(200);expect(state.checkout).toHaveBeenCalledOnce();
  });
  it.each(['stripe','app_store'])('keeps the own-account %s paid rejection ahead of peer matching',async provider=>{
    await paid(provider,'current');await paid('stripe');
    for(const request of [apple,stripe]){const res=await request();expect(res.status).toBe(409);expect(await res.json()).toMatchObject({error:{code:'ALREADY_SUBSCRIBED'}});}
  });
  it('ignores private relay and preserves anonymous purchase without login',async()=>{
    await paid('stripe');await db.user.update({where:{id:'current'},data:{email:' HIDDEN@privaterelay.appleid.com '}});
    await db.user.update({where:{id:'other'},data:{email:'hidden@privaterelay.appleid.com'}});
    expect((await apple()).status).toBe(200);
    await db.mobilePurchaseIntent.deleteMany();await db.account.deleteMany({where:{userId:'current'}});
    await db.user.update({where:{id:'current'},data:{email:null,emailVerified:null}});
    expect((await apple()).status).toBe(200);
  });
  it('protects the legacy Stripe path while the shared ledger is off',async()=>{
    vi.stubEnv('MOBILE_LEDGER_ENABLED','false');try{await paid('app_store');expect((await stripe()).status).toBe(409);expect(state.checkout).not.toHaveBeenCalled();}finally{vi.stubEnv('MOBILE_LEDGER_ENABLED','true');}
  });
  it('logs only the fixed reason for same-email active contracts across stores',async()=>{
    await paid('stripe');await paid('app_store','current');
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    const {warnDuplicateSubscriptions}=await import('./billing-identity');await warnDuplicateSubscriptions(db,'current');
    expect(warn).toHaveBeenCalledExactlyOnceWith('[mobile-billing]','DUPLICATE_EMAIL_STRIPE_APP_STORE');warn.mockRestore();
  });
});
