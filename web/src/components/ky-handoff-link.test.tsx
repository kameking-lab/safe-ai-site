import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, MouseEvent as ReactMouseEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KyHandoffLink } from "./ky-handoff-link";
import {
  KY_HANDOFF_STORAGE_KEY,
  parseKyHandoffFromLocation,
} from "@/lib/ky/handoff";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    onClick,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      {...props}
      onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        event.preventDefault();
      }}
    >
      {children}
    </a>
  ),
}));

describe("KyHandoffLink", () => {
  beforeEach(() => {
    router.push.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("keeps work/site details in one-shot memory and navigates to a fixed route", () => {
    const work = "炎天下で舗装作業を行う";
    render(
      <KyHandoffLink
        handoff={{
          source: "heat",
          areaId: "tokyo-shinjuku",
          hazardIds: ["heat-illness"],
          workDraft: work,
        }}
      >
        この暑さでKYを作る
      </KyHandoffLink>,
    );
    const link = screen.getByRole("link", { name: "この暑さでKYを作る" });
    expect(link.getAttribute("href")).toBe("/ky/paper");
    expect(link.getAttribute("href")).not.toContain(work);
    expect(window.sessionStorage.getItem(KY_HANDOFF_STORAGE_KEY)).toBeNull();
    fireEvent.click(link);
    expect(router.push).toHaveBeenCalledWith("/ky/paper");
    expect(JSON.stringify(router.push.mock.calls)).not.toContain(work);
    expect(window.sessionStorage.getItem(KY_HANDOFF_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.length).toBe(0);
    expect(parseKyHandoffFromLocation("")).toMatchObject({
      source: "heat",
      areaId: "tokyo-shinjuku",
      workDraft: work,
      hazardIds: ["heat-illness"],
    });
    expect(parseKyHandoffFromLocation("")).toBeNull();
  });

  it.each([
    {
      label: "事故",
      handoff: {
        source: "accident" as const,
        accidentId: "mhlw-2024-001",
        accidentType: "chemical" as const,
        workCategory: "chemical" as const,
      },
    },
    {
      label: "Visual KYT",
      handoff: { source: "visual-kyt" as const, scenarioId: "vkyt-015" },
    },
    {
      label: "化学物質",
      handoff: {
        source: "chemical-ra" as const,
        chemicalId: "cas:108-88-3",
        cas: "108-88-3",
      },
    },
  ])("keeps the $label payload out of the destination URL", ({ label, handoff }) => {
    render(<KyHandoffLink handoff={handoff}>{label}</KyHandoffLink>);
    expect(screen.getByRole("link", { name: label }).getAttribute("href")).toBe(
      "/ky/paper",
    );
  });
});
