import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/api-cache";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type GoodsChatRequest = {
  question: string;
  aiProviderConsent?: boolean;
};

/**
 * 後方互換のため型は残す。ただし、検証済みの製品データと選定根拠を結び付けられるまで
 * API から商品推薦を返してはならない。
 */
export type GoodsRecommendation = {
  item: string;
  reason: string;
  lawBasis: string;
  searchQuery: string;
};

export type GoodsChatResponse = {
  reply: string;
  recommendations: GoodsRecommendation[];
  matchedCategories: Array<{
    id: string;
    reason: string;
  }>;
  checklist: string[];
  selectionStatus: "withheld";
  requiresHumanReview: true;
  aiUsed: false;
  degraded: true;
  degradedReason: "product_suitability_unverified";
};

export const PPE_SELECTION_CHECKLIST = [
  "作業、危険源、ばく露経路、使用時間、頻度を特定する",
  "化学物質を扱う場合は、最新版SDSの第8項などで推奨保護具を確認する",
  "必要な国家検定、JIS等の規格、性能区分と使用期限を確認する",
  "顔面・身体へのフィット、他の保護具との干渉、サイズを実装着で確認する",
  "交換時期、点検、洗浄、保管、教育の手順を決める",
  "保護具だけに頼らず、代替、隔離、局所排気、作業方法の改善を先に検討する",
  "安全衛生担当者、保護具着用管理責任者、メーカー等へ適合性を確認する",
] as const;

const CATEGORY_RULES = [
  {
    id: "fall-protection",
    keywords: ["高所", "墜落", "足場", "屋根", "はしご", "梯子", "鉄骨"],
    reason: "作業高さ・落下距離・取付設備を確認してから墜落制止用器具を検討",
  },
  {
    id: "respiratory",
    keywords: ["粉じん", "粉塵", "有機溶剤", "塗装", "溶接", "ヒューム", "石綿", "アスベスト"],
    reason: "有害物質、濃度、酸素濃度とSDSに適合する呼吸用保護具を確認",
  },
  {
    id: "chemical-gloves",
    keywords: ["薬液", "酸", "アルカリ", "化学", "溶剤", "皮膚", "洗浄剤"],
    reason: "対象物質ごとの耐透過・劣化データと使用時間を確認",
  },
  {
    id: "eye-face-protection",
    keywords: ["飛来", "研削", "グラインダー", "切断", "薬液", "溶接", "飛沫"],
    reason: "飛来物・薬液・光線と他の保護具との干渉を確認",
  },
  {
    id: "hearing",
    keywords: ["騒音", "大きな音", "はつり", "ハツリ", "削岩"],
    reason: "騒音ばく露と必要遮音量、警報・会話の聞こえ方を確認",
  },
  {
    id: "gas-detectors",
    keywords: ["酸欠", "酸素", "ガス", "硫化水素", "一酸化炭素", "密閉", "マンホール"],
    reason: "測定対象、警報値、校正、センサー寿命と測定位置を確認",
  },
  {
    id: "machine-lockout",
    keywords: ["機械", "点検", "整備", "修理", "清掃", "巻き込まれ", "電源"],
    reason: "すべてのエネルギー源、施錠箇所、復旧手順を確認",
  },
  {
    id: "heat-cold",
    keywords: ["暑熱", "熱中症", "高温", "寒冷", "低温", "屋外"],
    reason: "作業変更・休憩・水分塩分・測定を主にし、用品は補助として確認",
  },
  {
    id: "signs-barriers",
    keywords: ["立入", "進入", "車両", "重機", "区画", "第三者", "通行"],
    reason: "対象者、禁止・指示内容、視認距離と設置場所を確認",
  },
] as const;

export function matchGoodsCategories(question: string) {
  return CATEGORY_RULES.filter((rule) =>
    rule.keywords.some((keyword) => question.includes(keyword)),
  )
    .slice(0, 4)
    .map(({ id, reason }) => ({ id, reason }));
}

function responseHeaders(): Record<string, string> {
  return {
    ...noStoreHeaders(),
    "X-AI-Used": "false",
    "X-Selection-Status": "withheld",
  };
}

export async function POST(request: Request) {
  let body: GoodsChatRequest;
  try {
    body = (await request.json()) as GoodsChatRequest;
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "リクエスト形式が不正です。" } },
      { status: 400, headers: responseHeaders() },
    );
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "作業条件を入力してください。" } },
      { status: 400, headers: responseHeaders() },
    );
  }
  const safety = evaluateChatbotSafety(question);
  if (safety) {
    return NextResponse.json(
      {
        error: {
          code: safety.kind === "emergency" ? "EMERGENCY" : "SAFETY_HOLD",
          message: safety.response,
        },
        selectionStatus: "withheld",
        recommendations: [],
        checklist: [],
        aiUsed: false,
        requiresHumanReview: true,
      },
      { status: 422, headers: responseHeaders() },
    );
  }
  if (question.length > 2_000) {
    return NextResponse.json(
      { error: { code: "TOO_LARGE", message: "入力は2,000文字以内にしてください。" } },
      { status: 413, headers: responseHeaders() },
    );
  }

  const response: GoodsChatResponse = {
    reply:
      "入力内容から関連する保護具・安全用品のカテゴリ候補を整理しました。特定製品の適合性は判定していないため、次の条件を人が確認してから選定してください。",
    recommendations: [],
    matchedCategories: matchGoodsCategories(question),
    checklist: [...PPE_SELECTION_CHECKLIST],
    selectionStatus: "withheld",
    requiresHumanReview: true,
    aiUsed: false,
    degraded: true,
    degradedReason: "product_suitability_unverified",
  };

  return NextResponse.json(response, { status: 200, headers: responseHeaders() });
}
