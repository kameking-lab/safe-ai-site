import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test,expect } from './fixtures';
import { capability } from '../tests/fixtures';
import product from '../../web/src/lib/mobile/product-policy.json' with {type:'json'};

const host='https://www.anzen-ai-portal.jp';
const cors={'Access-Control-Allow-Origin':'http://127.0.0.1:3213','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,x-anzen-native,x-operation-id,origin,accept'};

test('native guest receives answers, a 429 offers one purchase button, and only that button starts login',async({page,context},info)=>{
  await page.setViewportSize({width:390,height:844});
  await context.route('https://**/*',route=>route.abort());
  let answered=0;let logins=0;const statuses:number[]=[];
  const limit=product.limits.free.law_chat;
  const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
  const resetAt=new Date(Date.parse(today+'T00:00:00+09:00')+86400000).toISOString();
  await context.route(host+'/api/**',async route=>{
    const request=route.request();const url=new URL(request.url());
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    if(url.pathname.endsWith('/capabilities')){
      const cap=capability();cap.session='anonymous';cap.upgrade=true;
      cap.features.law_chat.quota={...cap.features.law_chat.quota,used:answered,remaining:Math.max(0,limit-answered),resetAt};
      return route.fulfill({headers:cors,json:cap});
    }
    if(url.pathname==='/api/chatbot/stream'){
      expect(request.headers()['x-anzen-native']).toBe('1');expect(request.headers()['authorization']).toBeUndefined();
      expect(request.postDataJSON().privacyConfirmed).toBe(true);
      if(answered>=limit){statuses.push(429);return route.fulfill({status:429,headers:cors,json:{error:{code:'DAILY_LIMIT_REACHED',plan:'free',upgrade:true,message:'今日の無料回数はここまでです。',resetAt}}});}
      answered++;statuses.push(200);
      const answer='作業の種類と現場の条件を整理して確認します。';
      return route.fulfill({headers:{...cors,'Content-Type':'text/event-stream'},body:`event: text\ndata: ${JSON.stringify({chunk:answer})}\n\nevent: meta\ndata: ${JSON.stringify({answer,sources:[],source_type:'safety',confidence:'low',requiresHumanReview:true})}\n\n`});
    }
    if(url.pathname==='/api/mobile/v1/auth/start'){
      logins++;const flow='88888888-1111-4111-8111-111111111111';
      return route.fulfill({headers:cors,json:{flow,authorizeUrl:host+'/api/mobile/v1/auth/authorize?flow='+flow}});
    }
    return route.fulfill({status:401,headers:cors,json:{error:{code:'UNAUTHORIZED'}}});
  });
  // Exercise the native fetch/stream adapters with an empty Keychain. Only the iOS
  // plugin boundary is replaced; canonical chat rendering and purchase handling run normally.
  await context.addInitScript(()=>{
    const prefs=new Map<string,string>();const vault=new Map<string,string>();
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
  });
  await page.goto('/chatbot/');
  // WebKit safe-area emulation; preserve the production CSS while assigning the iPhone inset.
  await page.addStyleTag({content:'body{padding-top:59px!important}body::before{height:59px!important}header.sticky{top:59px!important}.fixed.inset-0{padding-top:59px!important}'});
  await expect(page.getByLabel('AIの利用枠')).toContainText(`残り${limit}／${limit}`);
  const input=page.getByRole('textbox');
  for(let i=0;i<limit;i++){
    await input.fill('作業前に確認する条件を整理したい');await page.getByRole('button',{name:'送信',exact:true}).click();
    await expect(page.getByLabel('AIの利用枠')).toContainText(`残り${limit-i-1}／${limit}`);
    if(i===0){
      await expect(page.getByText('作業の種類と現場の条件を整理して確認します。',{exact:true})).toBeVisible();
      const dir=path.resolve('../research/anz-guest');await mkdir(dir,{recursive:true});
      if(info.project.name==='chromium-phone')await page.screenshot({path:path.join(dir,'iphone-guest-answer.png'),scale:'css'});
    }
  }
  expect(logins).toBe(0);await expect(page).toHaveURL(/\/chatbot\//);
  await input.fill('追加の確認をしたい');await page.getByRole('button',{name:'送信',exact:true}).click();
  const offer=page.locator('[data-pro-upsell]');await expect(offer).toContainText('今日の無料回数はここまで');
  await expect(offer.locator('[data-pro-start]')).toHaveCount(1);await expect(offer.locator('[data-pro-start]')).toContainText('月額');
  expect(statuses).toEqual([...Array(limit).fill(200),429]);expect(logins).toBe(0);
  if(info.project.name==='chromium-phone')await page.screenshot({path:path.resolve('../research/anz-guest/iphone-guest-limit.png'),scale:'css'});
  await offer.locator('[data-pro-start]').click();await expect.poll(()=>logins).toBe(1);
  await expect(page).toHaveURL(/\/chatbot\//);
});
