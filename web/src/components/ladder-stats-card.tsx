import Link from "next/link";
import { AlertTriangle, CheckSquare, Hammer } from "lucide-react";

/** 脚立3点支持チェック 8項目（作業前・使用中の両方を含む実運用チェック） */
const LADDER_CHECKLIST_8 = [
  "脚立のラベル（最大使用質量・開き角度）を確認した",
  "天板・踏み桟・支柱にヒビ・曲がり・油付着がない",
  "開脚金具を完全にロックし、カチッと音が鳴るまで広げた",
  "4本の脚が水平な硬い面に着いており、ぐらつきがない",
  "天板には乗らず、1段下までを作業位置とした",
  "両手・片足（または両足・片手）の3点支持を常に保った",
  "作業中は脚立を横に動かさず、降りてから移動した",
  "2m以上で使用する場合は補助者を1名配置または墜落制止用器具を装着した",
];

/**
 * 脚立・はしご墜落の統計サマリーカード。
 * 100人調査 ID_020（電気工事業の脚立墜落が業種最多）を根拠に、
 * /accidents のトップへピン留めする。
 */
export function LadderStatsCard() {
  return (
    <section
      className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm sm:p-5"
      aria-label="脚立・はしご墜落の統計カード"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-amber-900">
              脚立・はしごからの墜落が業種別で最多
            </h2>
            <p className="mt-0.5 text-xs text-amber-900/80">
              電気工事業の死亡災害では、脚立・はしごからの転落が単独カテゴリで最多。
              厚労省・職場のあんぜんサイト収録事例からも同様の傾向が確認できます。
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-800 px-2 py-0.5 text-[10px] font-bold text-white">
          100人調査 ID_020
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-[11px] font-semibold text-slate-500">平均墜落高さ</dt>
          <dd className="mt-0.5 text-lg font-black text-amber-900">1.5〜2.5m</dd>
          <p className="text-[11px] leading-5 text-slate-600">
            「低いから大丈夫」が招く重症事故。1mでも打ちどころで死亡例あり。
          </p>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-[11px] font-semibold text-slate-500">主な原因</dt>
          <dd className="mt-0.5 text-sm font-bold text-amber-900">
            3点支持不遵守・開脚金具未ロック・脚元不安定
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-[11px] font-semibold text-slate-500">多発時期</dt>
          <dd className="mt-0.5 text-sm font-bold text-amber-900">
            夏（保守点検期）と年度末の工期集中期
          </dd>
        </div>
      </dl>

      <details className="mt-3 rounded-xl border border-amber-200 bg-white/70 p-3">
        <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-amber-900">
          <CheckSquare className="h-4 w-4" aria-hidden="true" />
          脚立3点支持チェック 8項目を開く
        </summary>
        <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-800">
          {LADDER_CHECKLIST_8.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-700 text-[10px] font-bold text-white">
                {idx + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href="/ky?preset=ladder"
          className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800"
        >
          <Hammer className="h-3.5 w-3.5" aria-hidden="true" />
          KY用紙でこのプリセットを使う
        </Link>
        <Link
          href="/accidents?acc_type=墜落"
          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
        >
          墜落・転落事例のみで絞り込む
        </Link>
      </div>
    </section>
  );
}
