// GA4計測タグの有効判定。プレビュー用GA4プロパティと本番プロパティを混在させないため、
// 測定IDが設定されていても VERCEL_ENV=production（Vercel本番デプロイ）以外では無効化する。
// ローカル開発・Preview環境（PRごとのデプロイ含む）は VERCEL_ENV が "production" にならないため
// 自動的に対象外になる。
export function isGaEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) && process.env.VERCEL_ENV === "production";
}
