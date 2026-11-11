import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import product from './product-policy';
import { recordOperationsAlert } from './operations-alerts';
import { processPausedStripeCheckouts } from './pro-sales-checkouts';

export const PRO_SALES_PAUSED_MESSAGE='今月のPro新規受付は終了しました。来月1日に再開します。';
export function budgetMonth(now=new Date()){return new Date(now.getTime()+9*3600000).toISOString().slice(0,7);}
/** Caller holds the budget lock when this is used while reserving provider cost. */
export async function pauseProSales(tx:Prisma.TransactionClient,month:string){
  await tx.mobileBudgetMonth.updateMany({where:{month,salesPausedAt:null},data:{salesPausedAt:new Date()}});
  // Same transaction as the stop: a crash cannot lose the notification.
  await tx.mobileOperationsAlert.upsert({where:{id:`pro_sales_paused:${month}`},
    create:{id:`pro_sales_paused:${month}`,kind:'pro_sales_paused',reference:month},update:{}});
}
export async function proSalesStatus(now=new Date()){
  if(process.env.MOBILE_LEDGER_ENABLED!=='true')return {paused:false,message:null};
  if(!prisma)throw new Error('ENTITLEMENT_SYNC_PENDING');
  const month=budgetMonth(now);
  const budget=await prisma.mobileBudgetMonth.findUnique({where:{month}});
  const paused=!!budget?.salesPausedAt || !!budget&&budget.committedYen+budget.reservedYen>=product.monthlyBudgetYen;
  if(paused){
    const newlyPaused=!budget?.salesPausedAt;
    if(newlyPaused)await prisma.mobileBudgetMonth.updateMany({where:{month,salesPausedAt:null},data:{salesPausedAt:new Date()}});
    await recordOperationsAlert('pro_sales_paused',month);
    if(newlyPaused)await processPausedStripeCheckouts().catch(()=>{});
  }
  return {paused,message:paused?PRO_SALES_PAUSED_MESSAGE:null};
}
export async function assertProSalesOpen(){if((await proSalesStatus()).paused)throw new Error('PRO_SALES_PAUSED');}

/** Serialize Checkout creation with the budget stop; caller keeps this lock until creation commits. */
export async function lockProSalesOpen(tx:Prisma.TransactionClient){
  const month=budgetMonth();
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`anzen-budget:${month}`},0))`;
  const budget=await tx.mobileBudgetMonth.findUnique({where:{month}});
  if(budget?.salesPausedAt || budget&&budget.committedYen+budget.reservedYen>=product.monthlyBudgetYen)throw new Error('PRO_SALES_PAUSED');
}
