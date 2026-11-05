import { normalizeKanjiNumbers } from "@/lib/article-number-normalize";
import { LAW_ALIAS_GROUPS } from "@/lib/law-name-registry";
import { supplementLawScope } from "./search";
import type { SupplementDataset, SupplementDocument, XmlNode } from "./types";

const ACT = "347AC0000000057", ORDER = "347CO0000000318", RULES = "347M50002000032";
const CRANE = "347M50002000034", OXYGEN = "347M50002000042";
const normalize = (text: string) => normalizeKanjiNumbers(text.normalize("NFKC")).replace(/\s/g, "");
type Ref = { lawId: string; article?: string; appendix?: string; paragraph?: string; item?: string };
export type RepresentativeResult = { documents: SupplementDocument[]; lead: string; explanation: string[]; question: string };
const ref = (lawId: string, article: number, paragraph?: number, item?: number): Ref => ({ lawId, article: `第${article}条`, paragraph: paragraph?.toString(), item: item?.toString() });

function topic(query: string) {
  const q = normalize(query);
  const sling = /玉掛/.test(q) && /資格|教育|講習|トン|[0-9]t|荷重|吊荷|つり荷|何t|61条|221条|222条/.test(q);
  const oxygen = /酸欠|酸素欠乏/.test(q) && /主任者|教育|資格|講習/.test(q);
  const crane = /クレーン/.test(q) && /91条|使用再開検査/.test(q);
  return { sling, oxygen, crane };
}

export function representativeIntent(query: string): boolean {
  const t = topic(query);
  if (t.sling || t.oxygen || t.crane) return true;
  const q = normalize(query);
  const mentions = ["安衛法", "安衛令", "安衛則", "クレーン則", "酸欠則"].flatMap(short =>
    (LAW_ALIAS_GROUPS.find(group => group.includes(short)) ?? [short]).flatMap(name => {
      const token = normalize(name), found: { short: string; start: number; end: number }[] = [];
      let start = q.indexOf(token);
      while (start >= 0) { found.push({ short, start, end: start + token.length }); start = q.indexOf(token, start + token.length); }
      return found;
    }));
  const named = mentions.filter(m => !mentions.some(other => other.start <= m.start && other.end >= m.end && other.end - other.start > m.end - m.start));
  return new Set(named.map(m => m.short)).size >= 2 && /条|別表/.test(q);
}

function text(node: XmlNode): string {
  return (node.tag === "Rt" ? "" : (node.text ?? "") + node.children.map(text).join(" ")) + (node.tail ?? "");
}
function child(parent: XmlNode, path: string, tag: string, number: string) {
  const candidates = parent.children.filter(node => node.tag === tag);
  const index = candidates.findIndex(node => tag === "Item"
    ? normalize(text(node.children.find(n => n.tag === "ItemTitle") ?? { ...node, text: "", children: [] })).replace(/^第|号$/g, "") === number
    : node.attributes.Num === number);
  if (index < 0) throw new Error("requested legal locator missing");
  return { node: candidates[index]!, path: `${path}/${tag}[${index + 1}]` };
}

/** Retain the original document ID for full-text viewing; the citation path identifies the exact clause. */
export function resolveRepresentativeRef(dataset: SupplementDataset, wanted: Ref): SupplementDocument {
  const found = dataset.documents.filter(document => document.lawId === wanted.lawId &&
    (wanted.appendix ? document.kind === "appendix" && normalize(document.label).match(/^別表第?([0-9]+(?:の[0-9]+)*)/)?.[1] === wanted.appendix
      : document.kind === "main" && document.articleNums.includes(wanted.article!)));
  if (found.length !== 1) throw new Error("required representative evidence missing or ambiguous");
  const document = found[0]!;
  let selected = { node: document.node, path: document.path };
  let label = document.label;
  if (wanted.paragraph || (wanted.item && document.kind === "main")) {
    const paragraph = wanted.paragraph ?? "1";
    selected = child(selected.node, selected.path, "Paragraph", paragraph);
    label += ` 第${paragraph}項`;
  }
  let context = "";
  if (wanted.item) {
    context = selected.node.children.filter(node => node.tag === "ParagraphSentence").map(text).join(" ");
    selected = child(selected.node, selected.path, "Item", wanted.item);
    const [number, ...branches] = wanted.item.split("の");
    label += ` 第${number}号${branches.map(branch => `の${branch}`).join("")}`;
  }
  return { ...document, path: selected.path, label, node: selected.node,
    text: `${context} ${text(selected.node)}`.trim() };
}

