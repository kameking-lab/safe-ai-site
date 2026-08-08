import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("PF-043 shared navigation prefetch budget", () => {
  it("does not prefetch every footer, flagship, or automation CTA destination", () => {
    const footer = source("src/components/footer.tsx");
    const flagship = source("src/components/flagship-nav.tsx");
    const automation = source(
      "src/components/automation/automation-consult-cta.tsx",
    );

    expect(footer).toContain("<NextLink {...props} prefetch={false}");
    expect(flagship.match(/prefetch: false,/g)?.length).toBe(7);
    expect(flagship).toContain("prefetch={prefetch}");
    expect(automation).toContain("prefetch={false}");
  });
});
