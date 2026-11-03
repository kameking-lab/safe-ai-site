'use client';
import { useEffect, useState } from 'react';
import { useFurigana } from '@/contexts/furigana-context';
import { useEasyJapanese } from '@/contexts/easy-japanese-context';
type Theme='system'|'light'|'dark';
const read=(key:string)=>{try{return localStorage.getItem(key);}catch{return null;}};
const write=(key:string,value:string)=>{try{localStorage.setItem(key,value);}catch{/* In-memory settings still work for this session. */}};
export function DisplaySettings(){
  const {furiganaEnabled,toggleFurigana}=useFurigana();
  const {easyJapaneseEnabled,toggleEasyJapanese}=useEasyJapanese();
  const [large,setLarge]=useState(false);const [contrast,setContrast]=useState(false);const [theme,setTheme]=useState<Theme>('system');
  useEffect(()=>{setLarge(read('large-font-enabled')==='true');setContrast(read('high-contrast-enabled')==='true');const saved=read('anzen-theme');setTheme(saved==='dark'||saved==='light'?saved:'system');},[]);
  useEffect(()=>{document.documentElement.classList.toggle('large-font',large);},[large]);
  useEffect(()=>{document.documentElement.classList.toggle('high-contrast',contrast);},[contrast]);
  useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)');const apply=()=>{const dark=theme==='dark'||(theme==='system'&&media.matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light';};apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);},[theme]);
  return <details aria-label="全画面の表示設定" className="border-b bg-white p-3 text-sm text-slate-900 print:hidden"><summary className="cursor-pointer font-bold">表示設定</summary><div className="mt-2 flex flex-wrap gap-2">
    <button aria-pressed={furiganaEnabled} onClick={toggleFurigana}>ふりがな</button><button aria-pressed={easyJapaneseEnabled} onClick={toggleEasyJapanese}>やさしい日本語</button>
    <button aria-pressed={large} onClick={()=>{write('large-font-enabled',String(!large));setLarge(!large);}}>文字大</button>
    <button aria-pressed={contrast} onClick={()=>{write('high-contrast-enabled',String(!contrast));setContrast(!contrast);}}>屋外表示</button>
    <button aria-label={`テーマ切替。現在は${theme==='system'?'端末設定':theme==='dark'?'ダーク':'ライト'}`} onClick={()=>{const next=theme==='system'?'light':theme==='light'?'dark':'system';write('anzen-theme',next);setTheme(next);}}>テーマ</button>
  </div></details>;
}
