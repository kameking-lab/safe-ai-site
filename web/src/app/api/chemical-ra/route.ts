/**
 * /api/chemical-ra
 * 化学物質名を受け取り、Gemini APIでSDS/GHS分類・保護具・対策チェックリストを返す。
 * 厚労省「職場のあんぜんサイト」の情報を参考にしたRAG方式。
 *
 * CREATE-SIMPLE準拠の4段階リスク判定（I〜IV）も同時に実施する。
 * 取扱量・換気・作業時間と濃度基準値からばく露指数を推計する。
 */
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { findByCas, searchMergedChemicals, regulatoryLabels, relatedLawTexts, type MergedChemical } from "@/lib/mhlw-chemicals";
import { AI_DISCLAIMER_SYSTEM_INSTRUCTION } from "@/lib/gemini";

export type ChemicalRaRequest = {
  chemicalName: string;
  workContent?: string;
  casNumber?: string;
  /** CREATE-SIMPLE 入力（任意） */
  ventilation?: "none" | "general" | "local";
  amount?: "small" | "medium" | "large";
  durationHours?: number;
};

export type CreateSimpleAssessment = {
  /** リスクレベル（I=低、IV=直ちに改善） */
  level: "I" | "II" | "III" | "IV";
  /** ラベル（例：「IV：直ちに改善」） */
  label: string;
  /** 推定ばく露指数（基準値1.0で基準値ちょうど） */
  exposureRatio: number;
  /** 入力内容のサマリ */
  inputSummary: { ventilation: string; amount: string; durationHours: number };
  /** 8時間濃度基準値（参考） */
  limit8h?: string;
  /** 判定ロジックの根拠注記 */
  rationale: string[];
};

export type GhsHazard = {
  category: string;      // ハザードクラス名
  classification: string; // 区分
  signal?: string;       // 注意喚起語（危険/警告）
  hazardStatement?: string; // 危険有害性情報
};

export type PpeRecommendation = {
  item: string;
  specification: string; // 規格・種類
  searchQuery: string;
};

export type SafetyMeasure = {
  category: string;   // 管理的対策・工学的対策・保護具など
  action: string;
  /** 優先度（1=最優先、3=低）。工学的対策→管理的対策→保護具の順 */
  priority?: 1 | 2 | 3;
};

export type ChemicalRaResponse = {
  chemicalName: string;
  casNumber?: string;
  ghsHazards: GhsHazard[];
  flashPoint?: string;
  exposureLimit?: string;
  ppeRecommendations: PpeRecommendation[];
  safetyMeasures: SafetyMeasure[];
  emergencyMeasures: string[];
  regulatoryNotes: string[];
  rawReply: string;
  /** AIが成功したか。失敗時はMHLWフォールバック */
  aiStatus?: "ok" | "apikey_missing" | "ai_failed" | "demo";
  /** AI失敗時のエラー詳細（カテゴリ） */
  aiErrorDetail?: string;
  /** CREATE-SIMPLE準拠の4段階判定（入力があれば算出） */
  createSimple?: CreateSimpleAssessment;
  /** 関連ハザード情報の引用（厚労省データから自動引用） */
  relatedHazards?: string[];
};

