'use client';
import { useEffect,useState } from 'react';
import { SignageFleetView } from '@/app/signage/manage/fleet-view';
import type { SignageFleetSnapshot } from '@/lib/signage/fleet-snapshot';
import { useNativeQuery } from '@/lib/use-native-query';
import { siteApi } from '../lib/session';
export function NativeSignageFleet(){
  const query=useNativeQuery();const organization=query?.get('organization')??'';
  const [snapshot,setSnapshot]=useState<SignageFleetSnapshot>({records:[],organizationName:null,unavailable:'scope'});
  useEffect(()=>{
    let active=true;let generation=0;
    async function refresh(){
      const ticket=++generation;
      // Discard member-only rows immediately on session changes, resume and refresh.
      setSnapshot({records:[],organizationName:null,unavailable:organization?'fleet_unavailable':'scope'});
      if(!/^[A-Za-z0-9_-]{1,64}$/.test(organization))return;
      try{const value=await siteApi('/api/mobile/v1/signage-fleet?organization='+encodeURIComponent(organization)) as SignageFleetSnapshot;if(active&&ticket===generation)setSnapshot(value);}
      catch{if(active&&ticket===generation)setSnapshot({records:[],organizationName:null,unavailable:'fleet_unavailable'});}
    }
    void refresh();const update=()=>{void refresh();};const timer=setInterval(update,60000);
    window.addEventListener('anzen-session-changed',update);window.addEventListener('anzen-app-active',update);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('anzen-session-changed',update);window.removeEventListener('anzen-app-active',update);};
  },[organization]);
  return <SignageFleetView {...snapshot}/>;
}
