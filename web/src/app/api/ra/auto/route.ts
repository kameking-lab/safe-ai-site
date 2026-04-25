/**
 * /api/ra/auto
 * 製品（または直接成分）+ 作業条件を受け取って RA を自動実行。
 *
 * - プラン別に月次回数制限（Free 3 / Standard 30 / Pro 無制限）。
 * - 認証ユーザーは prisma の SdsSearch に履歴を保存。
 * - DATABASE_URL 未設定 / 未ログインなら制限なし（ステートレス）。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchProducts, type SdsProduct } from "@/lib/sds-fetcher";
import { runRiskAssessment, type AmountLevel, type Ventilation } from "@/lib/ra-engine";
import {
  getSdsSearchLimit,
  isOverLimit,
  planFromSession,
} from "@/lib/plan-limits";

export type RaAutoRequest = {
  productName: string;
  manufacturer?: string;
  /** 直接 productId 指定で skip search */
  productId?: string;
  ventilation: Ventilation;
  amount: AmountLevel;
  durationHours: number;
};

const VENTILATION_VALUES: Ventilation[] = ["none", "general", "local"];
const AMOUNT_VALUES: AmountLevel[] = ["small", "medium", "large"];

function isVentilation(v: unknown): v is Ventilation {
  return typeof v === "string" && (VENTILATION_VALUES as string[]).includes(v);
}
function isAmount(v: unknown): v is AmountLevel {
  return typeof v === "string" && (AMOUNT_VALUES as string[]).includes(v);
}

export async function POST(request: Request) {
  let body: RaAutoRequest | null = null;
  try {
    body = (await request.json()) as RaAutoRequest;
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
  if (!isVentilation(body?.ventilation)) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "換気条件が不正です（none/general/local）。" } },
      { status: 400 }
    );
  }
  if (!isAmount(body?.amount)) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "取扱量が不正です（small/medium/large）。" } },
      { status: 400 }
    );
  }
  const durationHours = Number(body?.durationHours);
  if (!Number.isFinite(durationHours) || durationHours <= 0 || durationHours > 24) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "作業時間は 0 < h ≤ 24 で指定してください。" } },
      { status: 400 }
    );
  }

  // セッション・プラン判定
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const planName = (session?.user as { planName?: string } | undefined)?.planName;
  const plan = planFromSession(planName);

  // 月次制限チェック
  const limit = await getSdsSearchLimit(userId, plan);
  if (isOverLimit(limit)) {
    return NextResponse.json(
      {
        error: {
          code: "PLAN_LIMIT",
          message: `${plan.toUpperCase()} プランの月次上限（${limit.monthlyLimit}回）に達しました。プランをアップグレードしてください。`,
          plan,
          monthlyLimit: limit.monthlyLimit,
          used: limit.used,
        },
      },
      { status: 429 }
    );
  }

  // SDS 検索（または productId 指定でスキップ）
  let product: SdsProduct | undefined;
  let source: "internal-db" | "nite-chrip" = "internal-db";
  if (body.productId) {
    const searchResult = await searchProducts(productName, body.manufacturer);
    product = searchResult.hits.find((p) => p.id === body.productId) ?? searchResult.hits[0];
    source = searchResult.source;
  } else {
    const searchResult = await searchProducts(productName, body.manufacturer);
    product = searchResult.hits[0];
    source = searchResult.source;
  }

  if (!product) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message:
            "該当する製品が SDS 内蔵 DB に見つかりませんでした。製品名・メーカー名をご確認の上、再度お試しください（β機能：主要10製品のみ収録）。",
        },
      },
      { status: 404 }
    );
  }

  // RA 実行
  const ra = runRiskAssessment({
    product,
    ventilation: body.ventilation,
    amount: body.amount,
    durationHours,
  });

  // 履歴保存（DB 接続あり & ログイン時のみ）
  let saved = false;
  if (prisma && userId) {
    try {
      await prisma.sdsSearch.create({
        data: {
          userId,
          productName,
          manufacturer: body.manufacturer,
          ventilation: body.ventilation,
          amount: body.amount,
          durationHours,
          productHit: product as unknown as object,
          riskLevel: ra.overallLevel,
          componentRa: ra.components as unknown as object,
          source,
        },
      });
      saved = true;
    } catch (err) {
      console.error("[ra/auto] failed to save history:", err);
    }
  }

  return NextResponse.json(
    {
      ra,
      source,
      plan,
      monthlyLimit: limit.monthlyLimit,
      used: limit.used + 1,
      historySaved: saved,
      disclaimer:
        "本評価はCREATE-SIMPLEの簡略実装によるβ機能です。最終判断は事業者責任のもと公式CREATE-SIMPLEまたは労働衛生コンサルタントの判断をご確認ください。",
    },
    { status: 200 }
  );
}