const SYSTEM_PROMPT = `あなたは化学物質の安全性と職場の化学物質リスクアセスメントの専門家です。
厚労省「職場のあんぜんサイト」のSDS情報・GHSデータを参考に回答します。

ユーザーが化学物質名を入力したら、以下の情報をJSONブロックで返してください。

【JSONブロックのフォーマット】
\`\`\`json
{
  "casNumber": "CAS番号（不明な場合は null）",
  "ghsHazards": [
    {
      "category": "ハザードクラス名（例：急性毒性-経口）",
      "classification": "区分（例：区分4）",
      "signal": "危険 または 警告",
      "hazardStatement": "危険有害性情報（例：飲み込むと有害）"
    }
  ],
  "flashPoint": "引火点（例：-11℃）、不燃の場合は null",
  "exposureLimit": "許容濃度（例：OEL 50ppm / ACGIH TLV-TWA 50ppm）",
  "ppeRecommendations": [
    {
      "item": "保護具名",
      "specification": "規格・種類（例：DS2規格 防塵マスク）",
      "searchQuery": "Amazon/楽天検索キーワード"
    }
  ],
  "safetyMeasures": [
    {
      "category": "工学的対策",
      "action": "局所排気装置の設置（有機溶剤中毒予防規則第5条）",
      "priority": 1
    },
    {
      "category": "管理的対策",
      "action": "作業時間の短縮・作業手順書の整備",
      "priority": 2
    },
    {
      "category": "保護具",
      "action": "防毒マスク（有機ガス用吸収缶）の着用",
      "priority": 3
    }
  ],
  "emergencyMeasures": [
    "皮膚接触の場合：直ちに多量の水で洗い流す",
    "吸入した場合：新鮮な空気の場所に移動し、医療機関へ"
  ],
  "regulatoryNotes": [
    "有機溶剤中毒予防規則の対象物質（第2種有機溶剤）",
    "特定化学物質障害予防規則の対象外"
  ]
}
\`\`\`

【ルール】
- 既知の化学物質の場合は、一般的に公開されているSDS・GHSデータに基づいて回答する
- 不明な物質の場合は「詳細不明」と明記し、専門家への確認を推奨する
- 保護具は法令根拠（有機則・特化則・粉塵則等）を考慮して選定する
- 日本語で回答し、現場担当者が理解しやすい表現を使う
- 回答の冒頭に物質の基本的な性状説明を2〜3行で加える
- safetyMeasures は厚労省指針の優先順位（① 代替化／工学的対策 → ② 管理的対策 → ③ 個人保護具）を必ず守ること
- safetyMeasures.priority は 1=工学的対策・代替化、2=管理的対策、3=保護具 とし、配列は priority 順に並べること
- 濃度基準値・許容濃度は「参考値」として提示し、実際の作業環境測定結果によって判断すること
- 断定的な断言（「〜に該当します」）より「〜と考えられます」「〜とされています」を使うこと
${AI_DISCLAIMER_SYSTEM_INSTRUCTION}`;

// 安全対策カテゴリの優先度（厚労省「化学物質管理の優先順位」に準拠）
const CATEGORY_PRIORITY: Record<string, 1 | 2 | 3> = {
  代替化: 1,
  代替: 1,
  工学的対策: 1,
  工学的: 1,
  管理的対策: 2,
  管理的: 2,
  作業管理: 2,
  保護具: 3,
  個人保護具: 3,
};

function inferPriority(category: string): 1 | 2 | 3 {
  for (const [k, v] of Object.entries(CATEGORY_PRIORITY)) {
    if (category.includes(k)) return v;
  }
  return 2; // デフォルトは管理的対策扱い
}

function sortMeasuresByPriority(measures: SafetyMeasure[]): SafetyMeasure[] {
  return measures
    .map((m) => ({ ...m, priority: m.priority ?? inferPriority(m.category) }))
    .sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2));
}

function extractJsonBlock(reply: string): Partial<ChemicalRaResponse> {
  const match = reply.match(/```json\s*([\s\S]*?)```/);
  if (!match?.[1]) return {};
  try {
    return JSON.parse(match[1]) as Partial<ChemicalRaResponse>;
  } catch {
    return {};
  }
}

function removeJsonBlock(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").trim();
}

// ────────────────────────────────────────────────────────────
// CREATE-SIMPLE 簡略版（取扱量×換気×作業時間 → リスクレベル）
// ────────────────────────────────────────────────────────────

const VENTILATION_FACTOR = { none: 3.0, general: 1.0, local: 0.3 } as const;
const AMOUNT_FACTOR = { small: 0.3, medium: 1.0, large: 3.0 } as const;
const VENTILATION_LABEL = { none: "換気なし", general: "全体換気", local: "局所排気" } as const;
const AMOUNT_LABEL = { small: "少量（<1L/日）", general: "中量", medium: "中量（1〜10L/日）", large: "大量（>10L/日）" } as const;

