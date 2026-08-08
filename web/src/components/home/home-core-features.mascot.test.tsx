import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { HomeCoreFeatures } from "./home-core-features";

const COCKPIT_MASCOT_ASSET = join(
  process.cwd(),
  "public",
  "mascot",
  "mascot-pointing.webp",
);

describe("HomeCoreFeatures ownership boundary", () => {
  it("shows six compact primary links and role chips without repeating upper-page experiences", () => {
    const { container } = render(<HomeCoreFeatures />);

    expect(container.querySelectorAll("section > div > ul > li")).toHaveLength(6);
    expect(container.querySelectorAll('nav[aria-label="役割別の入口"] a')).toHaveLength(6);
    const hrefs = [...container.querySelectorAll("a")].map((link) =>
      link.getAttribute("href"),
    );
    expect(hrefs).toEqual([
      "/features",
      "/ky/paper",
      "/risk",
      "/safety-diary",
      "/signage",
      "/goods",
      "/notifications",
      "/for/construction",
      "/for/solo",
      "/for/manager",
      "/pricing",
      "/for/consultant",
      "/training/visual-ky",
    ]);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(container.querySelector('[data-mascot-guide]')).toBeNull();
    expect(container.textContent).not.toContain("化学物質を検索");
    expect(container.textContent).not.toContain("安衛法AIへの質問");
  });

  it("keeps the canonical cockpit pointing mascot as a transparent, bounded WebP", async () => {
    const metadata = await sharp(COCKPIT_MASCOT_ASSET).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(400);
    expect(metadata.height).toBe(388);
    expect(metadata.hasAlpha).toBe(true);
    expect(statSync(COCKPIT_MASCOT_ASSET).size).toBeLessThan(100_000);
    expect(
      readFileSync(COCKPIT_MASCOT_ASSET).subarray(0, 4).toString("ascii"),
    ).toBe("RIFF");
  });
});
