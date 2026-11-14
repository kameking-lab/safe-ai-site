import {allowBillingDiagnostic,billingDiagnosticSchema} from '@/lib/mobile/billing-diagnostics';
import {json,SITE_ORIGIN} from '@/lib/mobile/http';

export const runtime='nodejs';
// Available before login so a stuck exchange/configure can still be diagnosed.
// This route never reads authentication headers, sessions or provider credentials.
export async function POST(request:Request){
 if(request.headers.get('origin')!==SITE_ORIGIN)return json({ok:false},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({ok:false},415);
 if(!allowBillingDiagnostic(request))return json({ok:false},429);
 if(Number(request.headers.get('content-length'))>1024)return json({ok:false},413);
 const reader=request.body?.getReader();if(!reader)return json({ok:false},400);
 const chunks:Uint8Array[]=[];let size=0;
 let timedOut=false;
 let timer:ReturnType<typeof setTimeout>|undefined;
 // One deadline for the entire body; trickled chunks must not renew it.
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{timedOut=true;reject(new Error('BODY_TIMEOUT'));},2000);});
 try{
  while(true){const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.byteLength;if(size>1024){void reader.cancel().catch(()=>{});return json({ok:false},413);}chunks.push(value);}
  const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
  const event=billingDiagnosticSchema.safeParse(JSON.parse(new TextDecoder().decode(body)));
  if(!event.success)return json({ok:false},400);
  console.info('[mobile-billing]',JSON.stringify(event.data));
  return json({ok:true});
 }catch{void reader.cancel().catch(()=>{});return json({ok:false},timedOut?408:400);}
 finally{clearTimeout(timer);reader.releaseLock();}
}
