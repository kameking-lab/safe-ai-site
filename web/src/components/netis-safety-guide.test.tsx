import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FEATURED_NETIS_TECHNOLOGIES,
  NETIS_SAFETY_CATEGORIES,
} from "./netis-safety-data";
import { NetisSafetyExplorer } from "./netis-safety-explorer";
import { NetisSafetyGuide } from "./netis-safety-guide";

const navigation = vi.hoisted(() => ({
  query: "",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/resources/netis-safety",
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

describe("NetisSafetyGuide", () => {
  beforeEach(() => {
    navigation.query = "";
    navigation.push.mockReset();
  });

  it("5件の具体技術に一意なNETIS番号と短い初期説明を持つ", () => {
    expect(FEATURED_NETIS_TECHNOLOGIES).toHaveLength(5);
    expect(
      new Set(
        FEATURED_NETIS_TECHNOLOGIES.map(
          (technology) => technology.registrationNumber,
        ),
      ).size,
    ).toBe(5);
    for (const technology of FEATURED_NETIS_TECHNOLOGIES) {
      expect(technology.registrationNumber).toMatch(
        /^[A-Z]{2}-\d{6}-(?:A|VE)$/,
      );
      expect(technology.productUrl).toMatch(/^https:\/\//);
      expect(technology.summary.length).toBeLessThanOrEqual(60);
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
  });

  it("4カテゴリを画像付きの押せるボタンとして表示しURLへ同期する", () => {
    render(<NetisSafetyExplorer />);

    for (const category of NETIS_SAFETY_CATEGORIES) {
      expect(screen.getByRole("button", { name: category.label })).toBeDefined();
      expect(screen.getByAltText(category.imageAlt)).toBeDefined();
    }

    fireEvent.click(screen.getByRole("button", { name: "重機接触" }));
    expect(navigation.push).toHaveBeenCalledWith(
      "/resources/netis-safety?risk=machine-collision",
      { scroll: false },
    );
  });

  it("重機接触は定義済み技術だけ、墜落・転落はハーネスだけを表示する", () => {
    navigation.query = "risk=machine-collision";
    const { unmount } = render(<NetisSafetyExplorer />);
    expect(screen.getByText("重機接触：3件")).toBeDefined();
    expect(screen.getByText(/ヒヤリハンター/)).toBeDefined();
    expect(screen.getByText(/ドボレコJK/)).toBeDefined();
    expect(screen.queryByText(/ハーネスノーティファイ/)).toBeNull();
    unmount();

    navigation.query = "risk=fall-prevention";
    render(<NetisSafetyExplorer />);
    expect(screen.getByText("墜落・転落：1件")).toBeDefined();
    expect(screen.getByText(/ハーネスノーティファイ/)).toBeDefined();
    expect(screen.queryByText(/ヒヤリハンター/)).toBeNull();
  });

  it("暑熱・作業環境は0件を明示して公式検索へ案内する", () => {
    navigation.query = "risk=heat-environment";
    render(<NetisSafetyExplorer />);

    expect(screen.getByText("暑熱・作業環境：0件")).toBeDefined();
    expect(
      screen.getByText("このカテゴリの当サイト掲載技術は0件です"),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: /NETIS公式検索を開く/ }),
    ).toBeDefined();
  });
});
