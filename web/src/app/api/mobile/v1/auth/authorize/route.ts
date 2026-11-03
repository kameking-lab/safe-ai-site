import { auth } from '@/auth';
import { authorizeFlow } from '@/lib/mobile/session';
import { failure,SITE_ORIGIN } from '@/lib/mobile/http';
export async function GET(request:Request) {
  try {
    const flow=new URL(request.url).searchParams.get('flow');if(!flow || !/^[0-9a-f-]{36}$/.test(flow))throw new Error('INVALID_REQUEST');
    const session=await auth();const userId=(session?.user as {id?:string}|undefined)?.id;
    if(!userId || new URL(request.url).searchParams.get('confirmed')!=='1')return Response.redirect(`${SITE_ORIGIN}/auth/signin?callbackUrl=${encodeURIComponent(`/api/mobile/v1/auth/authorize?flow=${flow}&confirmed=1`)}`);
    const signedInAt=(session?.user as {signedInAt?:string}|undefined)?.signedInAt;
    let code:string;
    try{code=await authorizeFlow(flow,userId,signedInAt?new Date(signedInAt):undefined);}catch(e){if(e instanceof Error&&e.message==='REAUTH_REQUIRED')return Response.redirect(`${SITE_ORIGIN}/auth/signin?callbackUrl=${encodeURIComponent(`/api/mobile/v1/auth/authorize?flow=${flow}&confirmed=1`)}`);throw e;}
    return new Response(null,{status:302,headers:{Location:`anzenai://auth/callback?flow=${flow}&code=${code}`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }catch(e){return failure(e);}
}
