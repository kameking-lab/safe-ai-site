import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "現状把握レポート | ANZEN AI 内部",
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

const VALID_KEY = "kaneda2026";
const REPORT_FILENAME = "comprehensive-status-report-2026-04-30.md";

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function AdminStatusPage({ searchParams }: Props) {
  const params = await searchParams;
  if (params.key !== VALID_KEY) {
    notFound();
  }

  const md = readReport();
  const blocks = parseMarkdown(md);
  const toc = blocks
    .filter((b) => b.type === "heading" && b.level === 2)
    .map((b) => ({ id: (b as HeadingBlock).id, text: (b as HeadingBlock).text }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-800 text-white px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-slate-400 mb-1">ANZEN AI 内部文書 / noindex</p>
          <h1 className="text-xl font-bold leading-snug">完全版 現状把握レポート</h1>
          <p className="text-sm text-slate-300 mt-1">2026-04-30 / 全12セクション</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <nav
          id="summary"
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
          aria-label="目次"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            セクション目次
          </p>
          <ol className="space-y-1">
            {toc.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block text-sm text-blue-600 hover:text-blue-800 py-0.5 break-all"
                >
                  {s.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm prose-anzen">
          {renderBlocks(blocks)}
        </article>

        <div className="flex justify-center">
          <a
            href="#summary"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 text-white text-sm font-medium shadow-sm hover:bg-slate-700"
          >
            ↑ サマリーへ戻る
          </a>
        </div>

        <footer className="border-t border-slate-200 pt-6 pb-10 text-center text-xs text-slate-400">
          <p>ANZEN AI 内部文書 / 検索エンジン非公開</p>
          <p className="mt-1">出典: docs/{REPORT_FILENAME}</p>
        </footer>
      </div>
    </div>
  );
}

function readReport(): string {
  // 本番ビルドでの配置を優先（web/ 内コピー）。なければ開発時の docs/ オリジナルにフォールバック
  // 実ファイルは next.config.ts の outputFileTracingIncludes で明示トレース
  const candidates = [
    path.join(process.cwd(), "src", "app", "admin", "status", "report.md"),
    path.join(process.cwd(), "..", "docs", REPORT_FILENAME),
    path.join(process.cwd(), "docs", REPORT_FILENAME),
  ];
  for (const p of candidates) {
    try {
      return fs.readFileSync(p, "utf-8");
    } catch {
      // 次の候補へ
    }
  }
  return "# レポート未取得\n\n本番ビルドにレポートファイルが含まれていない可能性があります。";
}

type HeadingBlock = { type: "heading"; level: 1 | 2 | 3 | 4; text: string; id: string };
type ParagraphBlock = { type: "paragraph"; lines: string[] };
type BulletListBlock = { type: "bullet"; items: string[] };
type NumberedListBlock = { type: "numbered"; items: string[] };
type HrBlock = { type: "hr" };
type CodeBlock = { type: "code"; lines: string[]; lang?: string };
type Block =
  | HeadingBlock
  | ParagraphBlock
  | BulletListBlock
  | NumberedListBlock
  | HrBlock
  | CodeBlock;

function parseMarkdown(src: string): Block[] {
  const lines = src.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;
  const usedIds = new Set<string>();

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    if (trimmed === "---" || trimmed === "***") {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim() || undefined;
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 閉じる ```
      blocks.push({ type: "code", lines: codeLines, lang });
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.+?)\s*$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      const text = headingMatch[2];
      const id = uniqueSlug(text, usedIds);
      blocks.push({ type: "heading", level, text, id });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "bullet", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "numbered", items });
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        cur === "" ||
        cur === "---" ||
        cur === "***" ||
        cur.startsWith("#") ||
        cur.startsWith("```") ||
        /^[-*]\s+/.test(cur) ||
        /^\d+\.\s+/.test(cur)
      ) {
        break;
      }
      paraLines.push(cur);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paraLines });
    }
  }

  return blocks;
}

function uniqueSlug(text: string, used: Set<string>): string {
  let base = text
    .toLowerCase()
    .replace(/[、。「」『』（）()【】！？：、,.!?:;]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) base = "section";
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    slug = `${base}-${n++}`;
  }
  used.add(slug);
  return slug;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // 順序: コード -> 強調 -> 通常テキスト
  const nodes: ReactNode[] = [];
  const remaining = text;
  let idx = 0;
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(remaining.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${idx++}`}
          className="px-1.5 py-0.5 bg-slate-100 rounded text-[0.85em] font-mono text-slate-800"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b${idx++}`} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < remaining.length) {
    nodes.push(remaining.slice(lastIndex));
  }
  return nodes;
}

function renderBlocks(blocks: Block[]): ReactNode {
  return blocks.map((b, i) => {
    switch (b.type) {
      case "heading": {
        const inline = renderInline(b.text, `h${i}`);
        if (b.level === 1) {
          return (
            <h1
              id={b.id}
              key={i}
              className="text-2xl font-bold text-slate-900 mt-2 mb-4 leading-tight scroll-mt-20"
            >
              {inline}
            </h1>
          );
        }
        if (b.level === 2) {
          return (
            <h2
              id={b.id}
              key={i}
              className="text-xl font-bold text-slate-900 mt-8 mb-3 pb-1 border-b border-slate-200 scroll-mt-20"
            >
              {inline}
            </h2>
          );
        }
        if (b.level === 3) {
          return (
            <h3
              id={b.id}
              key={i}
              className="text-base font-semibold text-slate-800 mt-5 mb-2 scroll-mt-20"
            >
              {inline}
            </h3>
          );
        }
        return (
          <h4
            id={b.id}
            key={i}
            className="text-sm font-semibold text-slate-700 mt-4 mb-2 scroll-mt-20"
          >
            {inline}
          </h4>
        );
      }
      case "paragraph": {
        const text = b.lines.join(" ");
        return (
          <p key={i} className="text-sm text-slate-700 leading-relaxed my-3">
            {renderInline(text, `p${i}`)}
          </p>
        );
      }
      case "bullet":
        return (
          <ul key={i} className="list-disc pl-5 my-3 space-y-1">
            {b.items.map((it, j) => (
              <li key={j} className="text-sm text-slate-700 leading-relaxed">
                {renderInline(it, `ul${i}-${j}`)}
              </li>
            ))}
          </ul>
        );
      case "numbered":
        return (
          <ol key={i} className="list-decimal pl-5 my-3 space-y-1">
            {b.items.map((it, j) => (
              <li key={j} className="text-sm text-slate-700 leading-relaxed">
                {renderInline(it, `ol${i}-${j}`)}
              </li>
            ))}
          </ol>
        );
      case "hr":
        return <hr key={i} className="my-6 border-slate-200" />;
      case "code":
        return (
          <pre
            key={i}
            className="my-3 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed"
          >
            <code>{b.lines.join("\n")}</code>
          </pre>
        );
      default:
        return null;
    }
  });
}
