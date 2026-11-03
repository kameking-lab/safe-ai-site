import type { Metadata } from 'next';
import { PricingContent } from './PricingContent';
import { isPaidModeReady } from '@/lib/stripe-price-policy';
export const metadata:Metadata={title:'料金プラン｜無料・安全AI Pro 月額980円',description:'無料と安全AI Pro。会員ごとの共通利用枠と機能の提供状況をご確認ください。'};
export default function PricingPage(){return <PricingContent ready={process.env.MOBILE_LEDGER_ENABLED==='true'&&isPaidModeReady()}/>;}
