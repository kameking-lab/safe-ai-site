import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RegulationTagBadge, RegulationTagBadgeList } from "./regulation-tag-badge";

describe("RegulationTagBadge", () => {
  it("既知タグの shortLabel を描画", () => {
    render(<RegulationTagBadge tag="prtr1" />);
    expect(screen.getByText("PRTR第一種")).toBeDefined();
  });

  it("title 属性に fullLabel が入る", () => {
    render(<RegulationTagBadge tag="nite" />);
    const span = screen.getByText("政府版GHS");
    expect(span.getAttribute("title")).toContain("NITE");
  });

  it("onClick があれば button、なければ span", () => {
    const { rerender } = render(<RegulationTagBadge tag="waste" />);
    expect(screen.getByText("廃掃法").tagName).toBe("SPAN");
    rerender(<RegulationTagBadge tag="waste" onClick={() => {}} />);
    expect(screen.getByText("廃掃法").tagName).toBe("BUTTON");
  });
});

describe("RegulationTagBadgeList", () => {
  it("空配列なら何も描画しない", () => {
    const { container } = render(<RegulationTagBadgeList tags={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("未定義タグを除外して描画", () => {
    render(<RegulationTagBadgeList tags={["nite", "prtr1", "unknown"]} />);
    expect(screen.getByText("政府版GHS")).toBeDefined();
    expect(screen.getByText("PRTR第一種")).toBeDefined();
    expect(screen.queryByText("unknown")).toBeNull();
  });

  it("maxVisible を超える場合 +N で表示", () => {
    render(
      <RegulationTagBadgeList
        tags={["nite", "prtr1", "prtr2", "cscl1", "cscl2", "waste", "poison-control"]}
        maxVisible={3}
      />
    );
    expect(screen.getByText("政府版GHS")).toBeDefined();
    expect(screen.getByText("PRTR第一種")).toBeDefined();
    expect(screen.getByText("PRTR第二種")).toBeDefined();
    expect(screen.getByText("+4")).toBeDefined();
  });

  it("ジクロロメタンの 3 タグ (nite + prtr1 + waste) を全描画", () => {
    render(<RegulationTagBadgeList tags={["nite", "prtr1", "waste"]} maxVisible={5} />);
    expect(screen.getByText("政府版GHS")).toBeDefined();
    expect(screen.getByText("PRTR第一種")).toBeDefined();
    expect(screen.getByText("廃掃法")).toBeDefined();
    expect(screen.queryByText(/\+/)).toBeNull();
  });
});
