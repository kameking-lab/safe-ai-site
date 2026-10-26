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

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("SAFE_AI_LOCAL_SUPPLEMENTS", "true");
  vi.stubEnv("VERCEL", ""); vi.stubEnv("VERCEL_ENV", "");
  __resetRateLimitForTests(); __resetChatbotCacheForTests();
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network forbidden in this local experiment"));
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

async function ask(message: string, stream = false) {
  const response = await (stream ? STREAM : POST)(new Request("http://localhost/api/chatbot", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, lawCategory: "all", privacyConfirmed: true }),
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
  it.each(["安衛法別表1と安衛令別表6を確認", "労働安全衛生法別表1と労働安全衛生法施行令別表6を確認"])("does not distribute a number across different laws: %s", async query => {
    const response = await ask(query);
    expect(response.sources).toHaveLength(0);
    expect(response.directAnswer).toContain("一つずつ");
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
  it.each(["足場の手すり基準は？", "電気工事士が必要な作業は？", "熱中症対策は？", "酸欠作業に必要な資格は？", "玉掛けは何トンから？"])("keeps the existing route unchanged for %s", async query => {
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
});
