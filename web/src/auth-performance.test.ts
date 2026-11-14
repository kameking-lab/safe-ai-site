// @vitest-environment node
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({deleted:false,exists:true,rights:vi.fn(),user:vi.fn(),deletion:vi.fn(),subscription:vi.fn()}));
vi.mock('next/headers',()=>({headers:async()=>new Headers()}));
vi.mock('@/lib/server/deployment-safety',()=>({externalCredentialedServicesAllowed:()=>true}));
vi.mock('@/lib/mobile/session',()=>({mobileAuthSession:async()=>null}));
vi.mock('@/lib/mobile/billing-service',()=>({getEntitlement:state.rights}));
vi.mock('@/lib/prisma',()=>({prisma:{user:{findUnique:state.user},mobileAccountDeletion:{findUnique:state.deletion},subscription:{findUnique:state.subscription}}}));
vi.mock('next-auth',()=>({default:(config:{callbacks:{session:(args:unknown)=>Promise<unknown>}})=>({auth:()=>config.callbacks.session({session:{user:{name:'fixture'}},token:{sub:'member'}})})}));
beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();state.deleted=false;state.exists=true;
 vi.stubEnv('AUTH_SECRET','synthetic-test-only');vi.stubEnv('AUTH_GOOGLE_ID','synthetic-test-only');vi.stubEnv('AUTH_GOOGLE_SECRET','synthetic-test-only');vi.stubEnv('MOBILE_LEDGER_ENABLED','true');
 state.user.mockImplementation(async()=>state.exists?{id:'member'}:null);state.deletion.mockImplementation(async()=>state.deleted?{status:'pending'}:null);
 state.rights.mockResolvedValue({plan:'pro'});
});
afterEach(()=>vi.unstubAllEnvs());
it('identity-only API authentication skips billing while retaining existence/deletion checks',async()=>{
 const {auth}=await import('./auth');
 expect(await auth({identityOnly:true})).toMatchObject({user:{id:'member'}});
 expect(state.user).toHaveBeenCalledOnce();expect(state.deletion).toHaveBeenCalledOnce();expect(state.rights).not.toHaveBeenCalled();expect(state.subscription).not.toHaveBeenCalled();
 state.deleted=true;expect(await auth({identityOnly:true})).toMatchObject({user:undefined});
 state.deleted=false;state.exists=false;expect(await auth({identityOnly:true})).toMatchObject({user:undefined});
});
it('ordinary session display loads server rights and starts independent checks concurrently',async()=>{
 let release!:(value:unknown)=>void;state.user.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const {auth}=await import('./auth');const pending=auth();
 await vi.waitFor(()=>expect(state.rights).toHaveBeenCalledOnce());expect(state.deletion).toHaveBeenCalledOnce();
 release({id:'member'});expect(await pending).toMatchObject({user:{id:'member',planName:'pro'}});
});
