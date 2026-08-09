import type { LawArticle } from "@/data/laws";
import { getLawMetadata as getCitationLawMetadata } from "@/data/laws/law-metadata";
import type { MlitResource } from "@/data/mlit-resources";
import type { ChatbotSource, FollowupSuggestion } from "@/lib/chatbot-contract";
import { LEGAL_GENERATION_ENABLED } from "@/lib/chatbot-generation-policy";
import {
  classifyLegalQuestionTime,
  legalDateTextToGregorian,
  requestedLegalPeriod,
} from "@/lib/legal-answer-temporal";
import {
  applicableLegalProvisionEffectiveDate,
  explicitlyRequestedItemLabels,
  explicitlyRequestedItemRangeLabel,
  explicitlyRequestedItemSelectionLabel,
  isOxygenEducationSubjectsThreeAndFourCommonIntent,
  legalProvisionUnitForQuery,
  verifiedCurrentSnapshotDate,
} from "@/lib/legal-extractive-answer";
import {
  extractLegalItems,
  extractLegalParagraph,
  extractRequestedLegalItem,
} from "@/lib/legal-unit-extract";
import { hasElectricalDomainSignal } from "@/lib/electrical-work-model";

/** 主張単位の引用支持検証がない生成本文は、外部送信も含めて停止する。 */
export const GENERATIVE_LEGAL_ANSWERS_ENABLED = LEGAL_GENERATION_ENABLED;

export const SYSTEM_PROMPT = `あなたは労働安全衛生法の専門家AIアシスタントです。
以下のルールを厳守してください。

1. 必ず提供された法令条文のみに基づいて回答すること
2. 回答に引用する法令名・条文番号は、必ず【参照法令条文】に記載された法令名・条番号のみを使用すること。その他の架空・不確かな法令名（例：「化学物質管理関連通達第60条」のような存在しない法令）は絶対に作らないこと
3. 条文中の号番号（第○号、一・二・三・…・十一 等）は、参照条文に記載されている表記をそのまま用いること。号番号を独自に変換・推測・並べ替えしてはならない（例：条文に「六」とあるものを「第6号」「第11号」等に書き換えない）。条文に号番号の記載がない場合は号番号を付与しないこと
4. ハルシネーション（根拠のない情報の創作）は絶対に行わないこと。提供された法令条文・所管省庁資料に記載のない事実は推測で書かず、「提供データには明記なし」と明示すること
5. 日本語で丁寧に回答すること
6. 専門用語には補足説明を加えること
7. これまでの会話履歴がある場合は、文脈を踏まえて回答すること（「先ほどの〜について」等の指示語を解釈する）
8. 法的義務として明文化されている事項（資格・免許・特別教育・技能講習・作業主任者の選任など）は、参照条文に明示があれば「〜が必要です」「〜しなければなりません」と断定形で書くこと。「〜とされています」「〜と考えられます」等のぼかし表現は、解釈の余地が残る論点に限定する
9. 「法令上の明確な規定は見つかりませんでした」「明確な規定がありません」のようなぼかし表現は、参照条文に該当論点の規定が本当に存在しない場合に限り使用すること。参照条文に該当条文がある場合に逃げ口上として使うことを禁ずる
10. 法令条文を引用する際は、条番号だけでなく可能な限り「条文番号＋施行日＋発出機関」の3点セットで明示すること（例：「安衛則第518条（施行：2020年12月、所管：厚生労働省）」）。施行日が提供条文の文中に明記されていない場合は施行日を省略し「（所管：厚生労働省）」のみ書くこと。「YYYY年MM月」「第XX条」のようなプレースホルダ・記号のまま出力することは絶対に禁止（施行日不明時は省略、条番号不明時はその条文自体を引用しない）
11. 参照法令条文に含まれない法令（例：架空の通達番号、根拠不明のガイドライン名）を断定的に引用してはならない。範囲外の場合は必ず「本ツールの提供データ範囲外のため、e-Gov・MHLW公式情報でご確認ください」と明示的に断ること

資格系質問（フォークリフト・クレーン・玉掛け・酸欠・有機溶剤などの「運転に必要な資格は？」「教育は何が必要？」型の質問）への回答ルール：
- 結論を本文の先頭に1〜2文で必ず明記する。例：「最大荷重1t以上のフォークリフトの運転には『フォークリフト運転技能講習』の修了が必要です（労働安全衛生法第61条第1項、労働安全衛生法施行令第20条第11号）。1t未満は特別教育（安衛則第36条第5号）で足ります。」
- 結論の直後に、法令名・条番号を括弧付きで併記する
- 参照条文に安衛法第61条（就業制限）または安衛法施行令第20条が含まれている場合は、必ずその条番号を回答中に直接引用する
- 施行令第20条を引用する際は必ず「第○号」（例：第11号、第6号）の号番号を明示すること。号番号なしに「施行令第20条」とだけ書くことは禁止
- 「明確な規定が見つかりません」型の回答は、参照条文に第61条・施行令第20条のいずれも含まれない場合に限る

回答の形式（スマホで3秒で結論が読める形にすること）：
- まず質問への直接的な回答（結論）を1〜2文で述べる
- 次に根拠となる条文を引用する（「根拠：安衛法第○条」等）。各条文の説明は要点1〜2文に要約し、条文全文の逐語引用はしないこと（条文全文は画面の「参照条文」欄に自動表示される）
- 必要に応じて補足説明を加える。回答全体は結論→根拠→補足の順で簡潔に（目安600字以内）
- 表示形式: 箇条書きは行頭を「・」で書くこと。markdown記法（「* 」「- 」「+ 」の箇条書き、「#」見出し、表、コードブロック、水平線「---」）は使用禁止。強調は**太字**のみ使用可
- 出典一覧・関連通達・関連リーフレットの一覧を回答本文に書かないこと（画面が構造化して自動表示する）

【重要：免責・表現ルール】
- 回答は「～と考えられます」「～とされています」等の表現を使い、断定を避けること（ただし法的義務の明文はルール8のとおり断定形で書く）
- 法令解釈が行政・判例によって異なる可能性がある場合は必ずその旨を明記すること
- 免責文は画面側で常時表示されるため、回答本文に免責文を書かないこと`;

/** MLIT資料をプロンプト用テキストに整形 */
export function buildMlitContext(resources: MlitResource[]): string {
  if (resources.length === 0) return "";
  return resources
    .map(
      (resource) =>
        `- ${resource.publisher}（${resource.bureau}）「${resource.title}」 ${resource.publishedDate ? `(${resource.publishedDate})` : ""} カテゴリ:${resource.category}/${resource.subcategory}`,
    )
    .join("\n");
}

/** MLIT資料をChatbotSource形式に変換 */
export function mlitToSource(resource: MlitResource): ChatbotSource {
  const description = `${resource.subcategory}・対象:${resource.targetAudience.join("・")}${resource.relatedLaws.length > 0 ? `・関連:${resource.relatedLaws.join("、")}` : ""}`;
  return {
    law: `${resource.publisher}（${resource.bureau}）`,
    article: resource.title,
    text: description,
    snippet:
      resource.keywords.length > 0
        ? `キーワード: ${resource.keywords.slice(0, 5).join("・")}`
        : undefined,
    ministry: resource.publisher,
    url: resource.pdfUrl ?? resource.sourceUrl,
  };
}

