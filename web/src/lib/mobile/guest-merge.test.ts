// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose in-memory doubles for the Prisma delegate surface */
import { createHash } from 'node:crypto';
import { beforeEach,describe,expect,it,vi } from 'vitest';
const state=vi.hoisted(()=>({tables:{} as Record<string,any[]>,headers:new Headers()}));
vi.mock('next/headers',()=>({headers:async()=>state.headers}));
// In-memory tables with the equality / {in} filters the merge uses.
function matches(row:any,where:any={}){return Object.entries(where).every(([key,value]:[string,any])=>value&&typeof value==='object'&&!(value instanceof Date)&&'in' in value?value.in.includes(row[key]):row[key]===value);}
function table(name:string){
  const rows=()=>state.tables[name]??=[];
  return {
    findUnique:async({where,select}:any)=>{const row=rows().find(r=>matches(r,where));if(!row)return null;return select?._count?{...row,_count:{accounts:(state.tables.account??[]).filter(a=>a.userId===row.id).length}}:{...row};},
    findMany:async({where}:any={})=>rows().filter(r=>matches(r,where)).map(r=>({...r})),
    count:async({where}:any={})=>rows().filter(r=>matches(r,where)).length,
    create:async({data}:any)=>{const row={id:`${name}-${rows().length+1}`,email:null,...data};rows().push(row);return row;},
    update:async({where,data}:any)=>{const row=rows().find(r=>matches(r,where));if(!row)throw new Error(`missing ${name}`);Object.assign(row,data);return row;},
    updateMany:async({where,data}:any)=>{const hit=rows().filter(r=>matches(r,where));hit.forEach(r=>Object.assign(r,data));return {count:hit.length};},
    delete:async({where}:any)=>{const index=rows().findIndex(r=>matches(r,where));if(index<0)throw new Error(`missing ${name}`);return rows().splice(index,1)[0];},
    deleteMany:async({where}:any={})=>{const keep=rows().filter(r=>!matches(r,where));const count=rows().length-keep.length;state.tables[name]=keep;return {count};},
  };
}
const db:any=new Proxy({},{get:(_,key:string)=>key==='$transaction'?async(run:(tx:unknown)=>Promise<unknown>)=>run(db):table(key)});
vi.mock('./billing-service',()=>({billingDb:()=>db,lockMember:async()=>{}}));
import { createGuestSession,digest,exchangeFlow,isGuestUser,mobileAuthSession } from './session';

const verifier='v'.repeat(43),code='c'.repeat(43),flow='11111111-1111-4111-8111-111111111111';
function seedFlow(userId='member'){
  state.tables.mobileAuthFlow=[{id:flow,userId,challenge:createHash('sha256').update(verifier).digest('base64url'),codeHash:digest(code),authenticatedAt:new Date(),consumedAt:null,expiresAt:new Date(Date.now()+60000),createdAt:new Date()}];
}
async function guest(){const {token}=await createGuestSession();const userId=state.tables.mobileSession.find(s=>s.tokenHash===digest(token)).userId as string;return {token,userId};}
const future=()=>new Date(Date.now()+86400000);
beforeEach(()=>{
  state.tables={user:[{id:'member',email:'member@example.test',name:'Member'}],account:[{userId:'member',provider:'apple'}]};
  state.headers=new Headers();seedFlow();
});

describe('guest members',()=>{
  it('are flagged only without email and without a linked sign-in',async()=>{
    const {token,userId}=await guest();
    expect(await isGuestUser(userId)).toBe(true);expect(await isGuestUser('member')).toBe(false);
    state.headers=new Headers({authorization:`Bearer ${token}`});
    expect((await mobileAuthSession())?.user).toMatchObject({id:userId,email:null,guest:true});
    // Linking Apple/Google later makes the same row an ordinary member.
    state.tables.account.push({userId,provider:'google'});
    expect((await mobileAuthSession())?.user.guest).toBe(false);
  });
});

