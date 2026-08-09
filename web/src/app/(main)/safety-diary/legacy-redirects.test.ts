import { describe, expect, it, vi } from "vitest";

const { permanentRedirect } = vi.hoisted(() => ({
  permanentRedirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("next/navigation", () => ({ permanentRedirect }));

import NewPage from "./new/page";
import NewDetailPage from "./new/detail/page";
import EntryPage from "./[id]/page";
import PrintPage from "./[id]/print/page";
import MonthlyPage from "./monthly/[ym]/page";

const EDITOR_REDIRECT = "redirect:/safety-diary?edit=1";
const CONTEXTUAL_EDITOR_REDIRECT =
  "redirect:/safety-diary?source=legacy&edit=1";

const legacyContext = () => ({
  searchParams: Promise.resolve({ source: "legacy", edit: "0" }),
});

describe("legacy safety diary editor redirects", () => {
  it("redirects the retired create route directly to the editor", async () => {
    await expect(NewPage({})).rejects.toThrow(EDITOR_REDIRECT);
  });

  it("keeps existing query context and overrides stale editor flags", async () => {
    for (const route of [
      NewPage,
      NewDetailPage,
      EntryPage,
      PrintPage,
      MonthlyPage,
    ]) {
      await expect(route(legacyContext())).rejects.toThrow(
        CONTEXTUAL_EDITOR_REDIRECT,
      );
    }
  });
});
