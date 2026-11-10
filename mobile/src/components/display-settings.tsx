'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { useFurigana } from '@/contexts/furigana-context';
import { useEasyJapanese } from '@/contexts/easy-japanese-context';
type Theme='system'|'light'|'dark';
const read=(key:string)=>{try{return localStorage.getItem(key);}catch{return null;}};
const sessionSettings=new Map<string,string>();
const write=(key:string,value:string)=>{try{localStorage.setItem(key,value);sessionSettings.delete(key);}catch{sessionSettings.set(key,value);}window.dispatchEvent(new Event('anzen-display-settings'));};
const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);window.addEventListener('anzen-display-settings',notify);return()=>{window.removeEventListener('storage',notify);window.removeEventListener('anzen-display-settings',notify);};};
function useSetting(key:string){return useSyncExternalStore(subscribe,()=>sessionSettings.get(key)??read(key)??null,()=>null);}
/** Applies the saved display choices on every screen, including screens without the switches. */
export function DisplayPreferences(){
  useEffect(()=>{
    const root=document.documentElement;
    root.classList.toggle('large-font',read('large-font-enabled')==='true');
    root.classList.toggle('high-contrast',read('high-contrast-enabled')==='true');
    const media=matchMedia('(prefers-color-scheme: dark)');
    const apply=()=>{const saved=read('anzen-theme');const dark=saved==='dark'||(saved!=='light'&&media.matches);root.classList.toggle('dark',dark);root.style.colorScheme=dark?'dark':'light';};
    apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);
  },[]);
  return null;
}
export function DisplaySettings(){
  const {furiganaEnabled,toggleFurigana}=useFurigana();
  const {easyJapaneseEnabled,toggleEasyJapanese}=useEasyJapanese();
  const large=useSetting('large-font-enabled')==='true';const contrast=useSetting('high-contrast-enabled')==='true';const savedTheme=useSetting('anzen-theme');const theme:Theme=savedTheme==='dark'||savedTheme==='light'?savedTheme:'system';
  useEffect(()=>{document.documentElement.classList.toggle('large-font',large);},[large]);
  useEffect(()=>{document.documentElement.classList.toggle('high-contrast',contrast);},[contrast]);
  useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)');const apply=()=>{const dark=theme==='dark'||(theme==='system'&&media.matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light';};apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);},[theme]);
  return <details aria-label="全画面の表示設定" className="border-b bg-white px-3 py-1 text-sm text-slate-900 print:hidden"><summary className="flex min-h-11 cursor-pointer items-center font-bold">表示設定</summary><div className="mt-2 flex flex-wrap gap-2">
    <button aria-pressed={furiganaEnabled} onClick={toggleFurigana}>ふりがな</button><button aria-pressed={easyJapaneseEnabled} onClick={toggleEasyJapanese}>やさしい日本語</button>
    <button aria-pressed={large} onClick={()=>{write('large-font-enabled',String(!large));}}>文字大</button>
    <button aria-pressed={contrast} onClick={()=>{write('high-contrast-enabled',String(!contrast));}}>屋外表示</button>
    <button aria-label={`テーマ切替。現在は${theme==='system'?'端末設定':theme==='dark'?'ダーク':'ライト'}`} onClick={()=>{const next=theme==='system'?'light':theme==='light'?'dark':'system';write('anzen-theme',next);}}>テーマ</button>
  </div></details>;
}
