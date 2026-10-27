import { existsSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chatbot/route";
import { POST as STREAM } from "@/app/api/chatbot/stream/route";
import { POST as NO_SCRIPT } from "@/app/api/chatbot/no-script/route";
import { GET as EVIDENCE } from "@/app/api/chatbot/local-evidence/route";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import { finalizeChatbotResponse, type ChatbotResponse } from "@/lib/chatbot-contract";
import { decodeSupplementBytes, loadLocalSupplements, localSupplementFile, localSupplementsEnabled } from "./loader";
import { searchSupplements, supplementContext, supplementQueryIntent } from "./search";
import { supplementResponse } from "./response";
import { renderXmlNode } from "./render";
import { normalizeSourceProvenance } from "@/lib/source-provenance";
import { representativeResult, resolveRepresentativeRef } from "./representative";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("SAFE_AI_LOCAL_SUPPLEMENTS", "true");
  vi.stubEnv("VERCEL", ""); vi.stubEnv("VERCEL_ENV", "");
  __resetRateLimitForTests(); __resetChatbotCacheForTests();
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network forbidden in this local experiment"));
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

async function ask(message: string, stream = false, history?: { role: "user" | "assistant"; content: string }[]) {
  const response = await (stream ? STREAM : POST)(new Request("http://localhost/api/chatbot", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, lawCategory: "all", privacyConfirmed: true, history }),
  }));
  expect(response.status).toBe(200);
  const text = await response.text();
  const json = stream ? [...text.matchAll(/event: meta\ndata: ([^\n]+)\n\n/g)].at(-1)?.[1] : text;
  expect(json).toBeDefined();
  expect(globalThis.fetch).not.toHaveBeenCalled();
  return JSON.parse(json!) as ChatbotResponse;
}

describe("local supplement guard and rendering", () => {
  it("cannot activate on production or Vercel or without the explicit flag", () => {
    expect(localSupplementsEnabled({ NODE_ENV: "production", SAFE_AI_LOCAL_SUPPLEMENTS: "true" })).toBe(false);
    expect(localSupplementsEnabled({ NODE_ENV: "test", VERCEL_ENV: "preview", SAFE_AI_LOCAL_SUPPLEMENTS: "true" })).toBe(false);
    expect(localSupplementsEnabled({ NODE_ENV: "development" })).toBe(false);
  });
  it("rejects changed dataset bytes", () => {
    expect(() => decodeSupplementBytes(Buffer.from('{"schema":"changed"}'))).toThrow(/hash/);
  });
  it("leaves ordinary query intent alone", () => {
    for (const query of ["足場の手すり基準", "熱中症対策は", "電気工事士は必要", "玉掛けは何トンから", "酸欠作業に必要な資格は"]) expect(supplementQueryIntent(query)).toBe(false);
  });
  it("escapes XML text and never loads referenced figures", () => {
    const html = renderXmlNode({ tag: "Fig", attributes: { src: "https://example.invalid/image" }, text: null, tail: "<script>alert(1)</script>", children: [] });
    expect(html).toContain("未取得"); expect(html).not.toContain("<script>"); expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });
  it("preserves table row and column spans without copying event attributes", () => {
    const html = renderXmlNode({ tag: "TableColumn", attributes: { rowspan: "2", colspan: "3", onclick: "evil()" }, text: "条件", tail: null, children: [] });
    expect(html).toContain('<td rowspan="2" colspan="3">条件</td>'); expect(html).not.toContain("onclick");
  });
  it("retains mathematical superscripts and subscripts", () => {
    const html = renderXmlNode({ tag: "ArithFormula", attributes: {}, text: "π", tail: null, children: [
      { tag: "Sup", attributes: {}, text: "２", tail: "Ｅ／ｆ", children: [] },
      { tag: "Sub", attributes: {}, text: "ｋ", tail: null, children: [] },
    ] });
    expect(html).toBe("<span>π<sup>２</sup>Ｅ／ｆ<sub>ｋ</sub></span>");
  });
});

