"use client";

import { Fragment } from "react";

/**
 * 軽量な Markdown レンダラー。
 * **太字** / *斜体* / [リンク](url) / # 見出し / - 箇条書き / `code` / 改行 を処理する。
 * react-markdown を入れずに AI 応答をきれいに表示するための最小実装。
 */
export function SimpleMarkdown({ content, className }: { content: string; className?: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className={className}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string }
  | { kind: "blank" };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line || line.trim() === "") {
      blocks.push({ kind: "blank" });
      i += 1;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2] });
      i += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ kind: "list", items });
      continue;
    }
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraphLines.join("\n") });
  }
  return blocks;
}

function renderBlock(block: Block, key: number) {
  switch (block.kind) {
    case "heading": {
      const Tag = (`h${block.level + 2}` as unknown) as "h3" | "h4" | "h5";
      const size = block.level === 1 ? "text-base font-bold" : block.level === 2 ? "text-sm font-bold" : "text-xs font-semibold";
      return (
        <Tag key={key} className={`${size} mt-3 mb-1 text-slate-900`}>
          {renderInline(block.text)}
        </Tag>
      );
    }
    case "list":
      return (
        <ul key={key} className="my-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "paragraph":
      return (
        <p key={key} className="my-2 text-sm leading-relaxed text-slate-700">
          {renderInline(block.text)}
        </p>
      );
    case "blank":
      return null;
  }
}

function renderInline(text: string): React.ReactNode {
  // Tokenize for **bold**, *italic*, `code`, [link](url), line breaks.
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|(\n)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<Fragment key={keyIdx++}>{text.slice(last, match.index)}</Fragment>);
    if (match[1]) parts.push(<strong key={keyIdx++}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={keyIdx++}>{match[4]}</em>);
    else if (match[5]) parts.push(<code key={keyIdx++} className="rounded bg-slate-100 px-1 text-[0.85em]">{match[6]}</code>);
    else if (match[7]) parts.push(
      <a
        key={keyIdx++}
        href={match[9]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800"
      >
        {match[8]}
      </a>,
    );
    else if (match[10]) parts.push(<br key={keyIdx++} />);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<Fragment key={keyIdx++}>{text.slice(last)}</Fragment>);
  return parts;
}
