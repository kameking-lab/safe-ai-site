import { getAdminAccess } from '@/lib/server/admin-access';
import { appleReviewSchema,releaseReviewedApplePurchase } from '@/lib/mobile/apple-purchase-review';
import { json,failure } from '@/lib/mobile/http';
export async function POST(request:Request){try{
  // No mobile bearer route: a same-origin, allowlisted operator session is required.
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new Error('FORBIDDEN');
  const access=await getAdminAccess();if(!access.ok)throw new Error('FORBIDDEN');
  const raw=await request.text();if(raw.length>4096)throw new Error('INVALID_REQUEST');
  const evidence=appleReviewSchema.parse(JSON.parse(raw));
  return json(await releaseReviewedApplePurchase(evidence,access.userId));
}catch(e){return failure(e);}}
