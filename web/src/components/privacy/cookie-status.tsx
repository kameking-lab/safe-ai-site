import { isGaEnabled } from "@/lib/analytics-env";
import { configuredAdsensePublisherId } from "@/lib/adsense-account";
import { getRumServerReadiness } from "@/lib/rum/server-readiness";
import { isPreviewSafetyMode } from "@/lib/server/deployment-safety";

// Server component: reports deployment capability, not this browser's consent.
// Audit reference: harsh-third-party-2026-05-16 G-005.
export function PrivacyCookieStatus() {
  const gaEnabled = isGaEnabled();
  // Keep the capability condition aligned with the root layout's adsEnabled.
  const adsEnabled =
    !isPreviewSafetyMode() && Boolean(configuredAdsensePublisherId(process.env.NEXT_PUBLIC_ADSENSE_PUB_ID));
  const rumReadiness = getRumServerReadiness();

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm leading-7 text-slate-600">
        本サービスの配信設定に基づく Cookie の利用状況です。このブラウザの同意状態や、実際の広告表示・審査状況を示すものではありません。
        任意 Cookie は、設定が有効でも許可前には使用しません。
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
        <li>
          <span className="font-semibold">必須 Cookie：</span>
          <span className="ml-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            有効
          </span>
          <span className="ml-2 text-slate-600">（認証セッション・表示設定・KYドラフト一時保存）</span>
        </li>
        <li>
          <span className="font-semibold">分析 Cookie（GA4）：</span>
          {gaEnabled ? (
            <>
              <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                同意時のみ有効
              </span>
              <span className="ml-2 text-slate-600">（初期状態は拒否・送信先: Google LLC）</span>
            </>
          ) : (
            <>
              <span className="ml-1 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                未導入
              </span>
              <span className="ml-2 text-slate-600">（環境変数未設定、または本番環境以外のため計測は行われていません）</span>
            </>
          )}
        </li>
        <li>
          <span className="font-semibold">広告 Cookie（Google AdSense）：</span>
          {adsEnabled ? (
            <>
              <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                同意時のみ有効
              </span>
              <span className="ml-2 text-slate-600">（初期状態は読み込みなし・送信先: Google および広告配信パートナー）</span>
            </>
          ) : (
            <>
              <span className="ml-1 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                無効
              </span>
              <span className="ml-2 text-slate-600">（広告配信設定なし、またはプレビュー等の保護環境）</span>
            </>
          )}
        </li>
        <li>
          <span className="font-semibold">匿名Web Vitals（RUM）：</span>
          {rumReadiness.ready ? (
            <>
              <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                同意時のみ有効
              </span>
              <span className="ml-2 text-slate-600">
                （保持期間 {rumReadiness.retentionDays} 日、機微ルート・Previewは対象外）
              </span>
            </>
          ) : (
            <>
              <span className="ml-1 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                未導入
              </span>
              <span className="ml-2 text-slate-600">
                （送信先・保持期間・DPA・本番レート制御の条件未充足時は送信しません）
              </span>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}
