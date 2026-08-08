import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DistributedInputBar } from "./distributed-input-bar";

vi.mock("@/lib/meeting/cloud", () => ({
  isMeetingCloudEnabled: () => true,
  cloudCreateMeetingShare: vi.fn(),
  cloudFetchMeetingContributions: vi.fn(),
}));

import { cloudCreateMeetingShare, cloudFetchMeetingContributions } from "@/lib/meeting/cloud";

const baseProps = {
  cloudConsent: true,
  meetingId: "m1",
  siteName: "テスト現場",
  workDate: "2026-07-04",
  contractors: [],
  onImport: vi.fn(),
};

describe("DistributedInputBar fail-closed boundary", () => {
  beforeEach(() => {
    vi.mocked(cloudCreateMeetingShare).mockReset();
    vi.mocked(cloudFetchMeetingContributions).mockReset();
    baseProps.onImport.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([true, false])(
    "cloudConsent=%sでも保守中表示だけを示し、通信・操作導線を出さない",
    (cloudConsent) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      render(
        <DistributedInputBar
          {...baseProps}
          cloudConsent={cloudConsent}
        />,
      );

      const notice = screen.getByRole("note");
      expect(notice.textContent?.trim().length).toBeGreaterThan(0);
      expect(notice.className).toContain("border-amber-300");
      expect(
        notice.querySelector("button, a, input, select, textarea"),
      ).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.queryByRole("link")).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(cloudCreateMeetingShare).not.toHaveBeenCalled();
      expect(cloudFetchMeetingContributions).not.toHaveBeenCalled();
      expect(baseProps.onImport).not.toHaveBeenCalled();
    },
  );
});
