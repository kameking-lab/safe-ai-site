import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const mock=vi.hoisted(()=>({native:true,request:vi.fn(),token:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>mock.native,getPlatform:()=>mock.native?'ios':'web'},CapacitorHttp:{request:mock.request},registerPlugin:vi.fn()}));
vi.mock('../src/lib/session',()=>({sessionToken:mock.token}));
vi.mock('../src/lib/native-download',()=>({installNativeDownloads:vi.fn()}));
vi.mock('../src/lib/native-speech',()=>({installNativeSpeech:vi.fn()}));
import { createSiteFetch } from '../src/lib/web-transport';
const origin='https://localhost';const site='https://www.anzen-ai-portal.jp';
beforeEach(()=>{vi.clearAllMocks();mock.native=true;mock.token.mockResolvedValue('mock_session');vi.stubGlobal('location',new URL(origin));vi.stubGlobal('window',{dispatchEvent:vi.fn()});mock.request.mockImplementation(async({url})=>({url,status:200,headers:{'Content-Type':'Application/JSON'},data:{ok:true}}));});
afterEach(()=>vi.unstubAllGlobals());
describe('canonical API transport in the native bundle',()=>{
  it('preserves Request method, body and operation ID when init overrides another option',async()=>{
    const send=createSiteFetch(vi.fn());const id=crypto.randomUUID();
    const req=new Request(origin+'/api/chatbot',{method:'POST',headers:{'Content-Type':'application/json','X-Operation-ID':id},body:JSON.stringify({message:'足場'})});
    const result=await send(req,{cache:'no-store'});
    expect(await result.json()).toEqual({ok:true});expect(mock.request).toHaveBeenCalledWith(expect.objectContaining({url:site+'/api/chatbot',method:'POST',data:'{"message":"足場"}',headers:expect.objectContaining({'x-operation-id':id,authorization:'Bearer mock_session'})}));
  });
  it('keeps working anonymously when the Keychain plugin is unavailable',async()=>{
    mock.token.mockRejectedValue(Object.assign(new Error('"NativeVault" plugin is not implemented on ios'),{code:'UNIMPLEMENTED'}));
    const result=await createSiteFetch(vi.fn())('/api/chatbot',{method:'POST',headers:{Authorization:'Bearer obsolete'},body:'{}'});
    expect(await result.json()).toEqual({ok:true});expect(mock.request.mock.calls[0][0].headers.authorization).toBeUndefined();
  });
  it('creates an operation ID only when missing and uses the current secure session',async()=>{
    await createSiteFetch(vi.fn())('/api/chatbot',{method:'POST',headers:{Authorization:'Bearer obsolete'},body:'{}'});
    const headers=mock.request.mock.calls[0][0].headers;expect(headers['x-operation-id']).toMatch(/^[0-9a-f-]{36}$/);expect(headers.authorization).toBe('Bearer mock_session');
  });
  it('preserves request data in the browser preview too',async()=>{
    mock.native=false;const original=vi.fn(async()=>new Response('{}'));
    await createSiteFetch(original)(new Request(origin+'/api/sds/search?q=test',{method:'POST',headers:{'x-test':'kept'},body:'payload'}),{cache:'no-store'});
    const [req,init]=original.mock.calls[0] as unknown as [Request,RequestInit];expect(req.url).toBe(site+'/api/sds/search?q=test');expect(req.method).toBe('POST');expect(req.headers.get('x-test')).toBe('kept');expect(await req.text()).toBe('payload');expect(init.redirect).toBe('error');expect(mock.request).not.toHaveBeenCalled();
  });
  it('leaves bundled files and external requests outside the API adapter',async()=>{
    const original=vi.fn(async()=>new Response('file'));const send=createSiteFetch(original);
    await send('/images/test.webp');await send('https://example.test/api/data');expect(original).toHaveBeenCalledTimes(2);expect(mock.request).not.toHaveBeenCalled();expect(mock.token).not.toHaveBeenCalled();
  });
  it('keeps multipart SDS uploads and binary downloads intact',async()=>{
    const form=new FormData();form.append('file',new Blob(['PDF'],{type:'application/pdf'}),'test.pdf');form.append('mode','sds');
    await createSiteFetch(vi.fn())('/api/sds/upload',{method:'POST',body:form});
    expect(mock.request.mock.calls[0][0]).toMatchObject({dataType:'formData',data:[{key:'file',type:'base64File',value:btoa('PDF'),contentType:'application/pdf',fileName:'test.pdf'},{key:'mode',type:'string',value:'sds'}]});
    mock.request.mockResolvedValue({url:site+'/api/pdf',status:200,headers:{'content-type':'application/pdf'},data:btoa('PDF')});
    expect(await (await createSiteFetch(vi.fn())('/api/pdf')).text()).toBe('PDF');
  });
  it('rejects aborts and off-site redirects and supports empty responses',async()=>{
    const signal=AbortSignal.abort();await expect(createSiteFetch(vi.fn())('/api/test',{signal})).rejects.toMatchObject({name:'AbortError'});expect(mock.request).not.toHaveBeenCalled();
    mock.request.mockResolvedValue({url:'https://example.test/api/test',status:200,headers:{},data:''});await expect(createSiteFetch(vi.fn())('/api/test')).rejects.toThrow('Redirect refused');
    mock.request.mockResolvedValue({url:site+'/api/test',status:204,headers:{},data:''});expect((await createSiteFetch(vi.fn())('/api/test')).status).toBe(204);
  });
});
