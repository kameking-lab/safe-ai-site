// @vitest-environment node
import { beforeEach,afterEach,describe,expect,it,vi } from 'vitest';
const state=vi.hoisted(()=>({operations:[] as Array<{id:string;userId:string;feature:string;day:string;status:string;createdAt:Date;requestHash:string;response?:unknown}>,tail:Promise.resolve() as Promise<unknown>,paid:false}));
vi.mock('@/auth',()=>({auth:async()=>({user:{id:'mock_member'}})}));
vi.mock('@/lib/prisma',()=>{
  const tx={
    $executeRaw:async()=>1,
    mobileIdentity:{upsert:async()=>({appUserId:'mock_immutable_revenuecat_id'})},
    mobilePurchaseIntent:{findUnique:async()=>null},
    subscription:{findUnique:async()=>state.paid?{planName:'pro',status:'active',stripeSubscriptionId:'mock_stripe',currentPeriodEnd:new Date(Date.now()+86400000),updatedAt:new Date()}:null},
    mobileGrant:{findMany:async()=>[]},
    mobileUsageOperation:{
      findUnique:async({where}:{where:{id:string}})=>state.operations.find(o=>o.id===where.id)??null,
      findMany:async({where}:{where:{userId:string;feature:string;day:string;status:{in:string[]}}})=>state.operations.filter(o=>o.userId===where.userId&&o.feature===where.feature&&o.day===where.day&&where.status.in.includes(o.status)),
      count:async({where}:{where:{userId:string;feature:string;createdAt:{gt:Date}}})=>state.operations.filter(o=>o.userId===where.userId&&o.feature===where.feature&&o.createdAt>where.createdAt.gt).length,
      create:async({data}:{data:typeof state.operations[number]})=>{const row={...data,status:'reserved',createdAt:new Date()};state.operations.push(row);return row;},
      updateMany:async({where,data}:{where:{id:string;status:string};data:{status:string;response?:unknown}})=>{const o=state.operations.find(o=>o.id===where.id&&o.status===where.status);if(!o)return{count:0};Object.assign(o,data);return{count:1};}
    }
  };
  const prisma={...tx,$transaction:<T>(run:(db:typeof tx)=>Promise<T>)=>{const next=state.tail.then(()=>run(tx));state.tail=next.catch(()=>{});return next;}};
  return {prisma};
});
import { withUsage,checkBudget,jstKeys,maximumProviderCost } from './usage';
const request=(id=crypto.randomUUID())=>new Request('https://example.test/api/chatbot',{method:'POST',headers:{Authorization:'Bearer mock_session','Content-Type':'application/json','X-Operation-ID':id},body:JSON.stringify({message:'足場の手すり',privacyConfirmed:true})});
const answer=()=>Response.json({answer:'公式根拠を確認してください。',source_type:'rag',sources:[{text:'原文',url:'https://laws.e-gov.go.jp/law/mock',asOf:new Date().toISOString()}]});
beforeEach(()=>{state.operations=[];state.tail=Promise.resolve();state.paid=false;vi.stubEnv('MOBILE_LEDGER_ENABLED','true');});afterEach(()=>vi.unstubAllEnvs());
describe('shared daily AI accounting',()=>{
  it('allows only one of 20 competing requests for the last free slot',async()=>{
    for(let i=0;i<2;i++)state.operations.push({id:crypto.randomUUID(),userId:'mock_member',feature:'law_chat',day:jstKeys().day,status:'completed',createdAt:new Date(),requestHash:'prior'});
    const run=vi.fn(async()=>answer());const responses=await Promise.all(Array.from({length:20},()=>withUsage(request(),'law_chat',run)));
    expect(responses.filter(r=>r.status===200)).toHaveLength(1);expect(run).toHaveBeenCalledTimes(1);expect(state.operations.filter(o=>o.status==='completed')).toHaveLength(3);
  });
  it('replays the same operation without executing or charging it twice',async()=>{const id=crypto.randomUUID();const run=vi.fn(async()=>answer());expect((await withUsage(request(id),'law_chat',run)).status).toBe(200);expect((await withUsage(request(id),'law_chat',run)).status).toBe(200);expect(run).toHaveBeenCalledTimes(1);});
  it('does not charge unavailable RA, validation failure or safety-only results',async()=>{const run=vi.fn(async()=>Response.json({assessmentStatus:'unavailable',source_type:'safety'}));for(let i=0;i<3;i++)expect((await withUsage(request(),'chemical_ra',run)).status).toBe(200);expect(state.operations.every(o=>o.status==='released')).toBe(true);});
  it('uses a sliding 60-second Pro burst limit including unsuccessful attempts',async()=>{state.paid=true;const run=vi.fn(async()=>Response.json({source_type:'safety'}));for(let i=0;i<10;i++)await withUsage(request(),'law_chat',run);const blocked=await withUsage(request(),'law_chat',run);expect(blocked.status).toBe(429);expect(blocked.headers.get('Retry-After')).toBe('60');expect(run).toHaveBeenCalledTimes(10);});
  it('uses JST midnight and never reserves above the shared cost ceiling',()=>{expect(jstKeys(new Date('2026-11-03T14:59:59Z')).day).toBe('2026-11-03');expect(jstKeys(new Date('2026-11-03T15:00:00Z')).day).toBe('2026-11-04');expect(()=>checkBudget(49950,0,50,'pro')).not.toThrow();expect(()=>checkBudget(49950,50,1,'pro')).toThrow('AI_BUDGET_STOPPED');expect(()=>checkBudget(44000,950,50,'free')).toThrow('AI_BUDGET_FREE_PAUSED');expect(()=>checkBudget(0,0,NaN,'pro')).toThrow('AI_BUDGET_STOPPED');});
  it('refuses unpriced model changes and unbounded inference before reserving money',()=>{const bound={model:'mock_model',inputBytes:2000,maxOutputTokens:2048};const prices={model:'mock_model',inputJpyPerMillion:100,outputJpyPerMillion:500,margin:1.25};expect(maximumProviderCost(bound,prices)).toBeGreaterThan(0);expect(()=>maximumProviderCost({...bound,model:'unpriced_model'},prices)).toThrow();expect(()=>maximumProviderCost({...bound,maxOutputTokens:2049},prices)).toThrow();expect(()=>maximumProviderCost(bound,{...prices,inputJpyPerMillion:NaN})).toThrow();});
});
