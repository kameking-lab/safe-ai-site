// @vitest-environment node
import { beforeEach,afterEach,describe,expect,it,vi } from 'vitest';
const pause=vi.hoisted(()=>vi.fn(async()=>({count:1})));
const expireStopped=vi.hoisted(()=>vi.fn(async()=>({closed:0})));
const settlement=vi.hoisted(()=>({gate:undefined as Promise<void>|undefined,fail:false,entered:false}));
vi.mock('./pro-sales-checkouts',()=>({processPausedStripeCheckouts:expireStopped}));
const state=vi.hoisted(()=>({operations:[] as Array<{id:string;userId:string;feature:string;day:string;status:string;createdAt:Date;requestHash:string;response?:unknown}>,tail:Promise.resolve() as Promise<unknown>,paid:false,signedIn:true,budget:{committedYen:0,reservedYen:0},reservations:[] as Array<{id:string;amountYen:number;status:string}>}));
vi.mock('@/auth',()=>({auth:async()=>state.signedIn?{user:{id:'mock_member'}}:null}));
vi.mock('@/lib/prisma',()=>{
  const tx={
    $executeRaw:async()=>1,
    mobileIdentity:{upsert:async()=>({appUserId:'mock_immutable_revenuecat_id'})},
    mobilePurchaseIntent:{findUnique:async()=>null},
    subscription:{findUnique:async()=>state.paid?{planName:'pro',status:'active',stripeSubscriptionId:'mock_stripe',currentPeriodEnd:new Date(Date.now()+86400000),updatedAt:new Date()}:null},
    mobileGrant:{findMany:async()=>state.paid?[{provider:'stripe',environment:'PRODUCTION',revoked:false,expiresAt:new Date(Date.now()+86400000),checkedAt:new Date()}]:[]},
    mobileBudgetMonth:{
      findUnique:async()=>({...state.budget}),
      updateMany:pause,
      upsert:async()=>({...state.budget}),
      update:async({data}:{data:{reservedYen?:{increment?:number;decrement?:number};committedYen?:{increment:number}}})=>{state.budget.reservedYen+=(data.reservedYen?.increment??0)-(data.reservedYen?.decrement??0);state.budget.committedYen+=data.committedYen?.increment??0;return {...state.budget};}
    },
    mobileOperationsAlert:{upsert:async()=>({})},
    mobileProviderReservation:{
      create:async({data}:{data:{amountYen:number}})=>{const row={id:crypto.randomUUID(),amountYen:data.amountYen,status:'reserved'};state.reservations.push(row);return row;},
      updateMany:async({where,data}:{where:{id:string;status:string};data:{status:string}})=>{settlement.entered=true;await settlement.gate;if(settlement.fail)throw new Error('settlement failed');const r=state.reservations.find(x=>x.id===where.id&&x.status===where.status);if(!r)return{count:0};r.status=data.status;return{count:1};}
    },
    mobileUsageOperation:{
      findUnique:async({where}:{where:{id:string}})=>state.operations.find(o=>o.id===where.id)??null,
      findMany:async({where}:{where:{userId:string;feature:string;day:string;status:{in:string[]}}})=>state.operations.filter(o=>o.userId===where.userId&&o.feature===where.feature&&o.day===where.day&&where.status.in.includes(o.status)),
      count:async({where}:{where:{userId:string;feature:string;createdAt:{gt:Date}}})=>state.operations.filter(o=>o.userId===where.userId&&o.feature===where.feature&&o.createdAt>where.createdAt.gt).length,
      create:async({data}:{data:typeof state.operations[number]})=>{const row={...data,status:'reserved',createdAt:new Date()};state.operations.push(row);return row;},
      updateMany:async({where,data}:{where:{id:string;status:string};data:{status:string;response?:unknown}})=>{const o=where.id?state.operations.find(o=>o.id===where.id&&o.status===where.status):undefined;if(!o)return{count:0};Object.assign(o,data);return{count:1};}
    }
  };
  const prisma={...tx,$transaction:<T>(run:(db:typeof tx)=>Promise<T>)=>{const next=state.tail.then(()=>run(tx));state.tail=next.catch(()=>{});return next;}};
  return {prisma};
});
import { withUsage,withProviderBudget,checkBudget,jstKeys,maximumProviderCost,measuredProviderCost,rebuildRequest } from './usage';
import { __resetDevelopmentSharedStateForTests } from '@/lib/security/shared-state';
import { canUseMemberQuota,product } from './entitlement';
import * as entitlementPolicy from './entitlement';
import * as proSales from '../pro-sales';
const request=(id=crypto.randomUUID())=>new Request('https://example.test/api/chatbot',{method:'POST',headers:{Authorization:'Bearer mock_session','Content-Type':'application/json','X-Operation-ID':id},body:JSON.stringify({message:'足場の手すり',privacyConfirmed:true})});
const answer=()=>Response.json({answer:'公式根拠を確認してください。',source_type:'rag',sources:[{text:'原文',url:'https://laws.e-gov.go.jp/law/mock',asOf:new Date().toISOString()}]});
beforeEach(()=>{state.operations=[];state.tail=Promise.resolve();state.paid=false;state.signedIn=true;state.budget={committedYen:0,reservedYen:0};state.reservations=[];vi.stubEnv('MOBILE_LEDGER_ENABLED','true');});afterEach(()=>vi.unstubAllEnvs());
// Vercel passes a NextRequest from another realm; `new Request(foreign, init)` stringified it
// ("Failed to parse URL from [object Request]") and every native chat request returned 500.
function foreignRequest(real:Request):Request{
  return {url:real.url,method:real.method,headers:real.headers,body:real.body,signal:real.signal,bodyUsed:false,
    clone:()=>foreignRequest(real.clone()),json:()=>real.json(),text:()=>real.text(),toString:()=>'[object Request]'} as unknown as Request;
}
describe('request rebuild across runtime realms',()=>{
  it('rebuilds a foreign request from parts and keeps method, headers, body and abort',async()=>{
    const controller=new AbortController();
    const real=new Request('https://example.test/api/chatbot/stream',{method:'POST',headers:{'X-Anzen-Native':'1','Content-Type':'application/json'},body:'{}',signal:controller.signal});
    expect(()=>new Request(foreignRequest(real),{body:'{"a":1}'})).toThrow();
    const rebuilt=rebuildRequest(foreignRequest(real),'{"a":1}');
    expect(rebuilt.url).toBe('https://example.test/api/chatbot/stream');
    expect(rebuilt.method).toBe('POST');
    expect(rebuilt.headers.get('x-anzen-native')).toBe('1');
    expect(await rebuilt.json()).toEqual({a:1});
    controller.abort();
    expect(rebuilt.signal.aborted).toBe(true);
  });
  it('runs a metered native chat request that arrives as a foreign request object',async()=>{
    const run=vi.fn(async(req:Request)=>{expect(await req.clone().json()).toMatchObject({privacyConfirmed:true});return answer();});
    const response=await withUsage(foreignRequest(request()),'law_chat',run);
    expect(response.status).toBe(200);expect(run).toHaveBeenCalledTimes(1);
  });
});
describe('shared daily AI accounting',()=>{
  it('keeps the free quota available while paid rights are pending, without granting Pro or unknown rights',()=>{
    expect(canUseMemberQuota({plan:'free',syncState:'pending'})).toBe(true);
    expect(canUseMemberQuota({plan:'pro',syncState:'pending'})).toBe(false);
    expect(canUseMemberQuota({plan:'free',syncState:'unavailable'})).toBe(false);
  });
  it('enforces exactly three free answers during pending rights verification and still blocks unverified Pro',async()=>{
    const project=entitlementPolicy.projectEntitlement;
    const pending=vi.spyOn(entitlementPolicy,'projectEntitlement').mockImplementation((...args)=>({...project(...args),syncState:'pending'}));
    try{
      const run=vi.fn(async()=>answer());
      for(let i=0;i<3;i++)expect((await withUsage(request(),'law_chat',run)).status).toBe(200);
      const fourth=await withUsage(request(),'law_chat',run);
      expect(fourth.status).toBe(429);expect(await fourth.json()).toMatchObject({error:{code:'DAILY_LIMIT_REACHED',plan:'free'}});expect(run).toHaveBeenCalledTimes(3);
      state.paid=true;expect((await withUsage(request(),'law_chat',run)).status).toBe(503);expect(run).toHaveBeenCalledTimes(3);
    }finally{pending.mockRestore();}
  });
  it('distinguishes reserved last slots from daily completed consumption',async()=>{
    for(let i=0;i<3;i++)state.operations.push({id:crypto.randomUUID(),userId:'mock_member',feature:'law_chat',day:jstKeys().day,status:'reserved',createdAt:new Date(),requestHash:'prior'});
    const run=vi.fn(async()=>answer());const response=await withUsage(request(),'law_chat',run);expect(await response.json()).toMatchObject({error:{code:'OPERATION_PENDING'}});expect(run).not.toHaveBeenCalled();
  });
  it('allows only one of 20 competing requests for the last free slot',async()=>{
    for(let i=0;i<2;i++)state.operations.push({id:crypto.randomUUID(),userId:'mock_member',feature:'law_chat',day:jstKeys().day,status:'completed',createdAt:new Date(),requestHash:'prior'});
    const run=vi.fn(async()=>answer());const responses=await Promise.all(Array.from({length:20},()=>withUsage(request(),'law_chat',run)));
    expect(responses.filter(r=>r.status===200)).toHaveLength(1);expect(run).toHaveBeenCalledTimes(1);expect(state.operations.filter(o=>o.status==='completed')).toHaveLength(3);
  });
  it('replays the same operation without executing or charging it twice',async()=>{const id=crypto.randomUUID();const run=vi.fn(async()=>answer());expect((await withUsage(request(id),'law_chat',run)).status).toBe(200);expect((await withUsage(request(id),'law_chat',run)).status).toBe(200);expect(run).toHaveBeenCalledTimes(1);});
  it('counts every answered law chat send (no-evidence answers and follow-ups too) and stops the 4th for free',async()=>{
    const noEvidence=()=>Response.json({answer:'一般的な安全上の目安です。\n\nこの回答は条文の根拠を確認できていません。',source_type:'safety',sources:[]});
    const run=vi.fn(async()=>noEvidence());
    for(let i=0;i<3;i++)expect((await withUsage(request(),'law_chat',run)).status).toBe(200);
    expect(state.operations.filter(o=>o.status==='completed')).toHaveLength(3);
    const fourth=await withUsage(request(),'law_chat',run);
    expect(fourth.status).toBe(429);
    expect(await fourth.json()).toMatchObject({error:{code:'DAILY_LIMIT_REACHED',plan:'free'}});
    expect(run).toHaveBeenCalledTimes(3);
  });
  it('does not count a send that returned no answer (server-side failure)',async()=>{
    const run=vi.fn(async()=>Response.json({error:'回答を完了できませんでした。'},{status:503}));
    expect((await withUsage(request(),'law_chat',run)).status).toBe(503);
    expect(state.operations.every(o=>o.status==='released')).toBe(true);
  });
  it('does not charge unavailable RA, validation failure or safety-only results',async()=>{const run=vi.fn(async()=>Response.json({assessmentStatus:'unavailable',source_type:'safety'}));for(let i=0;i<3;i++)expect((await withUsage(request(),'chemical_ra',run)).status).toBe(200);expect(state.operations.every(o=>o.status==='released')).toBe(true);});
  it('uses a sliding 60-second Pro burst limit including unsuccessful attempts',async()=>{state.paid=true;const run=vi.fn(async()=>Response.json({source_type:'safety'}));for(let i=0;i<10;i++)await withUsage(request(),'law_chat',run);const blocked=await withUsage(request(),'law_chat',run);expect(blocked.status).toBe(429);expect(blocked.headers.get('Retry-After')).toBe('60');expect(run).toHaveBeenCalledTimes(10);});
  it('uses JST midnight and never reserves above the shared cost ceiling',()=>{expect(jstKeys(new Date('2026-11-03T14:59:59Z')).day).toBe('2026-11-03');expect(jstKeys(new Date('2026-11-03T15:00:00Z')).day).toBe('2026-11-04');expect(()=>checkBudget(49950,0,50,'pro')).not.toThrow();expect(()=>checkBudget(49950,50,1,'pro')).toThrow('AI_BUDGET_STOPPED');expect(()=>checkBudget(44000,950,50,'free')).toThrow('AI_BUDGET_FREE_PAUSED');expect(()=>checkBudget(0,0,NaN,'pro')).toThrow('AI_BUDGET_STOPPED');});
  it('refuses unpriced model changes and unbounded inference before reserving money',()=>{const bound={model:'mock_model',inputBytes:2000,maxOutputTokens:2048};const prices={model:'mock_model',inputJpyPerMillion:100,outputJpyPerMillion:500,margin:1.25};expect(maximumProviderCost(bound,prices)).toBeGreaterThan(0);expect(()=>maximumProviderCost({...bound,model:'unpriced_model'},prices)).toThrow();expect(()=>maximumProviderCost({...bound,maxOutputTokens:2049},prices)).toThrow();expect(()=>maximumProviderCost(bound,{...prices,inputJpyPerMillion:NaN})).toThrow();});
});
describe('anonymous website visitors with the shared ledger on',()=>{
  const web=(headers:Record<string,string>={})=>new Request('https://example.test/api/chatbot',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.test',...headers},body:JSON.stringify({message:'足場の手すり',privacyConfirmed:true})});
  it('keep the pre-ledger route behaviour without a member quota or login',async()=>{
    state.signedIn=false;const run=vi.fn(async()=>answer());
    for(let i=0;i<5;i++)expect((await withUsage(web(),'law_chat',run)).status).toBe(200);
    expect(run).toHaveBeenCalledTimes(5);expect(state.operations).toHaveLength(0);
  });
  it('lets a credential-free native guest use the anonymous path but never downgrades invalid credentials',async()=>{
    state.signedIn=false;const run=vi.fn(async()=>answer());
    expect((await withUsage(web({'X-Anzen-Native':'1'}),'law_chat',run)).status).toBe(200);
    expect((await withUsage(web({Authorization:'Bearer invalid'}),'law_chat',run)).status).toBe(401);
    expect(run).toHaveBeenCalledTimes(1);expect(state.operations).toHaveLength(0);
  });
  it('keeps signed-in web members on the shared member quota',async()=>{
    const run=vi.fn(async()=>answer());expect((await withUsage(web(),'law_chat',run)).status).toBe(200);
    expect(state.operations).toHaveLength(1);
  });
  const salesOpen=()=>{vi.stubEnv('SAFE_AI_STAGING_MODE','false');vi.stubEnv('VERCEL_ENV','development');vi.stubEnv('NEXT_PUBLIC_PAID_MODE','true');vi.stubEnv('STRIPE_SECRET_KEY','synthetic-not-real');vi.stubEnv('STRIPE_ANZEN_PRO_MONTHLY_PRICE_ID','price_synthetic_pro');__resetDevelopmentSharedStateForTests();};
  it.each(['law_chat','chemical_ra'] as const)('shares the web daily %s allowance with native guests and stops before execution',async feature=>{
    salesOpen();state.signedIn=false;
    const appSales=vi.spyOn(proSales,'appStoreSalesReady').mockReturnValue(true);
    try{
    const ip={'X-Forwarded-For':'198.51.100.30'};const native={...ip,'X-Anzen-Native':'1'};
    const run=vi.fn(async()=>feature==='law_chat'?answer():Response.json({assessmentStatus:'completed'}));
    // First answer on the website, subsequent answers from the signed-out app.
    for(let i=0;i<product.limits.free[feature];i++)expect((await withUsage(web(i===0?ip:native),feature,run)).status).toBe(200);
    const blocked=await withUsage(web(native),feature,run);
    expect(blocked.status).toBe(429);expect(await blocked.json()).toMatchObject({error:{code:'DAILY_LIMIT_REACHED',plan:'free',upgrade:true}});
    expect((await withUsage(web(ip),feature,run)).status).toBe(429);
    expect(run).toHaveBeenCalledTimes(product.limits.free[feature]);expect(state.operations).toHaveLength(0);
    }finally{appSales.mockRestore();}
  });
  it('counts native SSE answers, leaves failures uncounted, and resets on the next JST day',async()=>{
    salesOpen();state.signedIn=false;vi.useFakeTimers();
    try{
      vi.setSystemTime(new Date('2026-11-13T14:59:00Z'));
      const headers={'X-Anzen-Native':'1','X-Forwarded-For':'198.51.100.31'};
      const refused=vi.fn(async()=>Response.json({error:'invalid'},{status:400}));
      expect((await withUsage(web(headers),'law_chat',refused)).status).toBe(400);
      const run=vi.fn(async()=>new Response(`event: meta\ndata: ${JSON.stringify({answer:'fixture answer'})}\n\n`,{headers:{'Content-Type':'text/event-stream'}}));
      for(let i=0;i<product.limits.free.law_chat;i++)await (await withUsage(web(headers),'law_chat',run)).text();
      expect((await withUsage(web(headers),'law_chat',run)).status).toBe(429);
      vi.setSystemTime(new Date('2026-11-13T15:00:00Z'));
      const next=await withUsage(web(headers),'law_chat',run);expect(next.status).toBe(200);await next.text();
    }finally{vi.useRealTimers();}
  });
  it('fails closed for a native guest when the ledger or shared counter is unavailable',async()=>{
    state.signedIn=false;const run=vi.fn(async()=>answer());
    vi.stubEnv('MOBILE_LEDGER_ENABLED','false');expect((await withUsage(web({'X-Anzen-Native':'1'}),'law_chat',run)).status).toBe(503);
    salesOpen();vi.stubEnv('MOBILE_LEDGER_ENABLED','true');vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('SHARED_STATE_HMAC_SECRET','');vi.stubEnv('AUTOMATION_CONSULT_STATE_HASH_SECRET','');
    expect((await withUsage(web({'X-Anzen-Native':'1'}),'law_chat',run)).status).toBe(503);expect(run).not.toHaveBeenCalled();
  });
  it('reserves and awaits provider settlement for a native guest and preserves the monthly stop',async()=>{
    salesOpen();state.signedIn=false;
    vi.stubEnv('MOBILE_AI_PRICED_MODEL','gemini-3.8-flash');vi.stubEnv('MOBILE_AI_INPUT_JPY_PER_MILLION','160');vi.stubEnv('MOBILE_AI_OUTPUT_JPY_PER_MILLION','960');vi.stubEnv('MOBILE_AI_COST_MARGIN','1.5');
    const bound={model:'gemini-3.8-flash',inputBytes:20000,maxOutputTokens:2048};
    let release!:()=>void;settlement.entered=false;settlement.gate=new Promise<void>(resolve=>{release=resolve;});let resolved=false;
    const run=vi.fn(async()=>withProviderBudget(async()=>answer(),bound,()=>({promptTokenCount:10,candidatesTokenCount:10,totalTokenCount:20})));
    const pending=withUsage(web({'X-Anzen-Native':'1'}),'law_chat',run).then(response=>{resolved=true;return response;});
    try{await vi.waitFor(()=>expect(settlement.entered).toBe(true));expect(resolved).toBe(false);expect(state.budget.reservedYen).toBeGreaterThan(0);}finally{release();settlement.gate=undefined;}
    expect((await pending).status).toBe(200);expect(state.budget).toEqual({committedYen:1,reservedYen:0});expect(state.operations).toHaveLength(0);
    state.budget.committedYen=product.monthlyBudgetYen;
    await expect(withUsage(web({'X-Anzen-Native':'1'}),'law_chat',run)).rejects.toThrow('AI_BUDGET_STOPPED');
    expect(state.reservations).toHaveLength(1);
  });
  it('once Pro is on sale, gives an anonymous visitor the free daily allowance and then offers Pro',async()=>{
    salesOpen();state.signedIn=false;const run=vi.fn(async()=>answer());
    for(let i=0;i<3;i++)expect((await withUsage(web({'X-Forwarded-For':'198.51.100.7'}),'law_chat',run)).status).toBe(200);
    const blocked=await withUsage(web({'X-Forwarded-For':'198.51.100.7'}),'law_chat',run);
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toMatchObject({error:{code:'DAILY_LIMIT_REACHED',plan:'free',upgrade:true}});
    // Another visitor keeps their own allowance.
    expect((await withUsage(web({'X-Forwarded-For':'198.51.100.8'}),'law_chat',run)).status).toBe(200);
    expect(run).toHaveBeenCalledTimes(4);
  });
  it('does not count anonymous sends that were refused (bad encoding, no consent) and counts only answers',async()=>{
    salesOpen();state.signedIn=false;
    const ip={'X-Forwarded-For':'198.51.100.9'};
    const refused=vi.fn(async()=>Response.json({error:'外部AIへの送信前確認が必要です。',retryable:false},{status:428}));
    const badEncoding=vi.fn(async()=>Response.json({error:'文字コードを確認してください。'},{status:400}));
    expect((await withUsage(web(ip),'law_chat',badEncoding)).status).toBe(400);
    for(let i=0;i<2;i++)expect((await withUsage(web(ip),'law_chat',refused)).status).toBe(428);
    const run=vi.fn(async()=>answer());
    for(let i=0;i<3;i++)expect((await withUsage(web(ip),'law_chat',run)).status).toBe(200);
    expect((await withUsage(web(ip),'law_chat',run)).status).toBe(429);
    expect(run).toHaveBeenCalledTimes(3);
  });
  it('counts an anonymous streamed answer only after its final meta arrives',async()=>{
    salesOpen();state.signedIn=false;
    const ip={'X-Forwarded-For':'198.51.100.10'};
    const meta=JSON.stringify({answer:'一般的な安全上の目安です。',source_type:'safety',sources:[]});
    const stream=()=>new Response(`event: text`+String.fromCharCode(10)+`data: {}`+String.fromCharCode(10,10)+`event: meta`+String.fromCharCode(10)+`data: ${meta}`+String.fromCharCode(10,10),{headers:{'Content-Type':'text/event-stream'}});
    const noAnswer=()=>new Response(`event: error`+String.fromCharCode(10)+`data: {}`+String.fromCharCode(10,10),{headers:{'Content-Type':'text/event-stream'}});
    for(let i=0;i<2;i++){const r=await withUsage(web(ip),'law_chat',async()=>noAnswer());await r.text();}
    for(let i=0;i<3;i++){const r=await withUsage(web(ip),'law_chat',async()=>stream());expect(r.status).toBe(200);await r.text();}
    expect((await withUsage(web(ip),'law_chat',async()=>stream())).status).toBe(429);
  });
  it('tells a free member at the limit that Pro is available, and never a Pro member',async()=>{
    salesOpen();
    for(let i=0;i<3;i++)state.operations.push({id:crypto.randomUUID(),userId:'mock_member',feature:'law_chat',day:jstKeys().day,status:'completed',createdAt:new Date(Date.now()-120000),requestHash:'prior'});
    const run=vi.fn(async()=>answer());
    const free=await withUsage(web(),'law_chat',run);
    expect(free.status).toBe(429);
    expect(await free.json()).toMatchObject({error:{code:'DAILY_LIMIT_REACHED',plan:'free',upgrade:true,message:expect.stringContaining('無料3回')}});
    state.paid=true;
    for(let i=0;i<47;i++)state.operations.push({id:crypto.randomUUID(),userId:'mock_member',feature:'law_chat',day:jstKeys().day,status:'completed',createdAt:new Date(Date.now()-120000),requestHash:'prior'});
    const pro=await withUsage(web(),'law_chat',run);
    expect(await pro.json()).toMatchObject({error:{code:'DAILY_LIMIT_REACHED',plan:'pro',upgrade:false}});
    expect(run).not.toHaveBeenCalled();
  });
  it('does not offer the web purchase while Pro is not on sale',async()=>{
    for(let i=0;i<3;i++)state.operations.push({id:crypto.randomUUID(),userId:'mock_member',feature:'law_chat',day:jstKeys().day,status:'completed',createdAt:new Date(Date.now()-120000),requestHash:'prior'});
    const response=await withUsage(web(),'law_chat',vi.fn(async()=>answer()));
    expect(await response.json()).toMatchObject({error:{code:'DAILY_LIMIT_REACHED',plan:'free',upgrade:false}});
  });
  it('still reserves every anonymous provider call against the shared monthly budget as free',async()=>{
    vi.stubEnv('MOBILE_AI_PRICED_MODEL','gemini-3.8-flash');vi.stubEnv('MOBILE_AI_INPUT_JPY_PER_MILLION','160');vi.stubEnv('MOBILE_AI_OUTPUT_JPY_PER_MILLION','960');vi.stubEnv('MOBILE_AI_COST_MARGIN','1.5');
    const bound={model:'gemini-3.8-flash',inputBytes:20000,maxOutputTokens:2048};const provider=vi.fn(async()=>'ok');
    expect(await withProviderBudget(provider,bound)).toBe('ok');
    expect(state.budget.committedYen).toBeGreaterThan(0);expect(state.budget.reservedYen).toBe(0);
    state.budget={committedYen:44999,reservedYen:0};
    await expect(withProviderBudget(provider,bound)).rejects.toThrow('AI_BUDGET_FREE_PAUSED');
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it('commits a monthly sales pause before rejecting an over-budget provider call',async()=>{
    pause.mockClear();expireStopped.mockClear();
    vi.stubEnv('MOBILE_AI_PRICED_MODEL','gemini-3.8-flash');vi.stubEnv('MOBILE_AI_INPUT_JPY_PER_MILLION','160');vi.stubEnv('MOBILE_AI_OUTPUT_JPY_PER_MILLION','960');vi.stubEnv('MOBILE_AI_COST_MARGIN','1.5');
    state.budget={committedYen:50000,reservedYen:0};const provider=vi.fn(async()=>'ok');
    await expect(withProviderBudget(provider,{model:'gemini-3.8-flash',inputBytes:20000,maxOutputTokens:2048})).rejects.toThrow('AI_BUDGET_STOPPED');
    expect(provider).not.toHaveBeenCalled();expect(state.reservations).toHaveLength(0);
    expect(pause).toHaveBeenCalledWith({where:{month:jstKeys().month,salesPausedAt:null},data:{salesPausedAt:expect.any(Date)}});
    expect(state.budget).toEqual({committedYen:50000,reservedYen:0});
    expect(expireStopped).toHaveBeenCalledTimes(1);
  });
});

describe('stream provider measured settlement',()=>{
  beforeEach(()=>{settlement.gate=undefined;settlement.fail=false;settlement.entered=false;});
  afterEach(()=>{settlement.gate=undefined;settlement.fail=false;settlement.entered=false;});
  const pricing={model:'gemini-3.8-flash',inputJpyPerMillion:160,outputJpyPerMillion:960,margin:1.5};
  const bound={model:'gemini-3.8-flash',inputBytes:20000,maxOutputTokens:2048};
  const usage={promptTokenCount:900,candidatesTokenCount:300,thoughtsTokenCount:50,totalTokenCount:1250};
  const configure=()=>{
    vi.stubEnv('MOBILE_AI_PRICED_MODEL',pricing.model);vi.stubEnv('MOBILE_AI_INPUT_JPY_PER_MILLION','160');vi.stubEnv('MOBILE_AI_OUTPUT_JPY_PER_MILLION','960');vi.stubEnv('MOBILE_AI_COST_MARGIN','1.5');
  };
  it('includes thinking tokens and uses the measured total without changing configured rates',()=>{
    expect(measuredProviderCost(usage,pricing,9)).toEqual({amountYen:1,promptTokens:900,outputTokens:350});
    expect(measuredProviderCost({...usage,thoughtsTokenCount:undefined,totalTokenCount:1700},pricing,9)?.outputTokens).toBe(800);
    expect(measuredProviderCost({...usage,totalTokenCount:undefined},pricing,9)?.outputTokens).toBe(350);
  });
  it.each([
    undefined, {}, {promptTokenCount:900,candidatesTokenCount:300},
    {...usage,promptTokenCount:-1}, {...usage,candidatesTokenCount:NaN},
    {...usage,thoughtsTokenCount:1.5}, {...usage,totalTokenCount:100},
    {...usage,totalTokenCount:999999999},
  ])('keeps the reserved maximum for unknown or invalid usage: %j',(value)=>{
    expect(measuredProviderCost(value,pricing,9)).toBeNull();
  });
  it('keeps the reservation until the stream completes, then awaits settlement before resolving',async()=>{
    configure();
    let complete!:()=>void;
    const generated=new Promise<void>(resolve=>{complete=resolve;});
    let resolved=false;
    const readUsage=vi.fn(()=>usage);
    const result=withProviderBudget(async()=>{await generated;return 'complete';},bound,readUsage).then(value=>{resolved=true;return value;});
    await vi.waitFor(()=>expect(state.reservations).toHaveLength(1));
    expect(state.budget.reservedYen).toBe(maximumProviderCost(bound,pricing));
    expect(state.budget.committedYen).toBe(0);
    expect(resolved).toBe(false);expect(readUsage).not.toHaveBeenCalled();
    complete();
    expect(await result).toBe('complete');
    expect(state.budget).toEqual({reservedYen:0,committedYen:1});
    expect(state.reservations[0].status).toBe('committed');
    expect(readUsage).toHaveBeenCalledTimes(1);
  });
  it('charges the maximum on stream failure even if partial usage was available',async()=>{
    configure();const readUsage=vi.fn(()=>usage);
    await expect(withProviderBudget(async()=>{throw new Error('interrupted');},bound,readUsage)).rejects.toThrow('interrupted');
    expect(readUsage).not.toHaveBeenCalled();
    expect(state.budget).toEqual({reservedYen:0,committedYen:maximumProviderCost(bound,pricing)});
  });
  it('does not resolve while the settlement transaction is still pending',async()=>{
    configure();let release!:()=>void;
    settlement.gate=new Promise<void>(resolve=>{release=resolve;});
    let resolved=false;
    const result=withProviderBudget(async()=>'complete',bound,()=>usage).then(value=>{resolved=true;return value;});
    try{
      await vi.waitFor(()=>expect(settlement.entered).toBe(true));
      expect(resolved).toBe(false);
      expect(state.budget).toEqual({reservedYen:maximumProviderCost(bound,pricing),committedYen:0});
    }finally{release();}
    expect(await result).toBe('complete');
    expect(state.budget).toEqual({reservedYen:0,committedYen:1});
  });
  it('propagates a failed settlement and retains the reservation in the budget ceiling',async()=>{
    configure();settlement.fail=true;
    await expect(withProviderBudget(async()=>'complete',bound,()=>usage)).rejects.toThrow('settlement failed');
    const reserved=maximumProviderCost(bound,pricing);
    expect(state.budget).toEqual({reservedYen:reserved,committedYen:0});
    expect(state.reservations[0].status).toBe('reserved');
    state.budget.committedYen=44999;
    const run=vi.fn(async()=>'unexpected');
    await expect(withProviderBudget(run,bound,()=>usage)).rejects.toThrow('AI_BUDGET_FREE_PAUSED');
    expect(run).not.toHaveBeenCalled();
  });
  it('still settles the maximum if the usage reader fails',async()=>{
    configure();
    await expect(withProviderBudget(async()=>'complete',bound,()=>{throw new Error('missing usage');})).resolves.toBe('complete');
    expect(state.budget).toEqual({reservedYen:0,committedYen:maximumProviderCost(bound,pricing)});
  });
});
