import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";
import { SAFETY_TONE } from "@/lib/design/safety-tone";
import { ConclusionCard } from "./conclusion-card";
import { CollapsibleDetail } from "./collapsible-detail";

// 共通視覚言語（柱0-0）の部品の回帰ガード。
// 無読テストの前提＝「色＋アイコン＋デカ数字」が確実に描画されること。

describe("StatusBadge", () => {
  it("ラベルとトーン既定アイコンを描画する", () => {
    const { container } = render(<StatusBadge tone="danger">期限超過 3件</StatusBadge>);
    expect(screen.getByText("期限超過 3件")).toBeDefined();
    // 色だけに頼らない原則: アイコン(svg)が必ず付く
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("solid バリアントは濃色塗りクラスを持つ", () => {
    const { container } = render(
      <StatusBadge tone="safe" variant="solid">
        対応済
      </StatusBadge>,
    );
    // 具体色はトークン(safety-tone.ts)が真実。ここでは「solid がトークン経由で塗られること」を固定する
    expect(container.firstElementChild?.className).toContain(SAFETY_TONE.safe.solid);
  });
});

describe("ConclusionCard", () => {
  it("デカ数字・単位・短ラベルを描画し、role=status で読み上げ可能", () => {
    render(<ConclusionCard tone="danger" value={3} unit="件" title="期限超過" />);
    const card = screen.getByRole("status", { name: "いまの状態: 期限超過" });
    expect(card).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("期限超過")).toBeDefined();
  });

  it("value 省略時はデカアイコンが主役になる（svgあり・数字なし）", () => {
    const { container } = render(<ConclusionCard tone="safe" title="要対応なし" />);
    expect(container.querySelector("svg.h-12")).not.toBeNull();
  });

  it("action は次にやることへのリンクとして描画される", () => {
    render(
      <ConclusionCard
        tone="warning"
        value={2}
        unit="件"
        title="要対応"
        action={{ href: "/site-records/patrol", label: "対応する" }}
      />,
    );
    const link = screen.getByRole("link", { name: /対応する/ });
    expect(link.getAttribute("href")).toBe("/site-records/patrol");
  });
});

describe("CollapsibleDetail", () => {
  it("summary 見出しと本文を <details> で描画する（初期は閉）", () => {
    const { container } = render(
      <CollapsibleDetail summary="保存先とご利用上の注意">本文テキスト</CollapsibleDetail>,
    );
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);
    expect(screen.getByText("保存先とご利用上の注意")).toBeDefined();
    expect(screen.getByText("本文テキスト")).toBeDefined();
  });

  it("defaultOpen で初期展開できる", () => {
    const { container } = render(
      <CollapsibleDetail summary="見出し" defaultOpen>
        本文
      </CollapsibleDetail>,
    );
    expect(container.querySelector("details")?.hasAttribute("open")).toBe(true);
  });
});
