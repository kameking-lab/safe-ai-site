import { product } from '@/lib/mobile/entitlement';
import { json } from '@/lib/mobile/http';
export function GET() {
  const publicKey=process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY;
  const productId=process.env.REVENUECAT_IOS_PRODUCT_ID;
  const offeringId=process.env.REVENUECAT_IOS_OFFERING_ID;
  const appleReady=!!(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);
  const serverVerificationReady=!!(process.env.REVENUECAT_SECRET_API_KEY && process.env.REVENUECAT_V2_SECRET_API_KEY && process.env.REVENUECAT_PROJECT_ID && process.env.REVENUECAT_IOS_V2_PRODUCT_ID && process.env.REVENUECAT_WEBHOOK_AUTHORIZATION);
  const ready=process.env.MOBILE_IAP_ENABLED==='true' && process.env.MOBILE_LEDGER_ENABLED==='true' && !!publicKey && !!productId && !!offeringId && appleReady && serverVerificationReady;
  // Only the public, platform-specific SDK key may leave the server. Never a secret API key.
  return json({ready,publicKey:ready?publicKey:null,productId:ready?productId:null,offeringId:ready?offeringId:null,
    policy:product,login:{apple:appleReady,google:appleReady && !!process.env.AUTH_GOOGLE_ID},
    terms:'https://www.anzen-ai-portal.jp/terms',privacy:'https://www.anzen-ai-portal.jp/privacy',manage:'https://apps.apple.com/account/subscriptions'});
}
