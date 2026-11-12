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
    const measure = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      section.style.setProperty("--chatbot-viewport-height", `${height}px`);
      const top = Math.max(
        0,
        Math.round(section.getBoundingClientRect().top + window.scrollY),
      );
      const next = `${top}px`;
      if (section.style.getPropertyValue("--chatbot-top") !== next) {
        section.style.setProperty("--chatbot-top", next);
      }
    };
    measure();
    // ボックスより上の帯（お知らせ・アプリの利用枠表示など）は後から高さが変わる。
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(document.body);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section
      ref={ref}
      data-chatbot-viewport-section=""
      style={{ ...style, height: CHATBOT_SECTION_HEIGHT }}
      {...props}
    >
      {children}
    </section>
  );
}