describe('signing in after buying as a guest',()=>{
  it('moves the store identity, grant, intent and app data to a member without a store identity',async()=>{
    const {token,userId}=await guest();
    state.tables.mobileIdentity=[{userId,appUserId:'guest-app-user'}];
    state.tables.mobileGrant=[{id:'g1',userId,provider:'app_store',revoked:false,expiresAt:future()}];
    state.tables.mobilePurchaseIntent=[{userId,id:'intent',status:'completed'}];
    state.tables.mobileUsageOperation=[{id:'op',userId,day:'2026-11-17'}];
    state.tables.mobileWeatherLocation=[{id:'loc',userId,locationId:'tokyo'}];
    state.tables.mobilePushDevice=[{id:'device',userId}];state.tables.mobilePushOutbox=[{id:'out',deviceId:'device'}];
    const result=await exchangeFlow(flow,code,verifier,token);
    expect(result).toEqual({token:expect.stringMatching(/^[A-Za-z0-9_-]{43}$/)});
    expect(state.tables.mobileIdentity).toEqual([{userId:'member',appUserId:'guest-app-user'}]);
    expect(state.tables.mobileGrant[0].userId).toBe('member');
    expect(state.tables.mobilePurchaseIntent[0].userId).toBe('member');
    expect(state.tables.mobileUsageOperation[0].userId).toBe('member');
    expect(state.tables.mobileWeatherLocation[0].userId).toBe('member');
    expect(state.tables.mobilePushDevice).toEqual([]);expect(state.tables.mobilePushOutbox).toEqual([]);
    // The guest credential stops working and the empty guest row is removed.
    expect(state.tables.mobileSession.some(s=>s.userId===userId)).toBe(false);
    expect(state.tables.user.some(u=>u.id===userId)).toBe(false);
  });

  it('keeps the guest store identity and asks for a restore when the member already has one',async()=>{
    const {token,userId}=await guest();
    state.tables.mobileIdentity=[{userId,appUserId:'guest-app-user'},{userId:'member',appUserId:'member-app-user'}];
    state.tables.mobileGrant=[{id:'g1',userId,provider:'app_store',revoked:false,expiresAt:future()}];
    const result=await exchangeFlow(flow,code,verifier,token);
    expect(result).toMatchObject({restoreRecommended:true});
    expect(state.tables.mobileIdentity).toEqual([{userId,appUserId:'guest-app-user'},{userId:'member',appUserId:'member-app-user'}]);
    // RevenueCat transfer + reconcile() move the verified grant; nothing is reassigned here.
    expect(state.tables.mobileGrant[0].userId).toBe(userId);
    expect(state.tables.user.some(u=>u.id===userId)).toBe(true);
    expect(state.tables.mobileSession.some(s=>s.userId===userId)).toBe(false);
  });

  it('retires an unused guest identity when the member already has one',async()=>{
    const {token,userId}=await guest();
    state.tables.mobileIdentity=[{userId,appUserId:'guest-app-user'},{userId:'member',appUserId:'member-app-user'}];
    expect(await exchangeFlow(flow,code,verifier,token)).not.toHaveProperty('restoreRecommended');
    expect(state.tables.mobileIdentity).toEqual([{userId:'member',appUserId:'member-app-user'}]);
    expect(state.tables.user.some(u=>u.id===userId)).toBe(false);
  });

  it('ignores a token of a signed-in member, an unknown token and the same member',async()=>{
    state.tables.user.push({id:'other',email:'other@example.test'});state.tables.account.push({userId:'other',provider:'google'});
    state.tables.mobileSession=[{tokenHash:digest('o'.repeat(43)),userId:'other',expiresAt:future()}];
    state.tables.mobileIdentity=[{userId:'other',appUserId:'other-app-user'}];
    state.tables.mobileGrant=[{id:'g1',userId:'other',provider:'app_store',revoked:false,expiresAt:future()}];
    expect(await exchangeFlow(flow,code,verifier,'o'.repeat(43))).not.toHaveProperty('restoreRecommended');
    expect(state.tables.mobileIdentity[0].userId).toBe('other');expect(state.tables.mobileGrant[0].userId).toBe('other');
    expect(state.tables.mobileSession.some(s=>s.userId==='other')).toBe(true);
    for(const token of ['x'.repeat(43),'short']){seedFlow();await expect(exchangeFlow(flow,code,verifier,token)).resolves.toHaveProperty('token');}
    // A member's own previous session is never treated as a guest to merge.
    seedFlow();const own='m'.repeat(43);state.tables.mobileSession.push({tokenHash:digest(own),userId:'member',expiresAt:future()});
    await exchangeFlow(flow,code,verifier,own);expect(state.tables.mobileSession.some(s=>s.tokenHash===digest(own))).toBe(true);
    expect(state.tables.user.map(u=>u.id).sort()).toEqual(['member','other']);
  });
});