/** 条文テキストから質問キーワード周辺を抜粋したスニペットを生成 */
export function buildSnippet(
  text: string,
  query: string,
  maxLen = 140,
): string {
  if (!text) return "";
  const tokens = query
    .replace(/[？?！!。、.,（）()「」『』【】\s　]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .slice(0, 6);
  let bestIndex = -1;
  for (const token of tokens) {
    const index = text.indexOf(token);
    if (index >= 0) {
      bestIndex = index;
      break;
    }
  }
  if (bestIndex < 0) {
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  }
  const start = Math.max(0, bestIndex - 30);
  const end = Math.min(text.length, bestIndex + maxLen - 30);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return prefix + text.slice(start, end) + suffix;
}

const ITEM_TOPIC_TERMS = [
  "フォークリフト",
  "高所作業車",
  "フルハーネス",
  "墜落制止用器具",
  "玉掛け",
  "移動式クレーン",
  "クレーン",
  "酸素欠乏",
  "有機溶剤",
  "石綿",
] as const;

function normalizeItemMatchText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/フオー/g, "フォー")
    .replace(/シヨ/g, "ショ")
    .replace(/デリツク/g, "デリック")
    .replace(/[\s　]/g, "");
}

function itemFromArticleText(
  article: LawArticle,
  query: string,
): { item: string; snippet: string } | null {
  const queryText = normalizeItemMatchText(query);
  const requestedTerms = ITEM_TOPIC_TERMS.filter((term) =>
    queryText.includes(normalizeItemMatchText(term)),
  );
  if (requestedTerms.length === 0) return null;

  const specificTerms = requestedTerms.filter(
    (term) =>
      !requestedTerms.some(
        (other) => other.length > term.length && other.includes(term),
      ),
  );
  for (const item of extractLegalItems(article)) {
    const normalized = normalizeItemMatchText(item.text);
    if (
      !specificTerms.some((term) =>
        normalized.includes(normalizeItemMatchText(term)),
      )
    ) {
      continue;
    }
    return { item: item.item, snippet: item.snippet };
  }
  return null;
}

// 条文本文の語から号を補うのは、資格区分を号で列挙する条文に限る。
// 「第2種有機溶剤」のような区分名を「第2号」と取り違えない。
const SEMANTIC_ITEM_FALLBACKS = new Set(["安衛則|第36条", "安衛令|第20条"]);

function matchedItemNumber(
  article: LawArticle,
  query: string,
): { item: string; snippet: string } | null {
  const requestedItem = extractRequestedLegalItem(article, query);
  if (requestedItem) {
    return { item: requestedItem.item, snippet: requestedItem.snippet };
  }
  if (article.itemNumberMap) {
    const normalizedQuery = normalizeItemMatchText(query);
    for (const [number, value] of Object.entries(article.itemNumberMap)) {
      const normalizedValue = normalizeItemMatchText(value);
      if (
        ITEM_TOPIC_TERMS.some(
          (term) =>
            normalizedQuery.includes(normalizeItemMatchText(term)) &&
            normalizedValue.includes(normalizeItemMatchText(term)),
        )
      ) {
        return { item: `第${number}号`, snippet: `第${number}号　${value}` };
      }
    }
  }
  if (
    article.lawShort === "石綿則" &&
    article.articleNum === "第3条" &&
    /(?:事前調査|調査者)/.test(query)
  ) {
    return null;
  }
  if (
    !SEMANTIC_ITEM_FALLBACKS.has(`${article.lawShort}|${article.articleNum}`)
  ) {
    return null;
  }
  return itemFromArticleText(article, query);
}

const STRUCTURED_PARAGRAPH_LABEL_RE =
  /第[0-9０-９一二三四五六七八九十百千]+項/g;

function extractCitationParagraph(article: LawArticle, label: string) {
  const extracted = extractLegalParagraph(article, label);
  if (
    article.lawShort === "特別教育規程" &&
    /^第?[56]条$/.test(article.articleNum) &&
    article.sourceKind === "government-official-primary" &&
    article.verificationStatus === "primary-source-verified"
  ) {
    // 特別教育規程5・6条の公式表は、表末尾の空白に続けて
    // 「３　第一項の実技教育は」と記録されている。一般の項境界抽出器が
    // 表中の数字との混同を避けて除外する形式なので、検証済み正本に限り、
    // 明示された第3項見出しそのものを第2項の終端・第3項の始端に使う。
    const heading = "３　第一項の実技教育は";
    const headingStart = article.text.indexOf(heading);
    if (label === "第2項" && extracted && headingStart >= 0) {
      const paragraphText = extracted.text.split(heading, 1)[0]?.trim();
      if (paragraphText) {
        return {
          paragraph: label,
          text: paragraphText,
          snippet: `${label}　${paragraphText.slice(0, 200)}`,
        };
      }
    }
    if (label === "第3項" && headingStart >= 0) {
      const paragraphText = article.text.slice(headingStart + 2).trim();
      return {
        paragraph: label,
        text: paragraphText,
        snippet: `${label}　${paragraphText.slice(0, 200)}`,
      };
    }
  }
  if (extracted) return extracted;
  return null;
}

/**
 * legalProvisionUnitForQueryが選んだ項番号だけを、検証済み条文本文から
 * 既存の項境界抽出器で取得する。本文の語句から項を推測しない。
 */
function extractStructuredParagraphs(
  article: LawArticle,
  locator: string | undefined,
) {
  const labels = locator?.match(STRUCTURED_PARAGRAPH_LABEL_RE) ?? [];
  if (labels.length === 0) return [];
  const extracted = labels.flatMap((label) => {
    const paragraph = extractCitationParagraph(article, label);
    return paragraph ? [paragraph] : [];
  });
  return extracted.length === labels.length ? extracted : [];
}

function exactVerifiedItemText(
  article: LawArticle,
  itemLabels: readonly string[],
): string | undefined {
  if (
    article.sourceKind !== "egov-fulltext-snapshot" ||
    article.verificationStatus !== "snapshot-hash-verified"
  ) {
    return undefined;
  }
  const items = extractLegalItems(article);
  const selected = itemLabels.flatMap((label) => {
    const item = items.find((candidate) => candidate.item === label);
    // `snippet` is intentionally display-limited by the generic extractor.
    // Legal-answer citations must retain the complete verified item so that a
    // proviso near the end of a long item is not silently omitted.
    return item ? [`${item.item}　${item.text}`] : [];
  });
  return selected.length === itemLabels.length ? selected.join("\n") : undefined;
}

