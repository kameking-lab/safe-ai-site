"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function slideElements(section: HTMLElement): HTMLElement[] {
  return [...section.querySelectorAll<HTMLElement>("[data-home-heat-slide]")];
}

export function HomeHeatSlideControls({ total }: { total: number }) {
  const controlsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [index, setIndex] = useState(0);

  const show = useCallback(
    (requested: number) => {
      const section = controlsRef.current?.closest<HTMLElement>(
        "[data-home-heat-slide-deck]",
      );
      if (!section) return;
      const slides = slideElements(section);
      const next = Math.max(0, Math.min(slides.length - 1, requested));
      slides.forEach((slide, slideIndex) => {
        slide.hidden = slideIndex !== next;
        slide.setAttribute("aria-hidden", String(slideIndex !== next));
      });
      const progress = section.querySelector<HTMLElement>(
        "[data-home-heat-slide-progress]",
      );
      progress?.setAttribute("aria-valuenow", String(next + 1));
      const progressBar = section.querySelector<HTMLElement>(
        "[data-home-heat-slide-progress-bar]",
      );
      if (progressBar) {
        progressBar.style.width = `${((next + 1) / Math.max(1, slides.length)) * 100}%`;
      }
      const live = section.querySelector<HTMLElement>(
        "[data-home-heat-slide-live]",
      );
      const title = slides[next]?.dataset.homeHeatSlideTitle ?? "";
      if (live) live.textContent = `スライド ${next + 1} / ${slides.length}: ${title}`;
      setIndex(next);
    },
    [],
  );

  useEffect(() => {
    const section = controlsRef.current?.closest<HTMLElement>(
      "[data-home-heat-slide-deck]",
    );
    const viewport = section?.querySelector<HTMLElement>(
      "[data-home-heat-slide-viewport]",
    );
    if (!viewport) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        show(index + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        show(index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        show(0);
      } else if (event.key === "End") {
        event.preventDefault();
        show(total - 1);
      }
    };
    const onTouchStart = (event: TouchEvent) => {
      touchStartX.current = event.changedTouches[0]?.clientX ?? null;
    };
    const onTouchEnd = (event: TouchEvent) => {
      const start = touchStartX.current;
      const end = event.changedTouches[0]?.clientX;
      touchStartX.current = null;
      if (start === null || end === undefined || Math.abs(end - start) < 45) {
        return;
      }
      show(end < start ? index + 1 : index - 1);
    };
    viewport.addEventListener("keydown", onKeyDown);
    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      viewport.removeEventListener("keydown", onKeyDown);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchend", onTouchEnd);
    };
  }, [index, show, total]);

  return (
    <div ref={controlsRef} className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => show(index - 1)}
        disabled={index === 0}
        aria-label="前のスライド"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/50 bg-white/10 text-lg disabled:opacity-40"
      >
        <span aria-hidden="true">←</span>
      </button>
      <span className="min-w-0 flex-1 text-center text-xs font-black tabular-nums">
        {index + 1} / {total}
      </span>
      <button
        type="button"
        onClick={() => show(index + 1)}
        disabled={index === total - 1}
        aria-label="次のスライド"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/50 bg-white/10 text-lg disabled:opacity-40"
      >
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
