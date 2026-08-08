import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskPageIntro } from "./task-page-intro";

describe("TaskPageIntro", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    window.history.replaceState(null, "", "/");
  });

  it("compact 表示でも視覚ステップと同じ内容を支援技術へ残す", () => {
    render(
      <TaskPageIntro
        title="化学物質リスクアセスメント"
        summary="入力前に利用の流れを確認できます。"
        primaryAction={{ href: "#start", label: "評価を始める" }}
        things={["物質を特定", "SDS・成分を確認", "公式ツールへ引き継ぐ"]}
        visual="chemical"
        compactOnMobile
      />,
    );

    const accessibleSteps = screen.getByRole("list", {
      name: "このページでできること",
    });
    expect(accessibleSteps.className).toContain("sr-only");
    expect(accessibleSteps.className).not.toContain("hidden");
    expect(accessibleSteps.textContent).toContain("物質を特定");
    expect(accessibleSteps.textContent).toContain("公式ツールへ引き継ぐ");
  });

  it("5段階フローを図解へ表示し、本文の要点は3件以内に保つ", () => {
    render(
      <TaskPageIntro
        title="化学物質リスクアセスメント"
        summary="物質と作業条件を順に確認します。"
        primaryAction={{ href: "#start", label: "物質を確認する" }}
        things={["物質を特定", "SDSを確認", "公式へ引き継ぐ"]}
        visualSteps={[
          "物質を特定",
          "SDSを確認",
          "作業条件を入力",
          "対策を確認",
          "公式・専門家で最終確認",
        ]}
        visual="chemical"
      />,
    );

    const visual = document.querySelector('[aria-hidden="true"].relative');
    expect(visual?.textContent).toContain("公式・専門家で最終確認");
    expect(
      screen.getByRole("list", { name: "このページでできること" }).children,
    ).toHaveLength(3);
  });

  it("主CTAで対象入力を表示してfocusし、通常のhash導線も維持する", () => {
    render(
      <>
        <TaskPageIntro
          title="法令・条文を検索"
          summary="収録索引から確認します。"
          primaryAction={{ href: "#search-form", label: "法令を検索する" }}
        />
        <section id="search-form">
          <label>
            <input type="checkbox" />
            補助条件
          </label>
          <label htmlFor="law-query">法令名・条番号</label>
          <input id="law-query" data-primary-focus="" />
        </section>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: /法令を検索する/ }));

    expect(document.activeElement).toBe(screen.getByLabelText("法令名・条番号"));
    expect(window.location.hash).toBe("#search-form");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("主CTAを含む冒頭CTAを最大3件に保つ", () => {
    render(
      <TaskPageIntro
        title="今日の安全"
        summary="必要な操作を先に示します。"
        primaryAction={{ href: "#start", label: "地域を選ぶ" }}
        secondaryActions={[
          { href: "/ky/paper", label: "KYを作る" },
          { href: "/signage", label: "朝礼で表示" },
          { href: "/accidents", label: "事故を見る" },
        ]}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
});
