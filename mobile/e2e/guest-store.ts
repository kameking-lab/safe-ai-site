import type { BrowserContext } from '@playwright/test';
import { expect } from './fixtures';
import policy from '../../web/src/lib/mobile/product-policy.json' with {type:'json'};

const host = 'https://www.anzen-ai-portal.jp';
const appUserId = '88888888-1111-4111-8111-111111111111';
const alias = '$RCAnonymousID:' + 'a'.repeat(32);
const productId = 'jp.anzenaiportal.pro.monthly';
const token = 'g'.repeat(43);
const headers = {
  'Access-Control-Allow-Origin':'http://127.0.0.1:3213',
  'Access-Control-Allow-Credentials':'true',
  'Access-Control-Allow-Headers':'content-type,authorization,x-anzen-native,x-anzen-csrf,x-operation-id',
};

export async function installGuestStore(context:BrowserContext) {
  const actions:string[] = [];
  const locations:{locationId:string; label:string; active:boolean; primary:boolean}[] = [];
  let catalogAvailable = true;
  let catalogReads = 0;
  let guests = 0;
  let owner:string | undefined;
  let completed = false;
  let paid = false;
  await context.exposeBinding('reviewStoreCall', async (_source, method:string, options) => {
    if (method === 'open' || method === 'logIn') throw new Error('Guest unexpectedly entered login');
    if (method === 'isConfigured') return {isConfigured:true};
    if (method === 'configure') owner = options.appUserID;
    if (method === 'getOfferings') {
      catalogReads++;
      if (!catalogAvailable) return {all:{},current:null};
      return {all:{review:{availablePackages:[{
        identifier:'monthly', packageType:'MONTHLY', presentedOfferingContext:{offeringIdentifier:'review'},
        product:{identifier:productId,price:6.99,priceString:'$6.99',currencyCode:'USD',subscriptionPeriod:'P1M'},
      }]}}};
    }
    if (method === 'purchasePackage' || method === 'restorePurchases') {
      expect(owner).toBe(alias);
      if(method==='purchasePackage')expect(options.aPackage.presentedOfferingContext.offeringIdentifier).toBe('review');
      actions.push(method);
      completed = true;
    }
    return {};
  });
  const entitlement = () => ({
    appUserId, appleGuestAppUserId:alias, plan:paid?'pro':'free', source:paid?'app_store':null,
    verifiedAt:new Date().toISOString(), expiresAt:paid?new Date(Date.now()+86400000).toISOString():null,
    syncState:'verified', limits:paid?policy.limits.pro:policy.limits.free,
  });
  await context.route(host+'/api/**',async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const reply = (json:unknown,status=200) => route.fulfill({headers,json,status});
    if (req.method()==='OPTIONS') return route.fulfill({status:204,headers});
    if (path.endsWith('/auth/start') || path.startsWith('/api/stripe/')) throw new Error('Unexpected checkout or login: '+path);
    if (path.endsWith('/auth/guest')) {
      expect(req.postDataJSON()).toEqual({anonymousStoreIdentity:true});
      guests++;
      return reply({token,guest:true});
    }
    if (path.endsWith('/billing/config')) return reply({ready:true,publicKey:'appl_fixture',productId,offeringId:'review',policy,
      login:{apple:true,google:true},terms:host+'/terms',privacy:host+'/privacy',manage:'https://apps.apple.com/account/subscriptions'});
    if (path.endsWith('/diagnostics')) return reply({ok:true});
    if (!(path.startsWith('/api/me/') || path.startsWith('/api/billing/') || path.endsWith('/v1/account'))) return route.fallback();
    if (req.headers()['authorization'] !== 'Bearer '+token) return reply({error:{code:'UNAUTHORIZED'}},401);
    if (path.endsWith('/entitlements')) return reply(entitlement());
    if (path.endsWith('/purchase-intents')) return reply({id:'88888888-2222-4222-8222-222222222222',...req.postDataJSON()});
    if (path.endsWith('/reconcile')) { paid = completed; return reply(entitlement()); }
    if (path.endsWith('/v1/account')) return reply({displayName:null,email:null,sdsHistory:[]});
    if (path.endsWith('/weather-locations')) {
      if (req.method()==='POST') locations.push({...req.postDataJSON(),label:'テスト地点',active:true,primary:true});
      return reply({locations,limit:paid?10:1,notifications:paid});
    }
    throw new Error('Unmodelled guest request: '+path);
  });
  return {actions,locations,setCatalog:(available:boolean)=>{catalogAvailable=available;},catalogReads:()=>catalogReads,paid:()=>paid,guests:()=>guests};
}
