import { createHash,createPrivateKey,sign } from 'node:crypto';
import { connect } from 'node:http2';
import { externalCredentialedServicesAllowed } from '../server/deployment-safety';
export type ApnsConfig={keyId:string;teamId:string;privateKey:string;topic:string;environment:'production'|'sandbox'};
export function apnsJwt(config:ApnsConfig,now=Date.now()){
  const b64=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload=`${b64({alg:'ES256',kid:config.keyId})}.${b64({iss:config.teamId,iat:Math.floor(now/1000)})}`;
  return `${payload}.${sign('sha256',Buffer.from(payload),{key:createPrivateKey(config.privateKey),dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
}
export async function sendApns(token:string,id:string,eventId:string,payload:unknown,config:ApnsConfig):Promise<{status:number;reason?:string}>{
  if(!externalCredentialedServicesAllowed() || process.env.MOBILE_APNS_ENABLED!=='true')throw new Error('FEATURE_UNAVAILABLE');
  if(!/^[a-f0-9]{64,200}$/i.test(token))throw new Error('INVALID_REQUEST');
  const host=config.environment==='production'?'https://api.push.apple.com':'https://api.sandbox.push.apple.com';
  return new Promise((resolve,reject)=>{
    const client=connect(host);let settled=false;
    let responseBody='';
    const end=(status?:number,error?:Error)=>{if(settled)return;settled=true;client.close();if(error)reject(error);else {let reason:string|undefined;try{reason=JSON.parse(responseBody).reason;}catch{}resolve({status:status??503,reason});}};
    client.on('error',()=>end(undefined,new Error('APNS_UNAVAILABLE')));
    const request=client.request({':method':'POST',':path':`/3/device/${token}`,authorization:`bearer ${apnsJwt(config)}`,'apns-topic':config.topic,'apns-push-type':'alert','apns-priority':'10','apns-id':id,'apns-collapse-id':createHash('sha256').update(eventId).digest('hex'),'apns-expiration':String(Math.floor(Date.now()/1000)+300)});
    request.setTimeout(10000,()=>{request.close();end(undefined,new Error('APNS_TIMEOUT'));});
    let status=503;request.on('response',headers=>{status=Number(headers[':status']);});request.on('data',data=>{if(responseBody.length<4096)responseBody+=data.toString();});request.on('end',()=>end(status));request.on('error',()=>end(undefined,new Error('APNS_UNAVAILABLE')));request.end(JSON.stringify(payload));
  });
}
