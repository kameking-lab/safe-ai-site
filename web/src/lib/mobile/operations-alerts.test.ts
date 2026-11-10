// @vitest-environment node
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
const mock=vi.hoisted(()=>({upsert:vi.fn(),updateMany:vi.fn(),findMany:vi.fn(),update:vi.fn(),send:vi.fn()}));
vi.mock('../prisma',()=>({prisma:{mobileOperationsAlert:{upsert:mock.upsert,updateMany:mock.updateMany,findMany:mock.findMany,update:mock.update}}}));
vi.mock('../external/resend-safe',()=>({sendEmailSafe:mock.send}));
import { recordOperationsAlert,deliverOperationsAlerts,resolveOperationsAlert } from './operations-alerts';
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('ADMIN_EMAILS','owner@example.test');vi.stubEnv('NOTIFY_FROM','alerts@example.test');mock.findMany.mockResolvedValue([{id:'account_deletion:job',kind:'account_deletion',reference:'job',attempts:0,createdAt:new Date(),resolvedAt:null}]);mock.send.mockResolvedValue({delivered:true});});afterEach(()=>vi.unstubAllEnvs());
it('deduplicates durable records and automatically notifies the configured administrator',async()=>{
  await recordOperationsAlert('account_deletion','job');await recordOperationsAlert('account_deletion','job');
  expect(mock.upsert.mock.calls[0]).toEqual(mock.upsert.mock.calls[1]);
  expect(await deliverOperationsAlerts()).toEqual({sent:1});
  expect(mock.send).toHaveBeenCalledWith(expect.objectContaining({to:['owner@example.test'],text:expect.stringContaining('照合ID: job'),idempotencyKey:expect.stringMatching(/^mobile-alert:[a-f0-9]{64}$/)}));
  expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({data:{notifiedAt:expect.any(Date)}}));
  await resolveOperationsAlert('account_deletion','job');expect(mock.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:{resolvedAt:expect.any(Date)}}));
});
it('retries undelivered and unconfigured notifications without marking them sent',async()=>{
  mock.send.mockResolvedValue({delivered:false});expect(await deliverOperationsAlerts()).toEqual({sent:0});
  expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({data:{attempts:{increment:1},nextAttempt:expect.any(Date)}}));
  vi.stubEnv('ADMIN_EMAILS','');mock.send.mockClear();await deliverOperationsAlerts();expect(mock.send).not.toHaveBeenCalled();
});
