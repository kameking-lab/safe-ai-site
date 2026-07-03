"use client";

import { useRef, type KeyboardEvent } from "react";

/**
 * ARIA APG tab パターン（automatic activation）用の共通キーボード操作フック。
 * ArrowLeft/Right(Up/Down)で前後のタブへ移動＋選択、Home/Endで先頭/末尾へ。
 * ローミングtabindex（アクティブのみtabIndex=0、他は-1）でTabキー移動を1停止点に保つ。
 */
export function useRovingTablist(itemCount: number, activeIndex: number, onChange: (index: number) => void) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function moveTo(index: number) {
    const wrapped = (index + itemCount) % itemCount;
    onChange(wrapped);
    buttonRefs.current[wrapped]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveTo(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveTo(index - 1);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(itemCount - 1);
        break;
      default:
        break;
    }
  }

  function getTabProps(index: number) {
    return {
      ref: (el: HTMLButtonElement | null) => {
        buttonRefs.current[index] = el;
      },
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => onKeyDown(event, index),
    };
  }

  return { getTabProps };
}
