import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OptionalThirdPartyScripts } from "./OptionalThirdPartyScripts";
import { OPTIONAL_TRACKING_CONSENT_KEY } from "@/lib/analytics-privacy";
import { ChatbotClientBridge } from "@/app/(main)/chatbot/ChatbotClientBridge";
import { TransientChatLink } from "./home-safety-cockpit/transient-chat-link";
import {
  TransientQueryBridgeProvider,
  useTransientQueryBridge,
} from "./home-safety-cockpit/transient-query-bridge";
import {
  __resetTransientChatNavigationForTests,
  consumeTransientChatNavigation,
} from "@/lib/transient-chat-navigation";

let currentPathname = "/laws";
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => router,
}));
vi.mock("@/components/Analytics", () => ({ default: () => <div data-testid="analytics-script" /> }));
vi.mock("@/components/AdSenseScript", () => ({ default: () => <div data-testid="ads-script" /> }));
vi.mock("@/components/chatbot-panel", () => ({
  ChatbotPanel: ({
    initialQuestion,
    onInitialQuestionConsumed,
  }: {
    initialQuestion?: string;
    onInitialQuestionConsumed: () => void;
  }) => (
    <section aria-label="chatbot destination">
      <output data-testid="destination-question">{initialQuestion ?? ""}</output>
      <button type="button" onClick={onInitialQuestionConsumed}>
        一時質問を消費
      </button>
    </section>
  ),
}));

afterEach(() => {
  currentPathname = "/laws";
  router.push.mockReset();
  __resetTransientChatNavigationForTests();
  window.history.replaceState(null, "", "/laws");
  localStorage.clear();
  sessionStorage.clear();
  delete document.body.dataset.pendingQuestion;
  Reflect.deleteProperty(window, "gtag");
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window.navigator, "globalPrivacyControl");
  Reflect.deleteProperty(window.navigator, "doNotTrack");
});

function PendingQuestionProbe() {
  const { peekChatQuestion } = useTransientQueryBridge();
  return (
    <button
      type="button"
      onClick={() => {
        document.body.dataset.pendingQuestion =
          peekChatQuestion()?.question ?? "";
      }}
    >
      一時質問を確認
    </button>
  );
}

