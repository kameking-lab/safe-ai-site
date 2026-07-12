"use client";

import Link from "next/link";
import { HelpCircle, PackageSearch, Search, Upload } from "lucide-react";

/**
 * CR2-T1: 化学物質のゼロヒット（収載外）を「見つかりません＋広告」で終わらせないための
 * 共通救済コンポーネント。RA一窓（chemical-ra の UnifiedChemicalSearch）と
 * 化学物質検索DB（/chemical-database）の両画面が同じ脱出路を出すために共有する。
 *
 * 脱出路: ① AI詳細調査（RAは in-page callback、DBは /chemical-ra への遷移リンク）
 *         ② SDS読み取り（#sds-upload 或いは /chemical-ra#sds-upload）
 *         ③ 製品名から成分検索（/chemical-ra/product-search）
 * ＋製品名らしさのヒントと、収載外でも義務/努力義務が残る旨（57条の3・28条の2）の正直な注意。
 */

/** 製品名らしさの手掛かり（成分特定への導線を出すためのヒューリスティック）。 */
export const PRODUCT_HINT_WORDS = [
  "シンナー",
  "塗料",
  "ペンキ",
  "スプレー",
  "洗浄剤",
  "クリーナー",
  "接着剤",
  "ボンド",
  "オイル",
  "グリス",
  "ワックス",
  "うすめ液",
  "剥離剤",
  "さび止め",
  "防錆",
  "コーキング",
  "シーリング",
];

export function isLikelyProductName(q: string): boolean {
  return PRODUCT_HINT_WORDS.some((w) => q.includes(w));
}

/** AI詳細調査ボタンの振る舞い: RAは同一ページ内の action、他画面は /chemical-ra への遷移。 */
type AiAction = { onClick: () => void; loading?: boolean } | { href: string };

const BTN_PRIMARY =
  "inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-60";
const BTN_SECONDARY =
  "inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100";

export function ChemicalNotFoundRescue({
  query,
  ai,
  sdsHref = "/chemical-ra#sds-upload",
  productSearchHref = "/chemical-ra/product-search",
  catalogNote,
}: {
  query: string;
  ai: AiAction;
  sdsHref?: string;
  productSearchHref?: string;
  /** 収載外見出しの括弧内補足（例: 統合DB 3,695物質・法令名称索引のいずれにも見つかりません）。 */
  catalogNote?: string;
}) {
  const q = query.trim();
  const productHint = isLikelyProductName(q);
  // 同一ページ内アンカー（#...）は Link ではなくネイティブ <a> でスクロールさせる。
  const sdsIsHash = sdsHref.startsWith("#");
  return (
    <div role="status" className="space-y-2.5 rounded-xl border border-slate-300 bg-slate-50 p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
        <HelpCircle className="h-4 w-4 text-slate-500" aria-hidden="true" />
        「{q.slice(0, 30)}」は収載外です{catalogNote ? `（${catalogNote}）` : ""}
      </p>
      {productHint && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          製品名の可能性があります。製品の
          <strong className="font-semibold">SDS（安全データシート）の「組成・成分情報」欄にあるCAS番号</strong>
          で検索すると確実に特定できます。
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {"onClick" in ai ? (
          <button type="button" onClick={ai.onClick} disabled={ai.loading} className={BTN_PRIMARY}>
            <Search className="h-4 w-4" aria-hidden="true" />
            この名前でAI詳細調査
          </button>
        ) : (
          <Link href={ai.href} className={BTN_PRIMARY}>
            <Search className="h-4 w-4" aria-hidden="true" />
            この名前でAI詳細調査
          </Link>
        )}
        {sdsIsHash ? (
          <a href={sdsHref} className={BTN_SECONDARY}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            SDSを読み取って特定
          </a>
        ) : (
          <Link href={sdsHref} className={BTN_SECONDARY}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            SDSを読み取って特定
          </Link>
        )}
        <Link href={productSearchHref} className={BTN_SECONDARY}>
          <PackageSearch className="h-4 w-4" aria-hidden="true" />
          製品名から成分を探す
        </Link>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-600">
        収載外でも安全とは限りません。リスクアセスメント対象物（ラベル・SDS交付義務物質）に該当する場合は
        リスクアセスメントが義務（安衛法57条の3）、それ以外の化学物質も実施が努力義務です（安衛法28条の2）。
        SDSの入手 → 成分CAS番号で再検索 → 判定、の順で進めてください。
      </p>
    </div>
  );
}
