// @vitest-environment node
import { beforeEach,describe,expect,it,vi } from 'vitest';
const mock=vi.hoisted(()=>({access:vi.fn(),list:vi.fn()}));
vi.mock('@/lib/prisma',()=>({prisma:{$queryRawUnsafe:vi.fn()}}));
vi.mock('@/lib/server/organization-access',()=>({requireOrganizationAccess:mock.access}));
vi.mock('./fleet-repository',()=>({listSignageFleet:mock.list}));
import { getSignageFleetSnapshot } from './fleet-snapshot';
beforeEach(()=>{vi.clearAllMocks();mock.access.mockResolvedValue({ok:true,organizationName:'テスト組織'});mock.list.mockResolvedValue([]);});
describe('shared web and iOS fleet authorization',()=>{
  it('does not query an unspecified or malformed organization',async()=>{for(const id of [null,'', '../other',['org']])expect((await getSignageFleetSnapshot(id)).unavailable).toBe('scope');expect(mock.access).not.toHaveBeenCalled();expect(mock.list).not.toHaveBeenCalled();});
  it('requires the same authenticated organization viewer permission before reading any devices',async()=>{mock.access.mockResolvedValue({ok:false,reason:'membership_required'});expect(await getSignageFleetSnapshot('other-org')).toEqual({records:[],organizationName:null,unavailable:'membership_required'});expect(mock.access).toHaveBeenCalledWith('other-org','viewer');expect(mock.list).not.toHaveBeenCalled();});
  it('serializes only authorized rows and preserves observed device state and dates',async()=>{const date=new Date('2026-11-03T01:00:00Z');mock.list.mockResolvedValue([{siteId:'site',effectiveStatus:'stale',lastSeenAt:date,acknowledgedAt:null}]);const result=await getSignageFleetSnapshot('my-org');expect(result).toEqual({organizationName:'テスト組織',unavailable:null,records:[{siteId:'site',effectiveStatus:'stale',lastSeenAt:date.toISOString(),acknowledgedAt:null}]});expect(mock.list.mock.calls[0][1]).toBe('my-org');});
  it('does not expose records or an organization name on database failure',async()=>{mock.list.mockRejectedValue(new Error('db'));expect(await getSignageFleetSnapshot('my-org')).toEqual({records:[],organizationName:null,unavailable:'fleet_unavailable'});});
});