function exactMetiElectricianQaExcerpt(
  article: LawArticle,
  requestedItem: string | undefined,
): { item: "Q9" | "Q10"; text: string } | undefined {
  if (
    article.lawShort !== "経産省電工Q&A" ||
    article.sourceKind !== "government-official-primary" ||
    article.verificationStatus !== "primary-source-verified" ||
    article.sourceUrl !==
      "https://www.meti.go.jp/policy/safety_security/industrial_safety/sangyo/electric/files/kouzi-si-QA201803.pdf"
  ) {
    return undefined;
  }
  const q9Start = article.text.indexOf("Q9　");
  const q10Start = article.text.indexOf("Q10　");
  if (q9Start < 0 || q10Start <= q9Start) return undefined;
  if (requestedItem === "Q10") {
    const text = article.text.slice(q10Start).trim();
    return text.includes("測定器をクリップ留め又は巻き付ける場合") &&
      text.includes("電気主任技術者の指示確認")
      ? { item: "Q10", text }
      : undefined;
  }
  if (requestedItem === "Q9") {
    const text = article.text.slice(q9Start, q10Start).trim();
    return text.includes("接続線を切断・接続等の作業")
      ? { item: "Q9", text }
      : undefined;
  }
  return undefined;
}

function verifiedElectricalEducationExcerpt(
  article: LawArticle,
  query: string,
): string | undefined {
  if (
    article.lawShort !== "特別教育規程" ||
    !/^第?[56]条$/.test(article.articleNum) ||
    !hasElectricalDomainSignal(query) ||
    article.sourceKind !== "government-official-primary" ||
    article.verificationStatus !== "primary-source-verified"
  ) {
    return undefined;
  }
  const first = extractCitationParagraph(article, "第1項")?.text;
  const academic = extractCitationParagraph(article, "第2項")?.text;
  const practical = extractCitationParagraph(article, "第3項")?.text;
  if (!first || !academic || !practical) return undefined;

  if (/^第?5条$/.test(article.articleNum)) {
    const verifiedAcademicRows = [
      "一・五時間",
      "二時間",
      "五時間",
      "一時間",
    ];
    if (
      !first.includes("高圧若しくは特別高圧") ||
      !first.includes("敷設、点検、修理又は操作") ||
      !verifiedAcademicRows.every((duration) => academic.includes(duration)) ||
      academic.split("一・五時間").length - 1 !== 2 ||
      !practical.includes("十五時間以上") ||
      !practical.includes("操作の業務のみを行なう者については、一時間以上")
    ) {
      return undefined;
    }
    return "第1項「高圧・特別高圧の充電電路等の敷設、点検、修理又は操作」／第2項の学科表「1.5時間＋2時間＋1.5時間＋5時間＋1時間＝11時間以上」／第3項「実技15時間以上（操作の業務のみは1時間以上）」";
  }

  const verifiedAcademicRows = ["一時間", "二時間"];
  if (
    !first.includes("低圧の充電電路の敷設若しくは修理") ||
    !first.includes("充電部分が露出している開閉器の操作") ||
    !verifiedAcademicRows.every((duration) => academic.includes(duration)) ||
    academic.split("一時間").length - 1 !== 3 ||
    academic.split("二時間").length - 1 !== 2 ||
    !practical.includes("七時間以上") ||
    !practical.includes("開閉器の操作の業務のみを行なう者については、一時間以上")
  ) {
    return undefined;
  }
  return "第1項「低圧の充電電路の敷設・修理、又は区画場所の露出充電部付き開閉器の操作」／第2項の学科表「1時間＋2時間＋1時間＋2時間＋1時間＝7時間以上」／第3項「実技7時間以上（開閉器操作のみは1時間以上）」";
}

