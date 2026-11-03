import Link from "next/link";
export type SdsHistoryEntry={id:string;productName:string;riskLevel:string|null;createdAt:string|Date};
export function AccountSdsHistory({sdsHistory,sdsHistoryFailed}:{sdsHistory:SdsHistoryEntry[];sdsHistoryFailed:boolean}){return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800">SDS検索＋RA履歴</h2>
          <Link
            href="/chemical-ra/product-search"
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            新規検索 →
          </Link>
        </div>
        {sdsHistoryFailed ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            履歴の読み込みに失敗しました。時間をおいてページを再読み込みしてください。
          </p>
        ) : sdsHistory.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">
            まだ履歴がありません。製品検索＋自動RAを実行すると、ここに最新10件が表示されます。
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {sdsHistory.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{h.productName}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(h.createdAt).toLocaleString("ja-JP")}
                  </p>
                </div>
                {h.riskLevel && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {h.riskLevel}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>


);}
