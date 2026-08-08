import { describe, expect, it } from "vitest";
import { allLawArticles } from "@/data/laws";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import { GET, POST } from "./route";

describe("/api/law-summary fail-closed contract", () => {
  it("GET resolves only a server-side corpus article and returns a deterministic excerpt", async () => {
    const article = verifiedLawArticles[0];
    expect(article).toBeDefined();
    const params = new URLSearchParams({
      law: article.law,
      articleNum: article.articleNum,
    });
    const response = await GET(
      new Request(`http://localhost/api/law-summary?${params}`),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("X-AI-Used")).toBe("false");
    const body = (await response.json()) as {
      summary: string;
      source: string;
      aiUsed: boolean;
    };
    expect(body.source).toBe("primary_excerpt");
    expect(body.aiUsed).toBe(false);
    expect(body.summary).toContain(article.law);
    expect(body.summary).toContain(article.text.slice(0, 40));
  });

  it("holds an unknown article instead of presenting it as a primary excerpt", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/law-summary?law=unknown&articleNum=第1条",
      ),
    );
    expect(response.status).toBe(409);
    expect(response.headers.get("X-AI-Used")).toBeNull();
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("PRIMARY_TEXT_NOT_VERIFIED");
  });

  it("holds a curated article whose individual snapshot hash is unverified", async () => {
    const verifiedKeys = new Set(
      verifiedLawArticles.map((article) => `${article.law}|${article.articleNum}`),
    );
    const unverified = allLawArticles.find(
      (article) => !verifiedKeys.has(`${article.law}|${article.articleNum}`),
    );
    expect(unverified).toBeDefined();
    const params = new URLSearchParams({
      law: unverified!.law,
      articleNum: unverified!.articleNum,
    });
    const response = await GET(
      new Request(`http://localhost/api/law-summary?${params}`),
    );
    expect(response.status).toBe(409);
    expect(response.headers.get("X-Content-Status")).toBeNull();
    const body = (await response.json()) as { code: string; officialSearchUrl: string };
    expect(body.code).toBe("PRIMARY_TEXT_NOT_VERIFIED");
    expect(body.officialSearchUrl).toBe("https://laws.e-gov.go.jp/");
  });

  it("retires the caller-supplied text POST route", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
    expect(response.headers.get("X-AI-Used")).toBe("false");
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("ROUTE_RETIRED");
  });
});
