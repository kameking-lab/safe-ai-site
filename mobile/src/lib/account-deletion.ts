import { siteApi,sessionBinding,eraseSessionDataIfCurrent } from './session';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { contentStore,settingsStore } from './native';
import { collectAppLocalStorageKeys } from '@/lib/local-data-registry';
import { billing } from './billing';
export type DeletionPreparation={id:string;confirmation:string;receipt:string;expiresAt:string;subject:string;sessionBinding:string};
export type DeletionStatus={status:'prepared'|'pending'|'completed';completedAt:string|null};
type Receipt={receipt:string;subject:string;sessionBinding:string;erased:boolean};
async function finishRemovals(tasks:Promise<void>[]){const results=await Promise.allSettled(tasks);const failed=results.find(result=>result.status==='rejected');if(failed?.status==='rejected')throw failed.reason;}
async function clearDeletedAccountData(){
  await billing.forget().catch(()=>{});
  if(Capacitor.isNativePlatform())await PushNotifications.unregister().catch(()=>{});
  // Do not release the session lock while a sibling removal is still running after a failure.
  await finishRemovals(['news','revisions','statistics','weather','saved'].map(k=>contentStore.remove(k)));
  await finishRemovals(['location','large'].map(k=>settingsStore.remove(k)));
  for(const key of collectAppLocalStorageKeys(localStorage))localStorage.removeItem(key);
}
export async function prepareDeletion(){
  const binding=await sessionBinding();
  const result=await siteApi('/api/mobile/v1/account/delete',{action:'prepare'}) as Omit<DeletionPreparation,'sessionBinding'>;
  if(await sessionBinding()!==binding||!result.subject)throw new Error('REAUTH_REQUIRED');
  return {...result,sessionBinding:binding};
}
async function eraseReceiptData(record:Receipt){
  if(record.erased)return;
  await eraseSessionDataIfCurrent(record.sessionBinding,clearDeletedAccountData,async()=>{
    record.erased=true;
    await settingsStore.set('deletion-receipt',JSON.stringify(record));
  });
}
export async function confirmDeletion(preparation:DeletionPreparation){
  if(await sessionBinding()!==preparation.sessionBinding)throw new Error('REAUTH_REQUIRED');
  // Save the status-only receipt before sending. A lost response must remain recoverable.
  const record:Receipt={receipt:preparation.receipt,subject:preparation.subject,sessionBinding:preparation.sessionBinding,erased:false};
  await settingsStore.set('deletion-receipt',JSON.stringify(record));
  const result=await siteApi('/api/mobile/v1/account/delete',{action:'confirm',id:preparation.id,confirmation:preparation.confirmation,confirmationText:'削除'}) as DeletionStatus;
  if(result.status!=='prepared')await eraseReceiptData(record);return result;
}
export async function checkDeletion(){
  const stored=await settingsStore.get('deletion-receipt');if(!stored)return null;
  // Older unbound receipts can only query status; they never authorize local deletion.
  const record:Receipt|null=stored.startsWith('{')?JSON.parse(stored):null;
  const result=await siteApi('/api/mobile/v1/account/delete',{action:'status',receipt:record?.receipt??stored}) as DeletionStatus;
  if(record&&record.subject&&result.status!=='prepared')await eraseReceiptData(record);return result;
}
