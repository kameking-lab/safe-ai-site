/**
 * /api/chemical-ra
 * 化学物質名を受け取り、Gemini APIでSDS/GHS分類・保護具・対策チェックリストを返す。
 * 厚労省「職場のあんぜんサイト」の情報を参考にしたRAG方式。
 */
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { findByCas, searchMergedChemicals, regulatoryLabels, relatedLawTexts } from "@/lib/mhlw-chemicals";

export type ChemicalRaRequest = {
  chemicalName: string;
  workContent?: string;
  casNumber?: string;
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
      "action": "局所排気装置の設置（有機溶剤中毒予防規則第5条）"
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
- 回答の冒頭に物質の基本的な性状説明を2〜3行で加える`;

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    // APIキー未設定時はMHLWデータ + デモ回答
    const mhlwFallback = buildMhlwFallbackResponse(chemicalName, casNumber);
    if (mhlwFallback.regulatoryNotes.length > 0 || mhlwFallback.exposureLimit) {
      return NextResponse.json({
        ...mhlwFallback,
        rawReply: "⚠️ GEMINI_API_KEYが未設定のため、AI生成は利用できません。以下は厚労省公式データによる規制情報です。\nGHS分類・保護具推奨については製品の公式SDSをご確認ください。",
      }, { status: 200 });
    }
    return NextResponse.json({ ...DEMO_RESPONSE, chemicalName }, { status: 200 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });
  const workPart = body?.workContent?.trim()
    ? `\n\n【作業内容】\n${body.workContent.trim()}`
    : "";

  const userPrompt = `以下の化学物質のSDS情報・GHS分類・職場でのリスクアセスメント情報を提供してください。

【化学物質名】
${chemicalName}${workPart}

JSONブロック形式で安全データを提供し、物質の基本的な性状と取扱い上の注意点を説明してください。`;

  try {
    const result = await model.generateContent(userPrompt);
    const rawReply = result.response.text();
    const extracted = extractJsonBlock(rawReply);
    const cleanReply = removeJsonBlock(rawReply);

    const response: ChemicalRaResponse = {
      chemicalName,
      casNumber: extracted.casNumber ?? casNumber,
      ghsHazards: extracted.ghsHazards ?? [],
      flashPoint: extracted.flashPoint,
      exposureLimit: extracted.exposureLimit,
      ppeRecommendations: extracted.ppeRecommendations ?? [],
      safetyMeasures: extracted.safetyMeasures ?? [],
      emergencyMeasures: extracted.emergencyMeasures ?? [],
      regulatoryNotes: extracted.regulatoryNotes ?? [],
      rawReply: cleanReply,
    };
    return NextResponse.json(response, { status: 200 });
  } catch {
    // AI失敗時はMHLWデータでフォールバック
    return NextResponse.json(buildMhlwFallbackResponse(chemicalName, casNumber), { status: 200 });
  }
}