function parseLimitNumber(limit?: string): number | null {
  if (!limit) return null;
  const m = limit.match(/([\d.]+)/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return Number.isFinite(v) ? v : null;
}

function classifyLevel(ratio: number, isCarcinogenic: boolean): "I" | "II" | "III" | "IV" {
  const adj = isCarcinogenic ? ratio * 3 : ratio;
  if (adj < 0.1) return "I";
  if (adj < 0.5) return "II";
  if (adj < 1.0) return "III";
  return "IV";
}

const LEVEL_LABEL: Record<"I" | "II" | "III" | "IV", string> = {
  I: "I：低リスク",
  II: "II：要注意",
  III: "III：要改善",
  IV: "IV：直ちに改善",
};

function buildCreateSimpleAssessment(
  body: ChemicalRaRequest,
  mhlw: MergedChemical | undefined
): CreateSimpleAssessment | undefined {
  const ventilation = body.ventilation;
  const amount = body.amount;
  const durationHours = body.durationHours;
  // すべての入力が揃っていなければ判定しない（mhlw は不明でもデフォルト基準値で算出）
  if (!ventilation || !amount || typeof durationHours !== "number") return undefined;

  const limit8h = mhlw?.details?.limit8h;
  const limitNum = parseLimitNumber(limit8h) ?? 50; // 不明時はゆるい値（保守的に IV を出さない）
  const dur = Math.min(Math.max(durationHours, 0), 24);
  const baseExposure = VENTILATION_FACTOR[ventilation] * AMOUNT_FACTOR[amount] * (dur / 8);
  const estimatedConc = baseExposure * 100; // 単位は相対指標
  const ratio = Math.round((estimatedConc / Math.max(limitNum, 0.0001)) * 100) / 100;
  const isCarc = mhlw?.flags?.carcinogenic ?? false;
  const level = classifyLevel(ratio, isCarc);

  const rationale: string[] = [
    `換気: ${VENTILATION_LABEL[ventilation]}（係数 ${VENTILATION_FACTOR[ventilation]}）`,
    `取扱量: ${AMOUNT_LABEL[amount]}（係数 ${AMOUNT_FACTOR[amount]}）`,
    `作業時間: ${dur}時間（8時間換算 ${(dur / 8).toFixed(2)}）`,
    `推定ばく露指数: ${ratio.toFixed(2)}（基準値1.0で基準値ちょうど）`,
  ];
  if (isCarc) rationale.push("がん原性物質のため判定を3倍厳しく補正");
  if (!limit8h) rationale.push("8時間濃度基準値が不明のため、保守的な参考値（50ppm）で算出");

  return {
    level,
    label: LEVEL_LABEL[level],
    exposureRatio: ratio,
    inputSummary: {
      ventilation: VENTILATION_LABEL[ventilation],
      amount: AMOUNT_LABEL[amount],
      durationHours: dur,
    },
    limit8h,
    rationale,
  };
}

/** 厚労省データから関連ハザード情報を自動引用（規制カテゴリ＋関連法令） */
function buildRelatedHazards(mhlw: MergedChemical | undefined): string[] {
  if (!mhlw) return [];
  const out: string[] = [];
  out.push(...regulatoryLabels(mhlw.flags));
  out.push(...relatedLawTexts(mhlw.flags));
  if (mhlw.details?.limit8h) {
    out.push(`8時間濃度基準値: ${mhlw.details.limit8h}（安衛則 第577条の2）`);
  }
  if (mhlw.details?.limits?.carcinogenicity?.iarc) {
    out.push(`IARC発がん性分類: グループ${mhlw.details.limits.carcinogenicity.iarc}`);
  }
  return Array.from(new Set(out)).slice(0, 8);
}

function buildMhlwFallbackResponse(chemicalName: string, casNumber?: string): ChemicalRaResponse {
  let mhlw = casNumber ? findByCas(casNumber) : undefined;
  if (!mhlw) {
    const results = searchMergedChemicals(chemicalName, 1);
    if (results.length > 0) mhlw = results[0];
  }

  const notes: string[] = [];
  if (mhlw) {
    notes.push(...regulatoryLabels(mhlw.flags));
    notes.push(...relatedLawTexts(mhlw.flags));
  }

  const exposureLimit = mhlw?.details?.limit8h
    ? `8時間濃度基準値: ${mhlw.details.limit8h}${mhlw.details.limitShort ? ` / 短時間: ${mhlw.details.limitShort}` : ""}`
    : undefined;

  return {
    chemicalName,
    casNumber: casNumber ?? mhlw?.cas ?? undefined,
    ghsHazards: [],
    flashPoint: undefined,
    exposureLimit,
    ppeRecommendations: [],
    safetyMeasures: [],
    emergencyMeasures: [],
    regulatoryNotes: notes,
    rawReply:
      "⚠️ AI生成は現在利用できません。以下は厚労省公式データによる規制情報です。\nGHS分類・保護具推奨・緊急措置については製品の公式SDSをご確認ください。",
  };
}

const DEMO_RESPONSE: ChemicalRaResponse = {
  chemicalName: "トルエン（デモ）",
  casNumber: "108-88-3",
  ghsHazards: [
    { category: "引火性液体", classification: "区分2", signal: "危険", hazardStatement: "引火性の高い液体及び蒸気" },
    { category: "急性毒性（吸入）", classification: "区分4", signal: "警告", hazardStatement: "吸入すると有害のおそれ" },
    { category: "生殖毒性", classification: "区分2", signal: "警告", hazardStatement: "生殖能又は胎児への悪影響のおそれの疑い" },
  ],
  flashPoint: "4℃",
  exposureLimit: "OEL 20ppm（日本産業衛生学会）/ ACGIH TLV-TWA 20ppm",
  ppeRecommendations: [
    { item: "有機ガス用防毒マスク（吸収缶：有機ガス用）", specification: "JIST8151 有機ガス用吸収缶付き", searchQuery: "防毒マスク 有機ガス用 吸収缶" },
    { item: "保護手袋（耐溶剤性）", specification: "ニトリル製 EN374適合", searchQuery: "耐溶剤 保護手袋 ニトリル" },
    { item: "保護眼鏡（ゴーグルタイプ）", specification: "液体スプラッシュ対応", searchQuery: "保護ゴーグル 化学用" },
    { item: "化学物質用防護服（不浸透性）", specification: "耐溶剤タイプ", searchQuery: "防護服 耐溶剤 化学物質" },
  ],
  safetyMeasures: [
    { category: "工学的対策", action: "局所排気装置の設置（有機溶剤中毒予防規則第5条）" },
    { category: "工学的対策", action: "密閉化・囲い込みを優先する" },
    { category: "管理的対策", action: "作業時間の短縮・交替制の実施" },
    { category: "管理的対策", action: "作業環境測定の実施（有機則第28条）" },
  ],
  emergencyMeasures: [
    "皮膚接触の場合：直ちに多量の水と石鹸で洗い流し、汚染衣服を除去する",
    "眼への接触：大量の水で15分以上洗眼し、医療機関へ",
    "吸入した場合：新鮮な空気の場所に移動させ、呼吸困難な場合は医療機関へ",
    "火災の場合：泡・粉末・CO2消火器を使用。水による消火は不可",
  ],
  regulatoryNotes: [
    "有機溶剤中毒予防規則 第2種有機溶剤（有機則適用）",
    "特定化学物質（第2類物質）には該当しない",
    "危険物取扱規則 第4類 第1石油類（非水溶性）",
  ],
  rawReply: "Gemini APIキーが未設定のため、参考データを表示しています。",
};

export async function POST(request: Request) {
  let body: ChemicalRaRequest | null = null;
  try {
    body = (await request.json()) as ChemicalRaRequest;
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION", message: "リクエスト形式が不正です。" } }, { status: 400 });
  }

  const chemicalName = body?.chemicalName?.trim();
  if (!chemicalName) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "化学物質名を入力してください。" } }, { status: 400 });
  }

  const casNumber = body?.casNumber?.trim() || undefined;

  // 厚労省データを先行取得（CREATE-SIMPLE / 関連ハザード自動引用に使用）
  const mhlwData: MergedChemical | undefined = (() => {
    if (casNumber) {
      const found = findByCas(casNumber);
      if (found) return found;
    }
    const results = searchMergedChemicals(chemicalName, 1);
    return results[0];
  })();
  const createSimple = buildCreateSimpleAssessment(body, mhlwData);
  const relatedHazards = buildRelatedHazards(mhlwData);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    // APIキー未設定時はMHLWデータ + デモ回答
    const mhlwFallback = buildMhlwFallbackResponse(chemicalName, casNumber);
    if (mhlwFallback.regulatoryNotes.length > 0 || mhlwFallback.exposureLimit) {
      return NextResponse.json({
        ...mhlwFallback,
        safetyMeasures: sortMeasuresByPriority(mhlwFallback.safetyMeasures),
        createSimple,
        relatedHazards,
        aiStatus: "apikey_missing",
        aiErrorDetail: "GEMINI_API_KEY未設定",
        rawReply: "⚠️ GEMINI_API_KEYが未設定のため、AI生成は利用できません。以下は厚労省公式データによる規制情報です。\nGHS分類・保護具推奨については製品の公式SDSをご確認ください。",
      }, { status: 200 });
    }
    return NextResponse.json({
      ...DEMO_RESPONSE,
      chemicalName,
      safetyMeasures: sortMeasuresByPriority(DEMO_RESPONSE.safetyMeasures),
      createSimple,
      relatedHazards,
      aiStatus: "demo",
      aiErrorDetail: "GEMINI_API_KEY未設定",
    }, { status: 200 });
  }

  const workPart = body?.workContent?.trim()
    ? `\n\n【作業内容】\n${body.workContent.trim()}`
    : "";

  const userPrompt = `以下の化学物質のSDS情報・GHS分類・職場でのリスクアセスメント情報を提供してください。

【化学物質名】
${chemicalName}${workPart}

JSONブロック形式で安全データを提供し、物質の基本的な性状と取扱い上の注意点を説明してください。`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });
    const result = await model.generateContent(userPrompt);
    const rawReply = result.response.text();
    const extracted = extractJsonBlock(rawReply);
    const cleanReply = removeJsonBlock(rawReply);

    const response: ChemicalRaResponse = {
      chemicalName,
      casNumber: extracted.casNumber ?? casNumber,
      ghsHazards: extracted.ghsHazards ?? [],
      flashPoint: extracted.flashPoint,
      exposureLimit: extracted.exposureLimit ?? mhlwData?.details?.limit8h,
      ppeRecommendations: extracted.ppeRecommendations ?? [],
      safetyMeasures: sortMeasuresByPriority(extracted.safetyMeasures ?? []),
      emergencyMeasures: extracted.emergencyMeasures ?? [],
      regulatoryNotes: [
        ...(extracted.regulatoryNotes ?? []),
        ...relatedHazards.filter((h) => !(extracted.regulatoryNotes ?? []).some((r) => r.includes(h.slice(0, 10)))),
      ],
      rawReply: cleanReply,
      aiStatus: "ok",
      createSimple,
      relatedHazards,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    // AI失敗時はMHLWデータでフォールバック
    const errMsg = err instanceof Error ? err.message : "AI呼び出しに失敗";
    const lower = errMsg.toLowerCase();
    let aiErrorDetail = "AI呼び出しに失敗";
    if (lower.includes("rate") || lower.includes("429") || lower.includes("quota")) {
      aiErrorDetail = "Rate limit / quota 超過";
    } else if (lower.includes("timeout") || lower.includes("deadline")) {
      aiErrorDetail = "タイムアウト";
    } else if (lower.includes("network") || lower.includes("fetch") || lower.includes("econn")) {
      aiErrorDetail = "ネットワークエラー";
    } else if (lower.includes("auth") || lower.includes("401") || lower.includes("403") || lower.includes("api_key") || lower.includes("api key")) {
      aiErrorDetail = "APIキー認証エラー";
    }
    const fallback = buildMhlwFallbackResponse(chemicalName, casNumber);
    return NextResponse.json({
      ...fallback,
      safetyMeasures: sortMeasuresByPriority(fallback.safetyMeasures),
      createSimple,
      relatedHazards,
      aiStatus: "ai_failed",
      aiErrorDetail,
      rawReply: `⚠️ AI生成に失敗しました（${aiErrorDetail}）。以下は厚労省公式データによる規制情報です。\nGHS分類・保護具推奨については製品の公式SDSをご確認ください。`,
    }, { status: 200 });
  }
}
