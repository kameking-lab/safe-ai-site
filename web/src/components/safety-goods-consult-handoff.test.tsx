import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OptionalThirdPartyScripts } from "./OptionalThirdPartyScripts";
import { SafetyGoodsWizard } from "./safety-goods-wizard";
import { PpeConsultDraft } from "@/app/(main)/contact/automation-email/PpeConsultDraft";
import { __clearPpeConsultMemoryForTests, consumePpeConsultDraft } from "@/lib/ppe-consult-draft";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/goods", useRouter: () => router }));
vi.mock("@/components/Analytics", () => ({ default: () => null, trackEvent: vi.fn() }));
vi.mock("@/components/AdSenseScript", () => ({ default: () => null }));

afterEach(() => {
  router.push.mockReset();
  consumePpeConsultDraft();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/goods");
});

it("hands blocked wizard choices through the configured privacy guard and a full reload", async () => {
  window.history.replaceState({ ppeSelection: ["fall", "scaffold", "anchor", "unknown", "result"] }, "", "/goods");
  router.push.mockImplementation((href: string) => window.history.pushState(null, "", href));
  const view = render(<><OptionalThirdPartyScripts analyticsEnabled adsEnabled rumEnabled /><SafetyGoodsWizard /></>);

  fireEvent.click(screen.getByRole("button", { name: "選定を相談する" }));
  expect(router.push).toHaveBeenCalledWith("/contact/automation-email?subject=ppe-selection");
  expect(window.location.pathname).toBe("/goods"); // Guard isolates; JSDOM does not execute the reload.
  const key = sessionStorage.key(0)!;
  expect(sessionStorage.getItem(key)).toContain('"scaffold"');
  expect(sessionStorage.getItem(key)).not.toContain("体格");

  view.unmount();
  __clearPpeConsultMemoryForTests(); // Model the module reset caused by the guarded reload.
  window.history.replaceState(null, "", "/contact/automation-email?subject=ppe-selection");
  render(<PpeConsultDraft recipient="primary@gmail.com" subject="保護具相談" template="汎用ひな形" />);
  const editor = await screen.findByRole("textbox", { name: "相談文（編集できます）" }) as HTMLTextAreaElement;
  await waitFor(() => expect(editor.value).toContain("足場・屋根・高所"));
  expect(editor.value).toContain("体格");
  expect(sessionStorage.getItem(key)).toBeNull();
});
