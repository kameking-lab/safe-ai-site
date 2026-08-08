import { describe, expect, it } from "vitest";
import { getVisualKyCanonicalShareUrl } from "./share";

describe("visual KY canonical QR share URL", () => {
  it("公開canonicalだけを返し、query・token・個人識別子を含めない", () => {
    const url = getVisualKyCanonicalShareUrl({ slug: "scaffold-fall" });
    expect(url).toBe(
      "https://www.anzen-ai-portal.jp/training/visual-ky/scaffold-fall",
    );
    expect(url).not.toMatch(/[?#]/);
    expect(url).not.toMatch(/token|user|email|progress/i);
  });

  it("安全なslug以外を拒否する", () => {
    expect(() =>
      getVisualKyCanonicalShareUrl({ slug: "ok?token=secret" }),
    ).toThrow("Invalid visual KY slug");
  });
});
