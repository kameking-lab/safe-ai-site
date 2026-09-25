import { fireEvent, render, screen } from "@testing-library/react";
import { existsSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FEATURED_NETIS_TECHNOLOGIES,
  NETIS_SAFETY_CATEGORIES,
} from "./netis-safety-data";
import {
  NETIS_EFFICIENCY_CATEGORIES,
  NETIS_EFFICIENCY_TECHNOLOGIES,
} from "./netis-efficiency-data";
import { NETIS_WAVE2_CATEGORIES, NETIS_WAVE2_TECHNOLOGIES } from "./netis-wave2-data";
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

  it("10件の具体技術に一意なNETIS番号、注意点、確認日を持つ", () => {
    expect(FEATURED_NETIS_TECHNOLOGIES).toHaveLength(10);
    expect(
      new Set(
        FEATURED_NETIS_TECHNOLOGIES.map(
          (technology) => technology.registrationNumber,
        ),
      ).size,
    ).toBe(10);
    for (const technology of FEATURED_NETIS_TECHNOLOGIES) {
      expect(technology.registrationNumber).toMatch(
        /^[A-Z]{2}-\d{6}-(?:A|VE)$/,
      );
      expect(technology.productUrl).toMatch(/^https:\/\//);
      expect(technology.summary.length).toBeLessThanOrEqual(60);
      expect(technology.mechanism.length).toBeGreaterThan(30);
      expect(technology.useCase.length).toBeGreaterThan(20);
      expect(technology.limitations.length).toBeGreaterThan(20);
      expect(technology.checkedAt).toBe("2026年9月24日確認");
    }
    for (const category of NETIS_SAFETY_CATEGORIES) {
      expect(
        FEATURED_NETIS_TECHNOLOGIES.filter((technology) =>
          (technology.categoryIds as readonly string[]).includes(category.id),
        ).length,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("4カテゴリの写真はローカル保存済みで、Commonsの出典・作者・ライセンス・取得日を持つ", () => {
    for (const category of NETIS_SAFETY_CATEGORIES) {
      expect(category.image).toMatch(/^\/netis-safety\/categories\/[a-z-]+\.webp$/);
      expect(existsSync(path.join(process.cwd(), "public", category.image))).toBe(true);
      expect(category.imageCredit.sourceUrl).toMatch(
        /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,
      );
      expect(category.imageCredit.author.length).toBeGreaterThan(0);
      expect(category.imageCredit.license).toMatch(/CC BY|パブリックドメイン/);
      if (category.imageCredit.license.startsWith("CC")) {
        expect(category.imageCredit.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\//);
      }
      expect(category.imageCredit.retrievedAt).toBe("2026-09-24");
    }
  });

  it("コンパクト表示でも全10件をNETIS公式照合へつなぐ", () => {
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

  it("重機接触は5件、墜落・転落は2件の定義済み技術を表示する", () => {
    navigation.query = "risk=machine-collision";
    const { unmount } = render(<NetisSafetyExplorer />);
    expect(screen.getByText("重機接触：5件")).toBeDefined();
    expect(screen.getByText(/ヒヤリハンター/)).toBeDefined();
    expect(screen.getByText(/ドボレコJK/)).toBeDefined();
    expect(screen.queryByText(/ハーネスノーティファイ/)).toBeNull();
    unmount();

    navigation.query = "risk=fall-prevention";
    render(<NetisSafetyExplorer />);
    expect(screen.getByText("墜落・転落：2件")).toBeDefined();
    expect(screen.getByText(/ハーネスノーティファイ/)).toBeDefined();
    expect(screen.getByText(/ハーネスアラート/)).toBeDefined();
    expect(screen.queryByText(/ヒヤリハンター/)).toBeNull();
  });

  it("暑熱・作業環境は2件を表示し、名称検索をURLへ同期する", () => {
    navigation.query = "risk=heat-environment";
    render(<NetisSafetyExplorer />);

    expect(screen.getByText("暑熱・作業環境：2件")).toBeDefined();
    expect(screen.getByText(/熱中対策バンド/)).toBeDefined();
    expect(screen.getByText(/TECHNO BAND/)).toBeDefined();
    fireEvent.change(screen.getByLabelText(/名称・登録番号・用途/), {
      target: { value: "KT-260019" },
    });
    fireEvent.click(screen.getByRole("button", { name: "掲載技術を検索" }));
    expect(navigation.push).toHaveBeenCalledWith(
      "/resources/netis-safety?risk=heat-environment&q=KT-260019",
      { scroll: false },
    );
  });

  it("全10件のカードが画像枠・名称・登録番号・特徴を持ち、画像と名称がNETIS公式詳細へつながる", () => {
    const { container } = render(<NetisSafetyExplorer />);

    for (const technology of FEATURED_NETIS_TECHNOLOGIES) {
      const detailUrl = `https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=${technology.registrationNumber.replace(/-(?:A|V?E)$/i, "")}`;
      const nameLink = screen.getByRole("link", {
        name: `${technology.name}（NETIS公式の詳細を開く）`,
      });
      expect(nameLink.getAttribute("href")).toBe(detailUrl);
      // 戻るで絞り込み・位置を復元できるよう同じタブで開く
      expect(nameLink.getAttribute("target")).toBeNull();
      const article = nameLink.closest("article")!;
      expect(article.textContent).toContain(technology.registrationNumber);
      expect(article.textContent).toContain(technology.summary);
      const imageLink = article.querySelector('a[aria-hidden="true"]')!;
      expect(imageLink.getAttribute("href")).toBe(detailUrl);
      expect(imageLink.getAttribute("tabindex")).toBe("-1");

      if (technology.productImage.status === "verified") {
        expect(technology.productImage.sourceUrl).toMatch(/^https:\/\//);
        expect(technology.productImage.usageBasis.length).toBeGreaterThan(10);
        expect(article.querySelector("img")).not.toBeNull();
      } else {
        // 権利未確認の製品は汎用写真・AI画像で埋めず、未掲載と明示する
        expect(article.querySelector("img")).toBeNull();
        expect(article.textContent).toContain("製品画像は未掲載");
        expect(article.textContent).toContain("利用許諾を確認中");
      }
    }
    expect(container.querySelectorAll("article")).toHaveLength(10);
  });

  it("同じタブの詳細から戻ったとき、保存したスクロール位置と名称リンクへのフォーカスを復元する", () => {
    navigation.query = "risk=fall-prevention";
    window.history.replaceState(null, "", "/resources/netis-safety?risk=fall-prevention");
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    window.sessionStorage.setItem(
      "netis-safety-return-position",
      JSON.stringify({
        href: "/resources/netis-safety?risk=fall-prevention",
        scrollY: 640,
        registrationNumber: "KT-230282-A",
      }),
    );

    render(<NetisSafetyExplorer />);

    expect(scrollTo).toHaveBeenCalledWith({ top: 640, behavior: "instant" });
    expect(document.activeElement?.id).toBe("netis-tech-KT-230282-A");
    expect(window.sessionStorage.getItem("netis-safety-return-position")).toBeNull();
    scrollTo.mockRestore();
    window.history.replaceState(null, "", "/");
  });

  it("効率化タブで第1・第2陣18件を探せ、安全10件と混同しない", () => {
    navigation.query = "purpose=efficiency";
    const { container } = render(<NetisSafetyExplorer />);
    expect(screen.getByRole("button", { name: "作業を効率化" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("作業効率化候補：18件")).toBeDefined();
    expect(container.querySelectorAll("article")).toHaveLength(18);
    expect(screen.queryByText(/ヒヤリハンター/)).toBeNull();
    for (const category of NETIS_EFFICIENCY_CATEGORIES) {
      expect(screen.getByRole("button", { name: category.label })).toBeDefined();
      expect(screen.getByAltText(category.imageAlt)).toBeDefined();
      expect(existsSync(path.join(process.cwd(), "public", category.image))).toBe(true);
      expect(category.imageCredit.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(category.imageCredit.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\//);
    }
    for (const technology of NETIS_EFFICIENCY_TECHNOLOGIES) {
      const link = screen.getByRole("link", {
        name: `${technology.name}（国交省の紹介資料を開く）`,
      });
      expect(link.getAttribute("href")).toBe(technology.officialSourceUrl);
      expect(link.closest("article")?.textContent).toContain("現行登録未確認");
      expect(link.closest("article")?.textContent).toContain("製品画像は未掲載");
    }
    for (const category of NETIS_WAVE2_CATEGORIES.filter((item) => item.purpose === "efficiency")) {
      expect(screen.getByRole("button", { name: category.label })).toBeDefined();
      expect(screen.getByAltText(category.imageAlt)).toBeDefined();
      expect(existsSync(path.join(process.cwd(), "public", category.image))).toBe(true);
    }
    for (const technology of NETIS_WAVE2_TECHNOLOGIES.filter((item) => item.primaryPurpose === "efficiency")) {
      expect(container.textContent).toContain(technology.name);
      expect(container.textContent).toContain(technology.sourceBasis);
    }
  });

  it("品質・検査3件を独立した目的として表示し、効率化件数に混ぜない", () => {
    navigation.query = "purpose=quality";
    const { container } = render(<NetisSafetyExplorer />);
    expect(screen.getByText("品質・検査候補：3件")).toBeDefined();
    expect(container.querySelectorAll("article")).toHaveLength(3);
    for (const technology of NETIS_WAVE2_TECHNOLOGIES.filter((item) => item.primaryPurpose === "quality")) {
      expect(container.textContent).toContain(technology.name);
    }
  });

  it("第2陣を含む31件の基番号は重複せず、資料時点を明示する", () => {
    const all = [...FEATURED_NETIS_TECHNOLOGIES, ...NETIS_EFFICIENCY_TECHNOLOGIES, ...NETIS_WAVE2_TECHNOLOGIES];
    expect(all).toHaveLength(31);
    expect(new Set(all.map((item) => item.registrationNumber)).size).toBe(31);
    expect(NETIS_WAVE2_TECHNOLOGIES).toHaveLength(15);
    expect(NETIS_WAVE2_TECHNOLOGIES.filter((item) => item.categoryIds.includes("wave2-roadwork"))).toHaveLength(3);
    for (const item of NETIS_WAVE2_TECHNOLOGIES) {
      expect(item.sourceBasis).toContain("2026年4月公式一覧掲載");
      expect(item.sourceBasis).toContain("9月現行NETIS個別状態未確認");
      expect(item.officialSourceUrl).toMatch(/^https:\/\/www\.cgr\.mlit\.go\.jp\//);
      expect(item.providerSourceUrl).toMatch(/^https:\/\//);
    }
  });

  it("効率化候補は資料の末尾付き番号でも検索できる", () => {
    navigation.query = "purpose=efficiency&q=KT-210020-A";
    const { container } = render(<NetisSafetyExplorer />);
    expect(screen.getByText("作業効率化候補：1件")).toBeDefined();
    expect(container.querySelectorAll("article")).toHaveLength(1);
    expect(container.querySelector("article")?.textContent).toContain("ScanX");
  });

  it("効率化カテゴリの直リンクと検索を保ち、既存のrisk形式を利用する", () => {
    navigation.query = "risk=survey-measurement&q=ScanX";
    render(<NetisSafetyExplorer />);
    expect(screen.getByText("測量・出来形：1件")).toBeDefined();
    expect(screen.getByRole("button", { name: "作業を効率化" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "記録・点検" }));
    expect(navigation.push).toHaveBeenCalledWith(
      "/resources/netis-safety?risk=records-inspection&q=ScanX&purpose=efficiency",
      { scroll: false },
    );
  });
});
