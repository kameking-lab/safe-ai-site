import type { LawArticle } from "@/data/laws";
import {
  normalizeFullwidthAlnum,
  normalizeKanjiNumbers,
} from "@/lib/article-number-normalize";
import {
  buildServiceFirstLegalAnswer,
  legalApplicationStatusEvidenceIndex,
  legalApplicationStatusLine,
  legalEffectiveStatusConclusion,
  legalProvisionUnitForQuery,
} from "@/lib/legal-extractive-answer";

export type LegalClaimSupportResult = {
  supported: boolean;
  markersValid: boolean;
  citedIndexes: number[];
  claimCount: number;
  failures: string[];
};

type Claim = {
  section: "結論" | "条件" | "適用時点";
  text: string;
  raw: string;
  citationIndexes: number[];
};

const ADVISORY_CONDITION =
  /^(?:この条文が対象とする作業・設備・数値条件を照合してください。?|場所が不明な場合は、容器・設備図面と実際の作業場所を確認してください。?)$/;

function normalizeEvidence(value: string): string {
  return normalizeKanjiNumbers(normalizeFullwidthAlnum(value))
    .normalize("NFKC")
    .replace(/フオー/g, "フォー")
    .replace(/シヨ/g, "ショ")
    .replace(/デリツク/g, "デリック")
    .replace(/[\s　、。,.!?！？;；（）()「」『』・]/g, "");
}

function citationIndexes(value: string): number[] {
  return [...value.matchAll(/［(\d+)］/g)].map((match) => Number(match[1]) - 1);
}

function withoutMarkers(value: string): string {
  return value
    .replace(/^・/, "")
    .replace(/［\d+］/g, "")
    .trim();
}

function splitClaimSentences(value: string): string[] {
  const sentences: string[] = [];
  let current = "";
  let parenthesesDepth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    current += character;
    if (character === "（" || character === "(") parenthesesDepth += 1;
    if (character === "）" || character === ")") {
      parenthesesDepth = Math.max(0, parenthesesDepth - 1);
    }
    const isDecimalPoint =
      character === "." &&
      /\d/u.test(value[index - 1] ?? "") &&
      /\d/u.test(value[index + 1] ?? "");
    if (
      !/[。.!！?？;；]/u.test(character) ||
      isDecimalPoint ||
      parenthesesDepth > 0
    ) {
      continue;
    }

    let cursor = index + 1;
    while (cursor < value.length) {
      const marker = value.slice(cursor).match(/^\s*(［\d+］)/u);
      if (!marker?.[0]) break;
      current += marker[0];
      cursor += marker[0].length;
    }
    sentences.push(current.trim());
    current = "";
    index = cursor - 1;
  }
  if (current.trim()) sentences.push(current.trim());
  return sentences;
}

function parseClaims(answer: string): Claim[] {
  const claims: Claim[] = [];
  let section: Claim["section"] | null = null;
  for (const rawLine of answer.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "結論" || line === "条件" || line === "適用時点") {
      section = line;
      continue;
    }
    if (line === "根拠" || line === "次の質問") {
      section = null;
      continue;
    }
    if (!section || !line) continue;
    // Answer-first templates place a marker immediately after the claim it
    // supports.  Keep those local claim/evidence pairs separate even when
    // several short conclusion sentences share one rendered line.  This
    // prevents evidence cited for a later sentence from supporting an earlier
    // sentence merely because both happened to be on the same line.
    for (const localClaim of line.split(/(?<=］)\s+(?=\S)/u)) {
      const cleanLocalClaim = localClaim.replace(/^・/, "").trim();
      const fallbackIndexes = citationIndexes(cleanLocalClaim);
      for (const sentence of splitClaimSentences(cleanLocalClaim)) {
        const text = withoutMarkers(sentence);
        if (section === "条件" && ADVISORY_CONDITION.test(text)) continue;
        const localIndexes = citationIndexes(sentence);
        claims.push({
          section,
          text,
          raw: sentence,
          citationIndexes:
            localIndexes.length > 0 ? localIndexes : fallbackIndexes,
        });
      }
    }
  }
  return claims;
}

function evidenceHasAll(evidence: string, terms: readonly string[]): boolean {
  return terms.every((term) => evidence.includes(normalizeEvidence(term)));
}

function evidenceHasAny(evidence: string, terms: readonly string[]): boolean {
  return terms.some((term) => evidence.includes(normalizeEvidence(term)));
}

function claimHasAll(claim: string, terms: readonly string[]): boolean {
  return evidenceHasAll(normalizeEvidence(claim), terms);
}

function hasDangerousUnsupportedContradiction(value: string): boolean {
  const withoutGuardedWarning = value.replace(
    /(?:資格・免許|資格)(?:が)?不要とは判断できません。?/g,
    "",
  );
  const normalized = normalizeEvidence(withoutGuardedWarning);
  return (
    /無資格で(?:運転|作業|行|操作).*(?:でき|よい|構わない)/.test(normalized) ||
    /(?:資格|免許|技能講習|特別教育|教育|作業主任者の選任|墜落制止用器具の使用)(?:は|が)?不要(?:です|である|だ)?$/.test(
      normalized,
    ) ||
    /(?:資格|免許|技能講習|特別教育|教育|選任|使用)(?:は|が)?必要(?:は)?(?:ない|ありません)/.test(
      normalized,
    )
  );
}

/**
 * A presentation-only locator claim is supported only when every displayed
 * reference is paired with its own valid marker and resolves exactly to that
 * article (and requested paragraph/item) in the supplied evidence set.
 */
function presentationLocatorSupported(input: {
  claim: Claim;
  articles: readonly LawArticle[];
  query: string;
}): boolean | null {
  const match = input.claim.raw.match(
    /^.+?について取得した主な根拠条文は、(.+)です。?$/u,
  );
  if (!match) return null;
  const entries = match[1]!.split("、");
  if (
    entries.length === 0 ||
    entries.length !== input.claim.citationIndexes.length
  ) {
    return false;
  }

  const parsedIndexes: number[] = [];
  for (const entry of entries) {
    const entryMatch = entry.match(/^(.+?)［(\d+)］$/u);
    if (!entryMatch) return false;
    const index = Number(entryMatch[2]) - 1;
    const article = input.articles[index];
    if (!article || article.text.trim().length < 12) return false;
    const unit = legalProvisionUnitForQuery(article, input.query);
    const requestedUnit = unit.item ?? unit.paragraph ?? "";
    const expectedLocator = `${article.lawShort}${article.articleNum.replace(
      /^第/,
      "",
    )}${requestedUnit.replace(/^第/, "")}`;
    if (entryMatch[1] !== expectedLocator) return false;
    parsedIndexes.push(index);
  }
  return parsedIndexes.every(
    (index, position) => index === input.claim.citationIndexes[position],
  );
}

function inlineReviewedLocatorSupported(input: {
  claim: Claim;
  articles: readonly LawArticle[];
}): boolean | null {
  if (!/^直接根拠は安衛則194条の22です。?$/.test(input.claim.text)) {
    return null;
  }
  if (input.claim.citationIndexes.length !== 1) return false;
  const article = input.articles[input.claim.citationIndexes[0]!];
  return Boolean(
    article &&
    article.lawShort === "安衛則" &&
    /^第?194条の22$/.test(article.articleNum) &&
    /高所作業車/.test(article.text) &&
    /要求性能墜落制止用器具等/.test(article.text),
  );
}

