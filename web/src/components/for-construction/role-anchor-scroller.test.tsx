import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { RoleAnchorScroller } from "./role-anchor-scroller";

// C-1: useSearchParams（CSRベイルアウトの原因）→ window.location 読みに変更したため、
// next/navigation のモックではなく history API で実URLを設定して検証する。
function setSearch(search: string) {
  window.history.replaceState(null, "", `/for/construction${search}`);
}

describe("RoleAnchorScroller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    setSearch("");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setSearch("");
  });

  it("?role=foreman で #for-foreman にスクロール", () => {
    const target = document.createElement("section");
    target.id = "for-foreman";
    target.tabIndex = -1;
    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy as unknown as typeof target.scrollIntoView;
    document.body.appendChild(target);
    setSearch("?role=foreman");

    render(<RoleAnchorScroller />);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it("?role=manager で #for-manager にスクロール", () => {
    const target = document.createElement("section");
    target.id = "for-manager";
    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy as unknown as typeof target.scrollIntoView;
    document.body.appendChild(target);
    setSearch("?role=manager");

    render(<RoleAnchorScroller />);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it("?role=supervisor で #for-supervisor にスクロール", () => {
    const target = document.createElement("section");
    target.id = "for-supervisor";
    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy as unknown as typeof target.scrollIntoView;
    document.body.appendChild(target);
    setSearch("?role=supervisor");

    render(<RoleAnchorScroller />);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it("role 未指定なら何もしない", () => {
    const target = document.createElement("section");
    target.id = "for-foreman";
    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy as unknown as typeof target.scrollIntoView;
    document.body.appendChild(target);

    render(<RoleAnchorScroller />);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("未知の role 値なら何もしない", () => {
    const target = document.createElement("section");
    target.id = "for-foreman";
    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy as unknown as typeof target.scrollIntoView;
    document.body.appendChild(target);
    setSearch("?role=unknown-role");

    render(<RoleAnchorScroller />);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("該当 ID の要素が存在しなければ何もしない", () => {
    setSearch("?role=foreman");
    // 例外を投げないこと
    expect(() => render(<RoleAnchorScroller />)).not.toThrow();
  });
});
