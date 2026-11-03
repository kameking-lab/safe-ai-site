import { PushNotifications } from '@capacitor/push-notifications';
import { siteApi } from './session';
type Push=Pick<typeof PushNotifications,'addListener'|'register'>;
/** Keep listener failures and timeouts in the same promise; always release native listeners. */
export async function registerWeatherPush(push:Push=PushNotifications,send=siteApi,timeoutMs=20000){
  const removers:Array<()=>Promise<void>>=[];let settled=false;
  let resolve!:()=>void;let reject!:(error:unknown)=>void;
  const result=new Promise<void>((done,failed)=>{resolve=done;reject=failed;});
  // Attach a rejection observer before waiting for asynchronous listener setup.
  void result.catch(()=>{});
  const fail=(error:unknown)=>{if(!settled){settled=true;reject(error);}};
  const timer=setTimeout(()=>fail(new Error('通知の登録がタイムアウトしました。')),timeoutMs);
  try{
    const success=await push.addListener('registration',token=>{
      if(settled)return;
      void send('/api/me/push-devices',{token:token.value}).then(()=>{if(!settled){settled=true;resolve();}}).catch(()=>fail(new Error('サーバーの通知設定が準備中です。')));
    });removers.push(()=>success.remove());
    if(!settled){const failure=await push.addListener('registrationError',()=>fail(new Error('端末を通知先に登録できません。')));removers.push(()=>failure.remove());}
    if(!settled)void push.register().catch(fail);
    await result;
  }finally{settled=true;clearTimeout(timer);await Promise.allSettled(removers.map(remove=>remove()));}
}
