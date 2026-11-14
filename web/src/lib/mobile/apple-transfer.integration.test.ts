// @vitest-environment node
import {createServer,type Server} from 'node:http';
import {once} from 'node:events';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {PrismaClient} from '@prisma/client';

// Opt-in: a disposable, local-only PostgreSQL schema. No .env or live credentials.
// Start PostgreSQL on 127.0.0.1:55437, apply prisma/schema.prisma, then run:
// ANZEN_BILLING_INTEGRATION=1 npx vitest run src/lib/mobile/apple-transfer.integration.test.ts
const fixture=await vi.hoisted(async()=>{
 const {AsyncLocalStorage}=await import('node:async_hooks');
 return {headers:new AsyncLocalStorage<Headers>(),db:null as PrismaClient|null};
});
vi.mock('next/headers',()=>({headers:async()=>fixture.headers.getStore()??new Headers()}));
vi.mock('@/lib/prisma',()=>({get prisma(){return fixture.db;}}));
vi.mock('@/auth',async()=>({auth:async()=>{const {mobileAuthSession}=await import('./session');return mobileAuthSession();}}));

const run=process.env.ANZEN_BILLING_INTEGRATION==='1';
describe.skipIf(!run)('HTTP reconcile with real PostgreSQL and a RevenueCat HTTP fixture',()=>{
 let db:PrismaClient;let api:Server;let upstream:Server;let address:string;let rcAddress:string;
 let current='fixture-member-a';let valid=true;let outage=false;let storeId='renewal-2';let wrongOwner=false;let legacyUnknown=false;
 const actualFetch=globalThis.fetch;
 const logs:string[]=[];
 const expiry=()=>new Date(Date.now()+86400000);
 const subscription=()=>({id:'subscription-stable',customer_id:current,original_customer_id:'fixture-member-a',product_id:'rc-product',store:'app_store',environment:'sandbox',gives_access:valid,store_subscription_identifier:storeId});
 const listen=async(server:Server)=>{server.listen(0,'127.0.0.1');await once(server,'listening');return `http://127.0.0.1:${(server.address() as {port:number}).port}`;};
 beforeAll(async()=>{
  db=new PrismaClient({datasourceUrl:'postgresql://postgres@127.0.0.1:55437/postgres?schema=sp7_billing'});fixture.db=db;
  vi.stubEnv('MOBILE_LEDGER_ENABLED','true');vi.stubEnv('SAFE_AI_STAGING_MODE','false');vi.stubEnv('VERCEL_ENV','development');vi.stubEnv('MOBILE_SANDBOX_TESTER_EMAILS','');
  vi.stubEnv('REVENUECAT_IOS_PRODUCT_ID','ios-product');vi.stubEnv('REVENUECAT_IOS_V2_PRODUCT_ID','rc-product');vi.stubEnv('REVENUECAT_V2_SECRET_API_KEY','synthetic-fixture');vi.stubEnv('REVENUECAT_PROJECT_ID','project-fixture');vi.stubEnv('REVENUECAT_SECRET_API_KEY','synthetic-fixture');
  upstream=createServer((req,res)=>{
   if(outage){res.writeHead(503).end('{}');return;}
   const url=new URL(req.url!,'http://fixture');let value:unknown;
   if(url.pathname.startsWith('/v1/')){
    const owner=decodeURIComponent(url.pathname.split('/').at(-1)!);const active=valid&&owner===current;
    value={subscriber:{entitlements:active?{anzen_pro:{product_identifier:'ios-product',purchase_date:new Date().toISOString(),expires_date:expiry().toISOString()}}:{},subscriptions:active?{'ios-product':{store:'app_store',is_sandbox:true,expires_date:expiry().toISOString(),original_purchase_date:new Date().toISOString()}}:{}}};
   }else if(url.pathname.includes('/customers/'))value={items:[{...subscription(),...(wrongOwner?{customer_id:'fixture-member-a'}:{})}]};
   else value={items:!legacyUnknown&&['original-apple-id','renewal-1','renewal-2','renewal-3'].includes(url.searchParams.get('store_subscription_identifier')??'')?[subscription()]:[]};
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));
  });rcAddress=await listen(upstream);
  vi.stubGlobal('fetch',async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
   const url=new URL(String(input));if(url.origin!=='https://api.revenuecat.com')throw new Error('Non-fixture outbound request blocked');
   return actualFetch(rcAddress+url.pathname+url.search,init);
  });
  const {POST}=await import('@/app/api/billing/reconcile/route');
  api=createServer(async(req,res)=>{
   const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
   const headers=new Headers(Object.entries(req.headers).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
   const response=await fixture.headers.run(headers,()=>POST(new Request('http://127.0.0.1/api/billing/reconcile',{method:'POST',headers,body:Buffer.concat(chunks).toString()})));
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
  });address=await listen(api);
  vi.spyOn(console,'warn').mockImplementation((...args)=>{if(args[0]==='[mobile-billing]')logs.push(args.join(' '));});
 });
 beforeEach(async()=>{
  current='fixture-member-a';valid=true;outage=false;storeId='renewal-2';wrongOwner=false;legacyUnknown=false;logs.length=0;
  await db.mobileGrant.deleteMany();await db.mobilePurchaseIntent.deleteMany();await db.mobileSession.deleteMany();await db.mobileIdentity.deleteMany();await db.account.deleteMany();await db.subscription.deleteMany();await db.user.deleteMany();
  for(const [id,appUserId,provider] of [['a','fixture-member-a','apple'],['b','fixture-member-b','google'],['c','fixture-member-c','apple']]){
   await db.user.create({data:{id}});await db.mobileIdentity.create({data:{userId:id,appUserId,billingEnvironment:'SANDBOX'}});
   await db.account.create({data:{userId:id,provider,type:'oauth',providerAccountId:`fixture-${id}`}});
   const {digest}=await import('./session');await db.mobileSession.create({data:{userId:id,tokenHash:digest(id.repeat(43)),expiresAt:expiry()}});
  }
  // Historical IDs can be the true Apple original ID or an older renewal ID.
  await db.mobileGrant.createMany({data:['original-apple-id','renewal-1'].map(originalTransactionId=>({userId:'a',provider:'app_store',originalTransactionId,productId:'ios-product',environment:'SANDBOX',expiresAt:expiry(),checkedAt:new Date()}))});
 });
 afterAll(async()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();await Promise.all([api&&new Promise<void>(resolve=>api.close(()=>resolve())),upstream&&new Promise<void>(resolve=>upstream.close(()=>resolve()))]);await db?.$disconnect();fixture.db=null;});
 const reconcile=async(user:string,appUserId=`fixture-member-${user}`)=>{const response=await actualFetch(address,{method:'POST',headers:{Authorization:`Bearer ${user.repeat(43)}`,'Content-Type':'application/json'},body:JSON.stringify({appUserId})});return {status:response.status,body:await response.json()};};
 it('transfers verified A → B atomically, revokes every matching old ID, and logs provider codes only',async()=>{
  current='fixture-member-b';expect(await reconcile('b')).toMatchObject({status:200,body:{plan:'pro',source:'app_store'}});
  const {getEntitlement}=await import('./billing-service');expect((await getEntitlement('a',{snapshot:true})).plan).toBe('free');
  expect(await db.mobileGrant.count({where:{provider:'app_store',revoked:false}})).toBe(1);
  expect(logs).toEqual(['[mobile-billing] {"reason":"APP_STORE_VERIFIED_TRANSFER","from":["apple"],"to":["google"]}']);
 });
 it('keeps A unchanged when provider verification fails or is unavailable',async()=>{
  current='fixture-member-b';valid=false;expect((await reconcile('b')).body.plan).toBe('free');
  expect(await db.mobileGrant.count({where:{userId:'a',revoked:false}})).toBe(2);
  outage=true;expect((await reconcile('b')).status).toBe(503);expect(await db.mobileGrant.count({where:{userId:'a',revoked:false}})).toBe(2);expect(logs).toEqual([]);
 });
 it('records historical login methods when the old rejection prevented any ledger grant',async()=>{
  await db.mobileGrant.deleteMany();current='fixture-member-b';expect((await reconcile('b')).body.plan).toBe('pro');
  expect(logs).toEqual(['[mobile-billing] {"reason":"APP_STORE_VERIFIED_TRANSFER","from":["apple"],"to":["google"]}']);
  logs.length=0;await reconcile('b');expect(logs).toEqual([]);
 });
 it('rolls back the whole transfer if an active old ledger transaction cannot be matched',async()=>{
  current='fixture-member-b';legacyUnknown=true;expect((await reconcile('b')).status).toBe(503);
  const {getEntitlement}=await import('./billing-service');expect((await getEntitlement('a',{snapshot:true})).plan).toBe('pro');expect((await getEntitlement('b',{snapshot:true})).plan).toBe('free');
  expect(await db.mobileGrant.count({where:{userId:'a',revoked:false}})).toBe(2);expect(await db.mobileGrant.count({where:{userId:'b',revoked:false}})).toBe(0);expect(logs).toEqual([]);
 });
 it('rejects a mismatched current owner and a delayed request for a previous login',async()=>{
  // v1 says B has a grant but v2 still says A; no transfer is permitted.
  current='fixture-member-b';wrongOwner=true;expect((await reconcile('b')).status).toBe(409);
  expect((await reconcile('b','fixture-member-a')).status).toBe(401);expect(await db.mobileGrant.count({where:{userId:'a',revoked:false}})).toBe(2);
 });
 it('survives relogin, renewal and repeated synchronization without duplicate grants or changing Stripe ownership',async()=>{
  await db.mobileGrant.create({data:{userId:'a',provider:'stripe',originalTransactionId:'stripe-fixture',productId:'stripe-product',environment:'SANDBOX',expiresAt:expiry(),checkedAt:new Date()}});
  current='fixture-member-b';expect((await reconcile('b')).body.plan).toBe('pro');storeId='renewal-3';
  expect((await reconcile('b')).body.plan).toBe('pro');
  expect(await db.mobileGrant.count({where:{provider:'app_store',revoked:false}})).toBe(1);
  expect(await db.mobileGrant.findUnique({where:{provider_originalTransactionId_environment:{provider:'stripe',originalTransactionId:'stripe-fixture',environment:'SANDBOX'}}})).toMatchObject({userId:'a',revoked:false});
  current='fixture-member-c';const results=await Promise.all([reconcile('b'),reconcile('c')]);expect(results.find(r=>r.body.appUserId==='fixture-member-c')?.body.plan).toBe('pro');
  expect(await db.mobileGrant.count({where:{provider:'app_store',revoked:false}})).toBe(1);expect(await db.mobileGrant.findFirst({where:{provider:'app_store',revoked:false}})).toMatchObject({userId:'c'});
 });
});
