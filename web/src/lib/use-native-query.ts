'use client';
import { useEffect,useEffectEvent,useState } from 'react';
/** Static native pages share the web controls; restore only their validated URL state after hydration. */
export function useNativeQuery(onChange?:(query:URLSearchParams)=>void){
  const [query,setQuery]=useState<URLSearchParams|null>(null);
  const notify=useEffectEvent((next:URLSearchParams)=>onChange?.(next));
  useEffect(()=>{
    if(process.env.NEXT_PUBLIC_ANZEN_NATIVE!=='true')return;
    const update=()=>{const next=new URLSearchParams(window.location.search);setQuery(next);notify(next);};update();
    window.addEventListener('popstate',update);window.addEventListener('anzen-navigation',update);
    return()=>{window.removeEventListener('popstate',update);window.removeEventListener('anzen-navigation',update);};
  },[]);
  return query;
}
