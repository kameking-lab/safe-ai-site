import { describe, expect, it } from "vitest";
import { validateChatbotRequestBoundary } from "./chatbot-request-boundary";

function request(
  headers: Record<string, string>,
  url = "https://www.anzen-ai-portal.jp/api/chatbot",
) {
  return new Request(url, {
    method: "POST",
    headers,
    body: "{}",
  });
}

describe("chatbot request boundary", () => {
  it("accepts same-origin JSON browser requests", () => {
    expect(
      validateChatbotRequestBoundary(
        request({
          "content-type": "application/json; charset=utf-8",
          origin: "https://www.anzen-ai-portal.jp",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toEqual({ allowed: true });
  });

  it("accepts JSON requests without browser origin metadata", () => {
    expect(
      validateChatbotRequestBoundary(
        request({ "content-type": "application/json" }),
      ),
    ).toEqual({ allowed: true });
  });

  it("accepts a same-origin browser request when the proxy-facing Host differs from the internal URL", () => {
    expect(
      validateChatbotRequestBoundary(
        request(
          {
            "content-type": "application/json",
            host: "127.0.0.1:3107",
            origin: "http://127.0.0.1:3107",
            "sec-fetch-site": "same-origin",
            "x-forwarded-proto": "http",
          },
          "http://localhost:3107/api/chatbot/stream",
        ),
      ),
    ).toEqual({ allowed: true });
  });

  it("does not trust a supplied origin that matches neither the internal URL nor proxy-facing Host", () => {
    expect(
      validateChatbotRequestBoundary(
        request(
          {
            "content-type": "application/json",
            host: "127.0.0.1:3107",
            origin: "https://attacker.example",
            "sec-fetch-site": "same-origin",
            "x-forwarded-proto": "http",
          },
          "http://localhost:3107/api/chatbot/stream",
        ),
      ),
    ).toMatchObject({ allowed: false, status: 403 });
  });

  it("rejects non-JSON request bodies", () => {
    expect(
      validateChatbotRequestBoundary(
        request({
          "content-type": "text/plain",
          origin: "https://www.anzen-ai-portal.jp",
        }),
      ),
    ).toEqual({
      allowed: false,
      status: 415,
      message: "JSON形式のリクエストだけを受け付けます。",
    });
  });

  it("rejects explicit cross-origin and cross-site browser requests", () => {
    expect(
      validateChatbotRequestBoundary(
        request({
          "content-type": "application/json",
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toEqual({
      allowed: false,
      status: 403,
      message: "同一サイトからのリクエストだけを受け付けます。",
    });
  });

  it("rejects malformed and opaque browser origins", () => {
    for (const origin of ["null", "not a url"]) {
      expect(
        validateChatbotRequestBoundary(
          request({
            "content-type": "application/json",
            origin,
          }),
        ),
      ).toMatchObject({ allowed: false, status: 403 });
    }
  });
});
