import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { determineRequiredCerts } from "@/lib/education-cert-engine";
import {
  QUALIFICATION_FINDER_TERM_POLICY,
  parseQualificationFinderQuery,
} from "@/lib/education/qualification-finder-query";

type SourceLink = {
  file: string;
  href: string;
};

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(absolute));
      continue;
    }
    if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.includes(".test.") &&
      !entry.name.includes(".spec.")
    ) {
      files.push(absolute);
    }
  }
  return files;
}

function finderSourceLinks(): SourceLink[] {
  const roots = [join(process.cwd(), "src", "app"), join(process.cwd(), "src", "data")];
  const links: SourceLink[] = [];
  const pattern =
    /\/education-certification\/finder\?[a-zA-Z]+=[^"'`\s)]+/g;

  for (const root of roots) {
    for (const file of sourceFiles(root)) {
      const source = readFileSync(file, "utf8");
      for (const href of source.match(pattern) ?? []) {
        links.push({ file, href });
      }
    }
  }
  return links;
}

describe("qualification finder deep-link contract", () => {
  it("全リンク元のquery key/valueがserver allowlistで受理される", () => {
    const links = finderSourceLinks();
    expect(links.length).toBeGreaterThan(0);

    const rejected = links.filter(({ href }) => {
      const url = new URL(href, "https://www.anzen-ai-portal.jp");
      return (
        parseQualificationFinderQuery(url.searchParams).prefill.status !==
        "accepted"
      );
    });

    expect(rejected).toEqual([]);
  });

  it("専用HTMLガイドが明確なテーマをfinderリンクへ戻さない", () => {
    const topicGuideTerms = new Set(
      Object.entries(QUALIFICATION_FINDER_TERM_POLICY)
        .filter(([, policy]) => policy.coverage === "topicGuide")
        .map(([term]) => term),
    );
    const staleTopicLinks = finderSourceLinks().filter(({ href }) => {
      const url = new URL(href, "https://www.anzen-ai-portal.jp");
      return topicGuideTerms.has(url.searchParams.get("q") ?? "");
    });

    expect(staleTopicLinks).toEqual([]);
  });

  it("候補対応語と未確認語を現行エンジンの実結果から区別する", () => {
    const mismatches: Array<{
      term: string;
      coverage: string;
      candidateCount: number;
    }> = [];

    for (const [term, policy] of Object.entries(
      QUALIFICATION_FINDER_TERM_POLICY,
    )) {
      const candidateCount = determineRequiredCerts({
        businessTypes: ["general"],
        works: [term],
      }).length;
      const expectedCandidate = policy.coverage === "candidate";
      if ((candidateCount > 0) !== expectedCandidate) {
        mismatches.push({
          term,
          coverage: policy.coverage,
          candidateCount,
        });
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("topicGuideの案内先が実在する正規HTML pageである", () => {
    const missingPages = Object.values(QUALIFICATION_FINDER_TERM_POLICY)
      .filter(
        (
          policy,
        ): policy is Extract<
          (typeof QUALIFICATION_FINDER_TERM_POLICY)[keyof typeof QUALIFICATION_FINDER_TERM_POLICY],
          { coverage: "topicGuide" }
        > => policy.coverage === "topicGuide",
      )
      .filter((policy) => {
        const relativeRoute = policy.guideHref.replace(/^\//, "");
        return !existsSync(
          join(
            process.cwd(),
            "src",
            "app",
            "(main)",
            relativeRoute,
            "page.tsx",
          ),
        );
      });

    expect(missingPages).toEqual([]);
  });
});
