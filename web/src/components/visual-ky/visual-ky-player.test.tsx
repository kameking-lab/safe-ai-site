import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_VISUAL_KY_SCENARIOS } from "@/data/visual-ky";
import { VISUAL_KY_PROGRESS_KEY } from "@/lib/visual-ky/progress";
import { VisualKyPlayer } from "./visual-ky-player";
import { VisualKyStaticReference } from "./visual-ky-static-reference";
import {
  KY_HANDOFF_STORAGE_KEY,
  parseKyHandoffFromLocation,
} from "@/lib/ky/handoff";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/lib/visual-ky/analytics", () => ({
  trackVisualKyEvent: vi.fn(),
}));

const scenario = PUBLIC_VISUAL_KY_SCENARIOS[0];
const catalog = PUBLIC_VISUAL_KY_SCENARIOS.map((item) => ({
  id: item.id,
  categoryTags: item.categoryTags,
}));

describe("VisualKyPlayer", () => {
  beforeEach(() => {
    router.push.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
    parseKyHandoffFromLocation("");
  });

  it("hotspotと同じ内容のテキスト一覧をbuttonで選び、解説へ進める", async () => {
    render(
      <VisualKyPlayer
        scenario={scenario}
        nextHref="/training/visual-ky/aerial-lift-entrapment"
        progressCatalog={catalog}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "イラストから危険を探す" }),
    );
    const imageHotspot = screen.getByRole("button", { name: /候補1:/ });
    expect(imageHotspot.getAttribute("aria-pressed")).toBe("false");
    expect(imageHotspot.className).toContain("min-h-11");
    expect(imageHotspot.className).toContain("min-w-11");

    fireEvent.click(imageHotspot);
    expect(imageHotspot.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(
      screen.getByRole("button", { name: "予想を確定して解説を見る" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "危険と優先対策の解説",
      }),
    ).toBeTruthy();
    expect(screen.getAllByText("作業中止・エスカレーション").length).toBe(
      scenario.hazards.length,
    );
    expect(screen.getByText(/見逃しは責めず/)).toBeTruthy();
    for (const sourceId of scenario.hazards[0].sourceIds) {
      const source = scenario.officialSources.find(
        (candidate) => candidate.id === sourceId,
      );
      expect(source).toBeDefined();
      expect(screen.getAllByText(source!.locator, { exact: false }).length).toBeGreaterThan(0);
      expect(
        screen.getAllByText(source!.applicableScope, { exact: false }).length,
      ).toBeGreaterThan(0);
    }
  });

  it("未選択を明示確認すれば完了でき、個人情報なしの粗い進捗だけを端末保存する", async () => {
    render(
      <VisualKyPlayer
        scenario={scenario}
        nextHref="/training/visual-ky/aerial-lift-entrapment"
        progressCatalog={catalog}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "イラストから危険を探す" }),
    );
    expect(
      screen.getByRole("button", { name: "予想を確定して解説を見る" }),
    ).toHaveProperty("disabled", true);
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /危険なしと判断して解説へ進む/,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "予想を確定して解説を見る" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "対策を選ぶ" }));
    expect(screen.getByRole("button", { name: "まとめへ進む" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /対策をまだ選べないため/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "まとめへ進む" }));

    expect(
      screen.getByRole("heading", { name: "5分KYTを完了しました" }),
    ).toBeTruthy();
    expect(screen.getByText(/対策未選択として明示確認/)).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "選んだ対策の振り返り" }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(window.localStorage.getItem(VISUAL_KY_PROGRESS_KEY)).toContain(
        scenario.id,
      ),
    );
    const stored = window.localStorage.getItem(VISUAL_KY_PROGRESS_KEY) ?? "";
    expect(stored).not.toMatch(/name|email|company|answerText|health|siteName/i);
  });

  it("選んだ対策を責めずに優先候補・見直し候補として振り返る", () => {
    render(
      <VisualKyPlayer
        scenario={scenario}
        nextHref="/training/visual-ky/aerial-lift-entrapment"
        progressCatalog={catalog}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "イラストから危険を探す" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /危険なしと判断して解説へ進む/,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "予想を確定して解説を見る" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "対策を選ぶ" }));
    const recommended = scenario.countermeasureOptions.find(
      (option) => option.recommended,
    )!;
    const review = scenario.countermeasureOptions.find(
      (option) => !option.recommended,
    )!;
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: new RegExp(recommended.label),
      }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: new RegExp(review.label) }),
    );
    fireEvent.click(screen.getByRole("button", { name: "まとめへ進む" }));

    expect(
      screen.getByText(`優先候補：${recommended.label}`),
    ).toBeTruthy();
    expect(screen.getByText(`見直し候補：${review.label}`)).toBeTruthy();
    expect(screen.getByText(review.rationale)).toBeTruthy();
  });

  it("画像読込失敗時もテキスト教材へ案内する", () => {
    const { container } = render(
      <VisualKyPlayer
        scenario={scenario}
        nextHref="/training/visual-ky/aerial-lift-entrapment"
        progressCatalog={catalog}
      />,
    );
    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    fireEvent.error(image as HTMLImageElement);
    expect(screen.getByText("画像を読み込めませんでした")).toBeTruthy();
    expect(screen.getByText(/画像を見ないで学ぶ/)).toBeTruthy();
  });

  it("KY引継ぎへ選んだ危険と対策を一時メモリだけで渡す", () => {
    render(
      <VisualKyPlayer
        scenario={scenario}
        nextHref="/training/visual-ky/aerial-lift-entrapment"
        progressCatalog={catalog}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "イラストから危険を探す" }));
    const hotspot = screen.getByRole("button", { name: /候補1:/ });
    fireEvent.click(hotspot);
    fireEvent.click(screen.getByRole("button", { name: "予想を確定して解説を見る" }));
    fireEvent.click(screen.getByRole("button", { name: "対策を選ぶ" }));
    const measure = scenario.countermeasureOptions[0]!;
    fireEvent.click(
      screen.getByRole("checkbox", { name: new RegExp(measure.label) }),
    );
    fireEvent.click(screen.getByRole("button", { name: "まとめへ進む" }));
    const link = screen.getByRole("link", { name: "この問題でKYを作る" });
    fireEvent.click(link);
    expect(router.push).toHaveBeenCalledWith("/ky/paper");
    expect(window.sessionStorage.getItem(KY_HANDOFF_STORAGE_KEY)).toBeNull();
    const href = link.getAttribute("href") ?? "";
    const target = new URL(href, "https://example.invalid");
    expect(target.pathname).toBe("/ky/paper");
    expect([...target.searchParams.keys()]).toEqual([]);
    const stored = parseKyHandoffFromLocation(target.search);
    const firstHotspot = scenario.hotspots[0]!;
    const selectedHazard = scenario.hazards.find(
      (hazard) => hazard.id === firstHotspot.hazardId,
    );
    expect(stored?.hazardDrafts).toEqual([
      { id: selectedHazard?.id, title: selectedHazard?.title },
    ]);
    expect(stored?.measureDrafts?.[0]?.text).toBe(measure.label);
    expect(window.sessionStorage.getItem(KY_HANDOFF_STORAGE_KEY)).toBeNull();
    expect(link.getAttribute("href")).not.toContain(selectedHazard?.title ?? "__missing__");
  });
});

