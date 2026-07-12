/**
 * condex 配信 API（FT-D4 検索統合）。
 *
 * 全文層（laws-fulltext）を「条番号＋見出し＋スラグのみ」へ射影した軽量索引を返す。
 * クライアント横断検索（/search・⌘K）が 0 件時にこれを引き、curated に無い条番号を
 * 該当の全文条ページ（/law-navi/{egovLawId}/{artSlug}）へ着地させる。
 *
 * 【全文はクライアントに載せない】本文（text/paragraphs）は一切含めない。配信するのは
 * 条番号・見出し・スラグのみ（設計 §2-4「fulltext 由来の条番号+見出しのみの軽量インデックス」）。
 *
 * 静的化: 全文は committed 静的データで実行時に変化しないため force-static でビルド時に
 * 一度だけ生成し、以降は静的アセットとして配信する（サーバー実行コスト 0・生成物コミットなし・
 * 全文 JSON はサーバー/ビルド専用のまま＝クライアントバンドル不可侵）。FULLTEXT_LAW_IDS の
 * 増加（FT-D5 の安衛法・安衛令取込等）にはビルド時に自動追従する。
 */
import { NextResponse } from "next/server";
import { buildCondex } from "@/lib/laws-fulltext/condex-build";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  const payload = await buildCondex();
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      // 静的アセット扱い。全文の改正取込（revisionId 変化）時のみビルドで更新される。
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
