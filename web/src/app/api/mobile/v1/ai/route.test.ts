// @vitest-environment node
import {createHmac} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
const calls=vi.hoisted(()=>({chatbot:vi.fn(),quota:vi.fn()}));
vi.mock('@/lib/mobile/http',()=>({member:async()=> 'fixture-member',json:(v:unknown,status=200)=>Response.json(v,{status}),failure:()=>Response.json({error:'failed'},{status:503})}));
vi.mock('@/lib/mobile/usage',()=>({quota:async()=>{calls.quota();return {limit:3,used:1,reserved:0,remaining:2,resetAt:new Date().toISOString()};}}));
vi.mock('@/app/api/chatbot/route',()=>({POST:async()=>{calls.chatbot();return Response.json({answer:'fixture answer',conditions:['fixture condition'],sources:[{law:'fixture',article:'1',text:'fixture original',url:'https://laws.e-gov.go.jp/law/fixture',asOf:'2026-11-10T00:00:00Z'}],source_type:'rag',scopeWarnings:['unverified citation'],confidence:'low',requiresHumanReview:true,effectiveDateStatus:{asOf:'2026-11-10',status:'unknown',label:'unverified'}});}}));
import {POST} from './route';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
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
