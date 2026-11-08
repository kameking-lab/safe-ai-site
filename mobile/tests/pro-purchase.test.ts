import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const mock=vi.hoisted(()=>({prefs:new Map<string,string>(),token:null as string|null,startLogin:vi.fn(),purchase:vi.fn(),config:vi.fn(),events:[] as string[]}));
vi.mock('@capacitor/preferences',()=>({Preferences:{get:async({key}:{key:string})=>({value:mock.prefs.get(key)??null}),set:async({key,value}:{key:string;value:string})=>{mock.prefs.set(key,value);},remove:async({key}:{key:string})=>{mock.prefs.delete(key);}}}));
vi.mock('../src/lib/session',()=>({sessionToken:async()=>mock.token,startLogin:mock.startLogin}));
vi.mock('../src/lib/billing',()=>({billing:{config:mock.config,purchase:mock.purchase},isVerifiedPro:(m:{plan?:string}|null)=>m?.plan==='pro'}));
import { startProPurchase,resumeProPurchaseAfterLogin } from '../src/lib/pro-purchase';
import { StoreError,describeStoreError } from '../src/lib/store-errors';
beforeEach(()=>{mock.prefs.clear();mock.token=null;mock.events=[];vi.clearAllMocks();mock.config.mockResolvedValue({ready:true});mock.purchase.mockResolvedValue({plan:'pro'});vi.stubGlobal('window',{dispatchEvent:(e:Event)=>{mock.events.push(e.type);}});});
afterEach(()=>vi.unstubAllGlobals());
describe('「月額980円で続ける」をアプリで押したとき',()=>{
  it('未ログインならログインを開き、戻ってきたらそのまま購入シートを開く',async()=>{
    expect((await startProPurchase()).state).toBe('login');
    expect(mock.startLogin).toHaveBeenCalledTimes(1);expect(mock.purchase).not.toHaveBeenCalled();
    mock.token='session';
    const resumed=await resumeProPurchaseAfterLogin();
    expect(resumed?.state).toBe('pro');expect(mock.purchase).toHaveBeenCalledTimes(1);
    expect(mock.events).toContain('anzen-usage-changed');
    // 一度きり: 次のログインでは勝手に購入しない。
    expect(await resumeProPurchaseAfterLogin()).toBeNull();expect(mock.purchase).toHaveBeenCalledTimes(1);
  });
  it('ログイン済みなら確認なしで購入シートへ進む',async()=>{
    mock.token='session';
    expect((await startProPurchase()).state).toBe('pro');
    expect(mock.startLogin).not.toHaveBeenCalled();expect(mock.purchase).toHaveBeenCalledTimes(1);
  });
  it('古い（10分超）ログイン待ちでは購入しない',async()=>{
    mock.prefs.set('anzen.pro-after-login',String(Date.now()-11*60_000));mock.token='session';
    expect(await resumeProPurchaseAfterLogin()).toBeNull();expect(mock.purchase).not.toHaveBeenCalled();
  });
  it('失敗は理由とコードを画面に出せる文にする',async()=>{
    mock.token='session';
    mock.purchase.mockRejectedValueOnce({code:'23',message:'There is an issue with your configuration.',underlyingErrorMessage:'None of the products registered in the RevenueCat dashboard could be fetched from App Store Connect'});
    const failed=await startProPurchase();
    expect(failed.state).toBe('error');expect(failed.message).toContain('Bundle IDを確認）［23］');expect(failed.message).toContain('None of the products');
    mock.purchase.mockRejectedValueOnce(new Error('STORE_CANCELLED'));
    expect((await startProPurchase()).message).toBe('購入を取り消しました。');
  });
});
describe('App Store の失敗の言い換え',()=>{
  it('部品未組み込み・商品不一致・空の Offering を区別する',()=>{
    expect(describeStoreError({code:'UNIMPLEMENTED',message:'"Purchases" plugin is not implemented on ios'})).toContain('課金部品（RevenueCat）が組み込まれていません');
    expect(describeStoreError(new StoreError('PRODUCT_MISMATCH','jp.example.monthly MONTHLY P1M USD 6.99'))).toBe('App Store の商品が設定（月額980円・1か月）と一致しないため販売を止めています［PRODUCT_MISMATCH］（jp.example.monthly MONTHLY P1M USD 6.99）');
    expect(describeStoreError(new StoreError('NO_PACKAGES','offering=default / 取得=なし'))).toContain('［NO_PACKAGES］');
  });
});
