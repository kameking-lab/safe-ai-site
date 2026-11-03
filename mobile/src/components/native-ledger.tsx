'use client';
import { useEffect,useState } from 'react';
import { ChemicalRaLedgerView } from '@/app/(main)/chemical-ra/ledger/ledger-view';
import type { ChemicalRaLedgerRow } from '@/lib/chemical/ra-governance-repository';
import { siteApi } from '../lib/session';
export function NativeLedger(){
  const [data,setData]=useState<{records:ChemicalRaLedgerRow[];organizationName:string|null;unavailableReason:string|null}>({records:[],organizationName:null,unavailableReason:'authentication_required'});
  useEffect(()=>{let active=true;void siteApi('/api/mobile/v1/chemical-ledger').then(raw=>{const d=raw as typeof data;const records=d.records.map(r=>({...r,sdsIssueDate:r.sdsIssueDate?new Date(r.sdsIssueDate):null,approvedAt:r.approvedAt?new Date(r.approvedAt):null,reassessmentDate:r.reassessmentDate?new Date(r.reassessmentDate):null,updatedAt:new Date(r.updatedAt)}));if(active)setData({...d,records});}).catch(()=>{});return()=>{active=false;};},[]);
  return <ChemicalRaLedgerView {...data}/>;
}
