'use client';
import { useEffect,useState } from 'react';
import { AccountSdsHistory,type SdsHistoryEntry } from '@/components/account-sds-history';
import { siteApi } from '../lib/session';
export function NativeAccountDetails(){
  const [data,setData]=useState<{displayName:string|null;email:string|null;sdsHistory:SdsHistoryEntry[]}|null>(null);const [failed,setFailed]=useState(false);
  useEffect(()=>{let active=true;void siteApi('/api/mobile/v1/account').then(result=>{if(active)setData(result as NonNullable<typeof data>);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[]);
  return <><p>{data?.displayName} {data?.email}</p><p><a href="/profile">自社プロファイル・端末データのバックアップと削除</a></p><AccountSdsHistory sdsHistory={data?.sdsHistory??[]} sdsHistoryFailed={failed}/></>;
}