function knownClaimSupported(text: string, evidence: string): boolean | null {
  if (
    /高さ2m以上の一側足場を除く足場で、墜落により危険を及ぼすおそれのある箇所のうち、わく組足場以外の部分には手すり等と中桟等が必要/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "一側足場を除く",
      "高さ二メートル以上",
      "墜落により労働者に危険を及ぼすおそれのある箇所",
      "わく組足場以外の足場",
      "手すり等及び中桟等",
    ]);
  }
  if (/「手すり等」は高さ85cm以上、「中桟等」は高さ35〜50cm/.test(text)) {
    return evidenceHasAll(evidence, [
      "手すり等",
      "高さ八十五センチメートル以上",
      "中桟等",
      "高さ三十五センチメートル以上五十センチメートル以下",
    ]);
  }
  if (/つり足場を除く足場の作業床は、幅40cm以上/.test(text)) {
    return evidenceHasAll(evidence, [
      "つり足場の場合を除き",
      "幅は40センチメートル以上",
    ]);
  }
  if (/床材間の隙間は3cm以下/.test(text)) {
    return evidenceHasAll(evidence, ["床材間の隙間は3センチメートル以下"]);
  }
  if (/床材と建地との隙間は(?:原則)?12cm未満/.test(text)) {
    return evidenceHasAll(evidence, [
      "床材と建地との隙間は12センチメートル未満",
    ]);
  }
  if (
    /^12cm以上でも、墜落防止措置を講じた上で、両端の隙間の和が24cm未満の場合、または作業上24cm未満が困難な場合には例外/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "床材と建地との隙間が十二センチメートル以上",
      "防網を張る等墜落による労働者の危険を防止するための措置",
      "建地と床材の両端との隙間の和が二十四センチメートル未満",
      "二十四センチメートル未満とすることが作業の性質上困難",
    ]);
  }
  if (/床材と建地との隙間は原則12cm未満.*両端の隙間の和が24cm未満/.test(text)) {
    return evidenceHasAll(evidence, [
      "床材と建地との隙間は十二センチメートル未満",
      "床材と建地との隙間が十二センチメートル以上",
      "防網を張る等墜落による労働者の危険を防止するための措置",
      "建地と床材の両端との隙間の和が二十四センチメートル未満",
      "二十四センチメートル未満とすることが作業の性質上困難",
    ]);
  }
  if (/代表的な条件として、高さ2m以上の一側足場を除く足場/.test(text)) {
    return evidenceHasAll(evidence, [
      "一側足場を除く",
      "高さ2メートル以上",
      "墜落により労働者に危険を及ぼすおそれのある箇所",
      "わく組足場以外の足場",
      "85センチメートル以上",
      "35センチメートル以上50センチメートル以下",
    ]);
  }
  if (/わく組足場以外では、高さ85cm以上/.test(text)) {
    return evidenceHasAll(evidence, [
      "わく組足場以外",
      "85センチメートル以上",
      "35センチメートル以上50センチメートル以下",
    ]);
  }
  if (
    /わく組足場以外の手すり等として確認する場合、.*基準を満たしません/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "わく組足場以外",
      "85センチメートル以上",
      "35センチメートル以上50センチメートル以下",
    ]);
  }
  if (/足場の種類により、必要な墜落防止設備が変わ/.test(text)) {
    return evidenceHasAll(evidence, ["足場の種類に応じて", "設備"]);
  }
  if (/高さ2m以上の作業場所が対象/.test(text)) {
    return evidenceHasAll(evidence, ["高さ2メートル以上", "足場"]);
  }
  if (/最大荷重1トン以上のフォークリフト運転.*技能講習/.test(text)) {
    return evidenceHasAll(evidence, [
      "最大荷重",
      "1トン以上",
      "フォークリフト",
      "技能講習を修了した者",
    ]);
  }
  if (
    /安衛則36条5号は、最大荷重1トン未満のフォークリフト運転を掲げています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "最大荷重一トン未満のフォークリフト",
      "運転の業務",
    ]);
  }
  if (
    /最大荷重1トン以上のフォークリフト運転は、安衛令20条11号の就業制限業務/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "最大荷重",
      "基準荷重中心",
      "一トン以上のフオークリフト",
      "運転",
    ]);
  }
  if (
    /安衛法61条は、その業務を技能講習修了者等の所定資格を持つ者に限っています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "政令で定めるものについては",
      "免許を受けた者",
      "技能講習を修了した者",
      "資格を有する者でなければ",
      "当該業務に就かせてはならない",
    ]);
  }
  if (
    /「最大荷重」は、車両の構造・材料に応じて基準荷重中心に負荷できる最大の荷重/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "フォークリフトの構造及び材料に応じて",
      "基準荷重中心に負荷させることができる最大の荷重",
    ]);
  }
  if (/(?:1トン未満|1トン以上)の規定[はも]道路走行を除きます/.test(text)) {
    return evidenceHasAll(evidence, ["道路上を走行させる運転を除く"]);
  }
  if (/最大荷重1トン未満のフォークリフト運転/.test(text)) {
    return evidenceHasAll(evidence, [
      "最大荷重1トン未満",
      "フォークリフト",
      "特別の教育を行",
    ]);
  }
  if (
    /フォークリフトは、最大荷重1トン以上なら.*1トン未満でも特別教育/.test(text)
  ) {
    return evidenceHasAll(evidence, [
      "最大荷重",
      "1トン以上",
      "フォークリフト",
      "技能講習を修了した者",
      "1トン未満",
      "特別の教育を行",
    ]);
  }
  if (/基準は実際に運ぶ荷の重さではなく、車両の最大荷重/.test(text)) {
    return evidenceHasAll(evidence, ["最大荷重", "フォークリフト"]);
  }
  if (
    /電気作業で必要な資格・教育は一つではありません.*電気工事士免状または認定証等.*特別教育/.test(
      text,
    )
  ) {
    return (
      claimHasAll(text, [
        "配線や設備の設置変更",
        "設備作業区分に応じた電気工事士免状または認定証等",
        "充電電路の敷設点検修理操作等",
        "特別教育",
      ]) &&
      evidenceHasAll(evidence, [
        "一般用電気工作物等又は自家用電気工作物を設置し又は変更する工事",
        "第一種電気工事士免状",
        "第二種電気工事士免状",
        "特種電気工事資格者認定証",
        "認定電気工事従事者認定証",
        "危険又は有害な業務で厚生労働省令で定めるもの",
        "高圧",
        "特別高圧",
        "充電電路若しくは当該充電電路の支持物の敷設点検修理若しくは操作",
        "低圧",
        "敷設若しくは修理の業務",
      ])
    );
  }
  if (
    /電気工事士法上の「電気工事」は、一般用電気工作物等または自家用電気工作物を設置・変更する工事/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "一般用電気工作物等又は自家用電気工作物を設置し又は変更する工事",
      "軽微な工事を除く",
    ]);
  }
  if (
    /電気工事士法3条は、設備・工事区分に応じて、電気工事士免状または認定証等を持つ者に従事を限っています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "第一種電気工事士免状",
      "第二種電気工事士免状",
      "特種電気工事資格者認定証",
      "認定電気工事従事者認定証",
      "自家用電気工作物に係る電気工事",
      "一般用電気工作物等に係る電気工事",
      "従事してはならない",
    ]);
  }
  if (
    /安衛法59条3項は、省令で定める危険・有害業務に就かせるとき、特別教育を行うよう定めています/.test(
      text,
    )
  ) {
    return (
      evidenceHasAll(evidence, [
        "危険又は有害な業務で厚生労働省令で定めるもの",
      ]) &&
      evidenceHasAny(evidence, [
        "特別の教育を行なわなければならない",
        "特別の教育を行わなければならない",
      ])
    );
  }
  if (
    /安衛法59条3項により、省令で定める危険・有害業務に就かせるときは特別教育が必要/.test(
      text,
    )
  ) {
    return (
      evidenceHasAll(evidence, [
        "危険又は有害な業務で厚生労働省令で定めるもの",
      ]) &&
      evidenceHasAny(evidence, [
        "特別の教育を行なわなければならない",
        "特別の教育を行わなければならない",
      ])
    );
  }
  if (
    /電気では、安衛則36条4号に充電電路の敷設・点検・修理・操作等が掲げられています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "高圧",
      "特別高圧",
      "充電電路若しくは当該充電電路の支持物の敷設点検修理若しくは操作",
      "低圧",
      "敷設若しくは修理の業務",
      "充電部分が露出している開閉器の操作の業務",
    ]);
  }
  if (
    /電気工事士法3条の区分は、自家用・一般用・特殊・簡易の各電気工事で異なります/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "自家用電気工作物に係る電気工事",
      "一般用電気工作物等に係る電気工事",
      "特殊電気工事",
      "簡易電気工事",
    ]);
  }
  if (
    /安衛則36条4号は、高圧・特別高圧では充電電路または支持物の敷設・点検・修理・操作を掲げています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "高圧",
      "特別高圧",
      "充電電路若しくは当該充電電路の支持物の敷設点検修理若しくは操作",
    ]);
  }
  if (
    /低圧では、充電電路の敷設・修理と、充電部分が露出した開閉器の操作が同号に掲げられています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "低圧",
      "充電電路",
      "敷設若しくは修理の業務",
      "充電部分が露出している開閉器の操作の業務",
    ]);
  }
  if (
    /安衛法14条は、対象作業の区分に応じて作業主任者を選任し、労働者の指揮等を行わせるよう定めています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "政令で定めるものについては",
      "作業主任者を選任し",
      "当該作業に従事する労働者の指揮その他の厚生労働省令で定める事項を行わせなければならない",
    ]);
  }
  if (
    /安衛令6条は、「法第十四条の政令で定める作業」（指定された作業）を列挙しています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "法第十四条の政令で定める作業は次のとおり",
    ]);
  }
  if (
    /電気作業では、安衛則350条が安衛則339条・341条1項・342条1項・344条1項・345条1項の作業を行うときに作業の指揮者を定めるよう求めています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "第三百三十九条",
      "第三百四十一条第一項",
      "第三百四十二条第一項",
      "第三百四十四条第一項",
      "第三百四十五条第一項",
      "作業の指揮者を定めて",
      "作業を直接指揮",
    ]);
  }
  if (
    /安衛則36条4号には、高圧・特別高圧の充電電路または支持物の敷設・点検・修理・操作と、一定の低圧業務が掲げられています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "高圧",
      "特別高圧",
      "充電電路若しくは当該充電電路の支持物の敷設点検修理若しくは操作",
      "低圧",
      "敷設若しくは修理の業務",
      "充電部分が露出している開閉器の操作の業務",
    ]);
  }
  if (
    /低圧か高圧・特別高圧かに加え、敷設・点検・修理・操作のどれを行うかを確認します/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "高圧",
      "特別高圧",
      "敷設",
      "点検",
      "修理",
      "操作",
      "低圧",
    ]);
  }
  if (/電気工事士法上の「電気工事」に当たる範囲と設備区分/.test(text)) {
    return evidenceHasAll(evidence, [
      "一般用電気工作物等又は自家用電気工作物を設置し又は変更する工事",
      "軽微な工事を除く",
      "自家用電気工作物に係る電気工事",
      "一般用電気工作物等に係る電気工事",
    ]);
  }
  if (/低圧・高圧・特別高圧と、敷設・修理・点検・操作の別/.test(text)) {
    return evidenceHasAll(evidence, [
      "高圧",
      "特別高圧",
      "充電電路若しくは当該充電電路の支持物の敷設点検修理若しくは操作",
      "低圧",
      "敷設若しくは修理の業務",
      "特別の教育",
    ]);
  }
  if (/設備操作だけか、充電電路の敷設・点検・修理/.test(text)) {
    return (
      claimHasAll(text, ["設備操作", "充電電路の敷設点検修理"]) &&
      evidenceHasAll(evidence, [
        "高圧",
        "特別高圧",
        "充電電路若しくは当該充電電路の支持物の敷設点検修理若しくは操作",
        "低圧",
        "敷設若しくは修理の業務",
        "充電部分が露出している開閉器の操作の業務",
      ])
    );
  }
  if (
    /電気作業というだけで共通に選任する「作業主任者」はありません.*作業の指揮者.*作業主任者とは別/.test(
      text,
    )
  ) {
    return (
      claimHasAll(text, [
        "電気作業というだけで共通に選任する作業主任者はありません",
        "安衛令で列挙された特定作業",
        "停電作業",
        "高圧特別高圧の活線作業活線近接作業",
        "作業の指揮者",
        "作業主任者とは別",
      ]) &&
      evidenceHasAll(evidence, [
        "政令で定めるものについては",
        "作業主任者を選任",
        "法第14条の政令で定める作業は",
        "石綿若しくは石綿をその重量の0.1パーセントを超えて含有する製剤その他の物",
        "石綿分析用試料等",
        "電路を開路して",
        "高圧の充電電路の点検修理等",
        "高圧の充電電路に接触し",
        "特別高圧の充電電路又はその支持がいしの点検修理清掃等",
        "特別高圧の充電電路に接近することにより",
        "作業の指揮者を定めて",
        "作業を直接指揮",
      ])
    );
  }
  if (/安衛令6条の「高圧室内作業」は、大気圧を超える圧気工法/.test(text)) {
    return evidenceHasAll(evidence, [
      "高圧室内作業",
      "圧気工法",
      "大気圧を超える気圧下の作業室",
      "内部において行う作業",
    ]);
  }
  if (/充電電路の敷設・点検・修理・操作等では、特別教育の対象/.test(text)) {
    return (
      claimHasAll(text, ["充電電路の敷設点検修理操作等", "特別教育"]) &&
      evidenceHasAll(evidence, [
        "高圧",
        "特別高圧",
        "充電電路若しくは当該充電電路の支持物の敷設点検修理若しくは操作",
        "低圧",
        "敷設若しくは修理の業務",
        "充電部分が露出している開閉器の操作の業務",
      ])
    );
  }
  if (/低圧活線作業・低圧活線近接作業は350条の列挙には含まれない/.test(text)) {
    return (
      evidenceHasAll(evidence, [
        "第三百三十九条",
        "第三百四十一条第一項",
        "第三百四十二条第一項",
        "第三百四十四条第一項",
        "第三百四十五条第一項",
        "作業の指揮者を定めて",
      ]) && !evidenceHasAny(evidence, ["低圧活線作業", "低圧活線近接作業"])
    );
  }
  if (/最大荷重1トンちょうどは技能講習側/.test(text)) {
    return evidenceHasAll(evidence, [
      "最大荷重",
      "1トン以上",
      "技能講習を修了した者",
    ]);
  }
  if (/最大荷重1トンちょうどは、安衛令20条11号の就業制限側/.test(text)) {
    return evidenceHasAll(evidence, [
      "最大荷重",
      "一トン以上のフオークリフト",
      "運転の業務",
    ]);
  }
  if (/つり上げ荷重1トンちょうどは技能講習側/.test(text)) {
    return evidenceHasAll(evidence, [
      "つり上げ荷重が1トン以上",
      "玉掛け技能講習を修了した者",
    ]);
  }
  if (/つり上げ荷重1トンちょうどは、就業制限の対象/.test(text)) {
    return evidenceHasAll(evidence, [
      "つり上げ荷重が一トン以上",
      "玉掛けの業務",
    ]);
  }
  if (
    /「つり上げ荷重」は、機械の構造・材料に応じて負荷できる最大の荷重/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "構造及び材料に応じて負荷させることができる最大の荷重",
    ]);
  }
  if (/道路上(?:の走行|を走行させる運転).*対象外/.test(text)) {
    return evidenceHasAll(evidence, ["道路上を走行させる運転を除く"]);
  }
  if (/つり上げ荷重1トン以上.*玉掛け.*技能講習/.test(text)) {
    return evidenceHasAll(evidence, [
      "つり上げ荷重が1トン以上",
      "玉掛け",
      "玉掛け技能講習を修了した者",
    ]);
  }
  if (
    /つり上げ荷重1トン以上のクレーン・移動式クレーン・デリックの玉掛けは、就業制限の対象/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "つり上げ荷重が一トン以上のクレーン",
      "移動式クレーン",
      "デリック",
      "玉掛けの業務",
    ]);
  }
  if (/その業務は、玉掛け技能講習の修了者等に限られます/.test(text)) {
    return evidenceHasAll(evidence, [
      "令第二十条第十六号に掲げる業務",
      "玉掛け技能講習を修了した者",
      "当該業務に就かせてはならない",
    ]);
  }
  if (
    /クレーン・移動式クレーン・デリックの玉掛けは、つり上げ荷重1トン以上/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "つり上げ荷重が1トン以上",
      "玉掛け",
      "玉掛け技能講習を修了した者",
      "つり上げ荷重が1トン未満",
      "特別の教育",
    ]);
  }
  if (
    /基準は実際の(?:つり荷|荷の重さ)ではなく、機械の構造・材料に応じた最大荷重/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "構造及び材料に応じて負荷させることができる最大の荷重",
    ]);
  }
  if (/揚貨装置は制限荷重で判定/.test(text)) {
    return evidenceHasAll(evidence, ["揚貨装置", "制限荷重"]);
  }
  if (/基準は実際の荷の重さではなく、機械のつり上げ荷重/.test(text)) {
    return (
      evidenceHasAny(evidence, [
        "つり上げ荷重が1トン以上",
        "つり上げ荷重が1トン未満",
      ]) && evidenceHasAll(evidence, ["玉掛け"])
    );
  }
  if (/つり上げ荷重1トン未満.*玉掛け.*特別教育/.test(text)) {
    return evidenceHasAll(evidence, [
      "つり上げ荷重が1トン未満",
      "玉掛け",
      "特別の教育",
    ]);
  }
  if (/つり上げ荷重1トン未満の移動式クレーン.*特別教育/.test(text)) {
    return evidenceHasAll(evidence, [
      "つり上げ荷重が1トン未満の移動式クレーン",
      "特別の教育",
    ]);
  }
  if (
    /つり上げ荷重1トン以上5トン未満.*小型移動式クレーン運転技能講習/.test(text)
  ) {
    return evidenceHasAll(evidence, [
      "つり上げ荷重が1トン以上5トン未満の移動式クレーン",
      "小型移動式クレーン運転技能講習を修了した者",
    ]);
  }
  if (/5トン以上は移動式クレーン運転士免許/.test(text)) {
    return evidenceHasAll(evidence, [
      "移動式クレーン運転士免許を受けた者",
      "1トン以上5トン未満",
    ]);
  }
  if (/つり上げ荷重5トン以上.*移動式クレーン運転士免許/.test(text)) {
    return evidenceHasAll(evidence, [
      "移動式クレーン運転士免許を受けた者",
      "1トン以上5トン未満",
    ]);
  }
  if (/1トン以上5トン未満は、小型移動式クレーン運転技能講習/.test(text)) {
    return evidenceHasAll(evidence, [
      "1トン以上5トン未満の移動式クレーン",
      "小型移動式クレーン運転技能講習を修了した者",
    ]);
  }
  if (/フルハーネス型.*特別教育/.test(text)) {
    return evidenceHasAll(evidence, [
      "高さが2メートル以上",
      "作業床を設けることが困難",
      "フルハーネス型",
      "特別の教育を行",
    ]);
  }
  if (/ロープ高所作業は、この号の対象から除かれ/.test(text)) {
    return evidenceHasAll(evidence, ["ロープ高所作業", "除く"]);
  }
  if (/高さだけでなく、作業床を設けることが困難か/.test(text)) {
    return evidenceHasAll(evidence, [
      "高さが2メートル以上",
      "作業床を設けることが困難",
    ]);
  }
  if (/作業床の高さ10m未満.*高所作業車.*特別教育/.test(text)) {
    return evidenceHasAll(evidence, [
      "10メートル未満の高所作業車",
      "高所作業車",
      "特別の教育を行",
    ]);
  }
  if (
    /高所作業車の作業床上では、事業者は労働者に要求性能墜落制止用器具等を使用させ、労働者本人も使用しなければ/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "高所作業車",
      "作業床上の労働者",
      "要求性能墜落制止用器具等を使用させなければならない",
      "前項の労働者",
      "要求性能墜落制止用器具等を使用しなければならない",
    ]);
  }
  if (
    /作業床が接地面に対し垂直にのみ上昇・下降する構造のものは、この条文の対象から除かれます/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "作業床が接地面に対し垂直にのみ上昇し又は下降する構造のものを除く",
    ]);
  }
  if (
    /作業床の高さが2m以上のものが、安衛令10条7号の「高所作業車」です/.test(text)
  ) {
    return evidenceHasAll(evidence, [
      "作業床を最も高く上昇させた場合",
      "床面の高さ",
      "二メートル以上の高所作業車",
    ]);
  }
  if (
    /作業床の高さが10m未満の高所作業車運転が、安衛則36条10号の5に掲げられています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "作業床の高さ",
      "十メートル未満の高所作業車",
      "運転の業務",
    ]);
  }
  if (
    /作業床の高さが10m以上の高所作業車運転は、安衛令20条15号の就業制限業務/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "作業床の高さが十メートル以上の高所作業車",
      "運転の業務",
    ]);
  }
  if (
    /安衛法61条は、政令で定める就業制限業務を技能講習修了者等の所定資格を持つ者に限っています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "政令で定めるものについては",
      "免許を受けた者",
      "技能講習を修了した者",
      "資格を有する者でなければ",
      "当該業務に就かせてはならない",
    ]);
  }
  if (
    /安衛法59条1項は、労働者を雇い入れたとき、その業務に関する安全・衛生教育を行うよう事業者に求めています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "労働者を雇い入れたとき",
      "その従事する業務に関する安全又は衛生のための教育",
      "行なわなければならない",
    ]);
  }
  if (
    /安衛則35条は、当該労働者へ遅滞なく必要事項を教育するよう定めています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "当該労働者に対し",
      "遅滞なく",
      "安全又は衛生のため必要な事項",
      "教育を行なわなければならない",
    ]);
  }
  if (
    /作業内容を変更したときも、従事する業務に必要な安全・衛生教育が必要/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "労働者の作業内容を変更したとき",
      "従事する業務に関する安全又は衛生のための教育",
    ]);
  }
  if (
    /教育事項には、危険・有害性と取扱い、安全装置・保護具、作業手順・開始時点検、疾病予防、整理整頓、事故時の応急措置・退避などが含まれます/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "危険性又は有害性及びこれらの取扱い方法",
      "安全装置",
      "保護具",
      "作業手順",
      "作業開始時の点検",
      "疾病の原因及び予防",
      "整理整頓及び清潔の保持",
      "事故時等における応急措置及び退避",
    ]);
  }
  if (
    /十分な知識・技能があると認められる事項は、その教育を省略できます/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "十分な知識及び技能を有していると認められる労働者",
      "当該事項についての教育を省略することができる",
    ]);
  }
  if (/作業床最高高さ10mちょうどは、就業制限の対象/.test(text)) {
    return evidenceHasAll(evidence, [
      "作業床の高さが十メートル以上の高所作業車",
      "運転の業務",
    ]);
  }
  if (
    /銘板・仕様上の作業床最高高さが2m以上10m未満の高所作業車運転/.test(text)
  ) {
    return evidenceHasAll(evidence, [
      "作業床の高さ",
      "2メートル以上",
      "10メートル未満",
      "高所作業車",
      "特別の教育を行",
    ]);
  }
  if (/作業床の高さ10m以上.*高所作業車.*技能講習/.test(text)) {
    return evidenceHasAll(evidence, [
      "作業床の高さが10メートル以上",
      "高所作業車",
      "技能講習を修了した者",
    ]);
  }
  if (/作業床の高さ10m未満は特別教育、10m以上は/.test(text)) {
    return evidenceHasAll(evidence, [
      "10メートル未満の高所作業車",
      "作業床の高さが10メートル以上",
      "高所作業車",
      "特別の教育を行",
      "技能講習を修了した者",
    ]);
  }
  if (/銘板・仕様上の作業床最高高さが2m以上で、10m未満は特別教育/.test(text)) {
    return evidenceHasAll(evidence, [
      "作業床の高さ",
      "2メートル以上",
      "10メートル未満",
      "高所作業車",
      "特別の教育を行",
      "10メートル以上",
      "技能講習を修了した者",
    ]);
  }
  if (/作業床最高高さ10mちょうどは技能講習側/.test(text)) {
    return evidenceHasAll(evidence, [
      "作業床の高さ",
      "10メートル以上",
      "高所作業車",
      "技能講習を修了した者",
    ]);
  }
  if (
    /判定は当日の作業高さではなく、作業床を最大まで上げたときの高さ/.test(text)
  ) {
    return evidenceHasAll(evidence, [
      "作業床を最も高く上昇させた場合",
      "2メートル以上",
    ]);
  }
  if (
    /熱中症のおそれがある作業では、(?:報告体制の整備|症状の自覚や疑いを報告させる体制)/.test(
      text,
    )
  ) {
    return (
      evidenceHasAll(evidence, [
        "熱中症を生ずるおそれのある作業",
        "報告をさせる体制を整備",
        ...(text.includes("作業場ごとに作業からの離脱")
          ? [
              "作業場ごとに",
              "作業からの離脱",
              "身体の冷却",
              "必要に応じて医師の診察又は処置",
              "必要な措置の内容及びその実施に関する手順を定め",
            ]
          : []),
      ]) &&
      evidenceHasAny(evidence, [
        "当該体制を周知",
        "作業従事者に周知させなければならない",
      ])
    );
  }
  if (
    /^加えて、作業場ごとに作業からの離脱、身体の冷却、必要に応じた受診等の措置内容と実施手順をあらかじめ定め、周知/.test(
      text,
    )
  ) {
    return (
      evidenceHasAll(evidence, [
        "作業場ごとに",
        "作業からの離脱",
        "身体の冷却",
        "必要に応じて医師の診察又は処置",
        "必要な措置の内容及びその実施に関する手順を定め",
      ]) &&
      evidenceHasAny(evidence, [
        "当該手順を周知",
        "当該措置の内容及びその実施に関する手順を周知させなければならない",
        "作業従事者に周知させなければならない",
      ])
    );
  }
  if (/対象となる作業環境と作業時間/.test(text)) {
    return evidenceHasAll(evidence, ["暑熱な場所", "連続して行われる作業"]);
  }
  if (
    /対象は、暑熱な場所で連続して行われる作業等、熱中症を生ずるおそれのある作業/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "暑熱な場所において連続して行われる作業等",
      "熱中症を生ずるおそれのある作業",
    ]);
  }
  if (/解体・改修前の事前調査は必要で、原則、必要な知識を有する者/.test(text)) {
    return evidenceHasAll(evidence, [
      "解体又は改修",
      "事前調査",
      "必要な知識を有する者",
      "厚生労働大臣が定めるものに行わせなければならない",
    ]);
  }
  if (/対象は建築物、工作物又は鋼製の船舶の解体・改修/.test(text)) {
    return evidenceHasAll(evidence, [
      "建築物工作物又は船舶鋼製の船舶に限る",
      "解体又は改修",
      "前項各号に規定する場合を除き",
    ]);
  }
  if (/船舶では、石綿則3条の事前調査対象は鋼製の船舶に限られます/.test(text)) {
    return evidenceHasAll(evidence, [
      "船舶鋼製の船舶に限る",
      "解体又は改修",
      "船舶石綿含有資材調査者",
      "同等以上の知識を有すると認められる者",
    ]);
  }
  if (
    /建築物の解体・改修前の事前調査は、原則として一般建築物石綿含有建材調査者/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "解体又は改修",
      "一般建築物石綿含有建材調査者",
      "特定建築物石綿含有建材調査者",
      "同等以上の能力を有すると認められる者",
    ]);
  }
  if (/一戸建て住宅と共同住宅の住戸内部は、これらに加えて/.test(text)) {
    return evidenceHasAll(evidence, [
      "一戸建ての住宅及び共同住宅の住戸の内部",
      "一戸建て等石綿含有建材調査者",
    ]);
  }
  if (/工作物の区分により、工作物石綿事前調査者/.test(text)) {
    return evidenceHasAll(evidence, [
      "工作物石綿事前調査者",
      "一般建築物石綿含有建材調査者",
      "特定建築物石綿含有建材調査者",
    ]);
  }
  if (
    /対象工作物と除去する材料の区分で、告示上の調査者が変わります/.test(text)
  ) {
    return evidenceHasAll(evidence, ["特定工作物告示", "材料除去等の作業"]);
  }
  if (/石綿の事前調査を行える人は対象で変わります/.test(text)) {
    return evidenceHasAll(evidence, [
      "建築物石綿含有建材調査者",
      "船舶石綿含有資材調査者",
      "工作物石綿事前調査者",
    ]);
  }
  if (/石綿則3条の対象は、建築物、工作物または鋼製の船舶/.test(text)) {
    return evidenceHasAll(evidence, [
      "建築物工作物又は船舶鋼製の船舶に限る",
      "解体又は改修",
    ]);
  }
  if (
    /建築物のうち一戸建て住宅等では、一戸建て等石綿含有建材調査者/.test(text)
  ) {
    return evidenceHasAll(evidence, ["一戸建て等石綿含有建材調査者"]);
  }
  if (
    /同条3項各号の方法による場合は、同条4項の調査者要件から除かれます/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, ["前項各号に規定する場合を除き"]);
  }
  if (/屋内作業場等で第一種または第二種の有機溶剤業務/.test(text)) {
    return evidenceHasAll(evidence, [
      "屋内作業場等",
      "第1種有機溶剤等又は第2種有機溶剤等",
      "発散源を密閉する設備",
      "局所排気装置",
      "プッシュプル型換気装置",
    ]);
  }
  if (
    /^有機則1条は、有機溶剤を重量の5%を超えて含む混合物を「有機溶剤含有物」としています/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, ["重量の5パーセントを超えて含有"]);
  }
  if (
    /^第一種・第二種有機溶剤等を屋内作業場等で法定の有機溶剤業務に使う場合は、原則として発散源の密閉設備、局所排気装置またはプッシュプル型換気装置が必要/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "屋内作業場等",
      "第1種有機溶剤等又は第2種有機溶剤等",
      "発散源を密閉する設備",
      "局所排気装置",
      "プッシュプル型換気装置",
    ]);
  }
  if (/有機則29条2項により、同条1項の対象業務に常時従事/.test(text)) {
    return evidenceHasAll(evidence, [
      "前項の業務",
      "常時従事する労働者",
      "雇入れの際",
      "配置替えの際",
      "6月以内ごとに1回",
      "医師による健康診断",
    ]);
  }
  if (/有機則29条1項の健康診断対象業務は、屋内作業場等/.test(text)) {
    return evidenceHasAll(evidence, [
      "屋内作業場等",
      "有機溶剤業務",
      "第3条第1項",
      "第3種有機溶剤等",
      "タンク等の内部",
    ]);
  }
  if (
    /まずSDSで成分・含有率と作業内容を確認.*第一種・第二種有機溶剤等/.test(text)
  ) {
    return evidenceHasAll(evidence, [
      "第1種有機溶剤等又は第2種有機溶剤等",
      "屋内作業場等",
      "発散源を密閉する設備",
      "局所排気装置",
      "プッシュプル型換気装置",
    ]);
  }
  if (/混合物は、原則として有機溶剤を重量の5%を超えて含むか/.test(text)) {
    return evidenceHasAll(evidence, ["重量の5パーセントを超えて含有"]);
  }
  if (
    /^SDSの成分・含有率欄と作業内容を確認し、有機溶剤を重量の5%を超えて含む混合物かを照合します/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, ["重量の5パーセントを超えて含有"]);
  }
  if (/第三種有機溶剤等は扱いが異なり、タンク等の内部では全体換気/.test(text)) {
    return evidenceHasAll(evidence, [
      "第3種有機溶剤等",
      "タンク等の内部",
      "全体換気装置",
    ]);
  }
  if (/臨時作業または短時間作業には設備の適用除外・特例/.test(text)) {
    return evidenceHasAll(evidence, ["臨時に有機溶剤業務", "短時間"]);
  }
  if (
    /第三種有機溶剤等は、タンク等の内部で使う場合、原則として密閉設備/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "タンク等の内部",
      "第3種有機溶剤等",
      "発散源を密閉する設備",
      "局所排気装置",
      "プッシュプル型換気装置",
      "全体換気装置",
      "吹付け",
    ]);
  }
  if (
    /第三種有機溶剤等について、有機則6条の設備義務はタンク等の内部/.test(text)
  ) {
    return evidenceHasAll(evidence, ["タンク等の内部", "第3種有機溶剤等"]);
  }
  if (/SDSで第三種への該当と、実際の作業方法を確認/.test(text)) {
    return evidenceHasAll(evidence, ["第3種有機溶剤"]);
  }
  if (
    /第6条の設備義務は、第三種有機溶剤等をタンク等の内部で使う場合/.test(text)
  ) {
    return evidenceHasAll(evidence, ["タンク等の内部", "第3種有機溶剤等"]);
  }
  if (/まずSDSで第三種への該当と作業方法を確認/.test(text)) {
    return evidenceHasAll(evidence, ["第3種有機溶剤"]);
  }
  if (/第一種・第二種有機溶剤等の臨時作業/.test(text)) {
    return evidenceHasAll(evidence, [
      "臨時に有機溶剤業務",
      "タンク等の内部以外",
      "第5条の規定は適用しない",
      "全体換気装置",
    ]);
  }
  if (/第一種・第二種有機溶剤等の短時間作業/.test(text)) {
    return evidenceHasAll(evidence, [
      "短時間",
      "タンク等の内部以外",
      "全体換気装置",
      "送気マスク",
      "第5条の規定にかかわらず",
    ]);
  }
  if (
    /第三種有機溶剤等の臨時作業は、タンク等の内部か、吹付け作業か/.test(text)
  ) {
    return evidenceHasAll(evidence, [
      "タンク等の内部",
      "吹付けによる第3種有機溶剤等",
      "全体換気装置",
      "第6条第2項",
    ]);
  }
  if (/第三種有機溶剤等の短時間作業では/.test(text)) {
    return evidenceHasAll(evidence, [
      "タンク等の内部",
      "短時間",
      "送気マスク",
      "第6条の規定にかかわらず",
    ]);
  }
  if (/作業が法令上の有機溶剤業務に当たるか/.test(text)) {
    return evidenceHasAll(evidence, ["有機溶剤業務"]);
  }
  if (/酸素欠乏危険作業では、作業を常時監視/.test(text)) {
    return evidenceHasAll(evidence, [
      "酸素欠乏危険作業",
      "常時作業の状況を監視",
      "直ちにその旨を酸素欠乏危険作業主任者及びその他の関係者に通報",
      "通報する者を置く等",
    ]);
  }
  if (/酸欠則12条1項の特別教育5科目/.test(text)) {
    return (
      claimHasAll(text, [
        "酸素欠乏の発生の原因",
        "酸素欠乏症の症状",
        "空気呼吸器等の使用方法",
        "事故時の退避救急そ生方法",
        "その他の酸素欠乏症防止に必要な事項",
      ]) &&
      evidenceHasAll(evidence, [
        "第一種酸素欠乏危険作業",
        "酸素欠乏の発生の原因",
        "酸素欠乏症の症状",
        "空気呼吸器等の使用の方法",
        "事故の場合の退避及び救急そ生の方法",
        "酸素欠乏症の防止に関し必要な事項",
      ])
    );
  }
  if (/第二種にもこの5科目を準用し、第1号の「酸素欠乏」/.test(text)) {
    return (
      claimHasAll(text, [
        "第二種にもこの5科目を準用",
        "第1号の酸素欠乏を酸素欠乏等",
        "第2号第5号の酸素欠乏症を酸素欠乏症等",
      ]) &&
      evidenceHasAll(evidence, [
        "第二種酸素欠乏危険作業に係る業務について準用",
        "第一号中酸素欠乏とあるのは酸素欠乏等",
        "第二号及び第五号中酸素欠乏症とあるのは酸素欠乏症等",
      ])
    );
  }
  if (
    /条文は「者を置く等」と定めており、専任の監視人だけを唯一の方法とはしていません/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "常時作業の状況を監視",
      "通報する者を置く等",
    ]);
  }
  if (/条文上の措置は「異常時に通報する者を置く等」です/.test(text)) {
    return evidenceHasAll(evidence, [
      "異常を早期に把握するために必要な措置",
      "直ちにその旨を酸素欠乏危険作業主任者及びその他の関係者に通報する者を置く等",
    ]);
  }
  if (/作業場所が酸素欠乏危険作業に当たるか/.test(text)) {
    return evidenceHasAll(evidence, ["酸素欠乏危険作業"]);
  }
  if (/^その日の作業開始前に、酸素濃度等を測定します/.test(text)) {
    return evidenceHasAll(evidence, [
      "その日の作業を開始する前に",
      "空気中",
      "酸素",
      "濃度を測定",
    ]);
  }
  if (
    /^原則として酸素18%以上に保つよう換気し、第二種では硫化水素も100万分の10以下に保ちます/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "酸素の濃度を十八パーセント以上",
      "第二種酸素欠乏危険作業",
      "硫化水素の濃度を百万分の十以下",
      "換気しなければならない",
    ]);
  }
  if (
    /酸素欠乏危険作業では、原則として酸素濃度を18%以上に保つよう換気/.test(text)
  ) {
    return evidenceHasAll(evidence, [
      "酸素欠乏危険作業",
      "酸素の濃度を十八パーセント以上",
      "第二種酸素欠乏危険作業",
      "硫化水素の濃度を百万分の十以下",
      "換気しなければならない",
    ]);
  }
  if (/^第二種では、硫化水素濃度も100万分の10以下に保ちます/.test(text)) {
    return evidenceHasAll(evidence, [
      "第二種酸素欠乏危険作業",
      "硫化水素の濃度を百万分の十以下",
      "換気しなければならない",
    ]);
  }
  if (
    /爆発・酸化防止のため換気できない場合.*作業の性質上換気が著しく困難/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "爆発酸化等を防止するため換気することができない場合",
      "作業の性質上換気することが著しく困難な場合",
      "この限りでない",
    ]);
  }
  if (
    /高さ2m以上の作業床の端や開口部で墜落のおそれがある箇所には、囲い・手すり・覆い等/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "高さが二メートル以上の作業床の端開口部等",
      "墜落により労働者に危険を及ぼすおそれのある箇所",
      "囲い手すり覆い等",
      "設けなければならない",
    ]);
  }
  if (
    /囲い等を設けることが著しく困難な場合.*防網や要求性能墜落制止用器具/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "囲い等を設けることが著しく困難",
      "作業の必要上臨時に囲い等を取りはずす",
      "防網を張り",
      "要求性能墜落制止用器具を使用させる等",
      "墜落による労働者の危険を防止するための措置",
    ]);
  }
  if (
    /特別教育は、危険・有害な業務として厚生労働省令で指定された作業/.test(text)
  ) {
    return (
      evidenceHasAll(evidence, [
        "危険又は有害な業務で厚生労働省令で定めるもの",
        "フルハーネス型のものを用いて行う作業",
      ]) &&
      evidenceHasAny(evidence, [
        "特別の教育を行なわなければならない",
        "特別の教育を行わなければならない",
      ]) &&
      evidenceHasAny(evidence, [
        "法第五十九条第三項の厚生労働省令で定める危険又は有害な業務は次のとおり",
        "法第59条第3項の規定による特別の教育を必要とする業務は次のとおり",
      ])
    );
  }
  if (/^作業名が分からない段階では対象号を一つに確定できません/.test(text)) {
    return evidenceHasAny(evidence, [
      "法第五十九条第三項の厚生労働省令で定める危険又は有害な業務は次のとおり",
      "法第59条第3項の規定による特別の教育を必要とする業務は次のとおり",
    ]);
  }
  if (/実際に行う作業が安衛則36条のどの業務に当たるか/.test(text)) {
    return (
      evidenceHasAny(evidence, [
        "法第五十九条第三項の厚生労働省令で定める危険又は有害な業務は次のとおり",
        "法第59条第3項の規定による特別の教育を必要とする業務は次のとおり",
      ]) && evidenceHasAll(evidence, ["フルハーネス型のものを用いて行う作業"])
    );
  }
  if (
    /高さ2m以上でも、一律にフルハーネス型と決まるわけではありません/.test(text)
  ) {
    return evidenceHasAll(evidence, [
      "高さが2メートル以上",
      "作業床を設けることが困難",
      "作業床の端開口部等",
      "囲い等を設けることが著しく困難",
      "要求性能墜落制止用器具を使用させる等",
    ]);
  }
  if (
    /^作業床を設けにくい場所や、作業床の端・開口部で囲い等を設けにくい場合は、要求性能墜落制止用器具を使用させる等の措置が必要/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "作業床を設けることが困難",
      "作業床の端開口部等",
      "囲い等を設けることが著しく困難",
      "要求性能墜落制止用器具を使用させる等",
    ]);
  }
  if (/作業床を設けられる場合は、まず作業床を設けます/.test(text)) {
    return evidenceHasAll(evidence, [
      "高さが2メートル以上",
      "作業床を設けなければならない",
    ]);
  }
  if (/囲い等を一時的に外す場合も、墜落防止措置が必要/.test(text)) {
    return evidenceHasAll(evidence, [
      "作業の必要上臨時に囲い等を取りはずすとき",
      "墜落による労働者の危険を防止するための措置",
    ]);
  }
  if (/使用を命じられた作業者は、器具を使用しなければなりません/.test(text)) {
    return evidenceHasAll(evidence, [
      "使用を命じられたとき",
      "使用しなければならない",
    ]);
  }
  if (/^労働者死傷病報告の期限は休業日数で分かれます/.test(text)) {
    return evidenceHasAll(evidence, [
      "死亡し又は休業したとき",
      "遅滞なく",
      "休業の日数が4日に満たないとき",
      "1月から3月まで",
      "4月から6月まで",
      "7月から9月まで",
      "10月から12月まで",
      "最後の月の翌月末日まで",
    ]);
  }
  if (
    /^死亡または休業4日以上は安衛則97条1項により「遅滞なく」、休業4日未満は同条2項/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "死亡し又は休業したとき",
      "遅滞なく",
      "休業の日数が4日に満たないとき",
      "1月から3月まで",
      "4月から6月まで",
      "7月から9月まで",
      "10月から12月まで",
      "最後の月の翌月末日まで",
    ]);
  }
  if (
    /^報告先は所轄労働基準監督署長で、電子情報処理組織を使用して報告します/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "電子情報処理組織を使用して",
      "所轄労働基準監督署長に報告しなければならない",
    ]);
  }
  if (/^労働者死傷病報告の報告先は、所轄労働基準監督署長です/.test(text)) {
    return evidenceHasAll(evidence, [
      "所轄労働基準監督署長に報告しなければならない",
    ]);
  }
  if (
    /^安衛則97条1項の死亡・休業4日以上の報告も、同条2項の休業4日未満の報告も同じ報告先です/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "死亡し又は休業したとき",
      "休業の日数が4日に満たないとき",
      "所轄労働基準監督署長に報告しなければならない",
    ]);
  }
  if (
    /^死亡または休業4日以上は「遅滞なく」、休業1〜3日は四半期ごと/.test(text)
  ) {
    return evidenceHasAll(evidence, [
      "死亡し又は休業したとき",
      "遅滞なく",
      "休業の日数が4日に満たないとき",
      "1月から3月まで",
      "4月から6月まで",
      "7月から9月まで",
      "10月から12月まで",
      "最後の月の翌月末日まで",
    ]);
  }
  if (/^休業日数が4日に満たない場合/.test(text)) {
    return evidenceHasAll(evidence, [
      "休業の日数が4日に満たないとき",
      "1月から3月まで",
      "4月から6月まで",
      "7月から9月まで",
      "10月から12月まで",
      "最後の月の翌月末日まで",
      "所轄労働基準監督署長に報告しなければならない",
    ]);
  }
  if (
    /^休業4日以上.*この四半期報告ではなく、同条1項の「遅滞なく」の報告/.test(
      text,
    )
  ) {
    return evidenceHasAll(evidence, [
      "死亡し又は休業したとき",
      "遅滞なく",
      "休業の日数が4日に満たないとき",
    ]);
  }
  if (/^休業4日以上.*労働者死傷病報告を行います/.test(text)) {
    return evidenceHasAll(evidence, [
      "死亡し又は休業したとき",
      "遅滞なく",
      "電子情報処理組織を使用して",
      "所轄労働基準監督署長に報告しなければならない",
    ]);
  }
  if (/^同項は「何日以内」という日数ではなく「遅滞なく」/.test(text)) {
    return evidenceHasAll(evidence, ["遅滞なく"]);
  }
  if (/^休業日数が4日に満たない場合は、四半期ごとにまとめ/.test(text)) {
    return evidenceHasAll(evidence, [
      "休業の日数が4日に満たないとき",
      "1月から3月まで",
      "4月から6月まで",
      "7月から9月まで",
      "10月から12月まで",
      "最後の月の翌月末日まで",
    ]);
  }
  if (/^死亡した場合も、同条1項による「遅滞なく」の報告対象/.test(text)) {
    return evidenceHasAll(evidence, ["死亡し又は休業したとき", "遅滞なく"]);
  }
  return null;
}

