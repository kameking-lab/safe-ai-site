// @vitest-environment node
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
const mock=vi.hoisted(()=>({months:new Map<string,{committedYen:number;reservedYen:number;salesPausedAt:Date|null}>(),alerts:vi.fn()}));
const expireStopped=vi.hoisted(()=>vi.fn(async()=>({closed:0})));
vi.mock('./pro-sales-checkouts',()=>({processPausedStripeCheckouts:expireStopped}));
vi.mock('../prisma',()=>({prisma:{mobileBudgetMonth:{findUnique:async({where}:{where:{month:string}})=>mock.months.get(where.month)??null,updateMany:async({where}:{where:{month:string}})=>{const row=mock.months.get(where.month);if(row)row.salesPausedAt=new Date();return {count:1};}}}}));
vi.mock('./operations-alerts',()=>({recordOperationsAlert:mock.alerts}));
import { proSalesStatus,budgetMonth,assertProSalesOpen,lockProSalesOpen } from './pro-sales-gate';
import type { Prisma } from '@prisma/client';
beforeEach(()=>{mock.months.clear();mock.alerts.mockClear();vi.stubEnv('MOBILE_LEDGER_ENABLED','true');});afterEach(()=>vi.unstubAllEnvs());
it('pauses both sales channels at 50000 yen including reservations without changing existing rights',async()=>{
  mock.months.set('2026-11',{committedYen:49950,reservedYen:50,salesPausedAt:null});
  expect((await proSalesStatus(new Date('2026-11-30T14:59:59Z'))).paused).toBe(true);
  expect(mock.alerts).toHaveBeenCalledWith('pro_sales_paused','2026-11');
  expect(expireStopped).toHaveBeenCalled();
  // The latch survives settlement and resumes automatically at midnight JST on the first.
  mock.months.get('2026-11')!.reservedYen=0;
  expect((await proSalesStatus(new Date('2026-11-30T14:59:59Z'))).paused).toBe(true);
  expect(budgetMonth(new Date('2026-11-30T15:00:00Z'))).toBe('2026-12');
  expect((await proSalesStatus(new Date('2026-11-30T15:00:00Z'))).paused).toBe(false);
});
it('permits new sales below the cap and rejects them after a stop',async()=>{
  mock.months.set(budgetMonth(),{committedYen:49999,reservedYen:0,salesPausedAt:null});await expect(assertProSalesOpen()).resolves.toBeUndefined();
  mock.months.get(budgetMonth())!.salesPausedAt=new Date();await expect(assertProSalesOpen()).rejects.toThrow('PRO_SALES_PAUSED');
});
it('holds the budget lock before reading the committed stop for checkout creation',async()=>{
  const lock=vi.fn<(...args:unknown[])=>Promise<number>>(async()=>1);
  const read=vi.fn(async()=>{expect(lock).toHaveBeenCalled();return {salesPausedAt:new Date(),committedYen:0,reservedYen:0};});
  const tx={$executeRaw:lock,mobileBudgetMonth:{findUnique:read}} as unknown as Prisma.TransactionClient;
  await expect(lockProSalesOpen(tx)).rejects.toThrow('PRO_SALES_PAUSED');
  expect(lock.mock.calls[0][1]).toBe(`anzen-budget:${budgetMonth()}`);
});
