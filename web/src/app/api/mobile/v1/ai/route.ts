import { createHmac,timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { POST as chatbot } from '@/app/api/chatbot/route';
import { quota,anonymousQuota } from '@/lib/mobile/usage';
import type { ChatbotResponse } from '@/lib/chatbot-contract';
import { member,json,failure,isNativeGuestRequest } from '@/lib/mobile/http';
import { validateChatbotRequestBoundary } from '@/lib/server/chatbot-request-boundary';
export async function POST(request:Request){try{
  const guest=isNativeGuestRequest(request);
  if(guest){const boundary=validateChatbotRequestBoundary(request);if(!boundary.allowed)return json({error:{code:'FORBIDDEN',message:boundary.message}},boundary.status);}
  const userId=guest?null:await member(request);const b=z.object({version:z.union([z.literal(1),z.literal(2)]),feature:z.enum(['law_chat','chemical_ra']),input:z.string().min(1).max(2000),requestId:z.string().uuid(),privacyConfirmed:z.literal(true),answerAccounting:z.literal('all-answers').optional()}).parse(await request.json());
  // v1 required literal true safety assertions that the service cannot guarantee.
  // Refuse it before invoking AI/usage; clients must explicitly adopt the v2 contract.
  if(b.version===1)return json({error:{code:'CLIENT_UPDATE_REQUIRED',message:'このAI機能の利用には対応版アプリが必要です。',supportedVersion:2}},426);
  if(!guest){
  const secret=process.env.AUTH_SECRET;if(!secret)throw new Error('ENTITLEMENT_SYNC_PENDING');
  const token=request.headers.get('x-anzen-csrf')??'';const expected=createHmac('sha256',secret).update(`anzen-ai:${userId}:${new Date().toISOString().slice(0,10)}`).digest('hex');
  // A native Bearer credential is authenticated above and cannot be sent by a cross-site form.
  // Cookie clients still need the capability CSRF token. Quota/budget are enforced by chatbot.
  if(!request.headers.get('authorization')?.startsWith('Bearer ') && (!/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(token),Buffer.from(expected))))throw new Error('FORBIDDEN');
  }
  if(b.feature==='chemical_ra')throw new Error('FEATURE_UNAVAILABLE');
  const headers=new Headers(request.headers);headers.set('Content-Type','application/json');headers.set('X-Operation-ID',b.requestId);
  const response=await chatbot(new Request(new URL('/api/chatbot',request.url),{method:'POST',headers,body:JSON.stringify({message:b.input,privacyConfirmed:true})}));
  if(!response.ok)return response;
  const result=await response.json() as ChatbotResponse;
  const evidence=result.sources.filter(s=>s.text && s.url?.startsWith('https:') && s.asOf && Number.isFinite(Date.parse(s.asOf))).map(s=>({title:`${s.law} ${s.article}`,original:s.text,url:s.url,asOf:s.asOf,verification:s.verificationStatus??'原文を確認してください'}));
  const completed=result.source_type==='rag' && evidence.length>0;
  // Older v2 apps reject charged fallback responses. Updated clients explicitly
  // opt into answer-based accounting; keep the old response contract for others.
  return json({version:2,requestId:b.requestId,feature:b.feature,status:completed?'completed':'fallback',answer:result.answer,conditions:[...result.conditions,...(result.scopeWarnings??[]),...(result.requiresHumanReview?["この回答は人による確認が必要です。"]:[])],evidence,safety:{reviewed:false,dangerousAssertionsBlocked:false},scopeWarnings:result.scopeWarnings??[],confidence:result.confidence,requiresHumanReview:result.requiresHumanReview,effectiveDateStatus:result.effectiveDateStatus,usage:userId?await quota(userId,'law_chat'):await anonymousQuota(request,'law_chat'),charged:completed || b.answerAccounting==='all-answers' && typeof result.answer==='string' && result.answer.trim().length>0});
}catch(e){return failure(e);}}