function hasBalancedParentheses(value: string): boolean {
  let depth = 0;
  for (const character of value) {
    if (character === "（" || character === "(") depth += 1;
    if (character === "）" || character === ")") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

function hasCompletePredicate(value: string): boolean {
  return /(?:なければならない|てはならない|ものとする|とする|すること|目的とする|による|できる|をいう|に限る|の業務|必要である|必要です)$/u.test(
    value.replace(/[。]+$/, "").trim(),
  );
}

function directExtractSupported(text: string, evidence: string): boolean {
  const genericPrefix = "確認できた規定では、";
  const itemMatch = text.match(/の該当箇所は「([\s\S]+)」です。?$/u);
  const rawExcerpt = text.startsWith(genericPrefix)
    ? text.slice(genericPrefix.length).replace(/[。]+$/, "")
    : itemMatch?.[1];
  if (!rawExcerpt) return false;
  const excerpt = normalizeEvidence(rawExcerpt);
  return (
    excerpt.length >= 12 &&
    hasBalancedParentheses(rawExcerpt) &&
    hasCompletePredicate(rawExcerpt) &&
    evidence.includes(excerpt)
  );
}

export function validateServiceFirstLegalClaimSupport(input: {
  answer: string;
  query: string;
  articles: readonly LawArticle[];
  now: Date;
}): LegalClaimSupportResult {
  const claims = parseClaims(input.answer);
  const failures: string[] = [];
  const citedIndexes = new Set<number>();
  // Legal answers are produced by the deterministic, reviewed formatter.  A
  // substring regex alone must never allow an unreviewed premise or suffix to
  // borrow the citation attached to a canonical sentence.  Compare the whole
  // parsed claim sequence (including section, punctuation and marker indexes)
  // with a fresh formatter result before applying the evidence-specific rules
  // below.  Direct extracts and temporal holds are also formatter outputs, so
  // they remain fail-closed without maintaining a second looser allow-list.
  const canonicalClaims = parseClaims(
    buildServiceFirstLegalAnswer({
      query: input.query,
      articles: [...input.articles],
      now: input.now,
    }),
  );
  const claimSignature = (claim: Claim) =>
    JSON.stringify([claim.section, claim.raw, claim.citationIndexes]);
  if (
    claims.length !== canonicalClaims.length ||
    claims.some(
      (claim, index) =>
        claimSignature(claim) !== claimSignature(canonicalClaims[index]!),
    )
  ) {
    failures.push("answer:non-canonical-claim-sequence");
  }
  const statusCandidateIndexes = [
    ...new Set(
      claims
        .filter((claim) => claim.section !== "適用時点")
        .flatMap((claim) => claim.citationIndexes),
    ),
  ].filter((index) => index >= 0 && index < input.articles.length);
  if (statusCandidateIndexes.length === 0 && input.articles.length > 0) {
    statusCandidateIndexes.push(0);
  }
  const statusArticles = statusCandidateIndexes.map(
    (index) => input.articles[index]!,
  );
  const expectedStatusLine = legalApplicationStatusLine(
    input.query,
    statusArticles,
    input.now,
  );
  const expectedStatusEvidenceIndex =
    statusCandidateIndexes[
      legalApplicationStatusEvidenceIndex(
        input.query,
        statusArticles,
        input.now,
      )
    ] ??
    statusCandidateIndexes[0] ??
    0;

  for (const claim of claims) {
    const markersValid =
      claim.citationIndexes.length > 0 &&
      claim.citationIndexes.every(
        (index) => index >= 0 && index < input.articles.length,
      );
    if (!markersValid) {
      failures.push(`${claim.section}:citation-marker`);
      continue;
    }
    claim.citationIndexes.forEach((index) => citedIndexes.add(index));
    const evidence = normalizeEvidence(
      claim.citationIndexes
        .map((index) => input.articles[index]?.text ?? "")
        .join(" "),
    );

    if (claim.section === "適用時点") {
      if (claim.text !== expectedStatusLine) {
        failures.push("適用時点:metadata-mismatch");
      }
      if (
        claim.citationIndexes.length !== 1 ||
        claim.citationIndexes[0] !== expectedStatusEvidenceIndex
      ) {
        failures.push("適用時点:evidence-marker");
      }
      continue;
    }
    if (
      /^対象日の施行内容を確認できないため、回答を保留します/.test(
        claim.text,
      ) ||
      /^対象日版の公式本文または公布済みの改正法令を確認/.test(claim.text)
    ) {
      if (!expectedStatusLine.startsWith("確認不能（")) {
        failures.push(`${claim.section}:future-source-state`);
      }
      continue;
    }
    if (
      /^対象時点では、収録しているこの条文本文はまだ施行前/.test(claim.text)
    ) {
      if (!input.answer.includes("当時未施行")) {
        failures.push("結論:past-effective-date");
      }
      continue;
    }
    if (/^対象日の法令履歴と当時の条文本文を確認/.test(claim.text)) {
      if (!input.answer.includes("当時未施行")) {
        failures.push("条件:past-effective-date");
      }
      continue;
    }
    const effectiveStatus = input.articles[0]
      ? legalEffectiveStatusConclusion(
          input.query,
          input.articles[0],
          input.now,
        )
      : null;
    if (effectiveStatus && claim.section === "結論") {
      if (claim.text !== effectiveStatus) {
        failures.push("結論:effective-date-metadata");
      }
      continue;
    }
    if (
      /^条文は確認できましたが、この条件だけでは該当箇所を短文で特定できません/.test(
        claim.text,
      )
    ) {
      // 法的内容を断定しない保留。引用番号の存在と有効性だけを上で確認する。
      continue;
    }
    if (
      /^収録している現行本文だけでは当時の内容を確定できないため、回答を保留します/.test(
        claim.text,
      ) ||
      /^対象日版の公式本文または法令履歴を直接確認してください/.test(claim.text)
    ) {
      // 現行本文を過去時点の本文として扱わないための保留。法的内容は断定しない。
      continue;
    }

    if (hasDangerousUnsupportedContradiction(claim.text)) {
      failures.push(`${claim.section}:dangerous-contradiction`);
      continue;
    }

    const presentationLocator = presentationLocatorSupported({
      claim,
      articles: input.articles,
      query: input.query,
    });
    const inlineReviewedLocator = inlineReviewedLocatorSupported({
      claim,
      articles: input.articles,
    });
    const known = knownClaimSupported(claim.text, evidence);
    if (
      presentationLocator === false ||
      inlineReviewedLocator === false ||
      known === false
    ) {
      failures.push(`${claim.section}:reviewed-template-evidence`);
    } else if (
      presentationLocator === null &&
      inlineReviewedLocator === null &&
      known === null &&
      !directExtractSupported(claim.text, evidence)
    ) {
      failures.push(`${claim.section}:unregistered-claim`);
    }
  }

  const markersValid = !failures.some((failure) =>
    failure.endsWith(":citation-marker"),
  );
  return {
    supported: claims.length >= 2 && failures.length === 0,
    markersValid,
    citedIndexes: [...citedIndexes].sort((left, right) => left - right),
    claimCount: claims.length,
    failures,
  };
}
