import { normalizeKanjiNumbers } from "@/lib/article-number-normalize";
import { LAW_ALIAS_GROUPS } from "@/lib/law-name-registry";
import type { SupplementDataset, SupplementDocument } from "./types";

const normalized = (text: string) => normalizeKanjiNumbers(text.normalize("NFKC")).replace(/\s/g, "");
const oxygenPlace = (query: string) => /酸欠|酸素欠乏/.test(query) && /場所|対象|範囲|タンク|ピット|井戸/.test(query);
const formNumber = (text: string) => {
  const match = text.match(/様式第?([0-9]+)(?:号)?((?:の[0-9]+)*)/);
  return match ? match[1] + match[2] : undefined;
};

export function withoutAmendmentIdentityDates(dataset: SupplementDataset, query: string): string {
  let result = normalized(query);
  for (const document of dataset.documents) {
    const identity = document.node.attributes.AmendLawNum;
    if (identity) result = result.replaceAll(normalized(identity), "");
  }
  return result;
}

export function supplementQueryIntent(query: string): boolean {
  return /附則|付則|別表|様式|経過措置|準用|読み替/.test(query) || oxygenPlace(query) ||
    /クレーン(?:等安全規則|則)?第?91条/.test(normalized(query));
}

function grams(query: string): string[] {
  return [...new Set((query.match(/[一-龯ぁ-んァ-ヴー]{2,}/g) ?? [])
    .flatMap((word) => Array.from({ length: word.length - 1 }, (_, i) => word.slice(i, i + 2))))];
}

export function searchSupplements(dataset: SupplementDataset, query: string, category = "all") {
  const q = normalized(query);
  const namesFor = (law: SupplementDataset["laws"][number]) => [...new Set([
    law.title, law.lawShort, ...(LAW_ALIAS_GROUPS.find(group => group.includes(law.lawShort)) ?? []),
    ...(law.lawShort === "クレーン則" ? ["クレーン"] : []),
  ])];
  const mentions = dataset.laws.flatMap(law => namesFor(law).flatMap(name => {
    const token = normalized(name);
    return [...q.matchAll(new RegExp(token, "g"))].map(match => ({ law, start: match.index!, end: match.index! + token.length }));
  })).filter((mention, index, all) => !all.some((other, otherIndex) => index !== otherIndex &&
    other.start <= mention.start && other.end >= mention.end && other.end - other.start > mention.end - mention.start));
  const laws = [...new Map(mentions.map(mention => [mention.law.lawId, mention.law])).values()];
  const selectedIds = new Set(laws.map(law => law.lawId));
  const namedOtherLaw = (withoutAmendmentIdentityDates(dataset, query).replace(/附則|付則|本則|別表|様式|準用|読み替/g, " ").match(/[一-龯ァ-ヴー]+(?:法|則|令)/g) ?? [])
    .some(name => !["附則", "本則", "法令", "規則", "政令", "省令"].includes(name) &&
      !dataset.laws.some(law => namesFor(law).some(alias => normalized(alias) === name)));
  const unknownLaw = namedOtherLaw || LAW_ALIAS_GROUPS.some(group =>
    !dataset.laws.some(law => group.includes(law.lawShort) || group.includes(law.title)) &&
    group.some(name => name.length > 1 && q.includes(normalized(name))));
  if (unknownLaw || (laws.length === 0 && !oxygenPlace(query))) {
    return { documents: [], total: 0, unknownLaw: true, ambiguousScope: false };
  }
  // Multi-law selection requires a separate correspondence question rather than
  // distributing the first number across every named law.
  if (laws.length > 1) return { documents: [], total: 0, unknownLaw, ambiguousScope: true };
  const appendices = [...q.matchAll(/別表第?([0-9]+(?:の[0-9]+)*)/g)].map(match => match[1]!);
  const supplemental = /附則|付則|経過措置/.test(q);
  const form = /様式/.test(q);
  const requestedForm = formNumber(q);
  const amendments = new Set(dataset.documents.flatMap(document => {
    const identity = document.node.attributes.AmendLawNum;
    return identity && q.includes(normalized(identity)) ? [normalized(identity)] : [];
  }));
  const primary = /準用|読み替/.test(q) || /クレーン(?:等安全規則|則)?第?91条/.test(q);
  const articles = [...q.matchAll(/第?[0-9]+条(?:の[0-9]+)*/g)].map(match => match[0].startsWith("第") ? match[0] : `第${match[0]}`);
  const tokens = grams(q.replace(/附則|付則|別表|様式|経過措置|教えて|ください/g, ""));
  const ranked = dataset.documents.flatMap(document => {
    const law = dataset.laws.find(item => item.lawId === document.lawId)!;
    if (unknownLaw || (selectedIds.size > 0 && !selectedIds.has(document.lawId)) ||
      (category !== "all" && law.lawShort !== category)) return [];
    if (supplemental ? document.kind !== "supplementary" : primary ? document.kind !== "main" : document.kind !== "appendix") return [];
    if (form && !document.label.includes("様式")) return [];
    if (requestedForm && formNumber(normalized(document.label)) !== requestedForm) return [];
    if (supplemental && amendments.size > 0 && !amendments.has(normalized(document.node.attributes.AmendLawNum ?? ""))) return [];
    if (appendices.length > 0 && !appendices.includes(normalized(document.label).match(/^別表第?([0-9]+(?:の[0-9]+)*)/)?.[1] ?? "")) return [];
    if ((primary || supplemental) && articles.length > 0 && !document.articleNums.some(article => articles.includes(article))) return [];
    const text = normalized(document.text);
    let score = tokens.reduce((sum, token) => sum + (text.includes(token) ? 1 : 0), 0);
    if (oxygenPlace(query) && document.lawId === "347CO0000000318" && normalized(document.label).startsWith("別表第6酸素")) score += 100;
    if (appendices.length > 0 || (primary && articles.length > 0) || supplemental || form) score += 20;
    return score > 0 ? [{ document, score }] : [];
  }).sort((a, b) => b.score - a.score || a.document.path.localeCompare(b.document.path));
  return { documents: ranked.slice(0, 4).map(item => item.document), total: ranked.length, unknownLaw, ambiguousScope: false };
}

/** Explicit, same-snapshot context. These are evidence links, not an applicability engine. */
export function supplementContext(dataset: SupplementDataset, documents: SupplementDocument[]): SupplementDocument[] {
  const wanted: [string, string][] = [];
  for (const document of documents) {
    if (document.lawId === "347CO0000000318" && normalized(document.label).startsWith("別表第6酸素")) {
      wanted.push(["347AC0000000057", "第14条"], ["347CO0000000318", "第6条"],
        ["347M50002000042", "第2条"], ["347M50002000042", "第11条"]);
    }
    if (document.lawId === "347M50002000034" && document.articleNums.includes("第91条")) {
      wanted.push(["347M50002000034", "第56条"]);
    }
  }
  const ids = new Set(documents.map(document => document.id));
  return [...documents, ...wanted.flatMap(([law, number]) => {
    const found = dataset.documents.find(document => document.lawId === law && document.kind === "main" && document.articleNums.includes(number));
    if (!found) throw new Error("required same-snapshot context missing");
    if (ids.has(found.id)) return [];
    ids.add(found.id);
    return [found];
  })];
}
