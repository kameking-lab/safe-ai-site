import { prisma } from '../prisma';
import { sendEmailSafe } from '../external/resend-safe';
import { createHash } from 'node:crypto';

export type AlertKind = 'account_deletion' | 'billing_reconcile' | 'pro_sales_paused';
/** Stable references only: raw provider messages may contain credentials or customer data. */
export async function recordOperationsAlert(kind:AlertKind,reference:string){
  try {
    if(!prisma)throw new Error('NO_STORAGE');
    await prisma.mobileOperationsAlert.upsert({where:{id:`${kind}:${reference}`},
      create:{id:`${kind}:${reference}`,kind,reference},update:{}});
  } catch { console.error('[mobile-operations] alert storage failed', {kind,reference}); }
}
export async function resolveOperationsAlert(kind:AlertKind,reference:string){
  try { await prisma?.mobileOperationsAlert.updateMany({where:{id:`${kind}:${reference}`,resolvedAt:null},data:{resolvedAt:new Date()}}); }
  catch { console.error('[mobile-operations] alert resolution storage failed',{kind,reference}); }
}
export async function deliverOperationsAlerts(deadline=Date.now()+5000){
  if(!prisma)return {sent:0};
  const alerts=await prisma.mobileOperationsAlert.findMany({where:{notifiedAt:null,nextAttempt:{lte:new Date()}},take:5,orderBy:{createdAt:'asc'}});
  let sent=0;
  for(const alert of alerts){
    if(Date.now()>deadline-1000)break;
    const recipients=(process.env.ADMIN_EMAILS??'').split(',').map(s=>s.trim()).filter(s=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s));
    const from=process.env.NOTIFY_FROM?.trim();
    let delivered=false;
    try {
      if(from&&recipients.length){
        const result=await sendEmailSafe({tag:'mobile-operations',from,to:recipients,
          subject:`安全AI 運用通知：${alert.kind}`,
          text:`種別: ${alert.kind}\n照合ID: ${alert.reference}\n発生: ${alert.createdAt.toISOString()}\n${alert.resolvedAt?'自動再試行で復旧済み':'自動記録済み。保守処理が再試行します。'}`,
          timeoutMs:Math.min(3000,Math.max(1,deadline-Date.now())),
          idempotencyKey:`mobile-alert:${createHash('sha256').update(alert.id).digest('hex')}`});
        delivered=result.delivered;
      }
    } catch { /* Keep the notification in the durable outbox. */ }
    await prisma.mobileOperationsAlert.update({where:{id:alert.id},data:delivered?{notifiedAt:new Date()}:
      {attempts:{increment:1},nextAttempt:new Date(Date.now()+Math.min(3600000,2**Math.min(alert.attempts+1,10)*10000))}});
    if(delivered)sent++;
  }
  return {sent};
}
