// Server component: shows current GA4 deployment status based on env var.
// Audit reference: harsh-third-party-2026-05-16 G-005.
export function PrivacyCookieStatus() {
  const gaEnabled = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm leading-7 text-slate-600">
        本サービスの現在の Cookie 利用状況を以下に表示します（環境変数の設定に基づき自動判定）。
        変更があった場合は、本表示も自動的に更新されます。
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
                有効
              </span>
              <span className="ml-2 text-slate-600">（送信先: Google LLC・米国）</span>
            </>
          ) : (
            <>
              <span className="ml-1 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                未導入
              </span>
              <span className="ml-2 text-slate-600">（環境変数未設定のため計測は行われていません）</span>
            </>
          )}
        </li>
        <li>
          <span className="font-semibold">広告トラッキング Cookie：</span>
          <span className="ml-1 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
            未導入
          </span>
          <span className="ml-2 text-slate-600">（本サービス自体では設定していません）</span>
        </li>
      </ul>
    </div>
  );
}
