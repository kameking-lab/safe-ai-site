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
    <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/50 p-4 sm:p-5 space-y-2">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <CalendarClock className="h-5 w-5 text-sky-600" aria-hidden="true" />
        直近の労働災害（厚労省・公式データ）
      </h2>
      <p className="text-xs text-slate-600">
        最新の労災発生状況は厚労省・e-Statの公式データが一次情報です（出典明示でリンク）。本サイトの事例DBは過去事例の分析用です。
      </p>
      <ul className="space-y-1.5">
        {LINKS.map((l) => (
          <li key={l.url}>
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 hover:border-sky-300"
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
      <p className="text-[11px] text-slate-400">
        ※ 出典: 厚生労働省・職場のあんぜんサイト・政府統計の総合窓口(e-Stat)。政府標準利用規約2.0に基づき出典明示で利用。公表時期は調査時点。
      </p>
    </section>
  );
}
