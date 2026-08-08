import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("signage narrow reflow", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/app/signage/page.tsx"),
    "utf8",
  );

  it("mode and notification actions wrap into two columns before the sm breakpoint", () => {
    expect(source).toContain('data-signage-mode-actions=""');
    expect(source).toContain(
      "grid w-full shrink-0 grid-cols-2 gap-1 sm:flex sm:w-auto sm:flex-wrap sm:items-center",
    );
  });
});
