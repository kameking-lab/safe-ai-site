import { describe, expect, it, vi } from "vitest";
import {
  createRumAdapter,
  createRumMockTransport,
  isRumRouteEligible,
  prepareRumPayload,
  RUM_SAME_ORIGIN_ENDPOINT,
  type RawRumMetric,
} from "./privacy-adapter";

const safeMetric: RawRumMetric = {
  pathname: "/safety-ai",
  metric: "LCP",
  value: 2_350,
  rating: "good",
  navigationType: "navigate",
  deviceClass: "mobile",
  connectionClass: "medium",
  buildId: "build_20260727",
  anonymousBucket: "bucket_8f31a7c2",
};

describe("RUM privacy adapter", () => {
  it("constructs only the allowlisted schema and maps dynamic IDs to templates", () => {
    const payload = prepareRumPayload({
      ...safeMetric,
      pathname: "/accidents/synthetic-incident-42",
      value: 999_999,
    });

    expect(payload).toEqual({
      route_template: "/accidents/[id]",
      metric: "LCP",
      value: 600_000,
      rating: "good",
      navigation_type: "navigate",
      device_class: "mobile",
      connection_class: "medium",
      build_id: "build_20260727",
      anonymous_bucket: "bucket_8f31a7c2",
    });
    expect(Object.keys(payload ?? {})).toEqual([
      "route_template",
      "metric",
      "value",
      "rating",
      "navigation_type",
      "device_class",
      "connection_class",
      "build_id",
      "anonymous_bucket",
    ]);
  });

  it("rejects complete URLs, query strings, unknown routes, fields, and identifiers", () => {
    const blocked = [
      { ...safeMetric, pathname: "https://example.test/safety-ai" },
      { ...safeMetric, pathname: "/services/automation" },
      { ...safeMetric, pathname: "/services/automation?email=a@example.test" },
      { ...safeMetric, pathname: "/account/user-123" },
      { ...safeMetric, metric: "EMAIL" },
      { ...safeMetric, buildId: "branch/main" },
      { ...safeMetric, anonymousBucket: "user@example.test" },
    ];
    expect(blocked.every((input) => prepareRumPayload(input) === null)).toBe(
      true,
    );
  });

  it("classifies consultation, health, KY, chemical, and AI routes as ineligible before storage", () => {
    expect(isRumRouteEligible("/safety-ai")).toBe(true);
    for (const pathname of [
      "/services/automation",
      "/heat-illness-prevention",
      "/ky/paper",
      "/chemical-ra",
      "/chatbot",
    ]) {
      expect(isRumRouteEligible(pathname)).toBe(false);
    }
  });

  it("sends nothing before consent, outside production, under DNT/GPC, or without endpoint", async () => {
    for (const options of [
      { consentGranted: false, endpointEnabled: true, productionRuntime: true, dntOrGpc: false },
      { consentGranted: true, endpointEnabled: false, productionRuntime: true, dntOrGpc: false },
      { consentGranted: true, endpointEnabled: true, productionRuntime: false, dntOrGpc: false },
      { consentGranted: true, endpointEnabled: true, productionRuntime: true, dntOrGpc: true },
    ]) {
      const mock = createRumMockTransport();
      const adapter = createRumAdapter({ ...options, transport: mock.transport });
      expect(await adapter.record(safeMetric)).toBe(false);
      expect(mock.calls).toHaveLength(0);
    }
  });

  it("uses only the fixed same-origin endpoint and clears the bucket on withdrawal", async () => {
    const mock = createRumMockTransport();
    const clearAnonymousBucket = vi.fn();
    const adapter = createRumAdapter({
      consentGranted: true,
      endpointEnabled: true,
      productionRuntime: true,
      dntOrGpc: false,
      transport: mock.transport,
      clearAnonymousBucket,
    });

    expect(await adapter.record(safeMetric)).toBe(true);
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]?.endpoint).toBe(RUM_SAME_ORIGIN_ENDPOINT);

    adapter.withdrawConsent();
    expect(clearAnonymousBucket).toHaveBeenCalledOnce();
    expect(await adapter.record(safeMetric)).toBe(false);
    expect(mock.calls).toHaveLength(1);
  });

  it("does not retrospectively send metrics observed before consent", async () => {
    const mock = createRumMockTransport();
    const adapter = createRumAdapter({
      consentGranted: false,
      endpointEnabled: true,
      productionRuntime: true,
      dntOrGpc: false,
      transport: mock.transport,
    });

    expect(await adapter.record(safeMetric)).toBe(false);
    adapter.grantConsent();
    expect(mock.calls).toHaveLength(0);
    expect(await adapter.record({ ...safeMetric, value: 2_200 })).toBe(true);
    expect(mock.calls).toHaveLength(1);
  });
});
