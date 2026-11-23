import { installNativeTestBridge } from './native-test-bridge';
import { installGuestStore } from './guest-store';
import { test,expect } from './fixtures';
import { capability } from '../tests/fixtures';
import product from '../../web/src/lib/mobile/product-policy.json' with {type:'json'};

const host='https://www.anzen-ai-portal.jp';

const cors={'Access-Control-Allow-Origin':'http://127.0.0.1:3213','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,x-anzen-native,x-operation-id,origin,accept'};

test('native guest receives answers, a 429 offers one purchase button, and buying upgrades the guest in place',async({page,context},info)=>{
  await installNativeTestBridge(context, false, true);
  await context.route('https://**/*',route=>route.abort());
  let answered=0;let logins=0;const statuses:number[]=[];
  const limit=product.limits.free.law_chat;
  const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
  const resetAt=new Date(Date.parse(today+'T00:00:00+09:00')+86400000).toISOString();
  await context.route(host+'/api/**',async route=>{
    const request=route.request();const url=new URL(request.url());
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    if(url.pathname.endsWith('/capabilities')){
      const cap=capability();cap.session=store.paid()?'member':'anonymous';cap.plan=store.paid()?'pro':'free';cap.upgrade=!store.paid();
      cap.features.law_chat.quota={...cap.features.law_chat.quota,limit:store.paid()?50:limit,used:answered,remaining:Math.max(0,(store.paid()?50:limit)-answered),resetAt};
      return route.fulfill({headers:cors,json:cap});
    }
    if(url.pathname==='/api/chatbot/stream'){
      expect(request.headers()['x-anzen-native']).toBe('1');if(store.paid()) expect(request.headers().authorization).toBe('Bearer '+'g'.repeat(43));
      else expect(request.headers().authorization).toBeUndefined();
      expect(request.postDataJSON().privacyConfirmed).toBe(true);
      if(answered>=limit && !store.paid()){statuses.push(429);return route.fulfill({status:429,headers:cors,json:{error:{code:'DAILY_LIMIT_REACHED',plan:'free',upgrade:true,message:'今日の無料回数はここまでです。',resetAt}}});}
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
  const store = await installGuestStore(context);
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
      await page.getByRole('heading',{name:'安衛法AI',exact:true}).click();
      await expect(page.locator('[data-ai-processing-note]')).toBeVisible();
      if ((page.viewportSize()?.width ?? 390) < 768) await expect(page.getByRole('navigation',{name:'モバイル ボトムナビゲーション'})).toBeVisible();
      await page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
      if(info.project.name==='webkit-phone')await page.screenshot({path:info.outputPath('guest-answer.png'),scale:'css',animations:'disabled'});
    }
  }
  expect(logins).toBe(0);await expect(page).toHaveURL(/\/chatbot\//);
  await input.fill('追加の確認をしたい');await page.getByRole('button',{name:'送信',exact:true}).click();
  const offer=page.locator('[data-pro-upsell]');await expect(offer).toContainText('今日の無料回数はここまで');
  await expect(offer.locator('[data-pro-start]')).toHaveCount(1);await expect(offer.locator('[data-pro-start]')).toContainText('月額');
  expect(statuses).toEqual([...Array(limit).fill(200),429]);expect(logins).toBe(0);
  await page.getByRole('heading',{name:'安衛法AI',exact:true}).click();
  await expect(page.locator('[data-ai-processing-note]')).toBeVisible();
  if ((page.viewportSize()?.width ?? 390) < 768) await expect(page.getByRole('navigation',{name:'モバイル ボトムナビゲーション'})).toBeVisible();
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
  if(info.project.name==='webkit-phone')await page.screenshot({path:info.outputPath('guest-limit.png'),scale:'css',animations:'disabled'});
  await offer.locator('[data-pro-start]').click();await expect.poll(store.paid).toBe(true);
  await expect(page.getByLabel('AIの利用枠')).toContainText('／50');
  expect(store.actions).toEqual(['purchasePackage']);expect(logins).toBe(0);
  await input.fill('追加購入後の質問です');
  await page.getByRole('button',{name:'送信',exact:true}).click();
  await expect(page.getByLabel('AIの利用枠')).toContainText(`残り${50-limit-1}／50`);
  expect(statuses).toEqual([...Array(limit).fill(200),429,200]);
  await expect(page).toHaveURL(/\/chatbot\//);
});
