'use client';
import { useEffect,useState } from 'react';
/** Match the prerender initially, then use the device clock on native pages. */
export function useNativeNow(initialTimestamp:string){
  const [timestamp,setTimestamp]=useState(initialTimestamp);
  useEffect(()=>{
    if(process.env.NEXT_PUBLIC_ANZEN_NATIVE!=='true')return;
    const update=()=>setTimestamp(new Date().toISOString());update();
    const timer=setInterval(update,30000);
    window.addEventListener('anzen-app-active',update);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
    return()=>{clearInterval(timer);window.removeEventListener('anzen-app-active',update);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
  },[initialTimestamp]);
  return new Date(timestamp);
}
