import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash,randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { billingDb,getEntitlement,lockMember,entitlementInTransaction } from './billing-service';
import { product,type Plan } from './entitlement';
import { member,json,isNativeRequest,webMemberId } from './http';
import { inspectAiOutbound } from '../ai-outbound-safety';
import { validateChatbotRequestBoundary } from '../server/chatbot-request-boundary';
import { consumeSharedRateLimit,getRateLimitSubject,peekSharedRateLimit } from '../security/shared-state';
import { webProSalesReady,appStoreSalesReady } from '../pro-sales';
const context=new AsyncLocalStorage<{plan:Plan;operationId?:string}>();
/** The free daily limit carries the member's plan so the client can offer Pro (never to a Pro member). */
class DailyLimitError extends Error{constructor(readonly plan:Plan){super('DAILY_LIMIT_REACHED');}}
/** Pro can be bought from where the request came from: App Store in the app, Stripe on the web. */
export function upgradeAvailable(request:Request,plan:Plan|null){return plan!=='pro' && (isNativeRequest(request)?appStoreSalesReady():webProSalesReady());}
/**
 * Anonymous web visitors get the same free daily allowance as a free member once Pro is on sale,
 * counted per visitor (IP-derived, HMAC'd) for the JST day. Before sales open this is a no-op, so
 * the site keeps its free-to-browse behaviour with only the abuse limits.
 * 送信前は上限の確認だけ（増やさない）。数えるのは回答（生成または根拠なしの助言）が返った時だけ
 * ＝入力不備・同意なし・文字コード違反などで断った送信は数えない（recordAnonymousAnswer）。
 */
