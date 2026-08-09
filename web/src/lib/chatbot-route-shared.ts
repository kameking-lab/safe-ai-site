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

/** 検証済み法令本文を、確認状態を落とさずAPI出典へ変換する。 */
export function lawArticleToSource(
  article: LawArticle,
  query: string,
  now: Date = new Date(),
): ChatbotSource {
  const metadata = getCitationLawMetadata(article.lawShort);
  const questionTime = classifyLegalQuestionTime(query, now);
  const provisionUnit = legalProvisionUnitForQuery(article, query);
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
    ? undefined
    : (embeddedParagraph ?? provisionUnit.paragraph);
  const embeddedItem = article.articleNum.match(
    /第[0-9０-９一二三四五六七八九十百千]+号/,
  )?.[0];
  const matchedParagraph =
    requestedParagraph && !embeddedParagraph
      ? extractLegalParagraph(article, requestedParagraph)
      : null;
  const paragraph = oxygenEducationCommonSubjectsIntent
    ? "第1項・第2項"
    : fumigationMonitorItemsIntent
      ? "第1項"
      : (embeddedParagraph ??
        (matchedParagraph ? requestedParagraph : undefined));
  const scopedArticle = matchedParagraph
    ? {
        ...article,
        text: matchedParagraph.text,
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
    : (matchedParagraph?.text ?? article.text);
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
    article.lawShort === "有機則" && /(?:有機溶剤|シンナー)/.test(query)
      ? /^第?1条$/.test(article.articleNum) &&
        article.text.includes("有機溶剤含有物") &&
        /重量の(?:5|五)パーセントを超えて含有/.test(article.text)
        ? "第1項第2号「有機溶剤等は、有機溶剤又は有機溶剤含有物」「有機溶剤含有物は、有機溶剤を混合物の重量の5%を超えて含有するもの」"
        : /^第?5条$/.test(article.articleNum) &&
            article.text.includes("屋内作業場等") &&
            article.text.includes("第一種有機溶剤等又は第二種有機溶剤等") &&
            article.text.includes("発散源を密閉する設備") &&
            article.text.includes("プッシュプル型換気装置")
          ? "第1項「屋内作業場等で第一種・第二種有機溶剤等に係る有機溶剤業務に従事させるとき」「発散源を密閉する設備、局所排気装置又はプッシュプル型換気装置を設けなければならない」"
          : undefined
      : undefined;
  const organicMultiParagraphExcerpt =
    !paragraph && article.lawShort === "有機則"
      ? /^第?6条$/.test(article.articleNum) &&
        article.text.includes("第三種有機溶剤等") &&
        article.text.includes("吹付けによる") &&
        article.text.includes("全体換気装置")
        ? "第1項「タンク等の内部」「第三種有機溶剤等」「吹付けによる有機溶剤業務を除く」「密閉する設備、局所排気装置、プッシュプル型換気装置又は全体換気装置」／第2項「吹付けによる第三種有機溶剤等」「密閉する設備、局所排気装置又はプッシュプル型換気装置」"
        : /^第?8条$/.test(article.articleNum) &&
            article.text.includes("臨時に有機溶剤業務") &&
            article.text.includes("タンク等の内部以外") &&
            article.text.includes("第六条第二項")
          ? "第1項「臨時に有機溶剤業務」「タンク等の内部以外」「第五条の規定は、適用しない」／第2項「タンク等の内部」「全体換気装置」「第五条又は第六条第二項の規定にかかわらず」「発散源を密閉する設備、局所排気装置及びプッシュプル型換気装置を設けないことができる」"
          : /^第?9条$/.test(article.articleNum) &&
              article.text.includes("短時間") &&
              article.text.includes("タンク等の内部以外") &&
              article.text.includes("送気マスク")
            ? "第1項「タンク等の内部以外」「短時間」「全体換気装置」「第五条の規定にかかわらず」「密閉する設備、局所排気装置及びプッシュプル型換気装置を設けないことができる」／第2項「タンク等の内部」「短時間」「送気マスク」「第五条又は第六条の規定にかかわらず」「密閉する設備、局所排気装置、プッシュプル型換気装置及び全体換気装置を設けないことができる」"
            : undefined
      : undefined;
  const electricQualificationExcerpt =
    /(?:電気作業|電気工事|充電電路)/.test(query) &&
    article.lawShort === "電気工事士法" &&
    /^第?3条$/.test(article.articleNum) &&
    !paragraph &&
    article.text.includes("第一種電気工事士免状") &&
    article.text.includes("第二種電気工事士免状") &&
    article.text.includes("特種電気工事資格者認定証") &&
    article.text.includes("認定電気工事従事者認定証")
      ? "第1項「第一種電気工事士免状」「自家用電気工作物に係る電気工事」／第2項「第一種電気工事士又は第二種電気工事士免状」「一般用電気工作物等に係る電気工事」／第3項「特殊電気工事」「特種電気工事資格者認定証」／第4項「簡易電気工事」「認定電気工事従事者認定証」"
      : article.lawShort === "安衛則" &&
          /^第?36条$/.test(article.articleNum) &&
          provisionUnit.item === "第4号" &&
          /(?:電気作業|電気工事|充電電路)/.test(query) &&
          article.text.includes("低圧") &&
          article.text.includes("対地電圧が五十ボルト以下")
        ? "第4号「高圧若しくは特別高圧の充電電路又は支持物の敷設、点検、修理若しくは操作」／「低圧の充電電路（対地電圧が五十ボルト以下及び電信用・電話用等で感電危害のおそれのないものを除く）の敷設若しくは修理」／「低圧の電路の充電部分が露出している開閉器の操作」"
        : undefined;
  const fullHarnessEducationExcerpt =
    article.lawShort === "安衛則" &&
    /^第?36条$/.test(article.articleNum) &&
    provisionUnit.item === "第41号" &&
    /(?:フルハーネス|墜落制止用器具)/.test(query) &&
    article.text.includes("ロープ高所作業") &&
    article.text.includes("前号に掲げる業務を除く")
      ? "第40号「高さ2m以上で作業床を設けることが困難な箇所におけるロープ高所作業」／第41号「高さ2m以上で作業床を設けることが困難な箇所でフルハーネス型の墜落制止用器具を用いる作業（前号のロープ高所作業を除く）」"
      : undefined;
  const genericEducationExcerpt =
    article.lawShort === "安衛法" &&
    /^第?59条$/.test(article.articleNum) &&
    provisionUnit.paragraph === "第3項" &&
    article.text.includes("厚生労働省令で定める") &&
    article.text.includes("特別の教育を行")
      ? "第3項「危険又は有害な業務で、厚生労働省令で定めるものに労働者を就かせるとき」「当該業務に関する安全又は衛生のための特別の教育を行わなければならない」"
      : undefined;
  const electricalWorkControllerExcerpt =
    article.lawShort === "安衛則" &&
    /^第?350条$/.test(article.articleNum) &&
    /(?:電気作業|電気工事|充電電路)/.test(query) &&
    /(?:作業指揮者|作業の指揮者)/.test(query) &&
    article.text.includes("作業の指揮者を定めて")
      ? "対象「第339条、第341条第1項、第342条第1項、第344条第1項又は第345条第1項の作業」／「作業の指揮者を定めて」／第1号「作業の方法及び順序を周知」「作業を直接指揮」"
      : undefined;
  const oxygenDeficiencyExcerpt =
    article.lawShort === "酸欠則" && /(?:酸欠|酸素欠乏|酸素濃度)/.test(query)
      ? /^第?2条$/.test(article.articleNum) &&
        article.text.includes("酸素欠乏等") &&
        article.text.includes("硫化水素中毒")
        ? "第1号「酸素欠乏＝酸素濃度18%未満」／第2号「酸素欠乏等＝酸素欠乏又は硫化水素濃度100万分の10超の状態」／第3号「酸素欠乏症」／第4号「硫化水素中毒」／第5号「酸素欠乏症等＝酸素欠乏症又は硫化水素中毒」"
        : /^第?3条$/.test(article.articleNum) &&
            article.text.includes("その日の作業を開始する前") &&
            /これを(?:3|三)年間保存/.test(article.text)
          ? "第1項「その日の作業を開始する前に酸素（第二種は酸素及び硫化水素）の濃度を測定」／第2項第1号「測定日時」／第2号「測定方法」／第3号「測定箇所」／第4号「測定条件」／第5号「測定結果」／第6号「測定を実施した者の氏名」／第7号「防止措置を講じたときは当該措置の概要」／「3年間保存」"
          : /^第?5条$/.test(article.articleNum) &&
              /酸素の濃度を(?:18|十八)パーセント以上/.test(article.text) &&
              article.text.includes("換気することが著しく困難な場合")
            ? "第1項「酸素濃度18%以上（第二種は酸素18%以上かつ硫化水素100万分の10以下）に保つよう換気」／ただし「爆発、酸化等を防止するため換気できない場合又は作業の性質上換気が著しく困難な場合」は除く"
            : /^第?5条の2$/.test(article.articleNum) &&
                article.text.includes("同時に就業する労働者の人数と同数以上") &&
                article.text.includes("空気呼吸器等")
              ? "第5条ただし書の場合「同時に就業する労働者の人数と同数以上の空気呼吸器等を備え、労働者にこれを使用させなければならない」"
              : /^第?11条$/.test(article.articleNum) &&
                  article.text.includes("酸素欠乏危険作業主任者技能講習") &&
                  article.text.includes(
                    "酸素欠乏・硫化水素危険作業主任者技能講習",
                  )
                ? "第1項「第一種は酸素欠乏危険作業主任者技能講習又は酸素欠乏・硫化水素危険作業主任者技能講習を修了した者」「第二種は酸素欠乏・硫化水素危険作業主任者技能講習を修了した者」から作業主任者を選任"
                : /^第?12条$/.test(article.articleNum) &&
                    article.text.includes("第一種酸素欠乏危険作業") &&
                    article.text.includes(
                      "第二種酸素欠乏危険作業に係る業務について準用",
                    )
                  ? "第1項（第一種）第1号「酸素欠乏の発生の原因」／第2号「酸素欠乏症の症状」／第3号「空気呼吸器等の使用の方法」／第4号「事故の場合の退避及び救急そ生の方法」／第5号「その他、酸素欠乏症の防止に必要な事項」／第2項「第二種にも準用。第1号、第2号及び第5号を酸素欠乏等・酸素欠乏症等へ読み替え、第3号・第4号は共通」"
                  : undefined
      : undefined;
  const heatProcedureExcerpt =
    article.lawShort === "安衛則" &&
    /^第?612条の2$/.test(article.articleNum) &&
    /熱中症/.test(query) &&
    article.text.includes("その旨の報告をさせる体制を整備") &&
    article.text.includes("当該作業からの離脱、身体の冷却")
      ? "対象「暑熱な場所において連続して行われる作業等、熱中症を生ずるおそれのある作業」／第1項「熱中症の自覚症状又は疑いを発見した場合に報告させる体制を整備し、作業従事者へ周知」／第2項「作業場ごとに、作業からの離脱、身体の冷却、必要に応じた医師の診察・処置等の措置内容と実施手順を定め、周知」"
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
    electricQualificationExcerpt ??
    electricalWorkControllerExcerpt ??
    fullHarnessEducationExcerpt ??
    fumigationMonitorExcerpt ??
    explicitItemsExcerpt ??
    oxygenDeficiencyExcerpt ??
    heatProcedureExcerpt ??
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
    electricQualificationExcerpt ??
    electricalWorkControllerExcerpt ??
    fullHarnessEducationExcerpt ??
    fumigationMonitorExcerpt ??
    explicitItemsExcerpt ??
    oxygenDeficiencyExcerpt ??
    heatProcedureExcerpt ??
    asbestosQualificationExcerpt ??
    asbestosNoticeEvidence?.excerpt ??
    (scaffoldChapeau && scaffoldHandrailItem
      ? `${scaffoldChapeau} … ${scaffoldHandrailItem}`
      : (matchedItem?.snippet ??
        matchedParagraph?.snippet ??
        buildSnippet(article.text, query)));
  const sourceSnippetLimit =
    electricQualificationExcerpt ||
    electricalWorkControllerExcerpt ||
    genericEducationExcerpt ||
    scaffoldWorkFloorExcerpt ||
    scaffoldInspectionRecordExcerpt ||
    organicCoreExcerpt ||
    fullHarnessEducationExcerpt ||
    fumigationMonitorExcerpt ||
    explicitItemsExcerpt ||
    oxygenDeficiencyExcerpt ||
    heatProcedureExcerpt ||
    asbestosQualificationExcerpt ||
    asbestosNoticeEvidence ||
    (article.lawShort === "有機則" &&
      /^第?(?:6|8|9|29)条$/.test(article.articleNum))
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
