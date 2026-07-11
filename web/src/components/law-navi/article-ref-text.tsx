import Link from "next/link";
import { linkifyArticleReferences } from "@/lib/law-links/article-ref-linkify";
import { rewriteLawSearchHrefToPermalink } from "@/lib/law-navi/permalink";

/**
 * 条文本文を O18 条文参照リンカ（article-ref-linkify）でライブ化して描画する。
 *
 * O18 は実装・回帰固定済みだが描画面ゼロ（dormant）だった（T6 §4-2）。本コンポーネントが
 * 初の描画面。リンカ本体は不変更のまま、内部 href（/law-search?law=&art=）を対象条文が
 * 法令ナビ生成集合に在る場合のみパーマリンクへ書き換える（T6 §6 の薄い後処理・幽霊リンク 0）。
 * 解決不能な参照はリンカが素テキストとして返すのでそのまま描画される。
 */
export function ArticleRefText({
  text,
  lawFullName,
}: {
  text: string;
  lawFullName: string;
}) {
  const segments = linkifyArticleReferences(text, lawFullName);
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-8 text-slate-800">
      {segments.map((seg, i) => {
        if (!("href" in seg)) return <span key={i}>{seg.text}</span>;
        if (seg.external) {
          return (
            <a
              key={i}
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
            >
              {seg.text}
            </a>
          );
        }
        return (
          <Link
            key={i}
            href={rewriteLawSearchHrefToPermalink(seg.href)}
            className="text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900"
          >
            {seg.text}
          </Link>
        );
      })}
    </p>
  );
}
