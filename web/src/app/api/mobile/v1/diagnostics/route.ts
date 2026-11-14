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
 try{
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();return json({ok:false},413);}chunks.push(value);}
  const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
  const event=billingDiagnosticSchema.safeParse(JSON.parse(new TextDecoder().decode(body)));
  if(!event.success)return json({ok:false},400);
  console.info('[mobile-billing]',JSON.stringify(event.data));
  return json({ok:true});
 }catch{return json({ok:false},400);}
 finally{reader.releaseLock();}
}
