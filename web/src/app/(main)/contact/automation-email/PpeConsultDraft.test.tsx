import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { preparePpeConsultDraft, consumePpeConsultDraft } from "@/lib/ppe-consult-draft";
import { PpeConsultDraft } from "./PpeConsultDraft";

afterEach(() => {
  consumePpeConsultDraft();
  vi.restoreAllMocks();
});

it("lets the user edit transferred checks before explicitly opening email without a network request", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  preparePpeConsultDraft(["fall", "scaffold", "anchor", "unknown", "result"]);
  render(<PpeConsultDraft recipient="primary@gmail.com" subject="保護具相談" template="empty template" />);
  const textarea = await screen.findByRole("textbox", { name: "相談文（編集できます）" }) as HTMLTextAreaElement;
  await waitFor(() => expect(textarea.value).toContain("未確認・相談したい点"));
  expect(textarea.value).toContain("体格");
  fireEvent.change(textarea, { target: { value: "編集後の本文" } });
  const open = screen.getByRole("link", { name: "内容を確認してメールアプリを開く" });
  const mailto = new URL(open.getAttribute("href")!);
  expect(mailto.protocol).toBe("mailto:");
  expect(mailto.pathname).toBe("primary%40gmail.com");
  expect(mailto.searchParams.get("body")).toBe("編集後の本文");
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("does not offer editing or a mail link in SSR before hydration", () => {
  const html = renderToString(<PpeConsultDraft recipient="primary@gmail.com" subject="保護具相談" template="汎用ひな形" />);
  expect(html).toContain("disabled");
  expect(html).toContain("宛先・件名・ひな形をコピー");
  expect(html).toContain("汎用ひな形");
  expect(html).not.toContain("mailto:");
});

it("keeps the editable draft but offers no mail action when the recipient is unavailable", async () => {
  render(<PpeConsultDraft recipient={null} subject="保護具相談" template="確認したい点" />);
  await waitFor(() => expect(screen.getByRole("textbox", { name: "相談文（編集できます）" })).toHaveProperty("value", "確認したい点"));
  expect(screen.queryByRole("link", { name: "内容を確認してメールアプリを開く" })).toBeNull();
  expect(screen.getByRole("status")).toBeDefined();
});
