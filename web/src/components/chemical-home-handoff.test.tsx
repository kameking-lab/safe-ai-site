import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OptionalThirdPartyScripts } from "./OptionalThirdPartyScripts";
import { ScrollPositionRestorer } from "./scroll-position-restorer";
import { HomeDirectChemicalClient } from "./home-safety-cockpit/home-chemical-quick-search";
import { TransientQueryBridgeProvider } from "./home-safety-cockpit/transient-query-bridge";
import { ChemicalRaPanel } from "./chemical-ra-panel";
import { OPTIONAL_TRACKING_CONSENT_KEY } from "@/lib/analytics-privacy";
import { consumeTransientChemicalNavigation } from "@/lib/transient-chemical-navigation";

let pathname = "/";
const mocks = vi.hoisted(() => ({ push: vi.fn(), search: vi.fn(), confirm: vi.fn(), find: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: mocks.push, prefetch: vi.fn() }) }));
vi.mock("@/lib/chemical/search-client", () => ({ searchChemicalCatalog: mocks.search, confirmChemicalCatalogSelection: mocks.confirm, findChemicalByCas: mocks.find }));
vi.mock("./Analytics", () => ({ default: () => null }));
vi.mock("./AdSenseScript", () => ({ default: () => null }));
const toluene = { cas: "108-88-3", primaryName: "トルエン", aliases: [], flags: { carcinogenic: false, concentration: true, skin: false, label_sds: true }, appliedDates: {}, notes: [], entryCount: 1 };

function App({ destination = false }) {
  return <><OptionalThirdPartyScripts analyticsEnabled adsEnabled rumEnabled /><ScrollPositionRestorer /><TransientQueryBridgeProvider>{destination ? <ChemicalRaPanel /> : <HomeDirectChemicalClient />}</TransientQueryBridgeProvider></>;
}

beforeEach(() => {
  pathname = "/";
  window.history.replaceState({}, "", "/");
  mocks.search.mockResolvedValue([toluene]); mocks.confirm.mockResolvedValue(toluene); mocks.find.mockResolvedValue(toluene);
  mocks.push.mockImplementation((href: string) => { window.history.pushState({}, "", href); pathname = window.location.pathname; });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 640 });
  window.scrollTo = vi.fn();
  window.requestAnimationFrame = (callback) => { callback(0); return 1; };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ chemicalName: "トルエン", casNumber: "108-88-3", ghsHazards: [], ppeRecommendations: [], safetyMeasures: [], emergencyMeasures: [], regulatoryNotes: [], aiStatus: "disabled_for_safety", assessmentStatus: "unavailable", assessmentNotice: "公式SDSと公式ツールで確認してください。" }) }));
});
afterEach(() => { cleanup(); consumeTransientChemicalNavigation(); localStorage.clear(); sessionStorage.clear(); Reflect.deleteProperty(window, "gtag"); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it.each([["granted", "candidate"], ["denied", "candidate"], ["granted", "submit"], ["denied", "submit"]])("keeps chemical handoff and Back position with configured tracking (%s, %s)", async (consent, action) => {
  localStorage.setItem(OPTIONAL_TRACKING_CONSENT_KEY, consent);
  const gtag = vi.fn(); window.gtag = gtag;
  const view = render(<App />);
  fireEvent.change(screen.getByRole("combobox", { name: "化学物質を検索" }), { target: { value: "トルエン" } });
  const candidate = await screen.findByRole("option");
  fireEvent.click(action === "candidate" ? candidate : screen.getByRole("button", { name: "検索" }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/chemical-ra#chemical-ra-start"));
  expect(window.location.pathname).toBe("/chemical-ra");
  expect(window.location.search).toBe("");
  view.rerender(<App destination />);
  await waitFor(() => expect(mocks.find).toHaveBeenCalledWith("108-88-3"));
  await waitFor(() => expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("トルエン"));
  expect(consumeTransientChemicalNavigation()).toBe(false);
  expect(gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({ analytics_storage: "denied", ad_storage: "denied" }));
  expect(JSON.stringify(window.history.state)).not.toContain("108-88-3");
  expect(JSON.stringify(gtag.mock.calls)).not.toContain("トルエン");
  expect(JSON.stringify(Object.entries(localStorage))).not.toContain("トルエン");
  expect(JSON.stringify(Object.entries(sessionStorage))).not.toContain("トルエン");
  expect(sessionStorage.getItem("anzen-ai:scroll:/")).toBe("640");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  window.history.replaceState({}, "", "/");
  fireEvent(window, new PopStateEvent("popstate"));
  pathname = "/";
  view.rerender(<App />);
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 640, left: 0 });
});

it("submits while the background candidate search is still loading", async () => {
  mocks.search.mockImplementation(() => new Promise(() => undefined));
  render(<App />);
  fireEvent.change(screen.getByRole("combobox", { name: "化学物質を検索" }), { target: { value: "トルエン" } });
  await waitFor(() => expect(mocks.search).toHaveBeenCalled());
  const submit = screen.getByRole("button", { name: "検索" }) as HTMLButtonElement;
  expect(submit.disabled).toBe(false);
  fireEvent.click(submit);
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/chemical-ra#chemical-ra-start"));
});
