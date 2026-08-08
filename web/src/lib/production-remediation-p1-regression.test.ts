import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allLawArticles, mhlwLawArticles } from "@/data/laws";
import { FEATURES } from "@/data/features-catalog";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";
import { maxLevelFromWarningPayload } from "@/lib/jma/parse-jma-warning";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import {
  isKyCleanPrintAllowed,
  validateKyForTransition,
} from "@/lib/ky/readiness";
import {
  buildDefaultMeetingRecord,
} from "@/lib/meeting/schema";
import { validateMeetingForApproval } from "@/lib/meeting/readiness";
import { resolveExactChemical } from "@/lib/chemical/official-ra-response";
import { searchLawArticles } from "@/lib/law-search";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import { buildExactLegalEvidenceAnswer } from "@/lib/legal-exact-answer";

function source(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("production remediation fixed-ID P1 regression", () => {
  it("PF-001 natural emergency language is intercepted before normal answers", () => {
    for (const message of [
      "呼びかけても反応しない",
      "呼吸が分からない",
      "胸が痛い・・・動けない",
      "　意識　なし。　",
    ]) {
      const decision = evaluateChatbotSafety(message);
      expect(decision?.kind).toBe("emergency");
      expect(decision?.response).not.toMatch(/法令検索|KYを作成|無料相談/);
    }
    expect(
      evaluateChatbotSafety("意識がないわけではありません")?.kind,
    ).not.toBe("emergency");
  });

  it("PF-002 severe bleeding gives direct-pressure and infection guidance", () => {
    const decision = evaluateChatbotSafety("大量に血が出ていて止まらない");
    expect(decision).toMatchObject({
      kind: "emergency",
      emergencyCategory: "severe-bleeding",
    });
    expect(decision?.response).toMatch(/119番[\s\S]*直接圧迫/);
    expect(decision?.response).toMatch(/手袋|ビニール袋/);
    expect(decision?.response).toContain("救急隊・通信指令員の指示を最優先");
  });

  it("PF-003 legitimate JMA no-warning rows do not require a code", () => {
    expect(
      maxLevelFromWarningPayload({
        reportDatetime: "2026-07-28T12:00:00+09:00",
        areaTypes: [
          {
            areas: [
              {
                code: "1310100",
                warnings: [{ status: "発表警報・注意報はなし" }],
              },
            ],
          },
        ],
      }),
    ).toBe("none");
    const runtime = source("src/lib/jma/fetch-jma-runtime.ts");
    expect(runtime).toContain('sourceStatus: "fallback"');
    expect(runtime).toContain('status: degraded ? "degraded" : "live"');
  });

  it("PF-004 one authoritative KY schema carries all operational context", () => {
    const record = normalizeKyInstructionRecord({});
    expect(record.schemaVersion).toBe(2);
    expect(Object.keys(record.context)).toEqual(
      expect.arrayContaining([
        "workLocation",
        "equipment",
        "heavyEquipment",
        "plannedPeopleCount",
        "weather",
        "simultaneousWork",
        "changes",
        "newEntrants",
        "nightWork",
        "chemicals",
        "heatStress",
        "reviewerName",
      ]),
    );
    expect(source("src/lib/ky/storage-migration.ts")).toContain(
      "normalizeKyInstructionRecord",
    );
  });

  it("PF-005 incomplete KY cannot be approved or clean-printed", () => {
    const record = normalizeKyInstructionRecord({});
    const issueCodes = validateKyForTransition(record).map(
      (issue) => issue.code,
    );
    expect(issueCodes).toEqual(
      expect.arrayContaining([
        "work",
        "location",
        "hazard",
        "reviewer",
        "context-review",
        "created-at",
      ]),
    );
    expect(isKyCleanPrintAllowed(record)).toBe(false);
    expect(source("src/components/ky-paper/ky-print-sheet.tsx")).toContain(
      "下書き・未確認版",
    );
  });

  it("PF-006 meeting defaults remain unreviewed and fail approval", () => {
    const record = buildDefaultMeetingRecord();
    expect(record.documentControl.approval).toBeNull();
    expect(
      record.checklist.flatMap((category) => category.items).every(
        (item) => item.status === "unreviewed",
      ),
    ).toBe(true);
    expect(validateMeetingForApproval(record).length).toBeGreaterThan(0);
  });

  it("PF-007 ambiguous chemical names require explicit candidate confirmation", () => {
    expect(resolveExactChemical("キシレン")).toMatchObject({
      ok: false,
      code: "AMBIGUOUS",
    });
    const selector = source("src/components/mhlw-chemical-selector.tsx");
    expect(selector).toContain("pendingCandidate");
    expect(selector).toContain("SDSと一致する候補を確定");
    expect(selector).toContain("CAS番号");
  });

  it("PF-008 all nine unchanged representative law queries return results", () => {
    const quarantine = new Set(mhlwLawArticles);
    const articles = allLawArticles.filter(
      (article) => !quarantine.has(article),
    );
    const queries = [
      "安衛法 第61条",
      "労働安全衛生法 61条",
      "クレーン 第61条",
      "熱中症 安衛則 612条の2",
      "足場 特別教育",
      "フルハーネス",
      "石綿",
      "化学物質 管理者",
      "事業者 義務",
    ];
    expect(
      queries.map((query) => searchLawArticles(articles, query).length > 0),
    ).toEqual(queries.map(() => true));
  });

  it("PF-009 accident search remains internal without serializing free text", () => {
    const page = source("src/app/(main)/accident-news/page.tsx");
    const browser = source(
      "src/app/(main)/accident-news/accident-news-browser.tsx",
    );
    const filter = source(
      "src/app/(main)/accident-news/accident-news-filter.tsx",
    );
    expect(page).not.toMatch(/\bredirect\s*\(/);
    expect(page).toContain("<AccidentNewsBrowser");
    expect(browser).toContain('fetch("/api/accident-news/search"');
    expect(browser).toContain('method: "POST"');
    expect(filter).not.toContain('params.set("q"');
    expect(browser).not.toContain('params.set("q"');
    expect(page).toContain("SERIOUS_CASES_META.sourceUrl");
  });

  it("PF-010 consult capability fails closed before PII when production config is incomplete", () => {
    expect(
      getAutomationConsultAvailability({
        AUTOMATION_CONSULT_RECIPIENTS:
          "synthetic-primary@gmail.com,synthetic-audit@outlook.com",
      }),
    ).toMatchObject({
      status: "mail_available",
      accepting: true,
      webFormEnabled: false,
      contactMode: "mail_client",
    });
    const service = source(
      "src/app/(main)/services/automation/AutomationServiceContent.tsx",
    );
    const preparation = source(
      "src/app/(main)/services/automation/AutomationConsultPreparation.tsx",
    );
    expect(service).toContain("availability.accepting");
    expect(service).toContain("<AutomationConsultPreparation mailAvailable={mailAvailable} />");
    expect(preparation).toContain(
      "Webフォームへ相談本文を入力する方式ではありません",
    );
    expect(preparation).not.toMatch(/localStorage\.(?:setItem|getItem)/);
  });

  it("PF-011 exact article questions return the identified source text", () => {
    const result = buildExactLegalEvidenceAnswer(
      "労働安全衛生法第61条は何を定めていますか？",
      allLawArticles,
      new Date("2026-07-28T03:00:00Z"),
    );
    expect(result?.answer).toContain("労働安全衛生法 第61条");
    expect(result?.answer).not.toContain("特定できません");
  });

  it("PF-012 answers record JST basis date and do not speculate about future law", () => {
    const effective = buildExactLegalEvidenceAnswer(
      "2026年7月28日現在、安衛則第612条の2は何を定めていますか？",
      allLawArticles,
      new Date("2026-07-28T03:00:00Z"),
    );
    const future = buildExactLegalEvidenceAnswer(
      "2030年1月1日の安衛法第61条の義務は？",
      allLawArticles,
      new Date("2026-07-28T03:00:00Z"),
    );
    expect(effective).toMatchObject({
      temporalStatus: "effective",
      answerAsOf: "2026-07-28",
    });
    expect(effective?.answer).toContain("施行日: 2025-06-01");
    expect(future?.temporalStatus).toBe("future-unverified");
    expect(future?.answer).toContain("将来の義務内容は推測しません");
  });

  it("PF-013 public feature catalog excludes quarantined capabilities and limits claims", () => {
    expect(FEATURES.some((feature) => feature.href === "/risk-prediction")).toBe(
      false,
    );
    expect(FEATURES.some((feature) => feature.href === "/e-learning")).toBe(
      false,
    );
    expect(FEATURES.find((feature) => feature.slug === "ky")?.description).toContain(
      "人手確認",
    );
    expect(FEATURES.find((feature) => feature.slug === "ky")?.description).not.toContain(
      "AIによる",
    );
  });

  it("PF-014 cross-search dialog traps focus, isolates background, and restores focus", () => {
    const palette = source("src/components/CommandPalette.tsx");
    expect(palette).toContain("createPortal");
    expect(palette).toContain('aria-modal="true"');
    expect(palette).toContain("child.inert = true");
    expect(palette).toContain("previousFocusRef.current?.focus()");
    expect(palette).toContain("e.key === 'Escape'");
  });

  it("PF-015 320px fixed UI remains bounded and respects mobile safe areas", () => {
    const nav = source("src/components/mobile-bottom-nav-interactive.tsx");
    const cookies = source("src/components/OptionalThirdPartyScripts.tsx");
    expect(nav).toContain("w-full min-w-0 overflow-hidden");
    expect(nav).toContain("aria-controls={moreOpen");
    expect(nav).toContain("env(safe-area-inset-bottom");
    expect(cookies).toContain("var(--mobile-bottom-nav-h");
    expect(cookies).toContain("env(safe-area-inset-bottom");
  });

  it("PF-016 education and e-learning keep noindex and expose working alternatives without warning walls", () => {
    for (const file of [
      "src/app/(main)/education/page.tsx",
      "src/app/(main)/e-learning/page.tsx",
    ]) {
      const page = source(file);
      expect(page).toContain("index: false");
      expect(page).toContain("/training/visual-ky");
      expect(page).toContain("/education-certification/finder");
      expect(page).toContain("mhlw.go.jp");
      expect(page).toContain("<UsageNotesLink");
      expect(page).not.toMatch(/品質ゲート|allowlist|外部レビュー|停止理由/);
    }
  });
});
