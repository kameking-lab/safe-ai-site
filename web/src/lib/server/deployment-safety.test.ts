import { describe, expect, it } from "vitest";
import {
  externalCredentialedServicesAllowed,
  externalGenerativeAiAllowed,
  isPreviewSafetyMode,
  shouldBlockPreviewRequest,
} from "./deployment-safety";

describe("preview deployment safety", () => {
  it("is enabled only by trusted environment and is fail-closed", () => {
    expect(
      isPreviewSafetyMode({
        NODE_ENV: "test",
        VERCEL_ENV: "preview",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      isPreviewSafetyMode({
        NODE_ENV: "test",
        VERCEL_ENV: "production",
        SAFE_AI_STAGING_MODE: "true",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      isPreviewSafetyMode({
        NODE_ENV: "test",
        VERCEL_ENV: "production",
        SAFE_AI_STAGING_MODE: "false",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      externalCredentialedServicesAllowed({
        NODE_ENV: "test",
        VERCEL_ENV: "preview",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      externalGenerativeAiAllowed({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        GEMINI_EXTERNAL_AI_ENABLED: "true",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      externalGenerativeAiAllowed({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      externalGenerativeAiAllowed({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        GEMINI_EXTERNAL_AI_ENABLED: "true",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
  });

  it("blocks writes by default while allowing local computation and consult dry-run", () => {
    const preview = {
      NODE_ENV: "test",
      VERCEL_ENV: "preview",
    } as NodeJS.ProcessEnv;
    expect(
      shouldBlockPreviewRequest("POST", "/api/stripe/checkout", preview),
    ).toBe(true);
    expect(
      shouldBlockPreviewRequest("POST", "/api/meeting/records", preview),
    ).toBe(true);
    expect(
      shouldBlockPreviewRequest("POST", "/api/automation-consult", preview),
    ).toBe(false);
    expect(
      shouldBlockPreviewRequest(
        "POST",
        "/contact/automation-email/draft",
        preview,
      ),
    ).toBe(false);
    expect(
      shouldBlockPreviewRequest("POST", "/api/chemical/search", preview),
    ).toBe(false);
    expect(
      shouldBlockPreviewRequest(
        "POST",
        "/api/chemical/legal-profile",
        preview,
      ),
    ).toBe(false);
    expect(
      shouldBlockPreviewRequest("POST", "/api/accident-news/search", preview),
    ).toBe(false);
    expect(
      shouldBlockPreviewRequest("POST", "/api/chatbot/no-script", preview),
    ).toBe(false);
    expect(
      shouldBlockPreviewRequest(
        "POST",
        "/api/chatbot/no-script?message=secret",
        preview,
      ),
    ).toBe(true);
    expect(
      shouldBlockPreviewRequest("POST", "/api/chatbot/no-script/extra", preview),
    ).toBe(true);
    expect(externalGenerativeAiAllowed(preview)).toBe(false);
  });

  it("blocks cron, OAuth, webhook, and delivery reads in preview", () => {
    const preview = {
      NODE_ENV: "test",
      VERCEL_ENV: "preview",
    } as NodeJS.ProcessEnv;
    expect(
      shouldBlockPreviewRequest("GET", "/api/cron/news-digest", preview),
    ).toBe(true);
    expect(
      shouldBlockPreviewRequest("GET", "/api/auth/signin", preview),
    ).toBe(true);
    expect(
      shouldBlockPreviewRequest("GET", "/api/newsletter/subscribers", preview),
    ).toBe(true);
    expect(
      shouldBlockPreviewRequest("GET", "/api/weather-risk", preview),
    ).toBe(false);
  });

  it("cannot be enabled by request-shaped values in production", () => {
    const production = {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      SAFE_AI_STAGING_MODE: "false",
    } as NodeJS.ProcessEnv;
    expect(
      shouldBlockPreviewRequest(
        "POST",
        "/api/stripe/checkout?dryRun=true",
        production,
      ),
    ).toBe(false);
  });
});
