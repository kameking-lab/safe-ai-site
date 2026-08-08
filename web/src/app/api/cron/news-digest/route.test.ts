import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const ORIGINAL_ENV = { ...process.env };

describe("GET /api/cron/news-digest delivery gate", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "synthetic-cron-secret";
    process.env.RESEND_API_KEY = "synthetic-resend-key";
    process.env.RESEND_AUDIENCE_ID = "synthetic-audience";
    process.env.NOTIFY_FROM = "Audit <audit@example.invalid>";
    delete process.env.NEWS_DIGEST_SEND_ENABLED;
    delete process.env.NEWS_DIGEST_PERIOD;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("自動・未承認状態ではプロバイダーを呼ばず503でfail-closed", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/news-digest", {
        headers: { authorization: "Bearer synthetic-cron-secret" },
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, sent: false, reason: "delivery_disabled" });
  });

  it("認証済みpreviewは送信せず内容確認だけを返す", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/news-digest?preview=1", {
        headers: { authorization: "Bearer synthetic-cron-secret" },
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, sent: false, reason: "preview" });
  });
});
