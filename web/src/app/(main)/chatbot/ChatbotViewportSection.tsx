"use client";

import { useLayoutEffect, useRef, type ComponentPropsWithoutRef } from "react";

/**
 * 相談ボックスの高さ = 画面の高さ − ボックスより上にあるもの（実測）− 下のタブバー − ホームインジケーター。
 *
 * 以前は `calc(100dvh - 9rem)` 固定で、ウェブのヘッダー（約64px）と余白・タブバー（56px）しか
 * 引いていなかった。iOSアプリでは本文がステータスバー分（59px）下がり、アプリ共通ヘッダーと
 * 利用枠の帯も上に入るため、入力欄と送信ボタンが下のタブバーの裏に潜っていた。
 *
 * 実測前（サーバー描画・JS読み込み前）の既定値 5rem は、スマホのウェブで従来と同じ
 * 100dvh − 9rem（5rem + 0.5rem + タブバー56px）になるように選んでいる。
 */
export const CHATBOT_SECTION_HEIGHT =
  "clamp(8rem, calc(var(--chatbot-viewport-height, 100dvh) - var(--chatbot-top, 5rem) - 0.5rem - var(--mobile-bottom-nav-h, 0px) - env(safe-area-inset-bottom, 0px)), 52rem)";

export function ChatbotViewportSection({
  style,
  children,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = ref.current;
    if (!section) return;
    const viewport = window.visualViewport;
    let fullHeight = window.innerHeight;
    let fullWidth = window.innerWidth;
    const measure = () => {
      const height = viewport?.height ?? window.innerHeight;
      // Some WKWebViews resize innerHeight too. Preserve the pre-keyboard
      // height across blur/submit; only a rotation starts a new baseline.
      fullHeight = fullWidth === window.innerWidth ? Math.max(fullHeight, window.innerHeight) : window.innerHeight;
      fullWidth = window.innerWidth;
      const keyboard = window.innerWidth < 768 && fullHeight - height > 150;
      section.toggleAttribute("data-keyboard-open", keyboard);
      // WKWebView pans the visual viewport independently of document scroll.
      // Keep the whole conversation above the keyboard, rather than letting
      // WebKit scroll a sticky composer after a quota card changes its height.
      section.style.setProperty("--chatbot-viewport-offset", `${viewport?.offsetTop ?? 0}px`);
      section.style.setProperty("--chatbot-viewport-height", `${height}px`);
      const top = Math.max(
        0,
        Math.round(section.getBoundingClientRect().top - (viewport?.offsetTop ?? 0)),
      );
      const next = `${top}px`;
      if (section.style.getPropertyValue("--chatbot-top") !== next) {
        section.style.setProperty("--chatbot-top", next);
      }
    };
    measure();
    // Changing height inside ResizeObserver can resize its own observed body.
    // Apply those measurements in the next frame, outside the observer delivery.
    let frame = 0;
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure(); });
    };
    // ボックスより上の帯（お知らせ・アプリの利用枠表示など）は後から高さが変わる。
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    observer?.observe(document.body);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", schedule);
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", schedule);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", schedule);
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <section
      ref={ref}
      data-chatbot-viewport-section=""
      style={{ ...style, height: CHATBOT_SECTION_HEIGHT }}
      {...props}
    >
      <style>{`
        [data-chatbot-viewport-section][data-keyboard-open] {
          position: fixed; z-index: 60;
          top: calc(var(--chatbot-viewport-offset, 0px) + env(safe-area-inset-top, 0px));
          left: 0; right: 0; margin: 0 auto;
          height: max(0px, calc(var(--chatbot-viewport-height) - env(safe-area-inset-top, 0px))) !important;
          background: white;
        }
        html.dark [data-chatbot-viewport-section][data-keyboard-open] { background: #020617; }
        body:has([data-keyboard-open]) [data-mobile-nav="bottom"] { display: none !important; }
      `}</style>
      {children}
    </section>
  );
}
