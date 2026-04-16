"use client";

import { useFurigana } from "@/contexts/furigana-context";
import { applyRuby } from "@/lib/apply-ruby";

interface RubyTextProps {
  text: string;
  className?: string;
}

/**
 * ふりがな機能が有効な場合にルビ付きHTMLを表示するコンポーネント。
 * 無効時はそのままテキストを表示する。
 */
export function RubyText({ text, className }: RubyTextProps) {
  const { furiganaEnabled } = useFurigana();

  if (furiganaEnabled) {
    return (
      <span
        className={className}
        // applyRuby内でHTMLエスケープ済み
        dangerouslySetInnerHTML={{ __html: applyRuby(text) }}
      />
    );
  }

  return <span className={className}>{text}</span>;
}
