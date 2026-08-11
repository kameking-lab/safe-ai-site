import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const guardScript = resolve(
  process.cwd(),
  "scripts/audit/public-identity-guard.mjs",
);

describe("公開画面の権威・監修表示境界", () => {
  it("recursively scans source, public assets, Office files, and metadata", () => {
    expect(() =>
      execFileSync(process.execPath, [guardScript], {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe",
      }),
    ).not.toThrow();
  });

  it("uses the editorial identity and qualification without a registration number", () => {
    const byline = readFileSync(
      resolve(process.cwd(), "src/components/SupervisorByline.tsx"),
      "utf8",
    );
    const privateRegistration = ["260", "022"].join("");
    expect(byline).toContain("安全AIポータル編集部");
    expect(byline).toContain("労働安全コンサルタント監修");
    expect(byline).not.toContain(privateRegistration);
  });

  it("publishes article authors as the editorial Organization, not a Person", () => {
    const jsonLd = readFileSync(
      resolve(process.cwd(), "src/components/json-ld.tsx"),
      "utf8",
    );
    const personType = ["@type", "Person"].join('\": \"');
    expect(jsonLd).not.toContain(personType);
    expect(jsonLd).toContain("author: PUBLISHER_REF");
  });
});
