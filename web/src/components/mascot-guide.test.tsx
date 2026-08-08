import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "@/components/empty-state";
import { ErrorNotice } from "@/components/error-notice";
import { Mascot } from "@/components/mascot";
import {
  MASCOT_GUIDE_VARIANTS,
  MascotGuide,
  type MascotGuideVariant,
} from "@/components/mascot-guide";

const EXPECTED_IMAGE_VARIANTS: Record<MascotGuideVariant, string> = {
  default: "pointing",
  search: "detective",
  learning: "teacher",
  caution: "thinking",
  success: "salute",
  heat: "seasonal-summer",
  automation: "tablet-dx",
  error: "bow",
  emergency: "emergency-serious",
};

describe("MascotGuide", () => {
  it("年次計画用は同一犬に見える既存の書類ポーズを使う", () => {
    const { container } = render(
      <Mascot variant="calendar-plan" size="lg" alt="" />,
    );
    expect(
      decodeURIComponent(
        container.querySelector("img")?.getAttribute("src") ?? "",
      ),
    ).toContain("/mascot/mascot-stamp-doc.webp");
  });

  it("意味的variantを9種類に固定し、用途に適した既存ポーズへ割り当てる", () => {
    expect(MASCOT_GUIDE_VARIANTS).toEqual([
      "default",
      "search",
      "learning",
      "caution",
      "success",
      "heat",
      "automation",
      "error",
      "emergency",
    ]);

    for (const variant of MASCOT_GUIDE_VARIANTS) {
      const { container, unmount } = render(
        <MascotGuide variant={variant} title={`${variant} の案内`} />,
      );
      const guide = container.querySelector("[data-mascot-guide]");
      expect(guide?.getAttribute("data-mascot-variant")).toBe(variant);
      expect(guide?.getAttribute("data-mascot-image-variant")).toBe(
        EXPECTED_IMAGE_VARIANTS[variant],
      );
      unmount();
    }
  });

  it("emergencyは上書き指定にかかわらず真剣な専用画像とserious状態を使う", () => {
    const { container, rerender } = render(
      <MascotGuide
        variant="emergency"
        imageVariant="banzai"
        serious={false}
        title="緊急時は現場の指示に従ってください"
      />,
    );
    const guide = container.querySelector("[data-mascot-guide]");
    const image = container.querySelector("img");

    expect(guide?.getAttribute("data-mascot-image-variant")).toBe(
      "emergency-serious",
    );
    expect(guide?.getAttribute("data-serious")).toBe("true");
    expect(decodeURIComponent(image?.getAttribute("src") ?? "")).toContain(
      "/mascot/mascot-emergency-serious.webp",
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(guide?.getAttribute("aria-live")).toBeNull();

    rerender(
      <MascotGuide
        variant="caution"
        imageVariant="banzai"
        serious
        title="落ち着いて手順を確認してください"
      />,
    );
    expect(
      container
        .querySelector("[data-mascot-guide]")
        ?.getAttribute("data-mascot-image-variant"),
    ).toBe("emergency-serious");
  });

  it("画像は既定で装飾扱いとし、意味を持たせる場合だけ固有altを設定できる", () => {
    const { container, rerender } = render(
      <MascotGuide title="次の操作を選んでください" />,
    );
    const decorativeImage = container.querySelector("img");
    expect(decorativeImage?.getAttribute("alt")).toBe("");
    expect(decorativeImage?.getAttribute("width")).toBe("400");
    expect(decorativeImage?.getAttribute("height")).toBe("388");
    expect(decorativeImage?.style.width).toBe("96px");
    expect(decorativeImage?.style.height).toBe("auto");

    rerender(
      <MascotGuide
        variant="search"
        title="事故事例を調べます"
        imageAlt="虫眼鏡で資料を確認するチワワ案内役"
      />,
    );
    expect(
      screen.getByRole("img", {
        name: "虫眼鏡で資料を確認するチワワ案内役",
      }),
    ).toBeTruthy();
  });

  it("画像の読み込みに失敗しても案内文とCTAを利用できる", () => {
    const onAction = vi.fn();
    const { container } = render(
      <MascotGuide
        variant="error"
        title="検索結果を表示できません"
        message="条件を変えるか、もう一度お試しください。"
        action={
          <button type="button" onClick={onAction}>
            条件を変える
          </button>
        }
      />,
    );
    const image = container.querySelector("img");
    expect(image).toBeTruthy();

    fireEvent.error(image as HTMLImageElement);
    expect(screen.getByText("検索結果を表示できません")).toBeTruthy();
    expect(
      screen.getByText("条件を変えるか、もう一度お試しください。"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "条件を変える" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("短い案内タイトルを説明段落として誤集計せず、必要時は見出しへ変更できる", () => {
    const { rerender } = render(
      <MascotGuide title="次の操作を確認" message="案内の説明です。" />,
    );
    expect(screen.getByText("次の操作を確認").tagName).toBe("SPAN");
    expect(screen.getByText("案内の説明です。").tagName).toBe("DIV");

    rerender(<MascotGuide title="学習の次の段階" titleAs="h3" />);
    expect(
      screen.getByRole("heading", { level: 3, name: "学習の次の段階" }),
    ).toBeDefined();
  });

  it("LCP候補だけをeager/high priorityにでき、通常案内はlazyのままにする", () => {
    const { container, rerender } = render(
      <MascotGuide title="通常案内" />,
    );
    let image = container.querySelector("img");
    expect(image?.getAttribute("loading")).toBe("lazy");
    expect(image?.getAttribute("fetchpriority")).toBe("auto");
    expect(image?.getAttribute("sizes")).toBe("96px");

    rerender(<MascotGuide title="ヒーロー案内" eager />);
    image = container.querySelector("img");
    expect(image?.getAttribute("loading")).toBe("eager");
    expect(image?.getAttribute("fetchpriority")).toBe("high");
  });

  it("EmptyStateは専用ポーズを保ち、ErrorNoticeはerror案内と再試行を提供する", () => {
    const { container, rerender } = render(
      <EmptyState
        variant="water-break"
        title="まだ記録がありません"
        description="測定を追加してください。"
      />,
    );
    let guide = container.querySelector("[data-mascot-guide]");
    expect(guide?.getAttribute("data-mascot-variant")).toBe("heat");
    expect(guide?.getAttribute("data-mascot-image-variant")).toBe(
      "water-break",
    );

    const onRetry = vi.fn();
    rerender(
      <ErrorNotice
        title="一覧を取得できません"
        error={{ code: "NETWORK", message: "通信を確認してください。", retryable: true }}
        onRetry={onRetry}
      />,
    );
    guide = container.querySelector("[data-mascot-guide]");
    expect(guide?.getAttribute("data-mascot-variant")).toBe("error");
    expect(guide?.getAttribute("data-mascot-image-variant")).toBe("bow");
    fireEvent.click(screen.getByRole("button", { name: "もう一度試す" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
