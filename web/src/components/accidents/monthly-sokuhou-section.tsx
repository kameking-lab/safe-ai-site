import { ExternalLink, FileSpreadsheet } from "lucide-react";
import sokuhou from "@/data/accidents/monthly-sokuhou.json";

/**
 * P2-1 最新の月次速報（厚労省・速報値）表示。
 * ETL(scripts/etl/mhlw-monthly-fetch.ts)が取込んだ分析用Excelの業種小分類別 全国計をそのまま表示。
 * 速報・累計値（参考）。確定値は年次プレス・e-Statを参照。出典・取込日時を明記（政府標準利用規約2.0）。
 * サーバーコンポーネント（ビルド時にJSONを読み、上位のみ描画＝クライアントへ全件送らない）。
 */
interface Row {
  bigCode: number;
  name: string;
  total: number;
}
interface Set {
  period: string;
  sourceUrl: string;
  rows: Row[];
  skipped: number;
}
interface Data {
  source: string;
  fetchedAt: string;
  note: string;
  sibou: Set | null;
  sisyou: Set | null;
}

function topRows(set: Set | null, n: number): Row[] {
  if (!set) return [];
  return [...set.rows].sort((a, b) => b.total - a.total).slice(0, n);
}

export function MonthlySokuhouSection() {
  const d = sokuhou as Data;
  if (!d.sisyou && !d.sibou) return null;
  const sisyouTop = topRows(d.sisyou, 12);
  const sibouTop = topRows(d.sibou, 8);
  const periodLabel = (d.sisyou ?? d.sibou)?.period.split("/")[1]?.trim() ?? (d.sisyou ?? d.sibou)?.period ?? "";
  const fetched = new Date(d.fetchedAt);
  const fetchedLabel = Number.isNaN(fetched.getTime())
    ? d.fetchedAt
    : `${fetched.getFullYear()}/${fetched.getMonth() + 1}/${fetched.getDate()}`;

  return (
    <section className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/40 p-4 sm:p-5 space-y-3">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <FileSpreadsheet className="h-5 w-5 text-rose-600" aria-hidden="true" />
        最新の月次速報（厚労省・速報値）
      </h2>
      <p className="text-xs text-slate-600">{periodLabel}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sisyouTop.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-bold text-slate-900">死傷災害が多い業種（速報・累計）</p>
            <ul className="mt-2 space-y-0.5 text-xs text-slate-700">
              {sisyouTop.map((r, i) => (
                <li key={`${r.bigCode}-${r.name}`} className="flex justify-between gap-2 border-b border-slate-100 pb-0.5">
                  <span className="truncate">{i + 1}. {r.name}</span>
                  <span className="font-mono shrink-0">{r.total.toLocaleString()}人</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {sibouTop.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-bold text-slate-900">死亡災害が多い業種（速報・累計）</p>
            <ul className="mt-2 space-y-0.5 text-xs text-slate-700">
              {sibouTop.map((r, i) => (
                <li key={`${r.bigCode}-${r.name}`} className="flex justify-between gap-2 border-b border-slate-100 pb-0.5">
                  <span className="truncate">{i + 1}. {r.name}</span>
                  <span className="font-mono shrink-0">{r.total.toLocaleString()}人</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        {d.note}
        {d.sisyou?.skipped || d.sibou?.skipped
          ? `　（形式検証で未確認のためスキップした行: 死傷${d.sisyou?.skipped ?? 0}・死亡${d.sibou?.skipped ?? 0}）`
          : ""}
      </p>
      <p className="text-[11px] text-slate-400">
        出典: {d.source}（取込日 {fetchedLabel}）／{" "}
        <a href="https://anzeninfo.mhlw.go.jp/information/sokuhou.html" target="_blank" rel="noreferrer" className="text-rose-700 underline hover:no-underline">
          厚労省 速報ページ
          <ExternalLink className="ml-0.5 inline h-3 w-3" aria-hidden="true" />
        </a>
      </p>
    </section>
  );
}
