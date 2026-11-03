import product from '@/lib/mobile/product-policy.json';
// Legacy IDs remain readable for old records; only Free and Pro are offered.
export type PlanId = 'free'|'standard'|'pro'|'business'|'custom';
export type FeatureValue=boolean|string;
export interface MatrixFeature{labelJa:string;labelEn:string;values:Record<PlanId,FeatureValue>}
export interface FeatureCategory{labelJa:string;labelEn:string;features:MatrixFeature[]}
export const PLAN_IDS:PlanId[]=['free','pro'];
export const PLAN_LABELS:Record<PlanId,{ja:string;en:string}>={free:{ja:'無料',en:'Free'},pro:{ja:'安全AI Pro',en:'Anzen AI Pro'},standard:{ja:'旧プラン',en:'Legacy'},business:{ja:'旧プラン',en:'Legacy'},custom:{ja:'旧プラン',en:'Legacy'}};
export const PLAN_MONTHLY_PRICE:Record<PlanId,number|null>={free:0,pro:product.monthlyPrice,standard:null,business:null,custom:null};
export const PLAN_ANNUAL_MONTHLY:Record<PlanId,number|null>={free:null,pro:null,standard:null,business:null,custom:null};
export const PLAN_IS_POPULAR:Record<PlanId,boolean>={free:false,pro:true,standard:false,business:false,custom:false};
const values=(free:FeatureValue,pro:FeatureValue):Record<PlanId,FeatureValue>=>({free,pro,standard:'販売終了',business:'販売終了',custom:'販売終了'});
export const FEATURE_MATRIX:FeatureCategory[]=[{labelJa:'会員ごとの共通利用枠（日本時間0時更新）',labelEn:'Shared daily limits (JST midnight)',features:[
 {labelJa:'安衛法チャット',labelEn:'Law chat',values:values(`1日${product.limits.free.law_chat}回`,`1日${product.limits.pro.law_chat}回・1分10回`)},
 {labelJa:'化学物質RA（評価生成は現在停止中）',labelEn:'Chemical RA generation currently unavailable',values:values('生成停止・再開時1日1件','生成停止・再開時1日10件')},
 {labelJa:'警報地点',labelEn:'Weather locations',values:values('1地点・通知なし','10地点・通知あり')},
 {labelJa:'事故・法令・学習資料の閲覧',labelEn:'Read accident, legal and learning materials',values:values(true,true)},
 {labelJa:'利用会員',labelEn:'Member',values:values('本人1名','本人1名')},
]}];
