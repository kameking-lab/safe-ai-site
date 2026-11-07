import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import ProjectStoryPage, { metadata } from "./page";

describe("the approved project origin", () => {
  it("retains canonical identity and truthful AboutPage metadata", () => {
    const url = "https://www.anzen-ai-portal.jp/about/project-story";
    expect(metadata.title).toBe("このサイトについて");
    expect(metadata.alternates?.canonical).toBe(url);
    expect(sitemap().some((entry) => entry.url === url)).toBe(true);
    const { container } = render(<ProjectStoryPage />);
    const schemas = [...container.querySelectorAll('script[type="application/ld+json"]')].map((node) => node.textContent).join("\n");
    expect(schemas).toContain('"@type":"AboutPage"');
    expect(schemas).toContain('"@type":"BreadcrumbList"');
    expect(schemas).not.toContain('"@type":"Person"');
    expect(schemas).not.toContain("worksFor");
  });

  it("uses the approved experience without converting possibilities into causal claims", () => {
    const { container } = render(<ProjectStoryPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const article = container.querySelector("[data-project-story]");
    const text = article?.textContent ?? "";
    expect(text).toContain("私は、死亡事故で同僚を失いました。この経験が、現場の安全に関わる取り組みを続ける背景にあります。");
    expect(text).not.toContain("防げたかもしれない");
    expect(article?.querySelectorAll("[data-story-copy] p")).toHaveLength(4);
    expect(text).toContain("定型的な作業の負担を減らし");
    for (const unsupported of ["断トツ", "私がうつ病", "私がパワハラ", "事故を防げたはず", "勤務先", "氏名"]) expect(text).not.toContain(unsupported);
    expect(article?.querySelector("img")).toBeNull();
    expect(screen.getByRole("link", { name: "道具を使う" }).getAttribute("href")).toBe("/#tools");
    expect(screen.getByRole("link", { name: "品質について" }).getAttribute("href")).toBe("/about/quality");
    expect(screen.getByRole("link", { name: "出典について" }).getAttribute("href")).toBe("/about/data-sources");
  });
});