/** Number scope ends at the next law mention. Unpaired law names never inherit another law's number. */
function explicitRefs(dataset: SupplementDataset, query: string, allowUnpaired: boolean): Ref[] {
  query = query.replace(/\r?\n/g, "。");
  const q = normalize(query);
  const scope = supplementLawScope(dataset, query);
  const mentions = [...new Map(scope.mentions.map(m => [`${m.start}:${m.end}`, m])).values()].sort((a, b) => a.start - b.start);
  const references: Ref[] = [];
  const locatorToken = /第?[0-9]+(?:条|項|号)|別表第?[0-9]+|同条|同項|同号/;
  if (locatorToken.test(q.slice(0, mentions[0]?.start ?? q.length))) throw new Error("unpaired leading locator");
  for (let index = 0; index < mentions.length; index++) {
    const mention = mentions[index]!;
    const section = q.slice(mention.end, mentions[index + 1]?.start);
    if (/附則|付則|様式/.test(section)) throw new Error("supplement scope requires amendment identity");
    const found = [...section.matchAll(/別表第?([0-9]+(?:の[0-9]+)*)(?:第?([0-9]+)号((?:の[0-9]+)*))?|第?([0-9]+)条((?:の[0-9]+)*)(?:第?([0-9]+)項)?(?:第?([0-9]+)号((?:の[0-9]+)*))?/g)];
    if (!allowUnpaired && scope.laws.length > 1 && found.length === 0) throw new Error("unpaired law name");
    let previousEnd = 0;
    for (const match of found) {
      const connector = section.slice(previousEnd, match.index);
      if (!(previousEnd === 0 ? /^(?:の)?$/ : /^(?:、|,|，|・|と|及び|並びに|又は|若しくは)*$/).test(connector)) {
        throw new Error("law scope does not cross a sentence or an unspecified locator");
      }
      references.push({ lawId: mention.law.lawId, appendix: match[1],
        article: match[4] ? `第${match[4]}条${match[5]}` : undefined, paragraph: match[6],
        item: match[2] ? match[2] + match[3] : match[7] ? match[7] + match[8] : undefined });
      previousEnd = match.index! + match[0].length;
    }
    if (locatorToken.test(section.slice(previousEnd)) || /(?:号|項)[イロハニホヘト]/.test(section)) throw new Error("unconsumed legal locator");
  }
  if (references.length > 12) throw new Error("too many explicit provisions");
  return references;
}

export function validateRepresentativeReferenceScope(dataset: SupplementDataset, originalQuery: string): void {
  explicitRefs(dataset, originalQuery, true);
}