function freeDailyPolicy(feature:AiFeature){const {day}=jstKeys();return {routeKey:`free-${feature}-${day}`,limit:product.limits.free[feature],windowMs:86400000};}
export async function anonymousFreeAllowance(request:Request,feature:AiFeature){
  if(!webProSalesReady())return null;
  const {resetAt}=jstKeys();const policy=freeDailyPolicy(feature);
  const result=await peekSharedRateLimit({policy,rawSubject:getRateLimitSubject(request)});
  if(result.allowed)return null;
  return json({error:{code:'DAILY_LIMIT_REACHED',message:`今日の無料${policy.limit}回はここまでです。日本時間の0時にまた使えます。`,resetAt,plan:'free',upgrade:true}},429);
}
async function recordAnonymousAnswer(request:Request,feature:AiFeature){
  if(!webProSalesReady())return;
  await consumeSharedRateLimit({policy:freeDailyPolicy(feature),rawSubject:getRateLimitSubject(request)});
}
/** 回答が返った応答だけ onAnswered を待ってから返す（SSE は最後の meta を見て判定）。 */
async function afterAnswer(response:Response,feature:AiFeature,onAnswered:()=>Promise<void>):Promise<Response>{
  const record=async(value:unknown)=>{if(value&&chargeable(value,feature)){try{await onAnswered();}catch{/* counting failure never drops a delivered answer */}}};
  if(response.headers.get('content-type')?.includes('text/event-stream') && response.body){
    const reader=response.body.getReader();let collected='';const decoder=new TextDecoder();
    const stream=new ReadableStream({async start(controller){try{
      while(true){const item=await reader.read();if(item.done)break;collected+=decoder.decode(item.value,{stream:true});controller.enqueue(item.value);}collected+=decoder.decode();
      const meta=[...collected.matchAll(/event: meta\r?\ndata: ([^\n]+)/g)].at(-1)?.[1];
      await record(meta?JSON.parse(meta):null);controller.close();
    }catch(e){controller.error(e);}},async cancel(){await reader.cancel();}});
    return new Response(stream,{status:response.status,headers:response.headers});
  }
  if(response.ok)await record(await response.clone().json().catch(()=>null));
  return response;
}
export type AiFeature='law_chat'|'chemical_ra';
export function jstKeys(now=new Date()){
  const jst=new Date(now.getTime()+9*3600000).toISOString();const day=jst.slice(0,10);
  return {day,month:day.slice(0,7),resetAt:new Date(Date.parse(day+'T00:00:00+09:00')+86400000).toISOString()};
}
export function checkBudget(committed:number,reserved:number,next:number,plan:Plan){
  if(![committed,reserved,next].every(n=>Number.isSafeInteger(n)&&n>=0) || next<=0 || committed+reserved+next>product.monthlyBudgetYen)throw new Error('AI_BUDGET_STOPPED');
  if(plan==='free' && committed+reserved+next>=45000)throw new Error('AI_BUDGET_FREE_PAUSED');
}
/** Every paid provider call, including web KY and internal retries, shares this ledger. */
export type ProviderBound={model:string;inputBytes:number;maxOutputTokens:number};
export function maximumProviderCost(bound:ProviderBound,pricing:{model?:string;inputJpyPerMillion:number;outputJpyPerMillion:number;margin:number}){
  if(pricing.model!==bound.model || !Number.isSafeInteger(bound.inputBytes) || bound.inputBytes<0 || bound.inputBytes>100000 || !Number.isSafeInteger(bound.maxOutputTokens) || bound.maxOutputTokens<1 || bound.maxOutputTokens>2048 || ![pricing.inputJpyPerMillion,pricing.outputJpyPerMillion,pricing.margin].every(n=>Number.isFinite(n)&&n>0) || pricing.margin<1.25)throw new Error('AI_BUDGET_STOPPED');
  // UTF-8 byte count is a conservative input-token bound; add protocol overhead.
  return Math.max(1,Math.ceil(((bound.inputBytes+4096)*pricing.inputJpyPerMillion+bound.maxOutputTokens*pricing.outputJpyPerMillion)/1000000*pricing.margin));
}
export async function withProviderBudget<T>(run:()=>Promise<T>,bound:ProviderBound):Promise<T>{
  if(process.env.MOBILE_LEDGER_ENABLED!=='true')return run();
  const db=billingDb();const amount=maximumProviderCost(bound,{model:process.env.MOBILE_AI_PRICED_MODEL,inputJpyPerMillion:Number(process.env.MOBILE_AI_INPUT_JPY_PER_MILLION),outputJpyPerMillion:Number(process.env.MOBILE_AI_OUTPUT_JPY_PER_MILLION),margin:Number(process.env.MOBILE_AI_COST_MARGIN)});const {month}=jstKeys();
  const plan=context.getStore()?.plan??'free';
  const operationId=context.getStore()?.operationId;
  if(operationId){const marked=await db.mobileUsageOperation.updateMany({where:{id:operationId,status:'reserved',expiresAt:{gt:new Date()}},data:{providerStartedAt:new Date()}});if(marked.count!==1)throw new Error('OPERATION_RELEASED');}
  const reservation=await db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`anzen-budget:${month}`},0))`;
    const budget=await tx.mobileBudgetMonth.upsert({where:{month},create:{month},update:{}});
    checkBudget(budget.committedYen,budget.reservedYen,amount,plan);
    await tx.mobileBudgetMonth.update({where:{month},data:{reservedYen:{increment:amount}}});
    return tx.mobileProviderReservation.create({data:{month,amountYen:amount}});
  });
  try{return await run();}finally{
    // Unknown/failed provider usage is conservatively charged at the reserved maximum.
    // If settlement storage fails, the reservation remains and continues blocking overspend.
    await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`anzen-budget:${month}`},0))`;
      const changed=await tx.mobileProviderReservation.updateMany({where:{id:reservation.id,status:'reserved'},data:{status:'committed'}});
      if(changed.count)await tx.mobileBudgetMonth.update({where:{month},data:{reservedYen:{decrement:amount},committedYen:{increment:amount}}});
    });
  }
}
export async function quota(userId:string,feature:AiFeature,tx?:Prisma.TransactionClient){
  const db=tx??billingDb();const rights=await getEntitlement(userId);const {day,resetAt}=jstKeys();
  if(!tx)await billingDb().$transaction(async session=>{await lockMember(session,userId);await recoverUsageLeases(session,userId);});
  const rows=await db.mobileUsageOperation.groupBy({by:['status'],where:{userId,feature,day},_count:true});
  const used=rows.find(r=>r.status==='completed')?._count??0;const reserved=(rows.find(r=>r.status==='reserved')?._count??0)+(rows.find(r=>r.status==='uncertain')?._count??0);const limit=rights.limits[feature];
  return {limit,used,reserved,remaining:Math.max(0,limit-used-reserved),resetAt};
}
async function reserve(request:Request,userId:string,feature:AiFeature){
  await getEntitlement(userId);
  const raw=await request.clone().text();if(raw.length>65536)throw new Error('INVALID_REQUEST');
  const requestHash=createHash('sha256').update(raw).digest('hex');
  const id=request.headers.get('x-operation-id')??randomUUID();if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('INVALID_REQUEST');
  const {day}=jstKeys();
  await billingDb().$transaction(async tx=>{await lockMember(tx,userId);await recoverUsageLeases(tx,userId);});
  return billingDb().$transaction(async tx=>{
    await lockMember(tx,userId);
    const rights=await entitlementInTransaction(tx,userId);if(rights.syncState!=='verified')throw new Error('ENTITLEMENT_SYNC_PENDING');
    const previous=await tx.mobileUsageOperation.findUnique({where:{id}});
    if(previous){if(previous.userId!==userId || previous.feature!==feature || previous.requestHash!==requestHash)throw new Error('INVALID_REQUEST');
      if(previous.status==='completed' && previous.response)return {id,plan:rights.plan,replay:previous.response};throw new Error(previous.status==='released'?'OPERATION_RELEASED':'OPERATION_PENDING');}
    const rows=await tx.mobileUsageOperation.findMany({where:{userId,feature,day,status:{in:['completed','reserved','uncertain']}},select:{createdAt:true,status:true}});
    if(rows.length>=rights.limits[feature]){if(rows.some(r=>r.status!=='completed'))throw new Error('OPERATION_PENDING');throw new DailyLimitError(rights.plan);}
    const recent=await tx.mobileUsageOperation.count({where:{userId,feature,createdAt:{gt:new Date(Date.now()-60000)}}});
    if(rights.plan==='pro' && recent>=product.proBurstPerMinute)throw new Error('BURST_LIMITED');
    await tx.mobileUsageOperation.create({data:{id,userId,feature,day,requestHash,expiresAt:new Date(Date.now()+300000)}});
    return {id,plan:rights.plan,replay:null};
  });
}
/**
 * 法令AIは「1回送って回答が返った」ら1回と数える（新しいチャットでも同じチャットの追加質問でも）。
 * 以前は条文の根拠付き回答だけを数えていたため、根拠なしの回答や追加質問が数えられず、
 * 無料3回が4〜5回目まで止まらなかった。サーバー側の失敗（回答なし）は数えない。
 */
