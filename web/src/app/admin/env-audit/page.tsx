import { Metadata } from "next";
import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
  title: "環境変数 棚卸し | Admin",
};

const VALID_KEY = "kaneda2026";

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function EnvAuditPage({ searchParams }: Props) {
  const { key } = await searchParams;

  if (key !== VALID_KEY) {
    notFound();
  }

  const reportPath = path.join(
    process.cwd(),
    "..",
    "docs",
    "vercel-env-audit-2026-05-01.md"
  );

  let rawMd = "";
  try {
    rawMd = await readFile(reportPath, "utf-8");
  } catch {
    rawMd = "レポートファイルが見つかりません: " + reportPath;
  }

  const lines = rawMd.split("\n");

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <span className="bg-red-700 text-white text-xs font-bold px-2 py-1 rounded">
            ADMIN
          </span>
          <h1 className="text-xl font-bold text-gray-100">
            Vercel 環境変数 棚卸しレポート
          </h1>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 font-mono text-sm leading-relaxed">
          <MarkdownRenderer lines={lines} />
        </div>

        <p className="mt-4 text-xs text-gray-600 text-center">
          このページはadmin専用です。環境変数の値は一切表示されません。
        </p>
      </div>
    </div>
  );
}

function MarkdownRenderer({ lines }: { lines: string[] }) {
  const elements: React.ReactNode[] = [];
  let i = 0;
  let tableRows: string[] = [];
  let inTable = false;

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const [header, , ...body] = tableRows;
    const headers = header.split("|").map((c) => c.trim()).filter(Boolean);
    elements.push(
      <div key={`table-${i}`} className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-800">
              {headers.map((h, hi) => (
                <th
                  key={hi}
                  className="border border-gray-700 px-3 py-2 text-left text-gray-300 font-semibold"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => {
              const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
              return (
                <tr key={ri} className={ri % 2 === 0 ? "bg-gray-900" : "bg-gray-850"}>
                  {cells.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border border-gray-700 px-3 py-1.5 text-gray-300"
                    >
                      <InlineMarkdown text={cell} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("|")) {
      inTable = true;
      tableRows.push(line);
      i++;
      continue;
    } else if (inTable) {
      inTable = false;
      flushTable();
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-2xl font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-2">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-blue-400 mt-6 mb-2">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      const text = line.slice(4);
      const color = text.includes("🔴") ? "text-red-400" : text.includes("🟡") ? "text-yellow-400" : text.includes("🟢") ? "text-green-400" : "text-gray-300";
      elements.push(
        <h3 key={i} className={`text-base font-semibold ${color} mt-4 mb-2`}>
          {text}
        </h3>
      );
    } else if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="bg-gray-800 border border-gray-700 rounded p-4 my-3 text-green-300 text-xs overflow-x-auto">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="ml-4 text-gray-300 my-0.5 list-disc list-inside">
          <InlineMarkdown text={line.slice(2)} />
        </li>
      );
    } else if (line.startsWith("---")) {
      elements.push(<hr key={i} className="border-gray-700 my-4" />);
    } else if (line.startsWith("**")) {
      elements.push(
        <p key={i} className="text-gray-300 my-1">
          <InlineMarkdown text={line} />
        </p>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-gray-300 my-1">
          <InlineMarkdown text={line} />
        </p>
      );
    }

    i++;
  }

  if (inTable) flushTable();

  return <>{elements}</>;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="bg-gray-800 text-yellow-300 px-1 py-0.5 rounded text-xs">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-bold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
