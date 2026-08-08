import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { generateMetadata } from "./page";

const bodySource = readFileSync(
  resolve(process.cwd(), "src/app/(main)/chatbot/ChatbotBody.tsx"),
  "utf8",
);

describe("チャットボットの公開確認状態", () => {
  it("法令回答を公式見解・監修済みと表示しない", async () => {
    const metadata = await generateMetadata({
      searchParams: Promise.resolve({}),
    });
    const description = String(metadata.description ?? "");
    expect(description).not.toContain("承認済み");
    expect(description).not.toContain("公式見解");
    expect(bodySource).not.toContain("承認済み");
    expect(bodySource).not.toContain("登録番号260022）監修");
  });

  it("収録範囲や内部方式を入力前の主領域へ並べない", () => {
    expect(bodySource).not.toContain("高圧則");
    expect(bodySource).not.toContain("メンタルヘルス指針");
    expect(bodySource).not.toContain("RAG");
    expect(bodySource).not.toContain("hash");
  });

  it("入力と短い状態を先に示し、長い停止説明は表示しない", () => {
    expect(bodySource).toContain("安衛法AI");
    expect(bodySource).toContain("法令本文検索");
    expect(bodySource).toContain("/about/usage-notes");
    expect(bodySource).not.toContain("生成AI回答は停止中");
    expect(bodySource).not.toContain("現在の提供状態：根拠候補検索のみ");
    expect(bodySource).not.toContain(
      'descriptionJa="労働安全衛生法・関連規則に基づいてAIが回答"',
    );
  });
});
