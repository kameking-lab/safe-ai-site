'use client';
import { usePathname } from 'next/navigation';
import { SafetyNotice } from './safety-notice';
import { DisplayPreferences } from './display-settings';
// Nothing stacked above every page: preferences apply everywhere, their switches live in 全機能
// (and the home 設定 tab), and the emergency line shows on the home screen only.
export function GlobalSupport(){
  const pathname=usePathname().replace(/\/$/,'')||'/';
  return <><DisplayPreferences/>{pathname==='/'?<SafetyNotice/>:null}</>;
}
