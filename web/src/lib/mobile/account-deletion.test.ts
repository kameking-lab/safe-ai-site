// @vitest-environment node
import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { createHash } from 'node:crypto';
const state=vi.hoisted(()=>({job:null as any,session:null as any,apple:false,db:null as any,deleted:vi.fn(),revoked:vi.fn(),fetch:vi.fn()}));
vi.mock('./billing-service',()=>({billingDb:()=>state.db,lockMember:async()=>{}}));
import { prepareAccountDeletion,confirmAccountDeletion,accountDeletionStatus,processAccountDeletion } from './account-deletion';
const credential='a'.repeat(43);const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const request=()=>new Request('https://example.test/api/mobile/v1/account/delete',{method:'POST',headers:{Authorization:`Bearer ${credential}`}});
beforeEach(()=>{
  vi.clearAllMocks();state.job=null;state.apple=false;state.session={userId:'member-a',createdAt:new Date(),expiresAt:new Date(Date.now()+86400000)};
  const delegates=new Map<string,any>();
  state.db=new Proxy({}, {get:(_,key:string)=>{
    if(key==='$transaction')return async(run:(tx:any)=>Promise<unknown>)=>run(state.db);
    if(!delegates.has(key))delegates.set(key,{updateMany:vi.fn(async()=>({count:1})),deleteMany:vi.fn(async()=>({count:1})),findMany:vi.fn(async()=>[]),findUnique:vi.fn(async()=>null)});
    const model=delegates.get(key);
    if(key==='mobileSession'){model.findUnique=async()=>state.session;model.deleteMany=state.revoked;}
    if(key==='mobileIdentity')model.findUnique=async()=>({appUserId:'immutable-app-id'});
    if(key==='account'){model.findFirst=async()=>state.apple?{refresh_token:'test_fixture_token'}:null;model.findMany=async()=>state.apple?[{refresh_token:'test_fixture_token',access_token:null}]:[];}
    if(key==='user')model.delete=state.deleted;
    if(key==='mobileAccountDeletion'){
      model.findUnique=async({where}:any)=>state.job&&(where.id===state.job.id||where.userId===state.job.userId||where.receiptHash===state.job.receiptHash)?state.job:null;
      model.upsert=async({create,update}:any)=>{state.job=state.job?{...state.job,...update}:{id:'88888888-1111-4111-8111-111111111111',auditSubject:'anonymous-a',...create};return state.job;};
      model.update=async({data}:any)=>{Object.assign(state.job,data);return state.job;};
    }
    return model;
  }});
  vi.stubEnv('SAFE_AI_STAGING_MODE','false');vi.stubEnv('AUTH_APPLE_ID','test_client');vi.stubEnv('AUTH_APPLE_SECRET','test_fixture_only');state.fetch.mockResolvedValue({ok:true});vi.stubGlobal('fetch',state.fetch);
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('authenticated in-app account deletion',()=>{
  it('rejects stale or another member session before preparing a deletion',async()=>{state.session.createdAt=new Date(Date.now()-300001);await expect(prepareAccountDeletion(request(),'member-a')).rejects.toThrow('REAUTH_REQUIRED');state.session.createdAt=new Date();await expect(prepareAccountDeletion(request(),'other')).rejects.toThrow('REAUTH_REQUIRED');expect(state.job).toBeNull();});
  it('requires the same member, confirmation token and original session',async()=>{const p=await prepareAccountDeletion(request(),'member-a');await expect(confirmAccountDeletion(request(),'member-a',p.id,'b'.repeat(43))).rejects.toThrow('INVALID_REQUEST');expect(state.revoked).not.toHaveBeenCalled();expect(state.deleted).not.toHaveBeenCalled();});
  it('deletes personal data and sessions, retaining only an anonymous purchase owner',async()=>{const p=await prepareAccountDeletion(request(),'member-a');expect(await confirmAccountDeletion(request(),'member-a',p.id,p.confirmation)).toMatchObject({status:'completed'});expect(state.revoked).toHaveBeenCalled();expect(state.deleted).toHaveBeenCalledWith({where:{id:'member-a'}});expect(state.db.mobileGrant.updateMany).toHaveBeenCalledWith({where:{userId:'member-a'},data:{userId:'anonymous-a',revoked:true}});expect(state.job.userId).toBeNull();expect(await accountDeletionStatus(p.receipt)).toMatchObject({status:'completed'});await expect(accountDeletionStatus('b'.repeat(43))).rejects.toThrow('INVALID_REQUEST');});
  it('keeps a durable pending job when Apple revocation fails, then completes on retry',async()=>{state.apple=true;state.fetch.mockResolvedValueOnce({ok:false});const p=await prepareAccountDeletion(request(),'member-a');expect(await confirmAccountDeletion(request(),'member-a',p.id,p.confirmation)).toMatchObject({status:'pending'});expect(state.deleted).not.toHaveBeenCalled();await processAccountDeletion(p.id);expect(state.deleted).toHaveBeenCalledTimes(1);expect(state.fetch).toHaveBeenCalledWith('https://appleid.apple.com/auth/revoke',expect.objectContaining({method:'POST',redirect:'error'}));expect(await accountDeletionStatus(p.receipt)).toMatchObject({status:'completed'});});
});
