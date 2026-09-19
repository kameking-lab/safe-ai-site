import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FEATURED_NETIS_TECHNOLOGIES,
  NetisSafetyGuide,
} from "./netis-safety-guide";

describe("NetisSafetyGuide", () => {
  it("5件の具体技術に一意なNETIS番号と提供元リンクを持つ", () => {
    expect(FEATURED_NETIS_TECHNOLOGIES).toHaveLength(5);
    expect(
      new Set(
        FEATURED_NETIS_TECHNOLOGIES.map(
          (technology) => technology.registrationNumber,
        ),
      ).size,
    ).toBe(5);
    for (const technology of FEATURED_NETIS_TECHNOLOGIES) {
      expect(technology.registrationNumber).toMatch(/^[A-Z]{2}-\d{6}-(?:A|VE)$/);
      expect(technology.productUrl).toMatch(/^https:\/\//);
      expect(technology.mechanism.length).toBeGreaterThan(30);
      expect(technology.useCase.length).toBeGreaterThan(20);
    }
  });

  it("コンパクト表示でも全5件をNETIS公式照合へつなぐ", () => {
    render(<NetisSafetyGuide compact />);

    for (const technology of FEATURED_NETIS_TECHNOLOGIES) {
      const link = screen.getByRole("link", {
        name: `${technology.name} ${technology.registrationNumber}をNETIS公式で確認`,
      });
      const detailRegistrationNumber = technology.registrationNumber.replace(
        /-(?:A|V?E)$/i,
        "",
      );
      expect(link.getAttribute("href")).toBe(
        `https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=${detailRegistrationNumber}`,
      );
    }
    expect(screen.getByText("2026年9月19日確認")).toBeDefined();
  });

  it("詳細表示には仕組み、用途、公式照合、製品情報を示す", () => {
    render(<NetisSafetyGuide />);

    for (const technology of FEATURED_NETIS_TECHNOLOGIES) {
      expect(
        screen.getByRole("heading", { level: 4, name: technology.name }),
      ).toBeDefined();
    }
    expect(screen.getAllByText("仕組み")).toHaveLength(5);
    expect(screen.getAllByText("向いている現場")).toHaveLength(5);
    expect(screen.getAllByRole("link", { name: /NETIS公式で照合/ })).toHaveLength(5);
    expect(screen.getAllByRole("link", { name: /技術・製品情報/ })).toHaveLength(5);
  });
});
