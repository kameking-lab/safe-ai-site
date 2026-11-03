// @vitest-environment node
import { beforeEach,afterEach,describe,expect,it,vi } from 'vitest';
const mock=vi.hoisted(()=>({device:{id:'device',userId:'member',sessionHash:'session',token:'mock-token',enabled:true,environment:'production'},latest:{} as Record<string,unknown>,session:{} as Record<string,unknown>,notifications:true,locks:[] as string[],update:vi.fn()}));
vi.mock('./billing-service',()=>({
  lockPushDevice:async()=>{mock.locks.push('device');},lockMember:async()=>{mock.locks.push('member');},getEntitlement:async()=>({}),entitlementInTransaction:async()=>({syncState:'verified',limits:{notifications:mock.notifications,weatherLocations:10}}),
  billingDb:()=>{
    const tx={mobilePushDevice:{findUnique:async()=>mock.latest},mobileSession:{findUnique:async()=>mock.session},mobileWeatherLocation:{findMany:async()=>[{locationId:'tokyo-shinjuku'}]},mobileWeatherState:{findUnique:async()=>({sourceAt:new Date(),alerts:[{id:'test-alert'}]})},mobilePushOutbox:{update:mock.update}};
    return {$transaction:async(fn:(value:typeof tx)=>Promise<void>)=>fn(tx),mobilePushDevice:{findUnique:async()=>mock.device},mobilePushOutbox:{findMany:async()=>[{id:'outbox',deviceId:'device',eventId:'JP-13:test-alert',locationId:'tokyo-shinjuku',payload:{aps:{alert:'mock'}},expiresAt:new Date(Date.now()+300000),attempts:0}],updateMany:async()=>({count:1}),update:mock.update}};
  },
}));
import { deliverWeather } from './notification-worker';
beforeEach(()=>{vi.clearAllMocks();mock.locks=[];mock.latest={...mock.device};mock.session={userId:'member',expiresAt:new Date(Date.now()+86400000)};mock.notifications=true;for(const key of ['APNS_KEY_ID','APNS_TEAM_ID','APNS_PRIVATE_KEY','APNS_TOPIC'])vi.stubEnv(key,'mock-only');});afterEach(()=>vi.unstubAllEnvs());
describe('APNs delivery checks current device ownership under the shared locks',()=>{
  it('sends a current warning only after device and member locks',async()=>{const send=vi.fn(async()=>({status:200}));await deliverWeather(send);expect(mock.locks).toEqual(['device','member']);expect(send).toHaveBeenCalledTimes(1);expect(mock.update).toHaveBeenCalledWith({where:{id:'outbox'},data:{status:'sent'}});});
  it('discards an old outbox when a token is reassigned to another member or session',async()=>{for(const change of [{userId:'other-member'},{sessionHash:'other-session'},{enabled:false}]){mock.latest={...mock.device,...change};const send=vi.fn(async()=>({status:200}));await deliverWeather(send);expect(send).not.toHaveBeenCalled();expect(mock.update).toHaveBeenCalledWith({where:{id:'outbox'},data:{status:'discarded'}});}});
  it('does not send after logout, expiry, account mismatch or loss of Pro rights',async()=>{for(const session of [null,{userId:'other-member',expiresAt:new Date(Date.now()+100000)},{userId:'member',expiresAt:new Date(0)}]){mock.session=session as unknown as Record<string,unknown>;const send=vi.fn(async()=>({status:200}));await deliverWeather(send);expect(send).not.toHaveBeenCalled();}mock.session={userId:'member',expiresAt:new Date(Date.now()+100000)};mock.notifications=false;const send=vi.fn(async()=>({status:200}));await deliverWeather(send);expect(send).not.toHaveBeenCalled();});
});
