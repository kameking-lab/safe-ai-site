import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const productionFiles = [
  "src/components/elearning-panel.tsx",
  "src/components/visual-ky/visual-ky-player.tsx",
  "src/components/safety-elearning/safety-question-player.tsx",
  "src/app/(main)/e-learning/page.tsx",
  "src/app/(main)/e-learning/safety/page.tsx",
  "src/app/(main)/education/progress/page.tsx",
].map((file) => readFileSync(resolve(process.cwd(), file), "utf8"));

describe("retired persistent learning records", () => {
  it("has no learning-progress storage key, reader, writer, streak or history UI", () => {
    const source = productionFiles.join("\n");
    expect(source).not.toMatch(
      /safe-ai:elearning-progress|safe-ai:visual-ky-progress|recordThemeAttempt|loadProgressList|writeVisualKyProgress|累積学習時間|最終学習日|進捗保存|完了項目を見る/,
    );
  });

  it("does not use persistent or session storage in the qualification engine", () => {
    const engine = readFileSync(
      resolve(
        process.cwd(),
        "src/components/safety-elearning/safety-question-player.tsx",
      ),
      "utf8",
    );
    expect(engine).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
  });

  it("retires the organization progress route without touching old data", () => {
    const route = productionFiles.at(-1) ?? "";
    expect(route).toContain('permanentRedirect("/e-learning")');
    expect(route).not.toMatch(/localStorage|removeItem|deleteMany|prisma|learningMinutes/);
  });
});
