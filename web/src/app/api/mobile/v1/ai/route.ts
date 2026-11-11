import { createHmac,timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { POST as chatbot } from '@/app/api/chatbot/route';
import { quota } from '@/lib/mobile/usage';
import type { ChatbotResponse } from '@/lib/chatbot-contract';
import { member,json,failure } from '@/lib/mobile/http';
export async function POST(request:Request){try{
  const userId=await member(request);const b=z.object({version:z.union([z.literal(1),z.literal(2)]),feature:z.enum(['law_chat','chemical_ra']),input:z.string().min(1).max(2000),requestId:z.string().uuid(),privacyConfirmed:z.literal(true)}).parse(await request.json());
  // v1 required literal true safety assertions that the service cannot guarantee.
  // Refuse it before invoking AI/usage; clients must explicitly adopt the v2 contract.
  if(b.version===1)return json({error:{code:'CLIENT_UPDATE_REQUIRED',message:'このAI機能の利用には対応版アプリが必要です。',supportedVersion:2}},426);
  const secret=process.env.AUTH_SECRET;if(!secret)throw new Error('ENTITLEMENT_SYNC_PENDING');
  const token=request.headers.get('x-anzen-csrf')??'';const expected=createHmac('sha256',secret).update(`anzen-ai:${userId}:${new Date().toISOString().slice(0,10)}`).digest('hex');
  if(!/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(token),Buffer.from(expected)))throw new Error('FORBIDDEN');
  if(b.feature==='chemical_ra')throw new Error('FEATURE_UNAVAILABLE');
  const headers=new Headers(request.headers);headers.set('Content-Type','application/json');headers.set('X-Operation-ID',b.requestId);
  const response=await chatbot(new Request(new URL('/api/chatbot',request.url),{method:'POST',headers,body:JSON.stringify({message:b.input,privacyConfirmed:true})}));
  if(!response.ok)return response;
  const result=await response.json() as ChatbotResponse;
  const evidence=result.sources.filter(s=>s.text && s.url?.startsWith('https:') && s.asOf && Number.isFinite(Date.parse(s.asOf))).map(s=>({title:`${s.law} ${s.article}`,original:s.text,url:s.url,asOf:s.asOf,verification:s.verificationStatus??'原文を確認してください'}));
  const completed=result.source_type==='rag' && evidence.length>0;
  return json({version:2,requestId:b.requestId,feature:b.feature,status:completed?'completed':'fallback',answer:result.answer,conditions:[...result.conditions,...(result.scopeWarnings??[]),...(result.requiresHumanReview?["この回答は人による確認が必要です。"]:[])],evidence,safety:{reviewed:false,dangerousAssertionsBlocked:false},scopeWarnings:result.scopeWarnings??[],confidence:result.confidence,requiresHumanReview:result.requiresHumanReview,effectiveDateStatus:result.effectiveDateStatus,usage:await quota(userId,'law_chat'),charged:completed});
}catch(e){return failure(e);}}
