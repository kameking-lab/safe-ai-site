import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const mock=vi.hoisted(()=>({token:null as string|null,guest:false,startLogin:vi.fn(),purchase:vi.fn(),restore:vi.fn(),config:vi.fn(),forget:vi.fn(async()=>{mock.token=null;mock.guest=false;}),guestRequests:0,guestFails:false,events:[] as string[]}));
// ensureSession mirrors the session layer: reuse a session, otherwise create a guest session.
vi.mock('../src/lib/session',()=>({
  ensureSession:async()=>{if(mock.token)return mock.token;mock.guestRequests++;if(mock.guestFails)throw new Error('UNAVAILABLE');mock.token='guest-session';mock.guest=true;return mock.token;},
  isGuestSession:async()=>!!mock.token&&mock.guest,forgetLocalSession:mock.forget,startLogin:mock.startLogin,
}));
vi.mock('../src/lib/billing',()=>({billing:{config:mock.config,purchase:mock.purchase,restore:mock.restore},isVerifiedPro:(m:{plan?:string}|null)=>m?.plan==='pro'}));
import { startProPurchase,restoreProPurchases } from '../src/lib/pro-purchase';
import { StoreError,describeStoreError } from '../src/lib/store-errors';
beforeEach(()=>{mock.token=null;mock.guest=false;mock.guestRequests=0;mock.guestFails=false;mock.events=[];vi.clearAllMocks();mock.config.mockResolvedValue({ready:true});mock.purchase.mockResolvedValue({plan:'pro'});mock.restore.mockResolvedValue({plan:'pro'});vi.stubGlobal('window',{dispatchEvent:(e:Event)=>{mock.events.push(e.type);}});});
afterEach(()=>vi.unstubAllGlobals());
describe('「月額980円で続ける」をアプリで押したとき（登録なしで購入できる）',()=>{
  it('未ログインでもログインを求めず、ゲストのまま購入シートへ進む',async()=>{
    const result=await startProPurchase();
    expect(result.state).toBe('pro');expect(mock.startLogin).not.toHaveBeenCalled();
    expect(mock.guestRequests).toBe(1);expect(mock.purchase).toHaveBeenCalledTimes(1);
    expect(mock.events).toContain('anzen-usage-changed');
    // 2回目は同じゲストを使い、ゲストを増やさない。
    mock.purchase.mockRejectedValueOnce(new Error('ALREADY_SUBSCRIBED'));
    expect((await startProPurchase()).state).toBe('pro');expect(mock.guestRequests).toBe(1);
  });
  it('ログイン済みなら確認なしで購入シートへ進む',async()=>{
    mock.token='session';
    expect((await startProPurchase()).state).toBe('pro');
    expect(mock.startLogin).not.toHaveBeenCalled();expect(mock.guestRequests).toBe(0);expect(mock.purchase).toHaveBeenCalledTimes(1);
  });
  it('ゲストを作れないときは購入シートを開かず、短い案内だけを出す',async()=>{
    mock.guestFails=true;
    const failed=await startProPurchase();
    expect(failed).toEqual({state:'error',message:'購入を始められませんでした。通信を確認して、もう一度お試しください。'});
    expect(mock.purchase).not.toHaveBeenCalled();expect(mock.startLogin).not.toHaveBeenCalled();
  });
  it('期限切れのゲストは端末から外し、次に押したとき新しいゲストで購入できる',async()=>{
    mock.token='old-guest';mock.guest=true;mock.purchase.mockRejectedValueOnce(new Error('UNAUTHORIZED'));
    expect((await startProPurchase()).message).toBe('もう一度お試しください。');expect(mock.forget).toHaveBeenCalledOnce();
    expect((await startProPurchase()).state).toBe('pro');expect(mock.guestRequests).toBe(1);
    // ログイン済み会員の UNAUTHORIZED では会員の認証情報を消さない。
    mock.token='member';mock.guest=false;mock.forget.mockClear();mock.purchase.mockRejectedValueOnce(new Error('UNAUTHORIZED'));
    await startProPurchase();expect(mock.forget).not.toHaveBeenCalled();
  });
  it('「購入を復元」もログインなしで行える',async()=>{
    expect(await restoreProPurchases()).toEqual({plan:'pro'});
    expect(mock.guestRequests).toBe(1);expect(mock.restore).toHaveBeenCalledWith({ready:true});expect(mock.startLogin).not.toHaveBeenCalled();
  });
  it('失敗は短い操作案内だけにし、取消には警告しない',async()=>{
    mock.token='session';
    mock.purchase.mockRejectedValueOnce({code:'23',message:'There is an issue with your configuration.',underlyingErrorMessage:'None of the products registered in the RevenueCat dashboard could be fetched from App Store Connect'});
    const failed=await startProPurchase();
    expect(failed.state).toBe('error');expect(failed.message).toBe('少し待ってからもう一度お試しください。');
    mock.purchase.mockRejectedValueOnce(new Error('STORE_CANCELLED'));
    expect((await startProPurchase()).message).toBe('');
  });
});
describe('App Store の失敗の言い換え',()=>{
  it('技術的な設定・英語の詳細を表示せず、必要な操作を案内する',()=>{
    for(const error of [{code:'UNIMPLEMENTED',message:'"Purchases" plugin is not implemented on ios'},new StoreError('PRODUCT_MISMATCH','jp.example.monthly MONTHLY P1M USD 6.99'),new StoreError('NO_PACKAGES','offering=default / 取得=なし')])expect(describeStoreError(error)).toBe('少し待ってからもう一度お試しください。');
    expect(describeStoreError({code:'3'})).toBe('端末の購入制限を確認してください。');
    expect(describeStoreError({code:'10'})).toBe('通信環境を確認してもう一度お試しください。');
  });
});
