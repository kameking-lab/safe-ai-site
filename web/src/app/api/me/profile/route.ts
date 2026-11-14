import {auth} from '@/auth';
import {json,failure} from '@/lib/mobile/http';
import {withRequestTiming} from '@/lib/server/request-timing';

/** Header identity does not depend on billing providers or grant reconciliation. */
export async function GET(){return withRequestTiming(async measure=>{try{
  const session=await measure('auth',()=>auth({identityOnly:true}));
  const user=session?.user;
  return json({user:user?{name:user.name??null,email:user.email??null,image:user.image??null}:null});
}catch(e){return failure(e);}});}
