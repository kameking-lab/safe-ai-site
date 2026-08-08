import Link from "next/link";

export function EmptyCategoryFallback() {
  return (
    <section className="mx-auto mt-8 max-w-5xl rounded-2xl border-2 border-amber-400 bg-amber-50 p-6">
      <h2 className="text-lg font-bold text-amber-950">
        検証済みの一般公開機能は現在0件です
      </h2>
      <p className="mt-2 text-sm leading-7 text-amber-950">
        未確認の機能を利用可能とは案内しません。一次資料との照合と外部レビューが完了した機能だけを再公開します。
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/anzeneisei05.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-lg bg-amber-900 px-4 py-2 text-sm font-bold text-white"
        >
          厚生労働省の公式資料を確認
        </a>
        <Link
          href="/education-certification/finder"
          className="inline-flex min-h-11 items-center rounded-lg border border-amber-700 bg-white px-4 py-2 text-sm font-bold text-amber-950"
        >
          資格・教育条件を確認
        </Link>
      </div>
    </section>
  );
}
