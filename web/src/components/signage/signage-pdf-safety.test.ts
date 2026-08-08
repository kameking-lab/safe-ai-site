import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("signage PDF safety boundary", () => {
  it("uses the patched PDF.js release without a scripting-enabled viewer", () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    const source = readFileSync(
      join(
        process.cwd(),
        "src/components/signage/signage-today-documents.tsx",
      ),
      "utf8",
    );

    expect(packageJson.dependencies["pdfjs-dist"]).toBe("6.2.108");
    expect(source).toContain("pdfjsLib.getDocument({ data: arrayBuffer })");
    expect(source).toContain("page.render(");
    expect(source).not.toContain("enableScripting: true");
    expect(source).not.toMatch(/PDFViewer|AnnotationLayer/u);
  });
});
