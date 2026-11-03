'use client';
import { useEffect,useState } from 'react';
/** Static native pages share the web controls; restore only their validated URL state after hydration. */
export function useNativeQuery(){
  const [query,setQuery]=useState<URLSearchParams|null>(null);
  useEffect(()=>{
    if(process.env.NEXT_PUBLIC_ANZEN_NATIVE!=='true')return;
    const update=()=>setQuery(new URLSearchParams(window.location.search));update();
    window.addEventListener('popstate',update);window.addEventListener('anzen-navigation',update);
    return()=>{window.removeEventListener('popstate',update);window.removeEventListener('anzen-navigation',update);};
  },[]);
  return query;
}