function chargeable(value:unknown,feature:AiFeature){
  const r=value as {answer?:unknown;assessmentStatus?:string};
  return feature==='law_chat' ? typeof r.answer==='string' && r.answer.trim().length>0 : r.assessmentStatus==='completed';
}
/** Reclaim only expired, never-dispatched leases. Unknown provider results keep a slot. */
export async function recoverUsageLeases(tx:Prisma.TransactionClient,userId:string){
  await tx.mobileUsageOperation.updateMany({where:{userId,status:'reserved',expiresAt:{lte:new Date()},providerStartedAt:null},data:{status:'released'}});
  await tx.mobileUsageOperation.updateMany({where:{userId,status:'reserved',expiresAt:{lte:new Date()},providerStartedAt:{not:null}},data:{status:'uncertain'}});
  // Provider cost reservations are deliberately untouched, including on process termination.
}
/**
 * Re-create the request with its already-read body from plain parts. The incoming request
 * may come from another runtime realm (Next's NextRequest on Vercel): `new Request(request, …)`
 * then stringifies it ("Failed to parse URL from [object Request]"). The abort signal is
 * forwarded through a local controller for the same reason.
 */
export function rebuildRequest(request:Request,body:string):Request{
  const controller=new AbortController();const source=request.signal;
  if(source?.aborted)controller.abort();else source?.addEventListener?.('abort',()=>controller.abort(),{once:true});
  return new Request(String(request.url),{method:request.method,headers:Array.from(request.headers.entries()).filter(([name])=>name.toLowerCase()!=='content-length'),body,signal:controller.signal});
}
export async function withUsage(request:Request,feature:AiFeature,run:(request:Request)=>Promise<Response>){
  if(process.env.MOBILE_LEDGER_ENABLED!=='true'){
    // Native clients cannot bypass the missing shared quota contract.
    if(request.headers.get('x-anzen-native')==='1')return json({error:{code:'ENTITLEMENT_SYNC_PENDING',message:'サーバーの共通利用枠を確認できません。'}},503);
    return run(request);
  }
  // Anonymous web visitors keep the pre-ledger route behaviour (its own anonymous
  // rate limits and counts). Per-member quotas do not apply to them, but every
  // provider call still reserves against the shared monthly budget as plan 'free'.
  if(!isNativeRequest(request)){
    let signedIn:string|null;
    try{signedIn=await webMemberId();}catch{signedIn=null;}
    if(!signedIn){
      let limited:Response|null;
      try{limited=await anonymousFreeAllowance(request,feature);}catch{return json({error:{code:'ENTITLEMENT_SYNC_PENDING',message:'無料枠を確認できないため、いまはAIを止めています。時間をおいてお試しください。'}},503);}
      if(limited)return limited;
      return afterAnswer(await run(request),feature,()=>recordAnonymousAnswer(request,feature));
    }
  }
  const chunks:Uint8Array[]=[];let bytes=0;const reader=request.body?.getReader();
  if(reader)while(true){const item=await reader.read();if(item.done)break;bytes+=item.value.byteLength;if(bytes>65536){await reader.cancel();return json({error:{code:'INVALID_REQUEST',message:'入力が長すぎます。'}},413);}chunks.push(item.value);}
  request=rebuildRequest(request,Buffer.concat(chunks).toString('utf8'));
  if(feature==='law_chat'){
    const boundary=validateChatbotRequestBoundary(request);if(!boundary.allowed)return json({error:{code:'INVALID_REQUEST',message:boundary.message}},boundary.status);
    const body=await request.clone().json().catch(()=>null) as {message?:unknown;question?:unknown;privacyConfirmed?:unknown;history?:Array<{content?:unknown}>}|null;
    if(!body)return json({error:{code:'INVALID_REQUEST',message:'JSON形式の入力を確認してください。'}},400);
    const check=inspectAiOutbound({purpose:'shared-law-chat',texts:[body.message??body.question,...(Array.isArray(body.history)?body.history.map(h=>h?.content):[])],consent:body.privacyConfirmed===true,maxChars:12000,contextPolicy:'approved-server-corpus'});
    if(!check.allowed)return json({error:{code:check.reason==='consent_required'?'CONSENT_REQUIRED':'SAFETY_BLOCKED',reason:check.reason,message:check.message}},check.status);
  }
  let operation:{id:string;plan:Plan;replay:Prisma.JsonValue|null}|undefined;
  try{
    const userId=await member(request);operation=await reserve(request,userId,feature);
    if(operation.replay){if(new URL(request.url).pathname.endsWith('/stream'))return new Response(`event: meta\ndata: ${JSON.stringify(operation.replay)}\n\n`,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store'}});return json(operation.replay);}
    const response=await context.run({plan:operation.plan,operationId:operation.id},()=>run(request));
    const settle=async(value:unknown,completed:boolean)=>{await billingDb().mobileUsageOperation.updateMany({where:{id:operation!.id,status:'reserved'},data:{status:completed?'completed':'released',...(completed?{response:value as Prisma.InputJsonValue}:{})}});};
    if(response.headers.get('content-type')?.includes('text/event-stream') && response.body){
      const reader=response.body.getReader();let collected='';const decoder=new TextDecoder();
      const stream=new ReadableStream({async start(controller){try{
        while(true){const item=await reader.read();if(item.done)break;collected+=decoder.decode(item.value,{stream:true});controller.enqueue(item.value);}collected+=decoder.decode();
        const meta=[...collected.matchAll(/event: meta\r?\ndata: ([^\n]+)/g)].at(-1)?.[1];const value=meta?JSON.parse(meta):null;
        await settle(value,!!value&&chargeable(value,feature));controller.close();
      }catch(e){await settle(null,false);controller.error(e);}},async cancel(){await reader.cancel();await settle(null,false);}});
      return new Response(stream,{status:response.status,headers:response.headers});
    }
    const value=await response.clone().json().catch(()=>null);await settle(value,response.ok && !!value && chargeable(value,feature));return response;
  }catch(e){
    if(operation)await billingDb().mobileUsageOperation.updateMany({where:{id:operation.id,status:'reserved'},data:{status:'released'}}).catch(()=>{});
    const known=['UNAUTHORIZED','FORBIDDEN','INVALID_REQUEST','OPERATION_PENDING','OPERATION_RELEASED','DAILY_LIMIT_REACHED','BURST_LIMITED','ENTITLEMENT_SYNC_PENDING','AI_BUDGET_STOPPED','AI_BUDGET_FREE_PAUSED'];const code=e instanceof Error&&known.includes(e.message)?e.message:'ENTITLEMENT_SYNC_PENDING';
    const limitPlan=e instanceof DailyLimitError?e.plan:null;
    const message=code==='DAILY_LIMIT_REACHED'?(limitPlan==='free'?`今日の無料${product.limits.free[feature]}回はここまでです。日本時間の0時にまた使えます。`:'本日の上限に達しました。日本時間の次の0時に回復します。'):code==='UNAUTHORIZED'?'AIを利用するには会員ログインが必要です。':code==='BURST_LIMITED'?'短時間の利用が集中しています。60秒後に再度お試しください。':code==='OPERATION_PENDING'?'同じ操作を処理中です。再送せず、処理の完了をお待ちください。':'サーバーの安全な実行条件を確認できません。権利の再確認をお試しください。';
    const result=json({error:{code,message,resetAt:jstKeys().resetAt,...(limitPlan?{plan:limitPlan,upgrade:upgradeAvailable(request,limitPlan)}:{})}},code==='UNAUTHORIZED'?401:code==='FORBIDDEN'?403:code.includes('LIMIT')?429:503);
    if(code==='BURST_LIMITED')result.headers.set('Retry-After','60');return result;
  }
}
