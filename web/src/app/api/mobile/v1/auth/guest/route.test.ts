// @vitest-environment node
import {afterEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({users:0,sessions:[] as Array<{tokenHash:string;userId:string;expiresAt:Date}>,hits:new Map<string,number>(),policies:[] as Array<{routeKey:string;limit:number;windowMs:number}>}));
vi.mock('@/lib/security/shared-state',()=>({sharedRateLimitGuard:async(_request:Request,policy:{routeKey:string;limit:number;windowMs:number})=>{
  state.policies.push(policy);const count=(state.hits.get(policy.routeKey)??0)+1;state.hits.set(policy.routeKey,count);
  return count>policy.limit?Response.json({error:{code:'rate_limited'}},{status:429}):null;
}}));
vi.mock('@/lib/mobile/billing-service',()=>({lockMember:async()=>{},billingDb:()=>({$transaction:async(run:(tx:unknown)=>Promise<unknown>)=>run({
  user:{create:async({data}:{data:Record<string,unknown>})=>{expect(data).toEqual({});state.users++;return {id:`guest-${state.users}`};}},
  mobileSession:{create:async({data}:{data:{tokenHash:string;userId:string;expiresAt:Date}})=>{state.sessions.push(data);return data;}},
})})}));
import {POST} from './route';
import {digest} from '@/lib/mobile/session';
const call=()=>POST(new Request('https://example.test/api/mobile/v1/auth/guest',{method:'POST',body:'{}'}));
afterEach(()=>{state.users=0;state.sessions=[];state.hits.clear();state.policies=[];});
it('creates an anonymous member and a long-lived session without any personal information',async()=>{
  const response=await call();expect(response.status).toBe(200);
  const body=await response.json() as {token:string;guest:boolean};
  expect(body.guest).toBe(true);expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(state.sessions).toHaveLength(1);
  // Only the digest is stored, never the bearer token itself.
  expect(state.sessions[0].tokenHash).toBe(digest(body.token));expect(state.sessions[0].userId).toBe('guest-1');
  expect(state.sessions[0].expiresAt.getTime()-Date.now()).toBeGreaterThan(364*86400000);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});
it('limits guest creation per IP to 10 an hour and creates nothing once limited',async()=>{
  for(let i=0;i<10;i++)expect((await call()).status).toBe(200);
  expect(state.policies[0]).toMatchObject({routeKey:'mobile-auth-guest',limit:10,windowMs:3600000});
  expect(state.policies.some(p=>p.routeKey==='mobile-auth-guest-day'&&p.windowMs===86400000)).toBe(true);
  expect((await call()).status).toBe(429);expect(state.users).toBe(10);
});
