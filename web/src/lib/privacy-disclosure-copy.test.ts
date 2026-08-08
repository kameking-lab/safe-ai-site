import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("high-risk input disclosures", () => {
  it("keeps annual-plan free text in a same-tab handoff with short input prevention", () => {
    const form = read("src/components/safety-plan/plan-generator-form.tsx");
    const handoff = read("src/lib/transient-navigation-handoff.ts");
    const usageNotes = read("src/app/(main)/about/usage-notes/page.tsx");

    expect(form).toContain("putSafetyPlanHandoff");
    expect(form).toContain("入力内容はこのタブのプレビューだけに引き継ぎ、URLや履歴には残しません");
    expect(form).toContain("氏名、健康情報");
    expect(form).not.toContain("AIや第三者サービスへは送信しません");
    expect(form).not.toContain("プレビューURLに含まれる");
    expect(form).not.toContain("fetch(");
    expect(handoff).toContain("let safetyPlanHandoff: SafetyPlanHandoff | null = null");
    expect(handoff).toContain("safetyPlanHandoff = null");
    expect(usageNotes).toContain('title: "個人情報"');
    expect(usageNotes).toContain("氏名、会社名、現場名、連絡先、健康情報は入力しないでください");
  });

  it("explains OAuth data scope, purpose, optionality and deletion before sign-in", () => {
    const source = read("src/app/(main)/auth/signin/page.tsx");
    expect(source).toContain("氏名、メールアドレス、プロフィール画像");
    expect(source).toContain("Google Drive、連絡先、カレンダーの権限は要求しません");
    expect(source).toContain("ログインしなくても");
    expect(source).toContain("登録情報の削除");
  });
});

describe("search-scope disclosure", () => {
  it("keeps law-navi free text in memory and exposes only a fixed law-search fallback", () => {
    const page = read("src/app/(main)/law-navi/page.tsx");
    const search = read("src/app/(main)/law-navi/LawNaviSearch.tsx");

    expect(page).toContain("<LawNaviSearch />");
    expect(search).toContain('action="/law-search"');
    expect(search).toContain("event.preventDefault()");
    expect(search).toContain("setQuery(input.trim())");
    expect(search).toContain('href="/law-search"');
    expect(search).not.toMatch(/href=[^\n]+\/law-search\?q=/);
    expect(search).not.toMatch(/name=["']q["']/);
    expect(search).not.toContain("useRouter");
    expect(search).not.toContain("全サイト検索");
  });
});

describe("quick-tour naming", () => {
  it("does not advertise the canonical five-minute tour as three minutes", () => {
    expect(read("src/components/home-persona-entry.tsx")).not.toContain("3分ツアー");
    expect(read("src/components/flagship-grid.tsx")).not.toContain("3分ツアー");
  });
});
