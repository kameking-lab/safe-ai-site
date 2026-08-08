import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function request(body: unknown) {
  return new Request("https://example.test/api/chemical/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chemical/search", () => {
  it("CAS・名称を固定索引で検索し、no-storeで必要件数だけ返す", async () => {
    const byCas = await POST(request({ query: "108-88-3", limit: 8 }));
    const casJson = (await byCas.json()) as {
      ok: boolean;
      catalogCount: number;
      items: Array<{ cas: string | null; primaryName: string }>;
    };
    expect(byCas.status).toBe(200);
    expect(byCas.headers.get("cache-control")).toContain("no-store");
    expect(casJson.ok).toBe(true);
    expect(casJson.catalogCount).toBe(3_695);
    expect(casJson.items[0]?.cas).toBe("108-88-3");

    const byName = await POST(request({ query: "トルエン", limit: 1 }));
    const nameJson = (await byName.json()) as {
      items: Array<{ primaryName: string }>;
    };
    expect(nameJson.items).toHaveLength(1);
    expect(nameJson.items[0]?.primaryName).toContain("トルエン");
  });

  it("上限を30件へ固定し、不正・過長クエリをfail-closedにする", async () => {
    const limited = await POST(request({ query: "酸", limit: 999 }));
    const limitedJson = (await limited.json()) as { items: unknown[] };
    expect(limitedJson.items.length).toBeLessThanOrEqual(30);

    expect((await POST(request({ query: "" }))).status).toBe(400);
    expect((await POST(request({ query: "a".repeat(121) }))).status).toBe(400);
  });

  it("PF-007: 名称とCASをサーバー側で一意に再検査し、不一致・未知物質を拒否する", async () => {
    const confirmed = await POST(
      request({
        selection: { cas: "108-88-3", primaryName: "トルエン" },
      }),
    );
    const confirmedJson = (await confirmed.json()) as {
      ok: boolean;
      item: { cas: string; primaryName: string };
    };
    expect(confirmed.status).toBe(200);
    expect(confirmedJson.item).toMatchObject({
      cas: "108-88-3",
      primaryName: "トルエン",
    });

    expect(
      (
        await POST(
          request({
            selection: { cas: "108-88-3", primaryName: "キシレン" },
          }),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await POST(
          request({
            selection: { cas: "9999999-99-9", primaryName: "未知物質" },
          }),
        )
      ).status,
    ).toBe(409);
  });

  it("自動確定は入力語が名称・別名・CASへ完全一致する一意候補だけに限定する", async () => {
    const exact = await POST(
      request({
        selection: {
          cas: "108-88-3",
          primaryName: "トルエン",
          originalQuery: "トルエン",
        },
      }),
    );
    expect(exact.status).toBe(200);

    const partial = await POST(
      request({
        selection: {
          cas: "108-88-3",
          primaryName: "トルエン",
          originalQuery: "トル",
        },
      }),
    );
    expect(partial.status).toBe(409);

    const mismatch = await POST(
      request({
        selection: {
          cas: "108-88-3",
          primaryName: "トルエン",
          originalQuery: "キシレン",
        },
      }),
    );
    expect(mismatch.status).toBe(409);
  });

  it("検索語や応答本文をconsoleへ記録しない", async () => {
    const marker = "CONFIDENTIAL-CHEMICAL-MARKER";
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await POST(request({ query: marker }));

    expect(JSON.stringify(log.mock.calls)).not.toContain(marker);
    expect(JSON.stringify(warn.mock.calls)).not.toContain(marker);
    expect(JSON.stringify(error.mock.calls)).not.toContain(marker);
    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  });
});
