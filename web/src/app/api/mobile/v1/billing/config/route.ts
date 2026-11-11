import { product } from '@/lib/mobile/entitlement';
import { json } from '@/lib/mobile/http';
import { appStoreSalesReady } from '@/lib/pro-sales';
import { proSalesStatus } from '@/lib/mobile/pro-sales-gate';
export async function GET() {
  const publicKey=process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY;
  const productId=process.env.REVENUECAT_IOS_PRODUCT_ID;
  const offeringId=process.env.REVENUECAT_IOS_OFFERING_ID;
  const appleReady=!!(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);
  const ready=appStoreSalesReady();
  const sales=await proSalesStatus().catch(()=>({paused:true,message:'Proの受付状況を確認できません。時間をおいてお試しください。'}));
  // Only the public, platform-specific SDK key may leave the server. Never a secret API key.
  return json({ready,salesPaused:sales.paused,salesMessage:sales.message,publicKey:ready?publicKey:null,productId:ready?productId:null,offeringId:ready?offeringId:null,
    policy:product,login:{apple:appleReady,google:appleReady && !!process.env.AUTH_GOOGLE_ID},
    terms:'https://www.anzen-ai-portal.jp/terms',privacy:'https://www.anzen-ai-portal.jp/privacy',manage:'https://apps.apple.com/account/subscriptions'});
}