/** 検証済み法令本文を、確認状態を落とさずAPI出典へ変換する。 */
export function lawArticleToSource(
  article: LawArticle,
  query: string,
  now: Date = new Date(),
): ChatbotSource {
  const metadata = getCitationLawMetadata(article.lawShort);
  const questionTime = classifyLegalQuestionTime(query, now);
  const oxygenDomainQuery =
    /(?:酸欠|酸素欠乏|酸素濃度|酸素(?:が|の)?(?:少ない|薄い|足りない)(?:場所|所|現場)?|タンク(?:等)?(?:の)?(?:中|内|内部)?(?:に|へ)?(?:入る|立ち入る|入槽))/.test(
      query,
    );
  const organicSolventDomainQuery =
    /(?:有機溶剤|有機則|シンナー|溶剤.*(?:塗装|洗浄|拭|扱|使)|(?:塗装|洗浄).*溶剤|タンク(?:等)?(?:の)?(?:中|内|内部)?(?:に|へ)?(?:入る|立ち入る|入槽))/.test(
      query,
    );
  const heatDomainQuery =
    /(?:熱中症|暑熱|WBGT|(?:暑い|熱い)(?:現場|作業場|場所)|暑さ|夏(?:の)?(?:現場|作業場|作業).*(?:安全)?対策)/i.test(query);
  const chemicalManagerDomainQuery =
    /(?:化学物質(?:管理|かんり)者|化学物質.*(?:扱|取扱).*(?:管理者|管理)|(?:管理者|管理).*化学物質.*(?:扱|取扱)|(?:RA|リスクアセスメント)対象物.*(?:管理者|管理)|(?:管理者|管理).*(?:RA|リスクアセスメント)対象物)/i.test(
      query,
    );
  const workSupervisorQuery =
    /(?:作業主任者|主任者(?:を)?(?:置く|選任).*(?:仕事|作業)|(?:仕事|作業).*(?:主任者(?:を)?(?:置く|選任)))/.test(
      query,
    );
  const workRequirementQuery =
    /(?:資格|免許|教育|特別教育|技能講習|講習|作業主任者|何が(?:必要|要る|いる)|何を(?:すべき|する)|必要なもの|どうすれば|(?:乗る|使う|扱う|取り扱う|動かす|運転する|操作する|作業する|やる|組み立てる|解体する|塗装する|する|行う|入る|立ち入る|入槽する)(?:には|のに))/.test(
      query,
    );
  const provisionUnit = legalProvisionUnitForQuery(article, query);
  const metiElectricianQaExcerpt = exactMetiElectricianQaExcerpt(
    article,
    provisionUnit.item,
  );
  const oxygenEducationCommonSubjectsIntent =
    article.lawShort === "酸欠則" &&
    /^第?12条$/.test(article.articleNum) &&
    isOxygenEducationSubjectsThreeAndFourCommonIntent(query);
  const fumigationMonitorItemsIntent =
    article.lawShort === "特化則" &&
    /^第?38条の14$/.test(article.articleNum) &&
    /(?:監視人|監視者|監視)/.test(query);
  const effectiveOn = applicableLegalProvisionEffectiveDate(article, query);
  const embeddedParagraph = article.articleNum.match(
    /第[0-9０-９一二三四五六七八九十百千]+項/,
  )?.[0];
  const requestedParagraph = oxygenEducationCommonSubjectsIntent
    ? "第1項・第2項"
    : (embeddedParagraph ?? provisionUnit.paragraph);
  const embeddedItem = article.articleNum.match(
    /第[0-9０-９一二三四五六七八九十百千]+号/,
  )?.[0];
  const matchedParagraphs = extractStructuredParagraphs(
    article,
    requestedParagraph,
  );
  const matchedParagraphText =
    matchedParagraphs.length > 0
      ? matchedParagraphs.map(({ text }) => text).join("\n")
      : undefined;
  const matchedParagraphLabeledText =
    matchedParagraphs.length > 0
      ? matchedParagraphs
          .map(({ paragraph: label, text }) => `${label}　${text}`)
          .join("\n")
      : undefined;
  const matchedParagraphSnippet =
    matchedParagraphs.length > 0
      ? matchedParagraphs.map(({ snippet }) => snippet).join("／")
      : undefined;
  const paragraph = oxygenEducationCommonSubjectsIntent
    ? "第1項・第2項"
    : fumigationMonitorItemsIntent
      ? "第1項"
      : (embeddedParagraph ??
        (matchedParagraphs.length > 0 ? requestedParagraph : undefined));
  const scopedArticle = matchedParagraphText
    ? {
        ...article,
        text: matchedParagraphText,
        itemNumberMap: undefined,
      }
    : article;
  const explicitItemLabels = explicitlyRequestedItemLabels(
    query,
    article.articleNum,
  );
  const explicitItemSelection = explicitlyRequestedItemSelectionLabel(
    query,
    article.articleNum,
  );
  const explicitSelectedItems = explicitItemLabels.flatMap((label) => {
    const found = extractLegalItems(scopedArticle).find(
      (candidate) => candidate.item === label,
    );
    return found ? [found] : [];
  });
  const explicitItemsExcerpt =
    !oxygenEducationCommonSubjectsIntent &&
    explicitSelectedItems.length === explicitItemLabels.length &&
    (explicitItemLabels.length > 1 ||
      (article.lawShort === "酸欠則" && explicitItemLabels.length === 1))
      ? explicitSelectedItems.map(({ snippet }) => snippet).join("／")
      : undefined;
  const fumigationMonitorItems = fumigationMonitorItemsIntent
    ? extractLegalItems(article).filter(({ item }) =>
        ["第5号", "第12号"].includes(item),
      )
    : [];
  const fumigationMonitorExcerpt =
    fumigationMonitorItems.length === 2 &&
    fumigationMonitorItems.every(({ text }) => text.includes("監視人"))
      ? "第5号ただし書「燻蒸の効果を確認する場合」「呼吸用保護具を使用」「監視人を置いたとき」／第12号ただし書「濃度を基準値以下とすることが著しく困難」「当該場所の排気」「呼吸用保護具を使用」「監視人を置いたとき」"
      : undefined;
  const matchedItem = provisionUnit.item
    ? (extractLegalItems(scopedArticle).find(
        (candidate) => candidate.item === provisionUnit.item,
      ) ?? matchedItemNumber(article, query))
    : paragraph
      ? null
      : matchedItemNumber(article, query);
  const matchedUnitText = matchedItem?.snippet
    ? matchedItem.snippet.replace(/^第[^　]+[　\s]+/, "")
    : (matchedParagraphText ?? article.text);
  const scaffoldChapeau =
    article.lawShort === "安衛則" &&
    /^第?563条$/.test(article.articleNum) &&
    /(?:手すり|中さん|中桟)/.test(query)
      ? article.text.match(
          /^(.*?高さ二メートル以上.*?作業床を設けなければならない。)/,
        )?.[1]
      : undefined;
  const scaffoldHandrailItem = scaffoldChapeau
    ? matchedItem?.snippet
    : undefined;
  const scaffoldCitationExcerpt =
    article.lawShort === "安衛則" &&
    /^第?563条$/.test(article.articleNum) &&
    provisionUnit.item === "第3号" &&
    article.text.includes("一側足場を除く。第三号において同じ。") &&
    article.text.includes("墜落により労働者に危険を及ぼすおそれのある箇所") &&
    article.text.includes("わく組足場以外の足場")
      ? "「足場（一側足場を除く。第三号において同じ。）」／「高さ二メートル以上の作業場所」／第三号「墜落により労働者に危険を及ぼすおそれのある箇所」／ロ「わく組足場以外の足場　手すり等及び中桟等」"
      : article.lawShort === "安衛則" &&
          /^第?552条$/.test(article.articleNum) &&
          provisionUnit.item === "第4号" &&
          article.text.includes("墜落の危険のある箇所") &&
          article.text.includes("高さ八十五センチメートル以上") &&
          article.text.includes(
            "高さ三十五センチメートル以上五十センチメートル以下",
          )
        ? "第四号「墜落の危険のある箇所」／イ「高さ八十五センチメートル以上の手すり」／ロ「高さ三十五センチメートル以上五十センチメートル以下の桟」"
        : undefined;
  const scaffoldWorkFloorExcerpt =
    article.lawShort === "安衛則" &&
    /^第?563条$/.test(article.articleNum) &&
    /(?:足場|作業床)/.test(query) &&
    /(?:幅|隙間|すき間)/.test(query) &&
    article.text.includes("幅は、四十センチメートル以上") &&
    article.text.includes("床材間の隙間は、三センチメートル以下") &&
    article.text.includes("床材と建地との隙間は、十二センチメートル未満") &&
    article.text.includes("前項第二号ハの規定は")
      ? "第1項第2号「つり足場を除き、幅40cm以上」「床材間の隙間3cm以下」「床材と建地との隙間12cm未満」／第2項「12cm以上の箇所に防網を張る等の墜落防止措置」を講じ、両端の隙間の和が24cm未満の場合又は作業上24cm未満が困難な場合は第1項第2号ハを適用しない"
      : undefined;
  const scaffoldInspectionRecordExcerpt =
    article.lawShort === "安衛則" &&
    /^第?567条$/.test(article.articleNum) &&
    provisionUnit.paragraph === "第3項" &&
    provisionUnit.item === "第1号・第2号" &&
    article.text.includes("当該点検の結果及び点検者の氏名") &&
    article.text.includes("補修等の措置") &&
    article.text.includes("仕事が終了するまで")
      ? "第3項第1号「当該点検の結果及び点検者の氏名」／第2号「補修等の措置を講じた場合は当該措置の内容」／「足場を使用する作業を行う仕事が終了するまで保存」"
      : undefined;
  const organicCoreExcerpt =
    article.lawShort === "有機則" && organicSolventDomainQuery
      ? /^第?1条$/.test(article.articleNum) &&
        article.text.includes("有機溶剤含有物") &&
        /重量の(?:5|五)パーセントを超えて含有/.test(article.text)
        ? exactVerifiedItemText(article, ["第2号"])
        : /^第?5条$/.test(article.articleNum) &&
            article.text.includes("屋内作業場等") &&
            article.text.includes("第一種有機溶剤等又は第二種有機溶剤等") &&
            article.text.includes("発散源を密閉する設備") &&
            article.text.includes("プッシュプル型換気装置")
          ? matchedParagraphLabeledText
          : undefined
      : undefined;
  const organicMultiParagraphExcerpt =
    (!paragraph || paragraph === "第1項・第2項") &&
    article.lawShort === "有機則"
      ? /^第?6条$/.test(article.articleNum) &&
        article.text.includes("第三種有機溶剤等") &&
        article.text.includes("吹付けによる") &&
        article.text.includes("全体換気装置")
        ? (matchedParagraphLabeledText ?? article.text)
        : /^第?8条$/.test(article.articleNum) &&
            article.text.includes("臨時に有機溶剤業務") &&
            article.text.includes("タンク等の内部以外") &&
            article.text.includes("第六条第二項")
          ? (matchedParagraphLabeledText ?? article.text)
          : /^第?9条$/.test(article.articleNum) &&
              article.text.includes("短時間") &&
              article.text.includes("タンク等の内部以外") &&
              article.text.includes("送気マスク")
            ? (matchedParagraphLabeledText ?? article.text)
             : undefined
      : undefined;
  const electricalEducationExcerpt = verifiedElectricalEducationExcerpt(
    article,
    query,
  );
  const electricalDeEnergizedExcerpt =
    article.lawShort === "安衛則" &&
    /^第?339条$/.test(article.articleNum) &&
    provisionUnit.paragraph === "第1項" &&
    provisionUnit.item === "第1号・第2号・第3号" &&
    hasElectricalDomainSignal(query) &&
    article.sourceKind === "egov-fulltext-snapshot" &&
    article.verificationStatus === "snapshot-hash-verified" &&
    article.text.includes(
      "開路に用いた開閉器に、作業中、施錠し、若しくは通電禁止に関する所要事項を表示し、又は監視人を置くこと",
    ) &&
    article.text.includes("当該残留電荷を確実に放電させること") &&
    article.text.includes("高圧又は特別高圧であつたものについては") &&
    article.text.includes("検電器具により停電を確認") &&
    article.text.includes("短絡接地器具を用いて確実に短絡接地")
      ? exactVerifiedItemText(article, ["第1号", "第2号", "第3号"])
      : undefined;
  const electricQualificationExcerpt =
    hasElectricalDomainSignal(query) &&
    article.lawShort === "電気工事士法" &&
    /^第?3条$/.test(article.articleNum) &&
    (!paragraph || paragraph === "第1項・第2項・第3項・第4項") &&
    article.text.includes("第一種電気工事士免状") &&
    article.text.includes("第二種電気工事士免状") &&
    article.text.includes("特種電気工事資格者認定証") &&
    article.text.includes("認定電気工事従事者認定証")
      ? matchedParagraphLabeledText
      : article.lawShort === "安衛則" &&
          /^第?36条$/.test(article.articleNum) &&
          provisionUnit.item === "第4号" &&
          hasElectricalDomainSignal(query) &&
          article.text.includes("低圧") &&
          article.text.includes("直流にあつては七百五十ボルト以下") &&
          article.text.includes("交流にあつては六百ボルト以下") &&
          article.text.includes("対地電圧が五十ボルト以下")
        ? exactVerifiedItemText(article, ["第4号"])
        : undefined;
  const electricianMinorWorkExcerpt =
    article.lawShort === "電工士法令" &&
    /^第?1条$/.test(article.articleNum) &&
    provisionUnit.item === "第2号" &&
    hasElectricalDomainSignal(query) &&
    /(?:機器端子|電気機器の端子|端子へ|端子に)/.test(query) &&
    article.text.includes("電圧六百ボルト以下で使用する電気機器") &&
    article.text.includes("端子に電線") &&
    article.text.includes("ねじ止めする工事")
      ? exactVerifiedItemText(article, ["第2号"])
      : undefined;
  const fullHarnessEducationExcerpt =
    article.lawShort === "安衛則" &&
    /^第?36条$/.test(article.articleNum) &&
    provisionUnit.item === "第41号" &&
    /(?:(?:フル)?ハーネス|墜落制止用器具|安全帯)/.test(query) &&
    article.text.includes("前号に掲げる業務を除く")
      ? exactVerifiedItemText(article, ["第41号"])
      : undefined;
  const genericEducationExcerpt =
    article.lawShort === "安衛法" &&
    /^第?59条$/.test(article.articleNum) &&
    provisionUnit.paragraph === "第3項" &&
    article.text.includes("厚生労働省令で定める") &&
    article.text.includes("特別の教育を行")
      ? matchedParagraphLabeledText
      : undefined;
  const workSupervisorDutyExcerpt =
    article.lawShort === "安衛法" &&
    /^第?14条$/.test(article.articleNum) &&
    workSupervisorQuery &&
    article.text.includes("作業主任者を選任し") &&
    article.text.includes("当該作業に従事する労働者の指揮")
      ? (matchedParagraphLabeledText ?? article.text)
      : undefined;
  const workSupervisorItemLabels = hasElectricalDomainSignal(query)
    ? ["第1号"]
    : /足場/.test(query)
      ? ["第15号"]
      : oxygenDomainQuery
        ? ["第21号"]
        : organicSolventDomainQuery
          ? ["第22号"]
          : /(?:石綿|アスベスト)/.test(query)
            ? ["第23号"]
            : ["第15号", "第21号", "第22号", "第23号"];
  const workSupervisorListChapeau =
    article.lawShort === "安衛令" && /^第?6条$/.test(article.articleNum)
      ? article.text.match(/^(法第十四条の政令で定める作業は、次のとおりとする。)/)?.[1]
      : undefined;
  const workSupervisorListExcerpt =
    article.lawShort === "安衛令" &&
    /^第?6条$/.test(article.articleNum) &&
    (workSupervisorQuery ||
      /(?:足場|石綿|アスベスト)/.test(query) ||
      oxygenDomainQuery ||
      organicSolventDomainQuery) &&
    article.text.includes("高さが五メートル以上の構造の足場") &&
    article.text.includes("酸素欠乏危険場所") &&
    article.text.includes("有機溶剤") &&
    article.text.includes("石綿等")
      ? [
          workSupervisorListChapeau,
          exactVerifiedItemText(article, workSupervisorItemLabels),
        ]
          .filter(Boolean)
          .join("\n") || undefined
      : undefined;
  const specialEducationItemLabels = oxygenDomainQuery
    ? ["第26号"]
    : /(?:石綿|アスベスト)/.test(query)
      ? ["第37号"]
      : /足場/.test(query)
        ? ["第39号"]
        : ["第1号", "第10号の5", "第39号", "第41号"];
  const genericSpecialEducationListExcerpt =
    article.lawShort === "安衛則" &&
    /^第?36条$/.test(article.articleNum) &&
    !hasElectricalDomainSignal(query)
      ? oxygenDomainQuery ||
        /(?:石綿|アスベスト|足場)/.test(query) ||
        (/(?:特別教育|(?:危険|有害)(?:な)?作業.*教育)/.test(query) &&
          /(?:種類|一覧|必要.*作業|作業.*必要|(?:危険|有害)(?:な)?作業.*教育)/.test(
            query,
          ))
        ? exactVerifiedItemText(article, specialEducationItemLabels)
        : undefined
      : undefined;
  const restrictedWorkListExcerpt =
    article.lawShort === "安衛令" &&
    /^第?20条$/.test(article.articleNum) &&
    /技能講習/.test(query) &&
    article.text.includes("最大荷重") &&
    article.text.includes("一トン以上のフオークリフト") &&
    article.text.includes("十メートル以上の高所作業車") &&
    article.text.includes("一トン以上のクレーン")
      ? exactVerifiedItemText(article, ["第10号", "第12号", "第15号"])
      : undefined;
  const craneRestrictedWorkExcerpt =
    article.lawShort === "安衛令" &&
    /^第?20条$/.test(article.articleNum) &&
    ["第6号", "第7号", "第8号"].includes(provisionUnit.item ?? "") &&
    /クレーン/.test(query) &&
    article.text.includes("つり上げ荷重が五トン以上のクレーン")
      ? exactVerifiedItemText(article, [provisionUnit.item!])
      : undefined;
  const floorOperatedCraneQualificationExcerpt =
    article.lawShort === "クレーン則" &&
    /^第?22条$/.test(article.articleNum) &&
    (/床上操作式/.test(query) ||
      (/クレーン/.test(query) && !/(?:移動式クレーン|デリック)/.test(query))) &&
    article.text.includes("床上で運転し") &&
    article.text.includes("荷の移動とともに移動する方式") &&
    article.text.includes("床上操作式クレーン運転技能講習")
      ? article.text
      : undefined;
  const mobileCraneQualificationExcerpt =
    article.lawShort === "クレーン則" &&
    /^第?68条$/.test(article.articleNum) &&
    provisionUnit.paragraph === "第1項" &&
    /移動式クレーン/.test(query) &&
    article.text.includes("移動式クレーン運転士免許") &&
    article.text.includes("一トン以上五トン未満") &&
    article.text.includes("小型移動式クレーン運転技能講習")
      ? matchedParagraphLabeledText
      : undefined;
  const chemicalManagerExcerpt =
    article.lawShort === "安衛則" &&
    /^第?12条の5$/.test(article.articleNum) &&
    chemicalManagerDomainQuery &&
    article.text.includes("事由が発生した日から十四日以内") &&
    article.text.includes("リスクアセスメント対象物を製造している事業場") &&
    article.text.includes("必要な能力を有すると認められる者")
      ? matchedParagraphLabeledText
      : undefined;
  const organicSupervisorExcerpt =
    article.lawShort === "有機則" &&
    /^第?19条$/.test(article.articleNum) &&
    organicSolventDomainQuery &&
    workRequirementQuery &&
    article.text.includes("令第六条第二十二号") &&
    article.text.includes("有機溶剤作業主任者技能講習") &&
    article.text.includes("作業主任者を選任")
      ? matchedParagraphLabeledText
      : undefined;
  const asbestosSupervisorExcerpt =
    article.lawShort === "石綿則" &&
    /^第?19条$/.test(article.articleNum) &&
    /(?:石綿|アスベスト)/.test(query) &&
    workRequirementQuery &&
    article.text.includes("令第六条第二十三号") &&
    article.text.includes("石綿作業主任者技能講習") &&
    article.text.includes("作業主任者を選任")
      ? (matchedParagraphLabeledText ?? article.text)
      : undefined;
  const lowVoltageProximityExcerpt =
    article.lawShort === "安衛則" &&
    /^第?347条$/.test(article.articleNum) &&
    provisionUnit.paragraph === "第1項" &&
    hasElectricalDomainSignal(query) &&
    article.text.includes("低圧の充電電路に近接する場所") &&
    article.text.includes("当該充電電路に絶縁用防具を装着") &&
    article.text.includes("絶縁用保護具を着用させて") &&
    article.text.includes("身体の部分以外の部分") &&
    article.text.includes("接触するおそれのないとき")
      ? matchedParagraphLabeledText
      : undefined;
  const electricalWorkControllerExcerpt =
    article.lawShort === "安衛則" &&
    /^第?350条$/.test(article.articleNum) &&
    hasElectricalDomainSignal(query) &&
    article.text.includes("作業の指揮者を定めて")
      ? article.text
      : undefined;
  const oxygenDeficiencyExcerpt =
    article.lawShort === "酸欠則" && oxygenDomainQuery
      ? /^第?2条$/.test(article.articleNum) &&
        article.text.includes("酸素欠乏等") &&
        article.text.includes("硫化水素中毒")
        ? "第1号「酸素欠乏＝酸素濃度18%未満」／第2号「酸素欠乏等＝酸素欠乏又は硫化水素濃度100万分の10超の状態」／第3号「酸素欠乏症」／第4号「硫化水素中毒」／第5号「酸素欠乏症等＝酸素欠乏症又は硫化水素中毒」"
        : /^第?3条$/.test(article.articleNum) &&
            article.text.includes("その日の作業を開始する前") &&
            /これを(?:3|三)年間保存/.test(article.text)
          ? matchedParagraphLabeledText
          : /^第?5条$/.test(article.articleNum) &&
              /酸素の濃度を(?:18|十八)パーセント以上/.test(article.text) &&
              article.text.includes("換気することが著しく困難な場合")
            ? matchedParagraphLabeledText
            : /^第?5条の2$/.test(article.articleNum) &&
                article.text.includes("同時に就業する労働者の人数と同数以上") &&
                article.text.includes("空気呼吸器等")
                ? (matchedParagraphLabeledText ?? article.text)
                : /^第?11条$/.test(article.articleNum) &&
                  article.text.includes("酸素欠乏危険作業主任者技能講習") &&
                  article.text.includes(
                    "酸素欠乏・硫化水素危険作業主任者技能講習",
                  )
                ? matchedParagraphLabeledText
                : /^第?12条$/.test(article.articleNum) &&
                    article.text.includes("第一種酸素欠乏危険作業") &&
                    article.text.includes(
                      "第二種酸素欠乏危険作業に係る業務について準用",
                    )
                  ? matchedParagraphLabeledText
                  : undefined
      : undefined;
  const heatProcedureExcerpt =
    article.lawShort === "安衛則" &&
    /^第?612条の2$/.test(article.articleNum) &&
    heatDomainQuery &&
    article.text.includes("その旨の報告をさせる体制を整備") &&
    article.text.includes("当該作業からの離脱、身体の冷却")
      ? "対象「暑熱な場所において連続して行われる作業等、熱中症を生ずるおそれのある作業」／第1項「熱中症の自覚症状又は疑いを発見した場合に報告させる体制を整備し、作業従事者へ周知」／第2項「作業場ごとに、作業からの離脱、身体の冷却、必要に応じた医師の診察・処置等の措置内容と実施手順を定め、周知」"
      : undefined;
  const heatPreventionGuidelineExcerpt =
    article.lawShort === "熱中症ガイドライン" &&
    /^第?2・第?3$/.test(article.articleNum) &&
    heatDomainQuery &&
    article.sourceKind === "mhlw-official-primary" &&
    article.verificationStatus === "primary-source-verified" &&
    /WBGT[\s\S]*休憩[\s\S]*暑熱順化[\s\S]*水分及び塩分/.test(article.text)
      ? article.text
      : undefined;
  const asbestosQualificationExcerpt =
    article.lawShort === "石綿則" &&
    /^第?3条$/.test(article.articleNum) &&
    /(?:石綿|アスベスト)/.test(query) &&
    /(?:事前調査|調査者|調査.*(?:誰|資格|できる|行える))/.test(query) &&
    /(?:誰|資格|できる|行える|調査者|必要な知識)/.test(query) &&
    article.text.includes("船舶（鋼製の船舶に限る。以下同じ。）") &&
    article.text.includes("前項各号に規定する場合を除き") &&
    article.text.includes("必要な知識を有する者として厚生労働大臣が定めるもの")
      ? "第1項「建築物、工作物又は船舶（鋼製の船舶に限る。）の解体又は改修」「石綿等の使用の有無を調査」／第4項「前項各号に規定する場合を除き」「必要な知識を有する者として厚生労働大臣が定めるものに行わせなければならない」"
      : undefined;
  const asbestosSurveyDutyExcerpt =
    article.lawShort === "石綿則" &&
    /^第?3条$/.test(article.articleNum) &&
    provisionUnit.paragraph === "第1項" &&
    article.sourceKind === "egov-fulltext-snapshot" &&
    article.verificationStatus === "snapshot-hash-verified" &&
    matchedParagraphLabeledText?.includes("解体又は改修") &&
    matchedParagraphLabeledText.includes("石綿等の使用の有無を調査")
      ? matchedParagraphLabeledText
      : undefined;
  const asbestosBuildingTarget = /(?:建築物|一戸建て|共同住宅|住戸)/.test(
    query,
  );
  const asbestosStructureTarget = /工作物/.test(query);
  const asbestosShipTarget = /船舶/.test(query);
  const asbestosTargetCount = [
    asbestosBuildingTarget,
    asbestosStructureTarget,
    asbestosShipTarget,
  ].filter(Boolean).length;
  const asbestosNoticeEvidence =
    article.lawShort === "厚労省告示276号"
      ? asbestosTargetCount === 1 && asbestosShipTarget
        ? {
            item: "第3号",
            excerpt:
              "第3号「船舶（鋼製の船舶に限る。）の解体等の作業」「船舶石綿含有資材調査者」「同等以上の知識を有すると認められる者」",
          }
        : asbestosTargetCount === 1 && /一戸建て|共同住宅|住戸/.test(query)
          ? {
              item: "第2号",
              excerpt:
                "第2号「一戸建て住宅等の解体等の作業」「一般・特定建築物石綿含有建材調査者等又は一戸建て等石綿含有建材調査者」",
            }
          : asbestosTargetCount === 1 && asbestosBuildingTarget
            ? {
                item: "第1号・第2号",
                excerpt:
                  "第1号「一般建築物石綿含有建材調査者、特定建築物石綿含有建材調査者又は同等以上の能力を有すると認められる者」／第2号「一戸建て等石綿含有建材調査者」",
              }
            : asbestosTargetCount === 1 && asbestosStructureTarget
              ? {
                  item: "第4号・第5号",
                  excerpt:
                    "第4号「所定の工作物」「工作物石綿事前調査者」／第5号「その他の対象工作物に係る所定の材料除去等の作業」「一般・特定建築物石綿含有建材調査者等又は工作物石綿事前調査者」",
                }
              : {
                  item: undefined,
                  excerpt:
                    "第1・2号「建築物石綿含有建材調査者等」／第3号「鋼製船舶は船舶石綿含有資材調査者等」／第4・5号「所定の工作物は工作物石綿事前調査者等」",
                }
      : undefined;
  const supportedUnitText =
    scaffoldCitationExcerpt ??
    scaffoldWorkFloorExcerpt ??
    scaffoldInspectionRecordExcerpt ??
    organicCoreExcerpt ??
    organicMultiParagraphExcerpt ??
    genericEducationExcerpt ??
    workSupervisorDutyExcerpt ??
    workSupervisorListExcerpt ??
    genericSpecialEducationListExcerpt ??
    restrictedWorkListExcerpt ??
    craneRestrictedWorkExcerpt ??
    floorOperatedCraneQualificationExcerpt ??
    mobileCraneQualificationExcerpt ??
    chemicalManagerExcerpt ??
    organicSupervisorExcerpt ??
    asbestosSupervisorExcerpt ??
    electricalEducationExcerpt ??
    electricalDeEnergizedExcerpt ??
    electricQualificationExcerpt ??
    electricianMinorWorkExcerpt ??
    lowVoltageProximityExcerpt ??
    electricalWorkControllerExcerpt ??
    fullHarnessEducationExcerpt ??
    fumigationMonitorExcerpt ??
    metiElectricianQaExcerpt?.text ??
    explicitItemsExcerpt ??
    oxygenDeficiencyExcerpt ??
    heatPreventionGuidelineExcerpt ??
    heatProcedureExcerpt ??
    asbestosSurveyDutyExcerpt ??
    asbestosQualificationExcerpt ??
    asbestosNoticeEvidence?.excerpt ??
    (scaffoldChapeau && scaffoldHandrailItem
      ? `${scaffoldChapeau} … ${scaffoldHandrailItem}`
      : matchedUnitText);
  const parentLaw =
    /^(?:安衛令|安衛則|クレーン則|有機則|特化則|酸欠則|石綿則|粉じん則|鉛則|電離則|ボイラー則)$/.test(
      article.lawShort,
    )
      ? "労働安全衛生法"
      : undefined;
  const effectiveDate = effectiveOn
    ? legalDateTextToGregorian(effectiveOn)
    : null;
  const requestedPeriod = requestedLegalPeriod(query);
  const targetDate = questionTime.requestedDate ?? questionTime.asOf;
  const currentSnapshotDate =
    questionTime.status === "current"
      ? verifiedCurrentSnapshotDate(article, now)
      : null;
  const applicationStatus = !effectiveDate
    ? currentSnapshotDate
      ? "current"
      : "unknown"
    : effectiveDate > (requestedPeriod?.end ?? targetDate)
      ? "future"
      : questionTime.status === "past"
        ? "past"
        : questionTime.status === "future"
          ? effectiveDate > questionTime.asOf
            ? "future"
            : "unknown"
          : "current";
  const sourceSnippet =
    scaffoldCitationExcerpt ??
    scaffoldWorkFloorExcerpt ??
    scaffoldInspectionRecordExcerpt ??
    organicCoreExcerpt ??
    organicMultiParagraphExcerpt ??
    genericEducationExcerpt ??
    workSupervisorDutyExcerpt ??
    workSupervisorListExcerpt ??
    genericSpecialEducationListExcerpt ??
    restrictedWorkListExcerpt ??
    craneRestrictedWorkExcerpt ??
    floorOperatedCraneQualificationExcerpt ??
    chemicalManagerExcerpt ??
    organicSupervisorExcerpt ??
    asbestosSupervisorExcerpt ??
    electricalEducationExcerpt ??
    electricalDeEnergizedExcerpt ??
    electricQualificationExcerpt ??
    electricianMinorWorkExcerpt ??
    lowVoltageProximityExcerpt ??
    electricalWorkControllerExcerpt ??
    fullHarnessEducationExcerpt ??
    fumigationMonitorExcerpt ??
    metiElectricianQaExcerpt?.text ??
    explicitItemsExcerpt ??
    oxygenDeficiencyExcerpt ??
    heatPreventionGuidelineExcerpt ??
    heatProcedureExcerpt ??
    asbestosSurveyDutyExcerpt ??
    asbestosQualificationExcerpt ??
    asbestosNoticeEvidence?.excerpt ??
    (scaffoldChapeau && scaffoldHandrailItem
      ? `${scaffoldChapeau} … ${scaffoldHandrailItem}`
      : (matchedItem?.snippet ??
        matchedParagraphSnippet ??
        buildSnippet(article.text, query)));
  const needsLongSourceSnippet = Boolean(
    electricalEducationExcerpt ||
      electricalDeEnergizedExcerpt ||
      electricQualificationExcerpt ||
      electricianMinorWorkExcerpt ||
      electricalWorkControllerExcerpt ||
      genericEducationExcerpt ||
      workSupervisorDutyExcerpt ||
      workSupervisorListExcerpt ||
      genericSpecialEducationListExcerpt ||
      restrictedWorkListExcerpt ||
      craneRestrictedWorkExcerpt ||
      floorOperatedCraneQualificationExcerpt ||
      mobileCraneQualificationExcerpt ||
      oxygenDeficiencyExcerpt ||
      chemicalManagerExcerpt ||
      organicSupervisorExcerpt ||
      asbestosSupervisorExcerpt ||
      lowVoltageProximityExcerpt ||
      scaffoldWorkFloorExcerpt ||
      scaffoldInspectionRecordExcerpt ||
      organicCoreExcerpt ||
      fullHarnessEducationExcerpt ||
      fumigationMonitorExcerpt ||
      metiElectricianQaExcerpt ||
      explicitItemsExcerpt ||
      oxygenDeficiencyExcerpt ||
      heatPreventionGuidelineExcerpt ||
      heatProcedureExcerpt ||
      asbestosSurveyDutyExcerpt ||
      asbestosQualificationExcerpt ||
      asbestosNoticeEvidence ||
      (article.lawShort === "有機則" &&
        /^第?(?:6|8|9|29)条$/.test(article.articleNum)),
  );
  const needsFullProvisionSnippet = Boolean(
    electricQualificationExcerpt ||
      electricianMinorWorkExcerpt ||
      electricalDeEnergizedExcerpt ||
      electricalWorkControllerExcerpt ||
      lowVoltageProximityExcerpt ||
      workSupervisorDutyExcerpt ||
      workSupervisorListExcerpt ||
      genericSpecialEducationListExcerpt ||
      restrictedWorkListExcerpt ||
      craneRestrictedWorkExcerpt ||
      floorOperatedCraneQualificationExcerpt ||
      mobileCraneQualificationExcerpt ||
      oxygenDeficiencyExcerpt ||
      chemicalManagerExcerpt ||
      organicSupervisorExcerpt ||
      asbestosSupervisorExcerpt ||
      organicMultiParagraphExcerpt ||
      metiElectricianQaExcerpt ||
      asbestosSurveyDutyExcerpt,
  );
  const sourceSnippetLimit =
    needsFullProvisionSnippet
      ? 6_000
      : matchedParagraphs.length > 1
      ? 360
      : matchedParagraphs.length === 1 &&
          article.lawShort === "安衛則" &&
          /^第?(?:341|342|344|345|346|347)条$/.test(article.articleNum)
        ? 240
      : needsLongSourceSnippet
        ? 360
        : 140;
  return {
    law: article.law,
    lawShort: article.lawShort,
    article:
      article.articleNum +
      (paragraph && !article.articleNum.includes(paragraph) ? paragraph : "") +
      (article.articleTitle ? `「${article.articleTitle}」` : ""),
    articleTitle: article.articleTitle,
    lawNumber: metadata?.promulgation,
    paragraph,
    item:
      explicitItemSelection ??
      explicitlyRequestedItemRangeLabel(query, article.articleNum) ??
      embeddedItem ??
      (fumigationMonitorExcerpt ? "第5号・第12号" : undefined) ??
      (electricalDeEnergizedExcerpt
        ? "第1号・第2号・第3号"
        : undefined) ??
      (workSupervisorListExcerpt ? provisionUnit.item : undefined) ??
      (genericSpecialEducationListExcerpt
        ? specialEducationItemLabels.join("・")
        : undefined) ??
      (restrictedWorkListExcerpt
        ? "第10号・第12号・第15号"
        : undefined) ??
      (craneRestrictedWorkExcerpt ? provisionUnit.item : undefined) ??
      (oxygenDeficiencyExcerpt ? provisionUnit.item : undefined) ??
      metiElectricianQaExcerpt?.item ??
      asbestosNoticeEvidence?.item ??
      (scaffoldInspectionRecordExcerpt ? "第1号・第2号" : undefined) ??
      matchedItem?.item ??
      (scaffoldCitationExcerpt ? provisionUnit.item : undefined),
    parentLaw,
    relatedLaws: parentLaw ? [parentLaw] : undefined,
    effectiveOn,
    amendmentPromulgatedOn: article.amendmentPromulgatedOn,
    amendmentHistory: article.amendmentHistory,
    revision: metadata?.latestRevision,
    asOf: questionTime.requestedDate ?? questionTime.asOf,
    applicationStatus,
    text:
      supportedUnitText.length > 200
        ? `${supportedUnitText.slice(0, 200)}…`
        : supportedUnitText,
    snippet:
      sourceSnippet.length > sourceSnippetLimit
        ? `${sourceSnippet.slice(0, sourceSnippetLimit)}…`
        : sourceSnippet,
    url: article.sourceUrl ?? metadata?.eGovUrl,
    verificationStatus: article.verificationStatus,
    sourceKind: article.sourceKind,
    sourceFetchedAt: article.sourceFetchedAt,
    humanReviewStatus: article.humanReviewStatus,
  };
}

/** 質問と関連条文から、フォローアップ候補を生成 */
export function buildFollowups(
  question: string,
  articles: LawArticle[],
): FollowupSuggestion[] {
  const output: FollowupSuggestion[] = [];
  output.push({
    label: "💡 もっと詳しく",
    prompt:
      "先ほどの回答についてもう少し詳しく説明してください。特に実務での運用方法や注意点を教えてください。",
  });
  output.push({
    label: "📚 事例を教えて",
    prompt: "この内容に関連する具体的な現場事例や実施例を教えてください。",
  });
  if (articles.length > 0) {
    const top = articles[0];
    output.push({
      label: `📖 ${top.lawShort}${top.articleNum} の条文を見せて`,
      prompt: `${top.law}${top.articleNum}の条文の全文と要点を教えてください。`,
    });
  } else {
    output.push({
      label: "📖 関連条文を見せて",
      prompt: `${question} に関連する具体的な法令条文を教えてください。`,
    });
  }
  return output;
}
