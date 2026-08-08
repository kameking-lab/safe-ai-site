import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("monthly digest scheduling safeguards", () => {
  const vercel = readFileSync(resolve(process.cwd(), "../vercel.json"), "utf8");
  const route = readFileSync(resolve(process.cwd(), "src/app/api/cron/news-digest/route.ts"), "utf8");

  it("durable delivery ledgerができるまで自動cronを登録しない", () => {
    expect(vercel).not.toContain("/api/cron/news-digest");
  });

  it("当月の明示許可と既存broadcast照会を必須にする", () => {
    expect(route).toContain("NEWS_DIGEST_SEND_ENABLED");
    expect(route).toContain("NEWS_DIGEST_PERIOD");
    expect(route).toContain("broadcast_already_exists");
    expect(route).toContain("send: true");
  });
});
