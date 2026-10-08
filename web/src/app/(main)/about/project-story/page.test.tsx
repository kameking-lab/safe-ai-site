import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import ProjectStoryPage, { metadata } from "./page";

describe("the approved project origin", () => {
  it("retains canonical identity and truthful AboutPage metadata", () => {
    const url = "https://www.anzen-ai-portal.jp/about/project-story";
    expect(metadata.title).toBe("このサイトに込めた思い");
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
    expect(text).toContain("私は、死亡事故で同僚を失いました。安全な計画を立てていれば、防げたかもしれない。あの時、現場に行けば、防げたかもしれない。");
    expect(text).toContain("文系を専攻した私が建設業に進んだ背景");
    for (const unsupported of ["断トツ", "私がうつ病", "私がパワハラ", "事故を防げたはず", "勤務先", "氏名"]) expect(text).not.toContain(unsupported);
    expect(article?.querySelector("img")).toBeNull();
    expect(screen.getByRole("link", { name: "道具を使う" }).getAttribute("href")).toBe("/#tools");
    expect(screen.getByRole("link", { name: "品質について" }).getAttribute("href")).toBe("/about/quality");
    expect(screen.getByRole("link", { name: "出典について" }).getAttribute("href")).toBe("/about/data-sources");
  });
});
