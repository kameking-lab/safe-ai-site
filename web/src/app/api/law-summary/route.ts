import { NextResponse } from "next/server";
import { cdnCacheHeaders, noStoreHeaders } from "@/lib/api-cache";

const MAX_EXCERPT_CHARS = 1_200;

function primaryExcerpt(law: string, articleNum: string, text: string) {
  const clipped =
    text.length > MAX_EXCERPT_CHARS
      ? `${text.slice(0, MAX_EXCERPT_CHARS)}\n\n（この表示では原文の一部を省略しています）`
      : text;
  return {
    summary:
      `【一次資料の抜粋・自動解説ではありません】\n${law} ${articleNum}\n\n${clipped}\n\n` +
      "適用条件や関連条文を含む正本は、e-Gov法令検索の原文で確認してください。",
    source: "primary_excerpt" as const,
    aiUsed: false,
    requiresHumanReview: true,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const law = url.searchParams.get("law")?.trim() ?? "";
  const articleNum = url.searchParams.get("articleNum")?.trim() ?? "";
  if (!law || !articleNum) {
    return NextResponse.json(
      { error: "law と articleNum は必須です。" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  const { verifiedLawArticles } = await import(
    "@/data/laws/verified-corpus"
  );
  const article = verifiedLawArticles.find(
    (item) =>
      (item.law === law || item.lawShort === law) &&
      item.articleNum === articleNum,
  );
  if (!article) {
    return NextResponse.json(
      {
        error:
          "個別本文のハッシュ一致を確認できないため、抜粋表示を保留しました。e-Gov法令検索の正本で確認してください。",
        code: "PRIMARY_TEXT_NOT_VERIFIED",
        officialSearchUrl: "https://laws.e-gov.go.jp/",
      },
      { status: 409, headers: noStoreHeaders() },
    );
  }

  return NextResponse.json(
    primaryExcerpt(article.law, article.articleNum, article.text),
    {
      headers: {
        ...cdnCacheHeaders("INDUSTRY"),
        "X-AI-Used": "false",
        "X-Content-Status": "primary-excerpt",
      },
    },
  );
}

/**
 * 任意の法令名・条文本文を approved corpus と誤認する旧互換経路は廃止する。
 * 呼び出し側は、サーバー収載条文をIDで解決するGETを使用する。
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "この経路は廃止されました。",
      code: "ROUTE_RETIRED",
      canonicalMethod: "GET",
    },
    {
      status: 410,
      headers: {
        ...noStoreHeaders(),
        "X-AI-Used": "false",
      },
    },
  );
}
