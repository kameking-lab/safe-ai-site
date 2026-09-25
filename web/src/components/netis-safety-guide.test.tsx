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
import { NETIS_WAVE3_TECHNOLOGIES } from "./netis-wave3-data";
import { NETIS_WAVE4_CATEGORIES, NETIS_WAVE4_TECHNOLOGIES } from "./netis-wave4-data";
import { NETIS_WAVE5_CATEGORIES, NETIS_WAVE5_TECHNOLOGIES } from "./netis-wave5-data";
import { NETIS_WAVE6_TECHNOLOGIES } from "./netis-wave6-data";
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

  it("重機接触は5件、墜落・足場は4件の定義済み技術を表示する", () => {
    navigation.query = "risk=machine-collision";
    const { unmount } = render(<NetisSafetyExplorer />);
    expect(screen.getByText("重機接触：5件")).toBeDefined();
    expect(screen.getByText(/ヒヤリハンター/)).toBeDefined();
    expect(screen.getByText(/ドボレコJK/)).toBeDefined();
    expect(screen.queryByText(/ハーネスノーティファイ/)).toBeNull();
    unmount();

    navigation.query = "risk=fall-prevention";
    render(<NetisSafetyExplorer />);
    expect(screen.getByText("墜落・足場：4件")).toBeDefined();
    expect(screen.getByText(/ハーネスノーティファイ/)).toBeDefined();
    expect(screen.getByText(/ハーネスアラート/)).toBeDefined();
    expect(screen.queryByText(/ヒヤリハンター/)).toBeNull();
  });

  it("暑熱・作業環境は3件を表示し、名称検索をURLへ同期する", () => {
    navigation.query = "risk=heat-environment";
    render(<NetisSafetyExplorer />);

    expect(screen.getByText("暑熱・作業環境：3件")).toBeDefined();
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

  it("安全22件のカードが名称・登録番号・特徴を持ち、既存10件はNETIS公式詳細へつながる", () => {
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
    expect(container.querySelectorAll("article")).toHaveLength(23);
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

  it("効率化タブで公式資料を照合した32件を探せ、安全22件と混同しない", () => {
    navigation.query = "purpose=efficiency";
    const { container } = render(<NetisSafetyExplorer />);
    expect(screen.getByRole("button", { name: "作業を効率化" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("作業効率化候補：55件")).toBeDefined();
    expect(container.querySelectorAll("article")).toHaveLength(55);
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
    for (const technology of NETIS_WAVE3_TECHNOLOGIES.filter((item) => item.primaryPurpose === "efficiency")) {
      expect(container.textContent).toContain(technology.name);
      expect(container.textContent).toContain(technology.sourceBasis);
    }
  });

  it("品質・検査6件を独立した目的として表示し、効率化件数に混ぜない", () => {
    navigation.query = "purpose=quality";
    const { container } = render(<NetisSafetyExplorer />);
    expect(screen.getByText("品質・検査候補：22件")).toBeDefined();
    expect(container.querySelectorAll("article")).toHaveLength(22);
    for (const technology of [...NETIS_WAVE2_TECHNOLOGIES, ...NETIS_WAVE3_TECHNOLOGIES].filter((item) => item.primaryPurpose === "quality")) {
      expect(container.textContent).toContain(technology.name);
    }
  });

  it("第3陣を含む46件の基番号は重複せず、公式資料と提供元を示す", () => {
    const all = [...FEATURED_NETIS_TECHNOLOGIES, ...NETIS_EFFICIENCY_TECHNOLOGIES, ...NETIS_WAVE2_TECHNOLOGIES, ...NETIS_WAVE3_TECHNOLOGIES];
    expect(all).toHaveLength(46);
    expect(new Set(all.map((item) => item.registrationNumber.replace(/-(?:A|VE)$/i, ""))).size).toBe(46);
    expect(NETIS_WAVE2_TECHNOLOGIES).toHaveLength(15);
    expect(NETIS_WAVE3_TECHNOLOGIES).toHaveLength(15);
    expect(NETIS_WAVE2_TECHNOLOGIES.filter((item) => item.categoryIds.includes("wave2-roadwork"))).toHaveLength(3);
    for (const item of NETIS_WAVE2_TECHNOLOGIES) {
      expect(item.sourceBasis).toContain("2026年4月公式一覧掲載");
      expect(item.sourceBasis).toContain("9月現行NETIS個別状態未確認");
      expect(item.officialSourceUrl).toMatch(/^https:\/\/www\.cgr\.mlit\.go\.jp\//);
      expect(item.providerSourceUrl).toMatch(/^https:\/\//);
    }
    for (const item of NETIS_WAVE3_TECHNOLOGIES) {
      expect(item.sourceBasis).toContain("2026年4月公式一覧掲載");
      expect(item.sourceBasis).toContain("9月現行NETIS個別状態未確認");
      expect(item.officialSourceUrl).toMatch(/^https:\/\/www\.cgr\.mlit\.go\.jp\//);
      expect(item.providerSourceUrl).toMatch(/^https:\/\//);
      expect(item.sourceRegistrationNumber.startsWith(item.registrationNumber)).toBe(true);
      expect(item.summary.length).toBeLessThanOrEqual(60);
      expect(item.limitations.length).toBeGreaterThan(20);
    }
  });

  it("第4陣を合わせた60件を安全22・効率32・品質6に分け、個別照合の範囲を限定する", () => {
    const all = [...FEATURED_NETIS_TECHNOLOGIES, ...NETIS_EFFICIENCY_TECHNOLOGIES, ...NETIS_WAVE2_TECHNOLOGIES, ...NETIS_WAVE3_TECHNOLOGIES, ...NETIS_WAVE4_TECHNOLOGIES];
    expect(all).toHaveLength(60);
    expect(new Set(all.map((item) => item.registrationNumber.replace(/-(?:A|VE)$/i, ""))).size).toBe(60);
    expect(NETIS_WAVE4_TECHNOLOGIES).toHaveLength(14);
    expect(NETIS_WAVE4_TECHNOLOGIES.filter((item) => item.primaryPurpose === "safety")).toHaveLength(12);
    expect(NETIS_WAVE4_TECHNOLOGIES.filter((item) => item.primaryPurpose === "efficiency")).toHaveLength(2);
    for (const item of NETIS_WAVE4_TECHNOLOGIES) {
      const knownCategories = new Set([...NETIS_SAFETY_CATEGORIES, ...NETIS_EFFICIENCY_CATEGORIES, ...NETIS_WAVE2_CATEGORIES, ...NETIS_WAVE4_CATEGORIES].map((category) => category.id));
      expect(item.categoryIds.length).toBeGreaterThan(0);
      expect(item.categoryIds.every((id) => knownCategories.has(id))).toBe(true);
      expect(item.sourceBasis).toContain("2026年9月25日NETIS個別ページの名称・番号を確認");
      expect(item.sourceBasis).toContain("販売・現場適合は未確認");
      expect(item.individualUrl).toBe(`https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=${item.registrationNumber.replace(/-(?:A|VE)$/i, "")}`);
      expect(item.officialSourceUrl).toMatch(/^https:\/\/www\.cgr\.mlit\.go\.jp\//);
      expect(item.limitations.length).toBeGreaterThan(20);
    }
    for (const category of NETIS_WAVE4_CATEGORIES) {
      expect(NETIS_WAVE4_TECHNOLOGIES.some((item) => item.categoryIds.includes(category.id))).toBe(true);
      expect(existsSync(path.join(process.cwd(), "public", category.image))).toBe(true);
      expect(category.imageAlt).toContain("製品写真ではありません");
      expect(category.imageCredit.sourceUrl).toBe("");
    }
  });

  it("新カテゴリの直接URL、番号検索、目的切替を保持する", () => {
    navigation.query = "risk=marine-underwater&q=HRK-190002-VE";
    const { container, unmount } = render(<NetisSafetyExplorer />);
    expect(screen.getByText("海上・水中作業：1件")).toBeDefined();
    expect(container.querySelector("article")?.textContent).toContain("水中据付作業可視化システム");
    expect(container.querySelector("article a[id^='netis-tech-']")?.getAttribute("href")).toBe("https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=HRK-190002");
    unmount();
    navigation.query = "risk=temporary-mats&q=HK-190004";
    render(<NetisSafetyExplorer />);
    expect(screen.getByText("養生・仮設敷設：1件")).toBeDefined();
    expect(screen.getByRole("button", { name: "作業を効率化" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "安全を高める" }));
    expect(navigation.push).toHaveBeenCalledWith("/resources/netis-safety?q=HK-190004", { scroll: false });
  });

  it("第5陣26件と第6陣14件を限定紹介として加え、全100件の基番号と正式名称を重複させない", () => {
    const all = [...FEATURED_NETIS_TECHNOLOGIES, ...NETIS_EFFICIENCY_TECHNOLOGIES, ...NETIS_WAVE2_TECHNOLOGIES, ...NETIS_WAVE3_TECHNOLOGIES, ...NETIS_WAVE4_TECHNOLOGIES, ...NETIS_WAVE5_TECHNOLOGIES, ...NETIS_WAVE6_TECHNOLOGIES];
    expect(all).toHaveLength(100);
    expect(new Set(all.map((item) => item.registrationNumber.replace(/-(?:A|V[ER])$/i, ""))).size).toBe(100);
    expect(new Set(all.map((item) => item.name.normalize("NFKC").toLocaleLowerCase("ja"))).size).toBe(100);
    expect(NETIS_WAVE5_TECHNOLOGIES).toHaveLength(26);
    expect(NETIS_WAVE5_TECHNOLOGIES.filter((item) => item.primaryPurpose === "safety")).toHaveLength(1);
    expect(NETIS_WAVE5_TECHNOLOGIES.filter((item) => item.primaryPurpose === "efficiency")).toHaveLength(15);
    expect(NETIS_WAVE5_TECHNOLOGIES.filter((item) => item.primaryPurpose === "quality")).toHaveLength(10);
    for (const item of NETIS_WAVE5_TECHNOLOGIES) {
      expect(item.limitedIntroduction).toBe(true);
      expect(item.individualUrl).toBe(`https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=${item.registrationNumber.replace(/-(?:A|V[ER])$/i, "")}`);
      expect(item.checkedAt).toBe("2026年9月26日");
      expect(item.summary.length).toBeGreaterThan(15);
    }
    expect(NETIS_WAVE6_TECHNOLOGIES).toHaveLength(14);
    expect(NETIS_WAVE6_TECHNOLOGIES.filter((item) => item.primaryPurpose === "efficiency")).toHaveLength(8);
    expect(NETIS_WAVE6_TECHNOLOGIES.filter((item) => item.primaryPurpose === "quality")).toHaveLength(6);
    for (const item of NETIS_WAVE6_TECHNOLOGIES) {
      expect(item.limitedIntroduction).toBe(true);
      expect(item.checkedAt).toBe("2026年9月26日");
      expect(item.individualUrl).toBe(`https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=${item.registrationNumber.replace(/-(?:A|V[ER])$/i, "")}`);
      expect(item.summary.length).toBeGreaterThan(15);
    }
    const added = [...NETIS_WAVE5_TECHNOLOGIES, ...NETIS_WAVE6_TECHNOLOGIES];
    const searchable = added.map((item) => `${item.name} ${item.summary} ${item.searchTerms} ${item.categoryLabel}`).join(" ");
    for (const term of ["橋梁", "排水", "電気", "地盤", "計測"]) expect(searchable).toContain(term);
    for (const forbidden of ["現役", "期限内", "推奨技術です", "性能を保証", "販売可能"]) {
      expect(added.map((item) => item.summary).join(" ")).not.toContain(forbidden);
    }
    expect(NETIS_WAVE6_TECHNOLOGIES.find((item) => item.registrationNumber === "KT-180043-VE")).toMatchObject({
      name: "クラウド計測システム 『クラウド16』",
      summary: "最大16台の計測器の情報をクラウドへ蓄積し、環境・気象等の計測管理を行う。",
    });
  });

  it("第5陣は番号・用途語・防災カテゴリのURLから探せ、誤認防止文を表示する", () => {
    navigation.query = "purpose=quality&q=KK-150069-VE";
    const { container, unmount } = render(<NetisSafetyExplorer />);
    expect(screen.getByText("品質・検査候補：1件")).toBeDefined();
    expect(container.textContent).toContain("鋼製埋設部路面境界部の損傷判定、診断方法");
    expect(container.textContent).toContain("調査した技術の例");
    expect(container.textContent).toContain("最新の掲載状況・適用条件は公式ページで確認");
    expect(container.querySelector("article a[id^='netis-tech-']")?.getAttribute("href")).toBe("https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KK-150069");
    unmount();

    navigation.query = "risk=flood-defense&q=アクリル";
    render(<NetisSafetyExplorer />);
    expect(screen.getByText("洪水・高潮（防災）：1件")).toBeDefined();
    expect(screen.getByText(/作業員用保護具や避難判断を代替しません/)).toBeDefined();
    expect(screen.getByRole("button", { name: "洪水・高潮（防災）" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("第6陣は公式番号と用途語から探せ、検索状態と公式個別URLを保持する", () => {
    navigation.query = "purpose=efficiency&q=KT-180043-VE";
    const { container, unmount } = render(<NetisSafetyExplorer />);
    expect(screen.getByText("作業効率化候補：1件")).toBeDefined();
    expect(container.textContent).toContain("クラウド計測システム 『クラウド16』");
    expect(container.textContent).toContain("調査した技術の例");
    expect(container.querySelector("article a[id^='netis-tech-']")?.getAttribute("href")).toBe("https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KT-180043");
    expect((screen.getByRole("textbox", { name: "技術名や番号で検索" }) as HTMLInputElement).value).toBe("KT-180043-VE");
    unmount();

    navigation.query = "purpose=quality&q=防水 コネクタ";
    render(<NetisSafetyExplorer />);
    expect(screen.getByText("品質・検査候補：1件")).toBeDefined();
    expect(screen.getByText("EGy防水コネクタ")).toBeDefined();
  });

  it("目的タブの直後に検索を置き、画像カテゴリを巡回せず絞り込める", () => {
    const { container } = render(<NetisSafetyExplorer />);
    const purposeGroup = screen.getByRole("group", { name: "探す目的" });
    const search = screen.getByRole("search", { name: "当サイト掲載NETIS技術を検索" });
    const categoryGroup = screen.getByRole("group", { name: "安全課題カテゴリ" });
    expect(purposeGroup.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(search.compareDocumentPosition(categoryGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("効率化候補は資料の末尾付き番号でも検索できる", () => {
    navigation.query = "purpose=efficiency&q=KT-210020-A";
    const { container } = render(<NetisSafetyExplorer />);
    expect(screen.getByText("作業効率化候補：1件")).toBeDefined();
    expect(container.querySelectorAll("article")).toHaveLength(1);
    expect(container.querySelector("article")?.textContent).toContain("ScanX");
  });

  it("追加した現場技術は名称・末尾付き番号・既存カテゴリで発見できる", () => {
    navigation.query = "purpose=efficiency&risk=wave2-roadwork&q=SK-190003-VE";
    const { container } = render(<NetisSafetyExplorer />);
    expect(screen.getByText("道路作業・区画線：1件")).toBeDefined();
    expect(container.querySelector("article")?.textContent).toContain("冬用タイヤ自動判別システム");
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

  it("カテゴリ解除直後の検索は未確定URLを継ぎ、古いriskと検索語を復活させない", () => {
    navigation.query = "purpose=efficiency&risk=wave2-roadwork&q=old";
    render(<NetisSafetyExplorer />);

    // router がまだ新しい searchParams を渡していない間に続けて検索する。
    fireEvent.click(screen.getByRole("button", { name: "絞り込みを解除" }));
    expect(navigation.push).toHaveBeenNthCalledWith(
      1,
      "/resources/netis-safety?purpose=efficiency",
      { scroll: false },
    );
    fireEvent.change(screen.getByLabelText(/名称・登録番号・用途/), {
      target: { value: "KT-230092-A" },
    });
    fireEvent.click(screen.getByRole("button", { name: "掲載技術を検索" }));

    expect(navigation.push).toHaveBeenNthCalledWith(
      2,
      "/resources/netis-safety?purpose=efficiency&q=KT-230092-A",
      { scroll: false },
    );
  });
});
