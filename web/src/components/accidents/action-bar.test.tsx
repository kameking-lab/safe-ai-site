import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccidentActionBar } from "./action-bar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("AccidentActionBar KY handoff", () => {
  const base = {
    id: "mhlw-100620",
    title: "公開事故の長い本文をURLへ出さない",
    type: "墜落" as const,
    workCategory: "建設業" as const,
    source: {
      site: "職場のあんぜんサイト",
      caseId: "100620",
      url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100620",
    },
  };

  it("passes only a public ID and allowlisted accident/work enums", () => {
    const { container } = render(<AccidentActionBar accident={{ ...base, provenance: "mhlw" }} />);
    const href = screen
      .getByRole("link", { name: /この事故を参考にKYを作る/ })
      .getAttribute("href");
    expect(href).toBe("/ky/paper");
    expect(href).not.toContain(encodeURIComponent(base.title));
    expect(href).not.toContain("?");
    expect(href).not.toMatch(/[?&](?:q|payload|summary|title|fromAccident)=/u);
    expect(container.textContent).not.toContain("事故類型だけでは");
    expect(
      screen.getByRole("link", { name: "法令検索を開く" }).getAttribute("href"),
    ).toBe("/law-search");
  });

  it.each([
    ["unreviewed raw mhlw", "mhlw", "mhlw-2024-001"],
    ["curated", "curated", "curated-example"],
    ["synthetic", "synthetic", "synthetic-example"],
    ["preliminary", "preliminary", "preliminary-example"],
  ] as const)(
    "%s accidents cannot be automatically imported",
    (_label, provenance, id) => {
      render(
        <AccidentActionBar
          accident={{
            ...base,
            id,
            provenance,
            source:
              provenance === "mhlw"
                ? {
                    ...base.source,
                    caseId: "2024-001",
                    url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=2024-001",
                  }
                : undefined,
          }}
        />,
      );
      expect(screen.queryByRole("link", { name: /この事故を参考にKYを作る/ })).toBeNull();
      expect(screen.getByRole("link", { name: /空のKYを作る/ }).getAttribute("href")).toBe(
        "/ky/paper",
      );
    },
  );
});