export function representativeResult(dataset: SupplementDataset, query: string, category = "all"): RepresentativeResult | null {
  if (!representativeIntent(query)) return null;
  const scope = supplementLawScope(dataset, query);
  if (scope.unknownLaw) throw new Error("law outside the five-law MVP");
  const t = topic(query);
  if ([t.sling, t.oxygen, t.crane].filter(Boolean).length > 1) throw new Error("separate representative cases required");
  const explicit = explicitRefs(dataset, query, t.sling || t.oxygen || t.crane);
  let references: Ref[] = [];
  let lead = "指定された法令と条項・別表を対応させて確認できます。個別の適用判断には作業条件の確認が必要です。";
  let explanation: string[] = [];
  let question = "どの作業・設備に適用する確認ですか？ 作業日も教えてください。";
  if (t.sling) {
    references = [ref(ACT, 61), ref(ORDER, 20, 1, 16), ref(CRANE, 221), ref(ACT, 59, 3),
      ref(RULES, 36, 1, 19), ref(CRANE, 222), ref(CRANE, 2, 1, 1), ref(ORDER, 10, 1, 1), ref(CRANE, 1, 1, 4), ref(RULES, 37), ref(RULES, 38)];
    lead = "玉掛けは、機械のつり上げ荷重が1トン以上の就業制限と、1トン未満の特別教育を分けて確認します。実際につる荷物の重さだけでは区分を決められません。";
    explanation = [
      "安衛法61条1項→安衛令20条16号→クレーン則221条：つり上げ荷重1トン以上のクレーン・移動式クレーン・デリックの玉掛けは就業制限の対象で、玉掛け技能講習修了者等を定めています。221条には他の資格経路もあり、技能講習だけが唯一の経路ではありません。",
      "安衛法59条3項→安衛則36条19号：つり上げ荷重1トン未満の玉掛けを特別教育の対象としています。クレーン則222条は科目等を定め、安衛則37条には知識・技能に応じた科目省略、38条には記録保存の定めがあります。",
      "クレーン則2条1号は0.5トン未満を同規則の適用から除きますが、安衛則36条19号には0.5トンの下限がありません。0.5トン未満だから特別教育不要、とは判断できません。0.5トンちょうどはこの除外に入らず、1トンちょうどは就業制限側です。",
      "安衛令10条1号のつり上げ荷重は構造・材料に応じて負荷できる最大荷重です。定格荷重や実際の吊荷重量との取り違えを避けます。揚貨装置はクレーン則221条の対象から明示的に除かれるため、このMVPでは資格の結論を出しません。",
    ];
    question = "機械の種類、銘板等のつり上げ荷重、玉掛けか運転か、保有資格・教育歴、作業日を教えてください。";
  } else if (t.oxygen) {
    references = [ref(ACT, 14), ref(ORDER, 6, 1, 21), { lawId: ORDER, appendix: "6" }, ref(OXYGEN, 2), ref(OXYGEN, 11),
      ref(ACT, 59, 3), ref(RULES, 36, 1, 26), ref(OXYGEN, 12), ref(RULES, 37), ref(RULES, 38)];
    lead = "酸欠の作業主任者の選任資格と、作業者への特別教育は別の制度です。場所が令別表6に該当するか、第一種・第二種のどちらかを確認して根拠をつなぎます。";
    explanation = [
      "安衛法14条→安衛令6条21号・別表6→酸欠則2条・11条：酸素欠乏危険場所での作業について作業主任者を選任します。第一種は酸素欠乏危険作業主任者技能講習又は酸素欠乏・硫化水素危険作業主任者技能講習の修了者、第二種は後者の修了者から選任します。",
      "酸欠則2条8号の第二種は令別表6の3号の3・9号・12号の場所に対応します。12号は大臣指定の条件があり、この5法令だけで指定場所の全範囲は確定できません。酸素濃度の測定値だけで第一種・第二種や場所への適用を決めません。",
      "安衛法59条3項→安衛則36条26号→酸欠則12条：作業者への特別教育を定めます。主任者技能講習と作業者特別教育を同じ資格として扱いません。科目省略は安衛則37条の知識・技能条件、記録は38条を確認します。",
      "酸欠則11条3項は第二種に主任者の職務を準用し、酸素の測定を酸素及び硫化水素の測定へ読み替えます。12条2項も第二種の特別教育に対応した読み替えを定めます。",
    ];
    question = "場所の構造・保管物・使用履歴、主任者か作業者か、修了講習・教育歴、作業日を教えてください。";
  } else if (t.crane) {
    references = [ref(CRANE, 91), ref(CRANE, 56)];
    lead = "クレーン則91条は、移動式クレーンの使用再開検査に56条を準用し、56条2項の権限主体を読み替えます。";
    explanation = ["クレーン則91条→56条：検査しやすい位置への移動、試験用の荷・玉掛用具の準備、検査への立会い等を確認します。56条2項の『所轄都道府県労働局長』は『所轄労働基準監督署長』に読み替えます。56条の原文全体を無修正で転記して適用する説明にはしません。",
      "この回答は91条の準用内容の説明です。使用再開検査そのものが必要かどうかは、機械の種類・検査証と使用休止等の条件を別途確認します。"];
    question = "移動式クレーンの使用再開検査についての確認ですか？ 機械の種類・検査証と休止状況・作業日を教えてください。";
  }
  references.push(...explicit);
  if (references.length === 0) throw new Error("no paired provision");
  // A representative case deliberately crosses laws. Do not silently drop its context due to a UI filter.
  if (category !== "all") throw new Error("cross-law case requires all-law category");
  const documents = [...new Map(references.map(wanted => {
    const document = resolveRepresentativeRef(dataset, wanted);
    return [document.path + ":" + document.lawId, document] as const;
  })).values()];
  if (scope.laws.some(law => !documents.some(document => document.lawId === law.lawId))) throw new Error("unresolved named law");
  // Existing JSON/no-JS/React presentation displays three condition groups.
  // Keep every verified qualification/exception in those visible groups.
  if (explanation.length > 3) explanation = [...explanation.slice(0, 2), explanation.slice(2).join(" ")];
  return { documents, lead, explanation, question };
}
