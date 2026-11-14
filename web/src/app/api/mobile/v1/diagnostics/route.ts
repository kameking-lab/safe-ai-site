import {allowBillingDiagnostic,billingDiagnosticSchema} from '@/lib/mobile/billing-diagnostics';
import {json,SITE_ORIGIN} from '@/lib/mobile/http';

export const runtime='nodejs';
function reject(code:string,status:number){
 console.warn('[mobile-diagnostics]',JSON.stringify({stage:'receive',code,status}));
 return json({ok:false,error:{code}},status);
}
function allowedOrigin(request:Request){
 const origin=request.headers.get('origin');
 if(origin===SITE_ORIGIN)return true;
 // URLSession has no browser CORS boundary. This public, schema-limited
 // telemetry endpoint grants no rights and never reads credentials.
 return request.headers.get('x-anzen-native')==='1' && !request.headers.get('sec-fetch-site') &&
  (origin===null||origin==='capacitor://localhost'||origin==='https://localhost');
}
// Available before login so a stuck exchange/configure can still be diagnosed.
// This route never reads authentication headers, sessions or provider credentials.
export async function POST(request:Request){
 if(!allowedOrigin(request))return reject('ORIGIN_REJECTED',403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reject('CONTENT_TYPE_REJECTED',415);
 if(!allowBillingDiagnostic(request))return reject('DIAGNOSTIC_RATE_LIMITED',429);
 if(Number(request.headers.get('content-length'))>1024)return reject('BODY_TOO_LARGE',413);
 const reader=request.body?.getReader();if(!reader)return reject('BODY_REQUIRED',400);
 const chunks:Uint8Array[]=[];let size=0;
 let timedOut=false;
 let timer:ReturnType<typeof setTimeout>|undefined;
 // One deadline for the entire body; trickled chunks must not renew it.
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{timedOut=true;reject(new Error('BODY_TIMEOUT'));},2000);});
 try{
  while(true){const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.byteLength;if(size>1024){void reader.cancel().catch(()=>{});return reject('BODY_TOO_LARGE',413);}chunks.push(value);}
  const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
  const event=billingDiagnosticSchema.safeParse(JSON.parse(new TextDecoder().decode(body)));
  if(!event.success)return reject('SCHEMA_REJECTED',400);
  // The production compiler removes info/log. Keep bounded, schema-validated
  // diagnostic events on the retained warn channel so device reports survive.
  console.warn('[mobile-billing]',JSON.stringify(event.data));
  return json({ok:true});
 }catch{void reader.cancel().catch(()=>{});return reject(timedOut?'BODY_TIMEOUT':'INVALID_JSON',timedOut?408:400);}
 finally{clearTimeout(timer);reader.releaseLock();}
}
