// @vitest-environment node
import {createHmac} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
const calls=vi.hoisted(()=>({chatbot:vi.fn(),quota:vi.fn()}));
vi.mock('@/lib/mobile/http',async importOriginal=>({...await importOriginal<typeof import('@/lib/mobile/http')>(),member:async()=> 'fixture-member',json:(v:unknown,status=200)=>Response.json(v,{status}),failure:()=>Response.json({error:'failed'},{status:503})}));
vi.mock('@/lib/mobile/usage',()=>({anonymousQuota:async()=>({limit:3,used:1,reserved:0,remaining:2,resetAt:new Date().toISOString()}),quota:async()=>{calls.quota();return {limit:3,used:1,reserved:0,remaining:2,resetAt:new Date().toISOString()};}}));
vi.mock('@/app/api/chatbot/route',()=>({POST:async()=>{const response=calls.chatbot();return Response.json(response??{answer:'fixture answer',conditions:['fixture condition'],sources:[{law:'fixture',article:'1',text:'fixture original',url:'https://laws.e-gov.go.jp/law/fixture',asOf:'2026-11-10T00:00:00Z'}],source_type:'rag',scopeWarnings:['unverified citation'],confidence:'low',requiresHumanReview:true,effectiveDateStatus:{asOf:'2026-11-10',status:'unknown',label:'unverified'}});}}));
import {POST} from './route';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it.each(['fixture guidance',''])('reports answer-based accounting even without citations: %j',async answer=>{
 calls.chatbot.mockReturnValueOnce({answer,conditions:[],sources:[],source_type:'safety'});
 const response=await POST(new Request('https://example.test/api/mobile/v1/ai',{method:'POST',headers:{'X-Anzen-Native':'1','Content-Type':'application/json'},body:JSON.stringify({version:2,feature:'law_chat',input:'fixture question',requestId:crypto.randomUUID(),privacyConfirmed:true})}));
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({status:'fallback',charged:answer.length>0});
});
it('preserves warnings, confidence and review requirements through the native adapter',async()=>{
 vi.stubEnv('AUTH_SECRET','synthetic-test-only');
 const token=createHmac('sha256','synthetic-test-only').update(`anzen-ai:fixture-member:${new Date().toISOString().slice(0,10)}`).digest('hex');
 const response=await POST(new Request('https://example.test/api/mobile/v1/ai',{method:'POST',headers:{'Content-Type':'application/json','x-anzen-csrf':token},body:JSON.stringify({version:2,feature:'law_chat',input:'fixture question',requestId:crypto.randomUUID(),privacyConfirmed:true})}));
 expect(response.status).toBe(200);const data=await response.json();expect(data.version).toBe(2);
 expect(data.conditions).toContain('unverified citation');expect(data.scopeWarnings).toEqual(['unverified citation']);expect(data.confidence).toBe('low');expect(data.requiresHumanReview).toBe(true);expect(data.effectiveDateStatus.status).toBe('unknown');expect(data.safety).toEqual({reviewed:false,dangerousAssertionsBlocked:false});
});

it('explicitly refuses legacy safety assertions before calling AI or usage',async()=>{
 const response=await POST(new Request('https://example.test/api/mobile/v1/ai',{method:'POST',body:JSON.stringify({version:1,feature:'law_chat',input:'fixture',requestId:crypto.randomUUID(),privacyConfirmed:true})}));
 expect(response.status).toBe(426);expect((await response.json()).error.code).toBe('CLIENT_UPDATE_REQUIRED');
 expect(calls.chatbot).not.toHaveBeenCalled();expect(calls.quota).not.toHaveBeenCalled();
});
it('allows authenticated native requests without display CSRF proof while rejecting cookie requests without it',async()=>{
 vi.stubEnv('AUTH_SECRET','synthetic-test-only');
 const body=JSON.stringify({version:2,feature:'law_chat',input:'fixture question',requestId:crypto.randomUUID(),privacyConfirmed:true});
 const denied=await POST(new Request('https://example.test/api/mobile/v1/ai',{method:'POST',body}));
 expect(denied.status).toBe(503);expect(calls.chatbot).not.toHaveBeenCalled();
 const native=await POST(new Request('https://example.test/api/mobile/v1/ai',{method:'POST',headers:{authorization:'Bearer synthetic-session'},body}));
 expect(native.status).toBe(200);expect(calls.chatbot).toHaveBeenCalledTimes(1);
});

it('accepts a native guest without credentials or a CSRF capability and keeps the shared route boundary',async()=>{
 const body=JSON.stringify({version:2,feature:'law_chat',input:'fixture question',requestId:crypto.randomUUID(),privacyConfirmed:true});
 const headers={'X-Anzen-Native':'1','Content-Type':'application/json',Origin:'https://example.test'};
 const response=await POST(new Request('https://example.test/api/mobile/v1/ai',{method:'POST',headers,body}));
 expect(response.status).toBe(200);expect((await response.json()).usage.remaining).toBe(2);expect(calls.chatbot).toHaveBeenCalledTimes(1);expect(calls.quota).not.toHaveBeenCalled();
 calls.chatbot.mockClear();
 const denied=await POST(new Request('https://example.test/api/mobile/v1/ai',{method:'POST',headers:{...headers,Origin:'https://evil.test'},body}));
 expect(denied.status).toBe(403);expect(calls.chatbot).not.toHaveBeenCalled();
});
