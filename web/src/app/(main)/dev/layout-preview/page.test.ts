import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PF-069 internal layout preview boundary", () => {
  it("fails closed with notFound on Vercel production", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/app/(main)/dev/layout-preview/page.tsx",
      ),
      "utf8",
    );

    expect(source).toContain('process.env.VERCEL_ENV === "production"');
    expect(source).toContain("notFound()");
    expect(source).toContain("index: false");
    expect(source).toContain("follow: false");
  });
});
