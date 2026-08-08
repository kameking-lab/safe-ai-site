import { describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/components/Analytics";
import {
  canEmitChatDestinationEvent,
  sanitizeHomeCockpitAttributes,
  trackHomeCockpitEvent,
} from "./home-cockpit-telemetry";

vi.mock("@/components/Analytics", () => ({
  trackEvent: vi.fn(),
}));

describe("home cockpit telemetry privacy", () => {
  it("drops raw inputs, exact location, CAS, URL, and unknown attributes at runtime", () => {
    const safe = sanitizeHomeCockpitAttributes({
      action_type: "chemical",
      area_resolution_level: "municipality",
      count_bucket: "2-5",
      destination_route_template: "/chemical-ra",
      elapsed_bucket: "<100ms",
      raw_area: "新宿区",
      latitude: 35.6938,
      longitude: 139.7034,
      chemical_query: "トルエン",
      cas: "108-88-3",
      question: "個別の相談本文",
      url: "/chemical-ra?name=トルエン",
      token: "secret",
    });

    expect(safe).toEqual({
      action_type: "chemical",
      area_resolution_level: "municipality",
      count_bucket: "2-5",
      destination_route_template: "/chemical-ra",
      elapsed_bucket: "<100ms",
    });
  });

  it("rejects arbitrary values even when they use an allowed key", () => {
    expect(
      sanitizeHomeCockpitAttributes({
        action_type: "トルエン",
        area_resolution_level: "新宿区",
        destination_route_template: "/risk?area=tokyo-shinjuku",
        elapsed_bucket: "87ms",
      }),
    ).toEqual({});
  });

  it("does not emit from local or Preview-style hostnames", () => {
    trackHomeCockpitEvent("home_chat_start", {
      action_type: "chat",
      destination_route_template: "/chatbot",
    });

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("allows destination-ready only on the query-free production route after consent", () => {
    const base = {
      hostname: "www.anzen-ai-portal.jp",
      pathname: "/chatbot",
      search: "",
      hash: "",
      consentGranted: true,
      privacyOptOut: false,
      gaAvailable: true,
    };
    expect(canEmitChatDestinationEvent(base)).toBe(true);
    expect(
      canEmitChatDestinationEvent({ ...base, consentGranted: false }),
    ).toBe(false);
    expect(
      canEmitChatDestinationEvent({ ...base, privacyOptOut: true }),
    ).toBe(false);
    expect(
      canEmitChatDestinationEvent({ ...base, hostname: "preview.vercel.app" }),
    ).toBe(false);
    expect(
      canEmitChatDestinationEvent({ ...base, search: "?question=blocked" }),
    ).toBe(false);
    expect(
      canEmitChatDestinationEvent({ ...base, hash: "#blocked" }),
    ).toBe(false);
  });
});
