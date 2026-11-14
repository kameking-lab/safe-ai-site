// @vitest-environment node
import {afterEach,expect,it,vi} from 'vitest';
const session=vi.hoisted(()=>vi.fn());
vi.mock('@/auth',()=>({auth:session}));
import {GET} from './route';
afterEach(()=>vi.clearAllMocks());
it('returns only the display identity without requesting billing hydration',async()=>{
 session.mockResolvedValue({user:{id:'member',name:'fixture',email:'fixture@example.test',image:null,planName:'pro',appUserId:'internal'}});
 const response=await GET();expect(session).toHaveBeenCalledWith({identityOnly:true});
 expect(await response.json()).toEqual({user:{name:'fixture',email:'fixture@example.test',image:null}});
 expect(response.headers.get('cache-control')).toBe('private, no-store');expect(response.headers.get('vary')).toBe('Authorization, Cookie');
 expect(response.headers.get('server-timing')).toContain('auth;dur=');
});
it('returns a guest for an expired or deleted identity and fails closed on errors',async()=>{
 for(const value of [null,{user:undefined}]){session.mockResolvedValue(value);expect(await (await GET()).json()).toEqual({user:null});}
 session.mockRejectedValue(new Error('offline'));expect((await GET()).status).toBe(503);
});
