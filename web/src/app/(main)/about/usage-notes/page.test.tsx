import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import UsageNotesPage, { metadata } from "./page";

describe("/about/usage-notes", () => {
  it("is noindex,follow with a self canonical and stays out of the sitemap", () => {
    expect(metadata.alternates?.canonical).toBe("/about/usage-notes");
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
    expect(
      sitemap().some((entry) =>
        String(entry.url).endsWith("/about/usage-notes"),
      ),
    ).toBe(false);
  });

  it("groups every requested note under one concise page without internal terms", () => {
    const { container } = render(<UsageNotesPage />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    for (const heading of [
      "緊急時",
      "法令情報",
      "AI",
      "個人情報",
      "気象・WBGT",
      "化学物質",
      "KY・帳票",
      "教育・資格",
      "データ更新",
      "自動化相談",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    }
    expect(container.textContent).not.toMatch(
      /\b(?:RAG|hash|eval|synthetic|corpus|provenance|retrieval)\b/iu,
    );
  });

  it("is reachable from the global footer", () => {
    const footer = readFileSync(
      join(process.cwd(), "src/components/footer.tsx"),
      "utf8",
    );
    expect(footer).toContain('/about/usage-notes');
  });
});
