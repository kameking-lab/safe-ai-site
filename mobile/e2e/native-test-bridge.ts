import type { BrowserContext } from '@playwright/test';

/** Replace only native plugin boundaries; use the real transport and shared UI. */
export async function installNativeTestBridge(context:BrowserContext,signedIn=false){
  await context.addInitScript((signedIn)=>{
    const prefs=new Map<string,string>();const vault=new Map<string,string>();if(signedIn){prefs.set('anzen.install.session-initialized','1');vault.set('session','fixture-session');}
    const listeners=new Map<string,(value:unknown)=>void>();
    const bridgeFetch=window.fetch.bind(window);
    const plugins:Record<string,string[]>={NativeVault:['get','set','clear'],Preferences:['get','set','remove'],Browser:['open','addListener','removeListener'],App:['getLaunchUrl','addListener','removeListener'],PushNotifications:['addListener','removeListener'],NativeChatStream:['start','cancel','addListener','removeListener'],CapacitorHttp:['request'],NativeDocuments:['printPage'],NativeSpeech:['start','stop','addListener','removeListener']};
    Object.assign(window,{webkit:{messageHandlers:{bridge:{}}},Capacitor:{
      PluginHeaders:Object.entries(plugins).map(([name,methods])=>({name,methods:methods.map(name=>({name,rtype:name==='addListener'?'callback':'promise'}))})),
      nativeCallback:(plugin:string,method:string,options:{eventName:string},callback:(value:unknown)=>void)=>{listeners.set(plugin+':'+options.eventName,callback);return Promise.resolve('fixture-listener');},
      nativePromise:async(plugin:string,method:string,options:Record<string,string>)=>{
        if(plugin==='Preferences'||plugin==='NativeVault'){
          const store=plugin==='Preferences'?prefs:vault;const key=options?.key??options?.purpose??'session';
          if(method==='get')return {value:store.get(key)??null};
          if(method==='set')store.set(key,options.value);else store.delete(key);return {};
        }
        if(plugin==='CapacitorHttp'){
          const request=options as unknown as {url:string;method:string;headers:Record<string,string>;data?:unknown};
          const response=await bridgeFetch(request.url,{method:request.method,headers:request.headers,...(request.data?{body:typeof request.data==='string'?request.data:JSON.stringify(request.data)}:{})});
          return {url:response.url,status:response.status,headers:Object.fromEntries(response.headers),data:await response.json()};
        }
        if(plugin==='NativeChatStream'&&method==='start'){
          const request=options as unknown as {id:string;body:string;headers:Record<string,string>};
          const response=await bridgeFetch('https://www.anzen-ai-portal.jp/api/chatbot/stream',{method:'POST',headers:request.headers,body:request.body});
          const emit=listeners.get('NativeChatStream:response')!;
          emit({id:request.id,kind:'headers',status:response.status,headers:Object.fromEntries(response.headers)});
          const bytes=new Uint8Array(await response.arrayBuffer());
          emit({id:request.id,kind:'chunk',data:btoa(String.fromCharCode(...bytes))});emit({id:request.id,kind:'end'});
        }
        return {};
      },
    }});
  },signedIn);
}
