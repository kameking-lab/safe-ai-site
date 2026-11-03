import { siteApi,forgetLocalSession } from './session';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { contentStore,settingsStore } from './native';
import { collectAppLocalStorageKeys } from '@/lib/local-data-registry';
import { billing } from './billing';
export type DeletionPreparation={id:string;confirmation:string;receipt:string;expiresAt:string};
export type DeletionStatus={status:'prepared'|'pending'|'completed';completedAt:string|null};
export async function clearDeletedAccountData(){
  await forgetLocalSession();await billing.forget().catch(()=>{});
  if(Capacitor.isNativePlatform())await PushNotifications.unregister().catch(()=>{});
  await Promise.all(['news','revisions','statistics','weather','saved'].map(k=>contentStore.remove(k)));
  await Promise.all(['location','large'].map(k=>settingsStore.remove(k)));
  for(const key of collectAppLocalStorageKeys(localStorage))localStorage.removeItem(key);
}
export async function prepareDeletion(){return await siteApi('/api/mobile/v1/account/delete',{action:'prepare'}) as DeletionPreparation;}
export async function confirmDeletion(preparation:DeletionPreparation){
  // Save the status-only receipt before sending. A lost response must remain recoverable.
  await settingsStore.set('deletion-receipt',preparation.receipt);
  const result=await siteApi('/api/mobile/v1/account/delete',{action:'confirm',id:preparation.id,confirmation:preparation.confirmation,confirmationText:'削除'}) as DeletionStatus;
  await clearDeletedAccountData();return result;
}
export async function checkDeletion(){
  const receipt=await settingsStore.get('deletion-receipt');if(!receipt)return null;
  const result=await siteApi('/api/mobile/v1/account/delete',{action:'status',receipt}) as DeletionStatus;
  if(result.status!=='prepared')await clearDeletedAccountData();return result;
}
