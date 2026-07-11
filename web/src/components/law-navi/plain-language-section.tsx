import { MessageCircle } from "lucide-react";
import type { LawArticle } from "@/data/laws";
import { getFreshPlainArticle } from "@/data/plain";

/**
 * 条文ページの「現場ことば版」区画（原文の直下）。
 *
 * 表示条件は getFreshPlainArticle が一元判定:
 *  - 言い換えが存在し、fidelity 検証済み（verified）で、
 *  - 言い換えの元にした原文がコーパス現行原文とハッシュ一致（＝改正未反映の
 *    stale ではない）ときだけ描画する。未生成・stale は区画ごと出さない（空枠なし）。
 *
 * 免責は区画内に1回だけ・「正は原文」を明示。生成メタ（モデル・日付・機械照合済み）を
 * 小さく表示して、AI生成であることを隠さない。
 */
export function PlainLanguageSection({
  egovLawId,
  article,
}: {
  egovLawId: string;
  article: Pick<LawArticle, "articleNum" | "text">;
}) {
  const plain = getFreshPlainArticle(egovLawId, article);
  if (!plain) return null;

  return (
    <section
      aria-label="現場ことば版（わかりやすい言い換え）"
      className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm"
    >
      <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-amber-900">
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        現場ことば版（わかりやすい言い換え）
      </p>
      <p className="text-[15px] leading-7 text-slate-800">{plain.plainText}</p>
      {plain.omissions && plain.omissions.length > 0 && (
        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          ※この言い換えで省いている内容: {plain.omissions.join("／")}
        </p>
      )}
      <p className="mt-3 border-t border-amber-100 pt-2 text-[11px] leading-5 text-slate-500">
        この区画はAIによる言い換え（理解の補助）です。正式な内容は上の原文と e-Gov が正本です。
        生成: {plain.model}・{plain.generatedAt}・原文との機械照合（数値・義務主体・参照条）済み。
      </p>
    </section>
  );
}
