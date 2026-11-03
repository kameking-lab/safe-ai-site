'use client';
import { useEffect,useState } from 'react';
import { installAppLifecycle } from '../lib/app-lifecycle';
export function NativeLifecycle(){
  const [message,setMessage]=useState('');
  useEffect(()=>{
    const cleanup=installAppLifecycle();const error=(event:Event)=>setMessage(String((event as CustomEvent).detail));
    window.addEventListener('anzen-native-error',error);const changed=()=>setMessage('');window.addEventListener('anzen-session-changed',changed);
    return()=>{cleanup();window.removeEventListener('anzen-native-error',error);window.removeEventListener('anzen-session-changed',changed);};
  },[]);
  return message?<p role="alert" className="bg-amber-50 p-3 text-amber-950">{message}</p>:null;
}
