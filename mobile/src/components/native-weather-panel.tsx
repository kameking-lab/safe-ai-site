'use client';
import { useCallback,useContext,useEffect,useRef,useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { ProPurchasePresentationContext } from '@/components/pro-upsell-card';
import { signageLocations } from '@/data/signage-locations';
import { ensureSession,siteApi } from '../lib/session';
import { startProPurchase } from '../lib/pro-purchase';
import { loadWeather } from '../lib/api';
import { registerWeatherPush } from '../lib/push-registration';
import { WeatherPanel } from './weather-panel';
import type { Snapshot,Weather } from '../lib/contracts';
type Locations={locations:Array<{locationId:string;label:string;active:boolean;primary:boolean}>;limit:number;notifications:boolean};
export function NativeWeatherPanel(){
  const offer = useContext(ProPurchasePresentationContext);
  const refreshGeneration=useRef(0);
  const [online,setOnline]=useState(true);
  const [data,setData]=useState<Locations>({locations:[],limit:1,notifications:false});const [selected,setSelected]=useState('tokyo-shinjuku');const [weather,setWeather]=useState<Snapshot<Weather>|null>(null);const [message,setMessage]=useState('');const [signedIn,setSignedIn]=useState(false);const [busy,setBusy]=useState(false);
  const refresh=useCallback(async()=>{const ticket=++refreshGeneration.current;setData({locations:[],limit:1,notifications:false});setSignedIn(false);try{const result=await siteApi('/api/me/weather-locations') as Locations;if(ticket===refreshGeneration.current){setData(result);setSignedIn(true);}}catch{/* Unknown rights never enable notifications. */}},[]);
  useEffect(()=>{const locationId=new URLSearchParams(window.location.search).get('locationId');if(signageLocations.some(l=>l.id===locationId))setSelected(locationId!);void refresh();const changed=()=>{void refresh();};window.addEventListener('anzen-session-changed',changed);window.addEventListener('anzen-app-active',changed);window.addEventListener('anzen-entitlement-changed',changed);return()=>{refreshGeneration.current++;window.removeEventListener('anzen-session-changed',changed);window.removeEventListener('anzen-app-active',changed);window.removeEventListener('anzen-entitlement-changed',changed);};},[refresh]);
  useEffect(()=>{
    let active=true;let inFlight=false;
    async function update(){if(inFlight)return;inFlight=true;setOnline(navigator.onLine);try{const value=await loadWeather(selected);if(active){setWeather({schema:1,data:value,origin:'site',receivedAt:new Date().toISOString()});setMessage('警報情報を更新しました。');}}catch{if(active){setWeather(previous=>previous?{...previous,data:{...previous.data,state:'unavailable'}}:null);setMessage('現在の警報情報を取得できません。取得失敗を「警報なし」とは扱いません。');}}finally{inFlight=false;}}
    void update();const refreshWeather=()=>{void update();};const offline=()=>{setOnline(false);setWeather(previous=>previous?{...previous,data:{...previous.data,state:'unavailable'}}:null);};const timer=setInterval(refreshWeather,60000);
    window.addEventListener('anzen-app-active',refreshWeather);window.addEventListener('online',refreshWeather);window.addEventListener('offline',offline);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('anzen-app-active',refreshWeather);window.removeEventListener('online',refreshWeather);window.removeEventListener('offline',offline);};
  },[selected]);
  // Saving a location never asks for registration (App Store 5.1.1(v)): without a session, a guest
  // session with no personal data is created first, exactly as for a purchase.
  async function change(method:string,locationId=selected){if(busy)return;setBusy(true);try{if(method==='POST')await ensureSession();setData(await siteApi('/api/me/weather-locations',{locationId},method) as Locations);setSignedIn(true);setMessage('地点設定を保存しました。');}catch{setMessage('地点を保存できません。登録上限・通信状態を確認してください。');}finally{setBusy(false);}}
  // Pro (10 locations and notifications) is bought right here, without registering.
  async function buyPro(){if(busy)return;setBusy(true);try{const result=await startProPurchase();if(result.message)setMessage(result.message);}finally{setBusy(false);}void refresh();}
  async function enablePush(){if(busy || !data.notifications)return;setBusy(true);try{
    if(Capacitor.getPlatform()!=='ios')throw new Error('iOS端末で設定してください。');
    const permission=await PushNotifications.requestPermissions();if(permission.receive!=='granted')throw new Error('通知はオフです。iOSの設定で許可できます。');
    await registerWeatherPush();setMessage('通知を有効にしました。通知は遅延・不達の場合があります。');
  }catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  return <section className="native-panel mx-auto max-w-5xl p-5 text-slate-900"><h1 className="text-2xl font-bold">気象警報・地点と通知</h1><p role="status">{message}</p><p>登録上限：{data.limit}地点。全国・別地域の一時閲覧は無料です。市町村情報がない地点は都道府県単位の表示・通知です。</p>
    <label>閲覧する地点<select value={selected} onChange={e=>setSelected(e.target.value)}>{signageLocations.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></label>
    <button disabled={busy || (signedIn && data.locations.length>=data.limit)} onClick={()=>void change('POST')}>この地点を登録</button>
    {!data.notifications && <div>
      <button disabled={busy} onClick={()=>void buyPro()}>Proにする（{offer?.price ? `月額${offer.price}` : '月額プラン'}）</button>
      <p>警報10地点と通知。1か月ごとに自動更新され、App Storeで解約できます。</p>
      <p><a href="/terms">利用規約</a> · <a href="/privacy">プライバシーポリシー</a></p>
    </div>}
    <ul>{data.locations.map(l=><li key={l.locationId}><button onClick={()=>setSelected(l.locationId)}>{l.label} {l.active?'監視中':'Pro失効により停止中'}</button><button disabled={busy} onClick={()=>void change('PATCH',l.locationId)}>主地点にする</button><button disabled={busy} onClick={()=>void change('DELETE',l.locationId)}>削除</button></li>)}</ul>
    <button disabled={busy || !data.notifications} onClick={()=>void enablePush()}>Proの警報通知を有効にする</button><button disabled={busy || !signedIn} onClick={()=>{if(busy)return;setBusy(true);void siteApi('/api/me/push-devices',{},'DELETE').then(async()=>{if(Capacitor.getPlatform()==='ios')await PushNotifications.unregister();setMessage('通知を停止しました。');}).catch(()=>setMessage('通知を停止できませんでした。')).finally(()=>setBusy(false));}}>通知を停止</button>
    <WeatherPanel location={selected} value={weather} onLocation={async id=>{setSelected(id);}} online={online} memberSettings locationOptions={signageLocations.map(l=>({id:l.id,label:l.label,cityCode:l.jmaCityCode}))}/>
  </section>;
}