describe("OptionalThirdPartyScripts consent lifecycle", () => {
  it.each(["granted", "denied"] as const)(
    "configured本番状態・consent=%sでも質問を一度だけmemory handoffし任意eventを送らない",
    async (consent) => {
      const question = "盤を開けてテスターを当てる場合の資格は？";
      const gtag = vi.fn();
      window.gtag = gtag;
      localStorage.setItem(OPTIONAL_TRACKING_CONSENT_KEY, consent);
      vi.stubGlobal("crypto", { randomUUID: () => "configured-handoff" });
      router.push.mockImplementation((href: string) => {
        currentPathname = href;
        window.history.pushState(null, "", href);
      });

      const view = render(
        <>
          <OptionalThirdPartyScripts
            analyticsEnabled
            adsEnabled
            rumEnabled
          />
          <TransientQueryBridgeProvider>
            <TransientChatLink question={question}>
              安衛法AIで確認
            </TransientChatLink>
            <PendingQuestionProbe />
          </TransientQueryBridgeProvider>
        </>,
      );

      fireEvent.click(screen.getByRole("link", { name: "安衛法AIで確認" }));
      view.rerender(
        <>
          <OptionalThirdPartyScripts
            analyticsEnabled
            adsEnabled
            rumEnabled
          />
          <TransientQueryBridgeProvider>
            <ChatbotClientBridge />
            <PendingQuestionProbe />
          </TransientQueryBridgeProvider>
        </>,
      );

      expect(router.push).toHaveBeenCalledWith("/chatbot");
      expect(window.location.pathname).toBe("/chatbot");
      expect(window.location.search).toBe("");
      expect(window.location.hash).toBe("");
      expect(screen.getByTestId("destination-question").textContent).toBe(
        question,
      );
      expect(consumeTransientChatNavigation()).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "一時質問を確認" }));
      expect(document.body.dataset.pendingQuestion).toBe(question);
      fireEvent.click(screen.getByRole("button", { name: "一時質問を消費" }));
      expect(screen.getByTestId("destination-question").textContent).toBe("");
      fireEvent.click(screen.getByRole("button", { name: "一時質問を確認" }));
      expect(document.body.dataset.pendingQuestion).toBe("");
      fireEvent.click(screen.getByRole("button", { name: "一時質問を消費" }));
      expect(JSON.stringify(window.history.state)).not.toContain(question);
      expect(
        [
          ...Array(localStorage.length).keys(),
          ...Array(sessionStorage.length).keys(),
        ]
          .map((_unused, index) =>
            index < localStorage.length
              ? localStorage.getItem(localStorage.key(index) ?? "")
              : sessionStorage.getItem(
                  sessionStorage.key(index - localStorage.length) ?? "",
                ),
          )
          .join(" "),
      ).not.toContain(question);
      expect(JSON.stringify(gtag.mock.calls)).not.toContain(question);
      expect(
        gtag.mock.calls.filter(([command]) => command === "event"),
      ).toEqual([]);
      expect(gtag).toHaveBeenCalledWith(
        "consent",
        "update",
        expect.objectContaining({ analytics_storage: "denied" }),
      );
    },
  );

  it("does not place Cookie controls over the chatbot composer", async () => {
    currentPathname = "/chatbot";
    render(<OptionalThirdPartyScripts analyticsEnabled adsEnabled rumEnabled />);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Cookie設定" })).toBeNull();
      expect(screen.queryByRole("region", { name: "任意Cookieの設定" })).toBeNull();
    });
    expect(screen.queryByTestId("analytics-script")).toBeNull();
    expect(screen.queryByTestId("ads-script")).toBeNull();
  });

  it("loads no third-party script until the user explicitly grants consent", async () => {
    render(<OptionalThirdPartyScripts analyticsEnabled adsEnabled />);
    expect(screen.queryByTestId("analytics-script")).toBeNull();
    expect(screen.queryByTestId("ads-script")).toBeNull();

    fireEvent.click(await screen.findByRole("button", { name: "許可する" }));
    expect(await screen.findByTestId("analytics-script")).toBeTruthy();
    expect(screen.getByTestId("ads-script")).toBeTruthy();
    expect(localStorage.getItem(OPTIONAL_TRACKING_CONSENT_KEY)).toBe("granted");
  });

  it("withdraws consent, sends Consent Mode denial, and unmounts scripts", async () => {
    localStorage.setItem(OPTIONAL_TRACKING_CONSENT_KEY, "granted");
    const gtag = vi.fn();
    window.gtag = gtag;
    document.cookie = "_ga=host-only; Path=/";
    document.cookie = "_gid=host-only; Path=/";
    document.cookie = "portal_preference=keep; Path=/";
    render(<OptionalThirdPartyScripts analyticsEnabled adsEnabled />);
    await screen.findByTestId("analytics-script");

    fireEvent.click(screen.getByRole("button", { name: "Cookie設定" }));
    fireEvent.click(screen.getByRole("button", { name: "拒否する" }));

    await waitFor(() => expect(screen.queryByTestId("analytics-script")).toBeNull());
    expect(screen.queryByTestId("ads-script")).toBeNull();
    expect(localStorage.getItem(OPTIONAL_TRACKING_CONSENT_KEY)).toBe("denied");
    expect(gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
      analytics_storage: "denied",
      ad_storage: "denied",
    }));
    expect(document.cookie).not.toContain("_ga=");
    expect(document.cookie).not.toContain("_gid=");
    expect(document.cookie).toContain("portal_preference=keep");
  });

  it.each([
    ["GPC", "globalPrivacyControl", true],
    ["DNT", "doNotTrack", "1"],
  ] as const)(
    "does not mount Analytics, Ads, or RUM after prior consent when %s opts out",
    async (_label, key, value) => {
      localStorage.setItem(OPTIONAL_TRACKING_CONSENT_KEY, "granted");
      Object.defineProperty(window.navigator, key, {
        configurable: true,
        value,
      });

      render(
        <OptionalThirdPartyScripts
          analyticsEnabled
          adsEnabled
          rumEnabled
        />,
      );

      await screen.findByRole("button", { name: "Cookie設定" });
      expect(screen.queryByTestId("analytics-script")).toBeNull();
      expect(screen.queryByTestId("ads-script")).toBeNull();
    },
  );
});