// Requires the separately verified PC-local experiment, never a production DB.
describe.skipIf(!existsSync(localSupplementFile()))("five-law local route E2E", () => {
  it("loads all five snapshots and retains separate supplementary/appendix kinds", async () => {
    const dataset = await loadLocalSupplements();
    expect(dataset.laws).toHaveLength(5);
    expect(dataset.documents.filter(d => d.kind === "supplementary")).toHaveLength(372);
    expect(dataset.documents.filter(d => d.kind === "appendix")).toHaveLength(119);
  });
  it("retrieves oxygen annex 6 with same-date definitions and statutory context", async () => {
    const response = await ask("2026年10月26日時点の安衛令別表6の酸素欠乏危険場所は？");
    expect(response.sources[0]?.article).toContain("別表第六");
    expect(response.sources[0]?.article).not.toContain("第六の二");
    expect(response.sources[0]?.legalEvidence?.kind).toBe("appendix");
    expect(response.sources.some(s => s.lawShort === "酸欠則" && s.article === "第二条")).toBe(true);
    expect(response.sources.some(s => s.lawShort === "酸欠則" && s.article === "第十一条")).toBe(true);
    expect(new Set(response.sources.map(s => s.asOf))).toEqual(new Set(["2026-10-26"]));
    expect(response.effectiveDateStatus.status).toBe("unknown");
    expect(response.directAnswer).toContain("確定できません");
    expect(response.clarificationQuestion).toContain("作業場所");
    expect(normalizeSourceProvenance(response.sources[0]?.sourceProvenance)?.fetchedAt).toBeDefined();
  });
  it("never replaces annex 6-2 with annex 6 or article 6", async () => {
    const response = await ask("安衛令別表6の2の有機溶剤を確認したい");
    expect(response.sources).toHaveLength(1);
    expect(response.sources[0]!.article).toContain("別表第六の二");
    expect(response.sources[0]!.legalEvidence?.xmlPath).toContain("AppdxTable");
  });
  it("keeps repeated amended supplements distinct and requests the amendment identity", async () => {
    const response = await ask("安衛法の附則の経過措置は？");
    const ids = response.sources.map(s => s.legalEvidence?.documentId);
    expect(ids.length).toBeGreaterThan(1); expect(new Set(ids).size).toBe(ids.length);
    expect(response.sources.every(s => s.legalEvidence?.kind === "supplementary")).toBe(true);
    expect(response.clarificationQuestion).toContain("改正法令");
    expect(response.scopeWarnings?.join(" ")).toContain("候補");
  });
  it("retains crane 91's replacement language and its referenced article 56", async () => {
    const response = await ask("クレーン則91条の準用と読み替えは？");
    expect(response.sources.some(s => s.article === "第九十一条" && s.text.includes("読み替える"))).toBe(true);
    expect(response.sources.some(s => s.article === "第五十六条")).toBe(true);
    expect(response.effectiveDateStatus.status).toBe("unknown");
  });
  it.each(["2026年3月31日", "2026年4月1日", "2026年10月27日", "2026年2月30日", "令和8年2月30日", "2026.2.30", "2026年10月", "明日", "2026年10月26日から2026年10月27日まで"])("withholds unsupported time %s", async date => {
    const response = await ask(`${date}の安衛令別表6は？`);
    expect(response.sources).toHaveLength(0);
    expect(response.effectiveDateStatus.status).toBe("unknown");
    expect(response.directAnswer).toContain("確定できません");
  });
  it("does not reinterpret today or current law as the fixed snapshot date", async () => {
    for (const query of ["今日の玉掛け資格は？", "現行の安衛令別表6は？", "最新の酸欠作業者教育は？", "2026年10月26日の現在のクレーン則91条は？"]) {
      const response = await ask(query);
      expect(response.sources).toHaveLength(0);
      expect(response.effectiveDateStatus.status).toBe("unknown");
      expect(response.directAnswer).toContain("確定できません");
      expect(response.clarificationQuestion).toContain("年月日");
    }
    const fixedDate = await ask("2026年10月26日の玉掛け資格は？");
    expect(fixedDate.sources.length).toBeGreaterThan(0);
    expect(fixedDate.sources.every(source => source.asOf === "2026-10-26")).toBe(true);
  });
  it.each(["安衛法別表1と安衛令別表6を確認", "労働安全衛生法別表1と労働安全衛生法施行令別表6を確認"])("keeps each appendix paired to its own law: %s", async query => {
    const response = await ask(query);
    expect(response.sources).toHaveLength(2);
    expect(response.sources[0]?.lawShort).toBe("安衛法"); expect(response.sources[0]?.article).toContain("別表第一");
    expect(response.sources[1]?.lawShort).toBe("安衛令"); expect(response.sources[1]?.article).toContain("別表第六");
    expect(response.sources.every(source => source.legalEvidence?.kind === "appendix")).toBe(true);
  });
  it("can identify an amendment without using its promulgation year as the requested work date", async () => {
    const dataset = await loadLocalSupplements();
    const document = dataset.documents.find(d => d.kind === "supplementary" && d.lawId === "347AC0000000057" && d.node.attributes.AmendLawNum)!;
    const response = await ask(`安衛法${document.node.attributes.AmendLawNum}の附則を確認`);
    expect(response.sources.length).toBeGreaterThan(0);
    expect(response.sources.every(s => s.article.includes(document.node.attributes.AmendLawNum!))).toBe(true);
    expect(response.effectiveDateStatus.asOf).toBe("2026-10-26");
  });
  it("does not substitute main text for a nonexistent appendix or an uncovered law", async () => {
    for (const query of ["酸欠則別表99は？", "労基法附則の内容は？", "消防法別表第一は？", "安衛法と消防法の別表1は？"]) {
      const response = await ask(query);
      expect(response.sources).toHaveLength(0); expect(response.directAnswer).toMatch(/特定できません|対象外|保留/);
    }
  });
  it("recognizes a supported alias before retrieving an article", async () => {
    const response = await ask("クレーン安全規則91条の準用は？");
    expect(response.sources.length).toBeGreaterThan(0);
    expect(response.sources.every(s => s.lawShort === "クレーン則")).toBe(true);
  });
  it("fails closed when required same-snapshot context is absent", async () => {
    const dataset = await loadLocalSupplements();
    const primary = searchSupplements(dataset, "安衛令別表6は？").documents;
    expect(() => supplementContext({ ...dataset, documents: dataset.documents.filter(d => d.lawId !== "347M50002000042") }, primary)).toThrow(/context/);
  });
  it("matches JSON and SSE citations, warning and target date", async () => {
    const json = await ask("安衛令別表6は？");
    const sse = await ask("安衛令別表6は？", true);
    expect(sse.sources).toEqual(json.sources); expect(sse.citations).toEqual(json.citations);
    expect(sse.scopeWarnings).toEqual(json.scopeWarnings); expect(sse.effectiveDateStatus).toEqual(json.effectiveDateStatus);
  });
  it("shows missing figures in the no-JS answer and the full evidence viewer", async () => {
    const dataset = await loadLocalSupplements();
    const example = dataset.documents.find(d => d.kind === "appendix" && d.hasFigures)!;
    const law = dataset.laws.find(l => l.lawId === example.lawId)!;
    const query = `${law.lawShort}${example.label}を確認したい`;
    const response = await ask(query);
    expect(response.scopeWarnings?.join(" ")).toContain("画像本体を未取得");
    const html = await (await NO_SCRIPT(new Request("http://localhost/api/chatbot/no-script", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin: "http://localhost", "sec-fetch-site": "same-origin" },
      body: new URLSearchParams({ message: query }),
    }))).text();
    expect(html).toContain("画像本体を未取得");
    const full = await EVIDENCE(new Request(`http://localhost/api/chatbot/local-evidence?documentId=${encodeURIComponent(example.id)}`));
    expect(full.status).toBe(200); expect(full.headers.get("cache-control")).toBe("no-store");
    const original = await full.text();
    expect(original).toContain("画像を取得していない"); expect(original).not.toContain("<img");
    expect(original).toContain(law.revisionId); expect(original).toContain(law.xmlSha256);
  });
  it("escapes identity lookup and disables the evidence viewer in production", async () => {
    expect((await EVIDENCE(new Request("http://localhost/api/chatbot/local-evidence?documentId=../../secret"))).status).toBe(404);
    vi.stubEnv("NODE_ENV", "production");
    expect((await EVIDENCE(new Request("http://localhost/api/chatbot/local-evidence?documentId=anything"))).status).toBe(404);
  });
  it("keeps a main article and its branch article attached to separate no-JS evidence links", async () => {
    const query = "安衛則34条と34条の2の準用を確認";
    const response = await ask(query);
    expect(response.sources.map(source => source.article).sort()).toEqual(["第三十四条", "第三十四条の二"].sort());
    const html = await (await NO_SCRIPT(new Request("http://localhost/api/chatbot/no-script", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin: "http://localhost", "sec-fetch-site": "same-origin" },
      body: new URLSearchParams({ message: query }),
    }))).text();
    const items = html.match(/<li><strong>[\s\S]*?<\/li>/g) ?? [];
    for (const source of response.sources) {
      const href = `/api/chatbot/local-evidence?documentId=${encodeURIComponent(source.legalEvidence!.documentId)}`;
      const matches = items.filter(item => item.includes(href));
      expect(matches).toHaveLength(1);
      expect(matches[0]).toContain(`${source.article}</strong>`);
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it.each(["足場の手すり基準は？", "電気工事士が必要な作業は？", "熱中症対策は？"])("keeps the existing route unchanged for %s", async query => {
    vi.stubEnv("SAFE_AI_LOCAL_SUPPLEMENTS", "false");
    const old = await ask(query);
    __resetChatbotCacheForTests(); __resetRateLimitForTests();
    vi.stubEnv("SAFE_AI_LOCAL_SUPPLEMENTS", "true");
    const revised = await ask(query);
    expect(revised.directAnswer).toBe(old.directAnswer); expect(revised.sources).toEqual(old.sources);
    expect(revised.effectiveDateStatus).toEqual(old.effectiveDateStatus);
  });
  it("the final contract never promotes imported supplements to current", async () => {
    const dataset = await loadLocalSupplements();
    const response = finalizeChatbotResponse(supplementResponse(dataset, "安衛法附則"));
    expect(response.sources.every(s => s.applicationStatus === "unknown")).toBe(true);
    expect(response.effectiveDateStatus.status).toBe("unknown");
  });
  it.each(["玉掛けは何トンから？", "つり上げ荷重0.49tの玉掛け特別教育は？", "つり上げ荷重0.5tの玉掛け資格は？", "つり上げ荷重1tの玉掛け資格は？", "吊荷100kgの玉掛け資格は？"])("explains the actual statutory boundaries for %s", async query => {
    const response = await ask(query);
    expect(new Set(response.sources.map(source => source.lawShort))).toEqual(new Set(["安衛法", "安衛令", "クレーン則", "安衛則"]));
    expect(response.answer).toContain("0.5トン未満だから特別教育不要、とは判断できません");
    expect(response.answer).toContain("1トンちょうどは就業制限側");
    expect(response.directAnswer).toContain("荷物の重さだけでは");
    expect(response.clarificationQuestion).toContain("つり上げ荷重");
    const designated = response.sources.find(source => source.lawShort === "安衛則" && source.article.includes("第19号"));
    expect(designated?.text).toContain("玉掛け"); expect(designated?.text).not.toContain("研削といし");
    expect(designated?.legalEvidence?.xmlPath).toContain("/Item[");
    expect(response.effectiveDateStatus.status).toBe("unknown");
  });
  it("keeps explicit act/order/rule article and item references paired", async () => {
    const response = await ask("安衛法61条、安衛令20条第16号、クレーン則221条と222条を確認");
    expect(response.sources.map(source => `${source.lawShort}:${source.article}`)).toEqual([
      "安衛法:第六十一条", "安衛令:第二十条 第1項 第16号", "クレーン則:第二百二十一条", "クレーン則:第二百二十二条",
    ]);
    expect(response.sources[1]?.text).toContain("玉掛け");
    expect(response.sources[1]?.text).not.toContain("ボイラー");
  });
  it("does not treat the full order name as an independent mention of the Act", async () => {
    const short = await ask("安衛令別表6の酸素欠乏危険場所は？");
    const full = await ask("労働安全衛生法施行令別表6の酸素欠乏危険場所は？");
    expect(full.sources).toEqual(short.sources);
    expect(full.sources.some(source => source.lawShort === "酸欠則")).toBe(true);
  });
  it("can explain a representative case with named laws but without guessed article numbers", async () => {
    const response = await ask("玉掛け資格を安衛法と安衛令とクレーン則で確認したい");
    expect(response.sources.length).toBeGreaterThan(5);
    expect(response.answer).toContain("安衛法61条1項→安衛令20条16号");
  });
  it("separates oxygen supervisor qualifications from worker education and delegated designations", async () => {
    const response = await ask("酸欠作業の主任者資格と作業者の特別教育は？");
    expect(new Set(response.sources.map(source => source.lawShort))).toEqual(new Set(["安衛法", "安衛令", "酸欠則", "安衛則"]));
    expect(response.directAnswer).toContain("別の制度");
    expect(response.answer).toContain("第二種は後者の修了者");
    expect(response.answer).toContain("大臣指定");
    expect(response.answer).toContain("測定値だけ");
    expect(response.sources.find(source => source.article.includes("第26号"))?.text).toContain("酸素欠乏危険場所");
  });
  it("resolves annex legal item titles instead of their non-semantic XML Num", async () => {
    const dataset = await loadLocalSupplements();
    const item = resolveRepresentativeRef(dataset, { lawId: "347CO0000000318", appendix: "6", item: "3の3" });
    expect(item.path).toMatch(/AppdxTable\[6\]\/Item\[5\]$/);
    expect(item.text).toContain("海水"); expect(item.text).not.toContain("雨水");
    const response = await ask("安衛令別表6第3号の3と酸欠則2条第8号を確認");
    expect(response.sources[0]?.legalEvidence?.xmlPath).toBe(item.path);
    expect(response.sources[1]?.article).toContain("第8号");
  });
  it("explains crane 91's replacement and never fabricates paragraph 2 of article 91", async () => {
    const response = await ask("クレーン則91条の準用と読み替えは？");
    expect(response.answer).toContain("所轄都道府県労働局長");
    expect(response.answer).toContain("所轄労働基準監督署長");
    expect(response.answer).not.toContain("91条2項");
    expect(response.clarificationQuestion).toContain("移動式クレーン");
  });
  it.each(["安衛法と安衛令61条を確認", "安衛法61条と安衛令999条を確認", "安衛法61条と消防法20条を確認", "玉掛け資格と酸欠主任者教育を同時に判定", "クレーン則91条2項の読み替えは？", "玉掛け資格は安衛法61条。20条はどの法令？", "玉掛け資格は安衛法61条\n20条はどの法令？", "安衛法61条1項と999項、安衛令20条16号を確認", "安衛法61条1項と2項、安衛令20条16号を確認", "玉掛け61条の資格は？"])("holds incomplete, unpaired or out-of-scope references: %s", async query => {
    const response = await ask(query);
    expect(response.sources).toHaveLength(0);
    expect(response.effectiveDateStatus.status).toBe("unknown");
  });
  it("holds a cross-law representative case when a filter would discard part of the evidence", async () => {
    const dataset = await loadLocalSupplements();
    expect(() => representativeResult(dataset, "玉掛け資格は？", "クレーン則")).toThrow(/category/);
  });
  it("retains raw newline boundaries in SSE and no-JS as well as JSON", async () => {
    const query = "玉掛け資格は安衛法61条\n20条はどの法令？";
    for (const stream of [false, true]) expect((await ask(query, stream)).sources).toHaveLength(0);
    const html = await (await NO_SCRIPT(new Request("http://localhost/api/chatbot/no-script", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin: "http://localhost", "sec-fetch-site": "same-origin" },
      body: new URLSearchParams({ message: query }),
    }))).text();
    expect(html).toContain("代表ケースの対応を確認できません");
    expect(html).not.toContain('href="/api/chatbot/local-evidence');
  });
  it("does not complete a bundle with a missing legal definition or educational exception", async () => {
    const dataset = await loadLocalSupplements();
    const broken = { ...dataset, documents: dataset.documents.filter(doc => !(doc.lawId === "347M50002000032" && doc.articleNums.includes("第37条"))) };
    expect(() => representativeResult(broken, "玉掛け資格は？")).toThrow(/evidence/);
  });
  it.each(["玉掛けの資格は？", "酸欠主任者と特別教育は？", "クレーン則91条の準用は？"])("uses identical multi-law evidence across JSON and SSE for %s", async query => {
    const json = await ask(query), sse = await ask(query, true);
    expect(sse.sources).toEqual(json.sources); expect(sse.answer).toBe(json.answer);
    expect(sse.citations).toEqual(json.citations);
    expect(new Set(json.sources.map(source => source.asOf))).toEqual(new Set(["2026-10-26"]));
    const html = await (await NO_SCRIPT(new Request("http://localhost/api/chatbot/no-script", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin: "http://localhost", "sec-fetch-site": "same-origin" },
      body: new URLSearchParams({ message: query }),
    }))).text();
    expect(json.importantConditions.length).toBeLessThanOrEqual(3);
    for (const condition of json.importantConditions) expect(html).toContain(condition);
    for (const source of json.sources) expect(html).toContain(encodeURIComponent(source.legalEvidence!.documentId));
  });
  it.each(["2026年3月31日", "2026年4月1日", "2026年10月27日"])("never claims a representative case is verified at %s", async day => {
    const response = await ask(`${day}の玉掛け資格は？`);
    expect(response.sources).toHaveLength(0); expect(response.effectiveDateStatus.status).toBe("unknown");
  });
  it.each([
    ["玉掛けの資格は？", "つり上げ荷重1トンです", "クレーン則"],
    ["酸欠作業の特別教育は？", "その教育は？", "酸欠則"],
  ])("preserves representative evidence for a short conversational follow-up: %s", async (initial, followup, rule) => {
    const first = await ask(initial);
    const response = await ask(followup, false, [{ role: "user", content: initial }, { role: "assistant", content: first.answer }]);
    expect(response.sources.some(source => source.lawShort === rule)).toBe(true);
    expect(response.sources.some(source => source.lawShort === "安衛法")).toBe(true);
    expect(response.effectiveDateStatus.status).toBe("unknown");
  });
});
