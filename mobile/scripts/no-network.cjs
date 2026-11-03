// Native builds may evaluate shared Server Components. They must never call a provider.
const allowed = value => { try { return ['localhost','127.0.0.1','::1'].includes(new URL(String(value)).hostname); } catch { return false; } };
const nativeFetch = global.fetch;
global.fetch = (input,init) => allowed(input?.url ?? input) ? nativeFetch(input,init) : Promise.reject(new Error('Native build: outbound network disabled'));
for (const name of ['http','https']) {
  const mod = require('node:'+name);
  const request = mod.request;
  mod.request = function (...args) {
    const first = args[0];
    const host = typeof first === 'object' && !(first instanceof URL) ? first.hostname ?? first.host : new URL(String(first)).hostname;
    if (!['localhost','127.0.0.1','::1'].includes(host)) throw new Error('Native build: outbound network disabled');
    return request.apply(this,args);
  };
  mod.get = function (...args) { const req=mod.request(...args);req.end();return req; };
}
