/**
 * /api/sds/search
 * 製品名・メーカー名から SDS 内蔵 DB（または NITE-CHRIP）を検索。
 * 検索だけで RA は走らない（/api/ra/auto と分離）。
 */
import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/sds-fetcher";

export type SdsSearchRequest = {
  productName: string;
  manufacturer?: string;
};

export async function POST(request: Request) {
  let body: SdsSearchRequest | null = null;
  try {
    body = (await request.json()) as SdsSearchRequest;
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "リクエスト形式が不正です。" } },
      { status: 400 }
    );
  }

  const productName = body?.productName?.trim();
  if (!productName) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "製品名を入力してください。" } },
      { status: 400 }
    );
  }

  const result = await searchProducts(productName, body?.manufacturer?.trim() || undefined);
  return NextResponse.json(
    {
      hits: result.hits,
      source: result.source,
      disclaimer:
        "本検索はSDS情報の参考表示です。最終判断は事業者責任のもと公式SDSをご確認ください（β機能）。",
    },
    { status: 200 }
  );
}
