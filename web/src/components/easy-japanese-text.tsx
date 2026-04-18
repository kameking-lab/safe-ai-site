"use client";

import { useMemo } from "react";
import { useEasyJapanese } from "@/contexts/easy-japanese-context";
import dictionary from "@/lib/easy-japanese-dictionary.json";

// キーを長い順にソートして部分置換を防ぐ
const sortedEntries = (Object.entries(dictionary) as [string, string][]).sort(
  (a, b) => b[0].length - a[0].length
);

function applyEasyJapanese(text: string): string {
  let result = text;
  for (const [term, simple] of sortedEntries) {
    // 既に置換済みの箇所（カッコ内）は再置換しない
    const regex = new RegExp(escapeRegex(term) + "(?!（[^）]*）)", "g");
    result = result.replace(regex, `${simple}（${term}）`);
  }
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Props = {
  children: string;
  className?: string;
  as?: "span" | "p" | "li" | "dt" | "dd" | "td" | "th" | "div";
};

export function EasyJapaneseText({ children, className, as: Tag = "span" }: Props) {
  const { easyJapaneseEnabled } = useEasyJapanese();

  const processed = useMemo(() => {
    if (!easyJapaneseEnabled) return children;
    return applyEasyJapanese(children);
  }, [children, easyJapaneseEnabled]);

  return <Tag className={className}>{processed}</Tag>;
}
