import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { RoleAnchorScroller } from "./role-anchor-scroller";

const mockGet = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
}));

describe("RoleAnchorScroller", () => {
  beforeEach(() => {
    mockGet.mockReset();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("?role=foreman で #for-foreman にスクロール", () => {
    const target = document.createElement("section");
    target.id = "for-foreman";
    target.tabIndex = -1;
    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy as unknown as typeof target.scrollIntoView;
    document.body.appendChild(target);
    mockGet.mockImplementation((k: string) => (k === "role" ? "foreman" : null));

    render(<RoleAnchorScroller />);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it("?role=manager で #for-manager にスクロール", () => {
    const target = document.createElement("section");
    target.id = "for-manager";
    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy as unknown as typeof target.scrollIntoView;
    document.body.appendChild(target);
    mockGet.mockImplementation((k: string) => (k === "role" ? "manager" : null));

    render(<RoleAnchorScroller />);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it("?role=supervisor で #for-supervisor にスクロール", () => {
    const target = document.createElement("section");
    target.id = "for-supervisor";
    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy as unknown as typeof target.scrollIntoView;
    document.body.appendChild(target);
    mockGet.mockImplementation((k: string) => (k === "role" ? "supervisor" : null));

    render(<RoleAnchorScroller />);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it("role 未指定なら何もしない", () => {
    const target = document.createElement("section");
    target.id = "for-foreman";
    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy as unknown as typeof target.scrollIntoView;
    document.body.appendChild(target);
    mockGet.mockImplementation(() => null);

    render(<RoleAnchorScroller />);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("未知の role 値なら何もしない", () => {
    const target = document.createElement("section");
    target.id = "for-foreman";
    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy as unknown as typeof target.scrollIntoView;
    document.body.appendChild(target);
    mockGet.mockImplementation((k: string) => (k === "role" ? "unknown-role" : null));

    render(<RoleAnchorScroller />);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("該当 ID の要素が存在しなければ何もしない", () => {
    mockGet.mockImplementation((k: string) => (k === "role" ? "foreman" : null));
    // 例外を投げないこと
    expect(() => render(<RoleAnchorScroller />)).not.toThrow();
  });
});
