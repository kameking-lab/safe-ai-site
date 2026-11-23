import { test, expect } from './fixtures';
import { installNativeTestBridge } from './native-test-bridge';
import { installGuestStore } from './guest-store';

test.beforeEach(async ({context}) => {
  await context.route('https://**/*',route => route.abort());
  await installNativeTestBridge(context,false,true);
});

for (const action of ['purchasePackage','restorePurchases'] as const) {
  test(`fresh install completes ${action} with no portal account`,async ({page,context}) => {
    const store = await installGuestStore(context);
    if (action === 'purchasePackage') {
      await page.goto('/');
      await page.getByRole('link',{name:'Pro',exact:true}).first().click();
    } else {
      await page.goto('/pricing/start/?returnTo=/chatbot');
    }
    const panel = page.locator('section').filter({has:page.getByRole('heading',{name:'安全AI Pro',exact:true})}).first();
    await expect(panel).toContainText('$6.99');
    await expect(panel).toContainText('1か月ごとの自動更新');
    await expect(panel.getByRole('link',{name:'利用規約',exact:true})).toHaveAttribute('href','/terms');
    await expect(panel.getByRole('link',{name:'プライバシーポリシー'})).toHaveAttribute('href','/privacy');
    const buy = panel.getByRole('button',{name:/Proにする/});
    const restore = panel.getByRole('button',{name:'購入を復元',exact:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if(action==='purchasePackage' && process.env.ANZEN_REVIEW_CAPTURE==='1'){
      await page.screenshot({path:test.info().outputPath('guest-pro.png')});
    }
    await (action === 'purchasePackage' ? buy : restore).click();
    await expect(panel.getByText('Pro 利用中',{exact:true})).toBeVisible();
    expect(store.actions).toEqual([action]);
    expect(store.guests()).toBe(1);
    await expect(panel.getByRole('button',{name:'Apple / Googleで連携（任意）'})).toBeVisible();
    if(action==='restorePurchases'){
      let confirmations=0;
      await context.route('https://www.anzen-ai-portal.jp/api/mobile/v1/account/delete',async route=>{
        const request=route.request();
        const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:3213','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,authorization'};
        if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
        expect(request.headers().authorization).toBe('Bearer '+'g'.repeat(43));
        const body=request.postDataJSON();
        if(body.action==='prepare')return route.fulfill({headers,json:{id:'review-delete',confirmation:'confirm-fixture',receipt:'receipt-fixture',subject:'guest',expiresAt:new Date(Date.now()+600000).toISOString()}});
        expect(body.action).toBe('confirm');expect(body.confirmationText).toBe('削除');confirmations++;
        return route.fulfill({headers,json:{status:'completed',completedAt:new Date().toISOString()}});
      });
      await panel.locator('summary',{hasText:'アカウントの削除'}).click();
      await expect(panel.getByRole('button',{name:'本人確認のため再ログイン'})).toHaveCount(0);
      await panel.getByRole('button',{name:'アカウント削除を開始'}).click();
      await panel.getByLabel('確認のため「削除」と入力').fill('削除');
      await panel.getByRole('button',{name:'アカウントを完全に削除する'}).click();
      await expect(panel.getByRole('status').filter({hasText:'削除が完了しました'})).toBeVisible();
      expect(confirmations).toBe(1);
    }
  });
}

test('saves a free location then enables Pro locations from the same screen',async ({page,context}) => {
  const store = await installGuestStore(context);
  let releaseRead!:()=>void;
  const held=new Promise<void>(resolve=>{releaseRead=resolve;});
  const locationsUrl='https://www.anzen-ai-portal.jp/api/me/weather-locations';
  let delayed=false;
  await context.route(locationsUrl,async route=>{
    if(delayed || route.request().method()!=='GET' || !route.request().headers().authorization)return route.fallback();
    delayed=true;
    await held;
    await route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:3213','Access-Control-Allow-Credentials':'true'},json:{locations:[],limit:1,notifications:false}});
  });
  await page.goto('/notifications/');
  const save = page.getByRole('button',{name:'この地点を登録',exact:true});
  await save.click();
  await expect(page.getByText('テスト地点 監視中')).toBeVisible();
  expect(store.guests()).toBe(1);
  expect(store.locations).toHaveLength(1);
  await expect.poll(()=>delayed).toBe(true);
  const oldRead=page.waitForResponse(response=>response.url()===locationsUrl && response.request().method()==='GET');
  releaseRead();
  await (await oldRead).finished();
  await expect(save).toBeDisabled();
  await expect(page.getByText('テスト地点 監視中')).toBeVisible();
  const panel = page.locator('.native-panel').first();
  const buy = panel.getByRole('button',{name:/Proにする/});
  await expect(buy).toContainText('$6.99');
  await expect(panel).toContainText('1か月ごとに自動更新');
  await expect(panel.getByRole('link',{name:'利用規約'})).toHaveAttribute('href','/terms');
  await expect(panel.getByRole('link',{name:'プライバシーポリシー'})).toHaveAttribute('href','/privacy');
  if(process.env.ANZEN_REVIEW_CAPTURE==='1'){
    await buy.scrollIntoViewIfNeeded();
    await page.screenshot({path:test.info().outputPath('guest-weather.png')});
  }
  await buy.click();
  await expect(panel.getByText(/登録上限：10地点/)).toBeVisible();
  await expect(panel.getByRole('button',{name:'Proの警報通知を有効にする'})).toBeEnabled();
  const select=panel.getByLabel('閲覧する地点');
  const next=await select.locator('option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value).find(id=>id!=='tokyo-shinjuku'));
  if(!next) throw new Error('Expected a second selectable location');
  await select.selectOption(next);
  await save.click();
  await expect.poll(()=>store.locations.map(item=>item.locationId)).toEqual(['tokyo-shinjuku',next]);
  expect(store.actions).toEqual(['purchasePackage']);
  expect(store.guests()).toBe(1);
});
