import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ContactPage from "./page";
import { LanguageProvider } from "@/contexts/language-context";
import { FuriganaProvider } from "@/contexts/furigana-context";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";

async function contact(query: Record<string, string | string[] | undefined>) {
  const page = await ContactPage({ searchParams: Promise.resolve(query) });
  return <LanguageProvider><FuriganaProvider><EasyJapaneseProvider>{page}</EasyJapaneseProvider></FuriganaProvider></LanguageProvider>;
}

describe("contact server body", () => {
  it.each(["tab", "category"])("preserves the first repeated %s value", async (key) => {
    render(await contact({ [key]: ["business", "general"] }));
    expect(screen.getByRole("tab", { name: "法人・コンサルのご相談" }).getAttribute("aria-selected")).toBe("true");
  });

  it("preserves repeated education and industry values without forwarding unrelated queries", async () => {
    const element = await ContactPage({ searchParams: Promise.resolve({
      course: ["fullharness", "other"], topic: ["edu-pack", "other"],
      industry: ["建設・土木", "その他"], ignored: "unrelated-query-value",
    }) });
    const form = element.props.children[1].props.children;
    expect(form.props.initialParams).toEqual({ course: "fullharness", topic: "edu-pack", industry: "建設・土木" });
  });

  it("renders the form as initial HTML and provides a no-JavaScript contact route", async () => {
    const html = renderToStaticMarkup(await contact({ industry: ["建設・土木", "その他"] }));
    const documentBody = document.createElement("div");
    documentBody.innerHTML = html;
    expect(documentBody.querySelector("[data-inquiry-form] form")).not.toBeNull();
    expect(documentBody.querySelector('[hidden][id^="S:"]')).toBeNull();
    expect(documentBody.querySelector("noscript")?.textContent).toContain("フォーム送信にはJavaScriptが必要");
    expect(html).toContain('href="/contact/automation-email"');
    expect(html).not.toContain("入力フォームを読み込んでいます");
  });
});