describe("VisualKyStaticReference", () => {
  it("画像を見なくても場面、全危険、中止条件、一次資料を読める", () => {
    render(<VisualKyStaticReference scenario={scenario} />);
    expect(
      screen.getByRole("heading", {
        name: "場面説明・危険・対策のテキスト版",
      }),
    ).toBeTruthy();
    for (const hazard of scenario.hazards) {
      expect(screen.getByText(new RegExp(hazard.title))).toBeTruthy();
      expect(screen.getByText(hazard.firstAction)).toBeTruthy();
      for (const control of hazard.engineeringControls) {
        expect(screen.getAllByText(control).length).toBeGreaterThan(0);
      }
      for (const control of hazard.administrativeControls) {
        expect(screen.getAllByText(control).length).toBeGreaterThan(0);
      }
      for (const item of hazard.ppe) {
        expect(screen.getAllByText(item).length).toBeGreaterThan(0);
      }
      for (const sourceId of hazard.sourceIds) {
        const source = scenario.officialSources.find(
          (candidate) => candidate.id === sourceId,
        );
        expect(source).toBeDefined();
        expect(
          screen.getAllByText(source!.applicableScope, { exact: false }).length,
        ).toBeGreaterThan(0);
      }
    }
    expect(
      screen.getByRole("heading", {
        name: "一次資料・適用範囲・確認日",
      }),
    ).toBeTruthy();
  });
});
