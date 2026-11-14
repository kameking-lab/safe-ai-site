// @vitest-environment node
import {expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({devices:vi.fn(async(_input:unknown)=>({count:1})),sessions:vi.fn(async(_input:unknown)=>({count:1})),grant:{userId:'member',appUserId:'immutable-member-identifier',plan:'pro'}}));
vi.mock('@/lib/mobile/http',async original=>({...await original<typeof import('@/lib/mobile/http')>(),member:async()=> 'member'}));
vi.mock('@/lib/mobile/billing-service',()=>({lockMember:async()=>{},billingDb:()=>({$transaction:async(run:(tx:unknown)=>Promise<unknown>)=>run({mobilePushDevice:{updateMany:state.devices},mobileSession:{deleteMany:state.sessions}})})}));
import {POST} from './route';
it('revokes only the current session and push device, retaining the purchase owner and Pro grant',async()=>{
 const before=structuredClone(state.grant);
 const result=await POST(new Request('https://example.test/api/mobile/v1/auth/logout',{method:'POST',headers:{authorization:'Bearer synthetic-only'},body:'{}'}));
 expect(result.status).toBe(200);expect(state.devices).toHaveBeenCalledOnce();expect(state.sessions).toHaveBeenCalledOnce();
 expect(state.sessions.mock.calls[0][0]).toMatchObject({where:{userId:'member'}});expect(state.grant).toEqual(before);
});
