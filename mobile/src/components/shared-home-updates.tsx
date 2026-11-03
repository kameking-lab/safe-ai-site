'use client';
import { useEffect,useState } from 'react';
import { HomeSafetyUpdates as CanonicalView } from '../../../web/src/components/home/home-safety-updates';
import type { HomeLatestAccidentNews } from '@/lib/home/home-accident-server';
import { siteApi } from '../lib/session';
import { contentStore } from '../lib/native';
export function HomeSafetyUpdates({latestNews}:{latestNews:HomeLatestAccidentNews}){
  const [news,setNews]=useState(latestNews);const [saved,setSaved]=useState(false);
  useEffect(()=>{let active=true;void (async()=>{
    const raw=await contentStore.get('home-news').catch(()=>null);if(raw && active){try{const value=JSON.parse(raw) as HomeLatestAccidentNews;if(value && ['live','unavailable'].includes(value.status) && Array.isArray(value.items)){setNews(value);setSaved(true);}}catch{}}
    try{const fresh=await siteApi('/api/mobile/v1/home-news') as HomeLatestAccidentNews;if(!fresh || !Array.isArray(fresh.items) || !['live','unavailable'].includes(fresh.status))return;await contentStore.set('home-news',JSON.stringify(fresh));if(active){setNews(fresh);setSaved(false);}}catch{}
  })();return()=>{active=false;};},[]);
  return <>{saved?<p className="bg-amber-50 p-3 text-sm text-amber-950">最後に保存した報道見出しです。確認日時：{news.checkedAt}</p>:null}<CanonicalView latestNews={news}/></>;
}
