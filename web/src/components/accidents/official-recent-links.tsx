import { ExternalLink, CalendarClock } from "lucide-react";

/**
 * P1-2 直近の労働災害（公式）への出典付きリンク＋鮮度表示。
 * 社長要求「直近の事故がわかる」を合法・無料・低リスクで即対応。自動取込はせず、
 * 厚労省/e-Statの公式ページへ出典明示で誘導する（政府標準利用規約2.0、出典明示）。
 * 日付・件数は公式公表値（2026-05-26調査時点で確認）。実装時に最新を再確認すること。
 */
const LINKS: { label: string; freshness: string; url: string }[] = [
  {
    label: "労働災害発生 月次速報値（死亡・休業4日以上）",
    freshness: "毎月更新（分析用Excel提供）",
    url: "https://anzeninfo.mhlw.go.jp/information/sokuhou.html",
  },
  {
    label: "労働災害発生状況 年次確定値（厚労省プレス）",
    freshness: "令和6年確定値（2025-05-30公表／死亡746・死傷135,718）",
    url: "https://www.mhlw.go.jp/stf/newpage_58198.html",
  },
  {
    label: "死亡災害データベース（職場のあんぜんサイト）",
    freshness: "平成3年〜令和5年（個別事例の全数）",
    url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.html",
  },
  {
    label: "労働災害（死傷）データベース",
    freshness: "平成18年〜令和3年（休業4日以上の抽出）",
    url: "https://anzeninfo.mhlw.go.jp/anzen_pgm/SHISYO_FND.html",
  },
  {
    label: "e-Stat 労働災害発生状況（政府統計）",
    freshness: "業種別・事故型別の確定統計（無料・出典明示で利用可）",
    url: "https://www.e-stat.go.jp/statistics/00450551",
  },
];

export function OfficialRecentLinks() {
  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-white px-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-slate-800">
        <CalendarClock className="h-5 w-5 text-sky-600" aria-hidden="true" />
        公式の事故データ
      </summary>
      <ul className="space-y-1 border-t border-slate-200 py-3">
        {LINKS.map((l) => (
          <li key={l.url}>
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-start gap-2 py-2 text-sky-800 underline underline-offset-4"
            >
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-800">{l.label}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">{l.freshness}</span>
              </span>
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
