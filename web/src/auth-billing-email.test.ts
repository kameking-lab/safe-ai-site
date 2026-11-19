// @vitest-environment node
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({jwt:null as null|((args:unknown)=>Promise<unknown>),update:vi.fn()}));
vi.mock('next/headers',()=>({headers:async()=>new Headers()}));
vi.mock('@/lib/server/deployment-safety',()=>({externalCredentialedServicesAllowed:()=>true}));
vi.mock('@/lib/mobile/session',()=>({mobileAuthSession:async()=>null}));
vi.mock('@/lib/mobile/billing-service',()=>({getEntitlement:vi.fn()}));
vi.mock('@auth/prisma-adapter',()=>({PrismaAdapter:()=>({})}));
vi.mock('@/lib/prisma',()=>({prisma:{user:{updateMany:state.update}}}));
vi.mock('next-auth',()=>({default:(config:{callbacks:{jwt:typeof state.jwt}})=>{state.jwt=config.callbacks.jwt;return {};}}));
beforeEach(async()=>{
  vi.resetModules();vi.clearAllMocks();vi.stubEnv('AUTH_SECRET','synthetic');vi.stubEnv('AUTH_GOOGLE_ID','synthetic');vi.stubEnv('AUTH_GOOGLE_SECRET','synthetic');
  await import('./auth');
});
afterEach(()=>vi.unstubAllEnvs());
it.each(['google','apple'])('persists verification only from a successful %s provider login',async provider=>{
  await state.jwt!({token:{},user:{id:'member',email:'owner@example.test'},account:{provider},profile:{email:'OWNER@example.test',email_verified:true}});
  expect(state.update).toHaveBeenCalledExactlyOnceWith({where:{id:'member',email:'owner@example.test'},data:{emailVerified:expect.any(Date)}});
});
it('invalidates old verification when the provider does not verify the current email',async()=>{
  await state.jwt!({token:{},user:{id:'member',email:'owner@example.test'},account:{provider:'google'},profile:{email:'owner@example.test',email_verified:false}});
  expect(state.update).toHaveBeenCalledWith(expect.objectContaining({data:{emailVerified:null}}));
});
it('never upgrades verification from a session/JWT refresh or review credentials',async()=>{
  await state.jwt!({token:{sub:'member'}});
  await state.jwt!({token:{},user:{id:'member'},account:{provider:'app-review'}});
  expect(state.update).not.toHaveBeenCalled();
});
