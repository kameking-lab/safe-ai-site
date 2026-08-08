import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function filesBelow(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "admin") return [];
      return filesBelow(target);
    }
    return [target];
  });
}

describe("retired legacy contact path", () => {
  it("returns 410/no-store without parsing or logging the PII body", async () => {
    const info = console.info;
    const request = new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "person@example.com" }),
    });
    const jsonSpy = vi.spyOn(request, "json");
    const textSpy = vi.spyOn(request, "text");
    const response = await POST(request);
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(textSpy).not.toHaveBeenCalled();
    expect(console.info).toBe(info);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: "endpoint_retired",
      canonicalPath: "/services/automation#consult-form",
    });
  });

  it("contains no client-visible third-party form destination or public destination ID", () => {
    const root = path.resolve(process.cwd());
    const sources = [
      ...filesBelow(path.join(root, "src")),
      path.join(root, "next.config.ts"),
      path.join(root, ".env.example"),
    ]
      .filter(
        (file) =>
          /\.(?:ts|tsx|example)$/.test(file) &&
          !/\.test\.[cm]?[jt]sx?$/.test(file),
      )
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");
    expect(sources).not.toMatch(/formspree/i);
    expect(sources).not.toContain("NEXT_PUBLIC_FORMSPREE");
    expect(
      fs.existsSync(
        path.join(root, "src/app/(main)/contact/ContactForm.tsx"),
      ),
    ).toBe(false);
  });
});
