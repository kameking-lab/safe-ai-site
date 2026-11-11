import { prisma } from '../prisma';
import { lockMember } from './billing-service';
import { expireStripeIntent } from './stripe-purchase';
import { recordOperationsAlert,resolveOperationsAlert } from './operations-alerts';

/** The committed stop and pending intents are a durable queue, including after month rollover. */
export async function processPausedStripeCheckouts(deadline=Date.now()+5000){
  if(process.env.MOBILE_LEDGER_ENABLED!=='true'||!prisma)return {closed:0};
  const stopped=await prisma.mobileBudgetMonth.findFirst({where:{salesPausedAt:{not:null}},orderBy:{month:'desc'}});
  if(!stopped)return {closed:0};
  const [year,month]=stopped.month.split('-').map(Number);
  const cutoff=new Date(Date.UTC(year,month,1)-9*3600000);
  const intents=await prisma.mobilePurchaseIntent.findMany({
    where:{source:'stripe',status:'pending',createdAt:{lt:cutoff}},orderBy:{updatedAt:'asc'},take:20,
  });
  let closed=0;
  for(const queued of intents){
    if(Date.now()>=deadline)break;
    try{
      await prisma.$transaction(async tx=>{
        await lockMember(tx,queued.userId);
        const intent=await tx.mobilePurchaseIntent.findUnique({where:{userId:queued.userId}});
        if(!intent||intent.id!==queued.id||intent.source!=='stripe'||intent.status!=='pending')return;
        // A completed payment is reconciled, never denied after accepting the money.
        await expireStripeIntent(tx,intent);
      },{timeout:20000});
      await resolveOperationsAlert('billing_reconcile',queued.id);
      closed++;
    }catch{
      // Leave the pending intent intact. Rotate failures so one outage cannot starve the queue.
      await prisma.mobilePurchaseIntent.updateMany({where:{userId:queued.userId,id:queued.id,status:'pending'},data:{updatedAt:new Date()}});
      await recordOperationsAlert('billing_reconcile',queued.id);
    }
  }
  return {closed};
}
