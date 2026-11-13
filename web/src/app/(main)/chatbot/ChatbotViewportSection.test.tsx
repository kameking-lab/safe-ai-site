import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHATBOT_SECTION_HEIGHT,
  ChatbotViewportSection,
} from "./ChatbotViewportSection";

describe("ChatbotViewportSection（相談ボックスを下のタブバーの上に収める）", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("ResizeObserver内で高さを書き換えず、次の描画にまとめて解除時は取消す", () => {
    let notify!: () => void;
    let frame!: FrameRequestCallback;
    const cancel = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { notify = callback; }
      observe() {}
      disconnect = disconnect;
    });
    const schedule = vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1; });
    vi.stubGlobal("requestAnimationFrame", schedule);
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const box = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({top:120} as DOMRect);
    const view = render(<ChatbotViewportSection aria-label="相談" />);
    const section = screen.getByRole("region", { name: "相談" });
    box.mockReturnValue({top:186} as DOMRect);
    act(() => { notify(); notify(); });
    expect(section.style.getPropertyValue("--chatbot-top")).toBe("120px");
    expect(schedule).toHaveBeenCalledTimes(1);
    act(() => frame(0));
    expect(section.style.getPropertyValue("--chatbot-top")).toBe("186px");
    act(() => notify());
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledWith(1);
  });

  it("高さは実測した上端・タブバー・ホームインジケーターを画面の高さから引く", () => {
    expect(CHATBOT_SECTION_HEIGHT).toContain("var(--chatbot-viewport-height, 100dvh) - var(--chatbot-top, 5rem) - 0.5rem");
    expect(CHATBOT_SECTION_HEIGHT).toContain("var(--mobile-bottom-nav-h, 0px)");
    expect(CHATBOT_SECTION_HEIGHT).toContain("env(safe-area-inset-bottom, 0px)");
    // 実測前の既定値はスマホのウェブで従来の 100dvh − 9rem と同じ（5rem + 0.5rem + 56px = 9rem）
    expect(5 + 0.5 + 56 / 16).toBe(9);
  });
  it("キーボードで表示範囲が縮んだらvisualViewportの高さを使う",()=>{
    const viewport=Object.assign(new EventTarget(),{height:852});
    vi.stubGlobal("visualViewport",viewport);
    try{
      render(<ChatbotViewportSection aria-label="相談"/>);
      const section=screen.getByRole("region",{name:"相談"});
      expect(section.style.getPropertyValue("--chatbot-viewport-height")).toBe("852px");
      viewport.height=500;act(()=>viewport.dispatchEvent(new Event("resize")));
      expect(section.style.getPropertyValue("--chatbot-viewport-height")).toBe("500px");
    }finally{vi.unstubAllGlobals();}
  });

  it("描画直後にボックスの上端（ページ先頭からの位置）を --chatbot-top に入れる", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 231.4,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 231.4,
      toJSON: () => ({}),
    } as DOMRect);
    render(
      <ChatbotViewportSection aria-label="相談">
        <textarea aria-label="作業を質問" />
      </ChatbotViewportSection>,
    );
    const section = screen.getByRole("region", { name: "相談" });
    expect(section.style.getPropertyValue("--chatbot-top")).toBe("231px");
    expect(section.style.height).toBe(CHATBOT_SECTION_HEIGHT);
    expect(screen.getByRole("textbox", { name: "作業を質問" })).toBeTruthy();
  });

  it("上の帯の高さが変わったら（画面の回転・利用枠の表示など）測り直す", () => {
    let top = 120;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ top, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) }) as DOMRect,
    );
    render(<ChatbotViewportSection aria-label="相談" />);
    const section = screen.getByRole("region", { name: "相談" });
    expect(section.style.getPropertyValue("--chatbot-top")).toBe("120px");
    top = 186;
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(section.style.getPropertyValue("--chatbot-top")).toBe("186px");
  });
});
