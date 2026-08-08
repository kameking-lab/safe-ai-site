import Link from "next/link";

const CONFIRMATION_ITEMS = [
  "対象地域と現場内の測定場所",
  "絶対日付・作業開始時刻・終了予定時刻",
  "現場実測WBGT、または推定・予報であることを明記した参考リスク",
  "作業内容・作業量・暑い時間帯を避けられるか",
  "休憩場所・休憩間隔・作業中止や変更の基準",
  "水分・塩分補給の方法と担当",
  "作業前・休憩後の体調確認と声かけ",
  "単独作業を避ける方法と相互確認の役割",
  "緊急連絡先・119番通報・救急車を迎える担当",
  "対策の実施担当・確認者・再確認時刻",
] as const;

export function HeatIllnessKyStart() {
  return (
    <aside
      aria-labelledby="heat-illness-ky-start-title"
      className="mx-auto mt-4 max-w-7xl rounded-2xl border-2 border-orange-400 bg-orange-50 p-4 text-slate-950 sm:p-6 dark:border-orange-700 dark:bg-orange-950/30 dark:text-white"
      data-testid="heat-illness-ky-start"
    >
      <p className="text-sm font-bold text-orange-900 dark:text-orange-200">
        熱中症予防ハブから開始
      </p>
      <h2
        id="heat-illness-ky-start-title"
        className="mt-1 text-xl font-black sm:text-2xl"
      >
        熱中症KYの作業条件を確認してください
      </h2>
      <p className="mt-2 max-w-4xl text-sm leading-7">
        この導線は入力候補を自動確定せず、AI提案や予報値も帳票へ自動転記しません。
        現場実測、公式情報、利用者が確定した内容を分けて入力し、提出前の確認画面と承認を通してください。
      </p>
      <ul className="mt-4 grid gap-2 text-sm leading-6 sm:grid-cols-2">
        {CONFIRMATION_ITEMS.map((item) => (
          <li
            key={item}
            className="rounded-xl border border-orange-200 bg-white p-3 dark:border-orange-800 dark:bg-slate-950"
          >
            <span aria-hidden="true">□ </span>
            {item}
          </li>
        ))}
      </ul>
      <nav
        aria-label="熱中症KYの事前確認"
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        <Link
          href="/risk"
          className="inline-flex min-h-[44px] items-center rounded-lg bg-orange-800 px-4 py-2 text-sm font-bold text-white hover:bg-orange-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
        >
          地域・天気・取得時刻を確認
        </Link>
        <a
          href="https://www.wbgt.env.go.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center rounded-lg border border-orange-700 bg-white px-4 py-2 text-sm font-bold text-orange-950 underline dark:bg-slate-950 dark:text-orange-100"
        >
          環境省で暑さ指数を確認
        </a>
        <Link
          href="/heat-illness-prevention"
          className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-bold text-slate-950 underline dark:bg-slate-950 dark:text-white"
        >
          熱中症予防ハブへ戻る
        </Link>
      </nav>
    </aside>
  );
}
