import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { SourceProvenanceView } from "./source-provenance-view";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { FavoritesList } from "@/components/favorites/favorites-list";
import { formatArticleCitation, loadFavorites, toggleFavorite } from "@/lib/favorites";
import { verifiedPrimaryElectricalArticles } from "@/data/laws/verified-primary-electrical";
import { lawSourceProvenance } from "@/lib/legal-source-provenance";
import type { SourceProvenance } from "@/lib/source-provenance";

const source: SourceProvenance = { url: "https://laws.e-gov.go.jp/law/347AC0000000057", version: "20261001_507AC0000000033", fetchedAt: "2026-10-08T13:28:36.485Z", checkedAt: "2026-10-11T14:36:30.684Z", checkKind: "revision" };
beforeEach(() => localStorage.clear());

it("shows unknown fields without inventing dates and keeps the known source URL", () => {
  render(<SourceProvenanceView source={{ url: source.url }} />);
  const details = screen.getByText("原典情報").closest("details")!;
  details.open = true;
  expect(within(details).getByRole("link").getAttribute("href")).toBe(source.url);
  expect(within(details).getAllByText("未登録")).toHaveLength(2);
  expect(within(details).getByText("未確認")).toBeTruthy();
  expect(details.textContent).not.toMatch(/20\d\d-\d\d-\d\d/);
});

it("saves and reloads the exact public source facts alongside a bookmark", () => {
  render(<FavoriteButton kind="article" id="law|1" title="目的" subtitle="安衛法 第1条" href="/law-navi/347AC0000000057/1" sourceProvenance={source} />);
  fireEvent.click(screen.getByRole("button", { name: "お気に入りに追加" }));
  expect(loadFavorites()[0]?.sourceProvenance).toEqual(source);
  render(<FavoritesList />);
  const details = screen.getByText("原典情報").closest("details")!;
  expect(details.textContent).toContain(source.version);
  expect(details.textContent).toContain("2026-10-08（JST）");
  expect(details.textContent).toContain("2026-10-11（JST）");
});

it("does not backfill unknown confirmation with the favorite's addedAt", () => {
  toggleFavorite({ kind: "article", id: "unknown|1", title: "未確認", subtitle: "", href: "/law-search", sourceProvenance: { fetchedAt: source.fetchedAt } });
  expect(loadFavorites()[0]?.sourceProvenance).toEqual({ fetchedAt: source.fetchedAt });
  expect(formatArticleCitation({ text: "本文", lawShort: "検査", articleNum: "第1条", sourceProvenance: loadFavorites()[0]?.sourceProvenance })).not.toContain("最終確認");
});

it("keeps the same known version and dates in the copied citation", () => {
  const citation = formatArticleCitation({ text: "本文", lawShort: "安衛法", articleNum: "第1条", sourceProvenance: source });
  expect(citation).toContain(`原典URL: ${source.url}`);
  expect(citation).toContain(`原典版: ${source.version}`);
  expect(citation).toContain("取得日: 2026-10-08（JST）");
  expect(citation).toContain("最終確認: 2026-10-11（JST）（原典版の照合）");
});

it("keeps the real full revision through bookmark reload, display and citation copy", () => {
  const item = verifiedPrimaryElectricalArticles[0]!;
  const facts = lawSourceProvenance(item)!;
  toggleFavorite({ kind: "article", id: "electric|42", title: item.articleTitle!, subtitle: item.lawShort, href: "/law-search", sourceProvenance: facts });
  const saved = loadFavorites()[0]?.sourceProvenance;
  expect(saved?.version).toBe("339AC0000000170_20260803_508AC0000000068");
  render(<SourceProvenanceView source={saved} />);
  expect(screen.getByText(item.sourceRevisionId!)).toBeTruthy();
  expect(formatArticleCitation({ text: item.text, lawShort: item.lawShort, articleNum: item.articleNum, sourceProvenance: saved })).toContain(item.sourceRevisionId);
});
