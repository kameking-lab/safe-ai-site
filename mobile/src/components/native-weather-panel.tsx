'use client';
import { useEffect,useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { signageLocations } from '@/data/signage-locations';
import { siteApi } from '../lib/session';
import { loadWeather } from '../lib/api';
import { WeatherPanel } from './weather-panel';
import type { Snapshot,Weather } from '../lib/contracts';
type Locations={locations:Array<{locationId:string;label:string;active:boolean;primary:boolean}>;limit:number;notifications:boolean};
export function NativeWeatherPanel(){
  const [data,setData]=useState<Locations>({locations:[],limit:1,notifications:false});const [selected,setSelected]=useState('tokyo-shinjuku');const [weather,setWeather]=useState<Snapshot<Weather>|null>(null);const [message,setMessage]=useState('');const [signedIn,setSignedIn]=useState(false);const [busy,setBusy]=useState(false);
  async function refresh(){try{setData(await siteApi('/api/me/weather-locations') as Locations);setSignedIn(true);}catch{setSignedIn(false);setData({locations:[],limit:1,notifications:false});}}
  useEffect(()=>{const locationId=new URLSearchParams(window.location.search).get('locationId');if(signageLocations.some(l=>l.id===locationId))setSelected(locationId!);void refresh();const changed=()=>{void refresh();};window.addEventListener('anzen-session-changed',changed);return()=>window.removeEventListener('anzen-session-changed',changed);},[]);
  useEffect(()=>{let active=true;void loadWeather(selected).then(value=>{if(active)setWeather({schema:1,data:value,origin:'site',receivedAt:new Date().toISOString()});}).catch(()=>{if(active)setMessage('現在の警報情報を取得できません。取得失敗を「警報なし」とは扱いません。');});return()=>{active=false;};},[selected]);
  async function change(method:string,locationId=selected){if(busy)return;setBusy(true);try{setData(await siteApi('/api/me/weather-locations',{locationId},method) as Locations);setMessage('地点設定を保存しました。');}catch{setMessage('地点を保存できません。会員の上限・通信状態を確認してください。');}finally{setBusy(false);}}
  async function enablePush(){if(busy || !data.notifications)return;setBusy(true);try{
    if(Capacitor.getPlatform()!=='ios')throw new Error('iOS端末で設定してください。');
    const permission=await PushNotifications.requestPermissions();if(permission.receive!=='granted')throw new Error('通知はオフです。iOSの設定で許可できます。');
    await new Promise<void>(async(resolve,reject)=>{
      const timeout=setTimeout(()=>{cleanup();reject(new Error('通知の登録がタイムアウトしました。'));},20000);
      let remove:()=>void=()=>{};const cleanup=()=>{clearTimeout(timeout);remove();};
      const success=await PushNotifications.addListener('registration',token=>{void siteApi('/api/me/push-devices',{token:token.value}).then(()=>{cleanup();resolve();}).catch(()=>{cleanup();reject(new Error('サーバーの通知設定が準備中です。'));});});
      const failure=await PushNotifications.addListener('registrationError',()=>{cleanup();reject(new Error('端末を通知先に登録できません。'));});remove=()=>{void success.remove();void failure.remove();};
      await PushNotifications.register().catch(e=>{cleanup();reject(e);});
    });setMessage('通知を有効にしました。通知は遅延・不達の場合があります。');
  }catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  return <section className="native-panel mx-auto max-w-5xl p-5 text-slate-900"><h1 className="text-2xl font-bold">気象警報・地点と通知</h1><p role="status">{message}</p><p>登録上限：{data.limit}地点。全国・別地域の一時閲覧は無料です。市町村情報がない地点は都道府県単位の表示・通知です。</p>
    <label>閲覧する地点<select value={selected} onChange={e=>setSelected(e.target.value)}>{signageLocations.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></label>
    {signedIn?<button disabled={busy || data.locations.length>=data.limit} onClick={()=>void change('POST')}>この地点を登録</button>:<p><a href="/account">ログイン</a>するとウェブと地点を共有できます。未ログインでも警報を閲覧できます。</p>}
    <ul>{data.locations.map(l=><li key={l.locationId}><button onClick={()=>setSelected(l.locationId)}>{l.label} {l.active?'監視中':'Pro失効により停止中'}</button><button disabled={busy} onClick={()=>void change('PATCH',l.locationId)}>主地点にする</button><button disabled={busy} onClick={()=>void change('DELETE',l.locationId)}>削除</button></li>)}</ul>
    <button disabled={busy || !data.notifications} onClick={()=>void enablePush()}>Proの警報通知を有効にする</button><button disabled={busy || !signedIn} onClick={()=>{void siteApi('/api/me/push-devices',{},'DELETE').then(()=>PushNotifications.unregister()).then(()=>setMessage('通知を停止しました。')).catch(()=>setMessage('通知を停止できませんでした。'));}}>通知を停止</button>
    <WeatherPanel location={selected} value={weather} onLocation={async id=>{setSelected(id);}} online={typeof navigator==='undefined' || navigator.onLine}/>
  </section>;
}
