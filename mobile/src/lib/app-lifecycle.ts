import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { completeLogin,dismissLogin,sessionToken } from './session';
import { billing } from './billing';
/** Mounted at the root, including offline reader and cold OAuth launches. */
export function installAppLifecycle(){
  if(!Capacitor.isNativePlatform())return()=>{};
  let active=true;
  const removers:Array<()=>void>=[];
  const handle=(url:string)=>{if(active)void completeLogin(url).catch(()=>{if(active)window.dispatchEvent(new CustomEvent('anzen-native-error',{detail:'ログインを完了できませんでした。会員画面から再度お試しください。'}));});};
  const ready=App.addListener('appUrlOpen',({url})=>handle(url)).then(listener=>{if(active)removers.push(()=>{void listener.remove();});else void listener.remove();});
  void ready.then(async()=>{if(!active)return;const launch=await App.getLaunchUrl();if(active && launch)handle(launch.url);}).catch(()=>{});
  const recover=()=>{void sessionToken().then(token=>{if(active&&token)return billing.recoverSession();}).catch(()=>{});};
  recover();
  void App.addListener('appStateChange',({isActive})=>{if(active&&isActive){window.dispatchEvent(new Event('anzen-app-active'));recover();}}).then(listener=>{if(active)removers.push(()=>{void listener.remove();});else void listener.remove();}).catch(()=>{});
  void Browser.addListener('browserFinished',()=>{if(active)void dismissLogin().catch(()=>{});}).then(listener=>{if(active)removers.push(()=>{void listener.remove();});else void listener.remove();}).catch(()=>{});
  return()=>{active=false;removers.forEach(remove=>remove());};
}
