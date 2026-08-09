import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import {
  QUALIFICATION_FINDER_PATH,
  parseQualificationFinderQuery,
} from "@/lib/education/qualification-finder-query";
import { CertFinderClient } from "./CertFinderClient";
import {
  TransientQueryBridgeProvider,
  useTransientQueryBridge,
} from "@/components/home-safety-cockpit/transient-query-bridge";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: navigation.replace,
    push: navigation.push,
  }),
}));

vi.mock("@/components/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => (
    <header>
      <h1>{title}</h1>
    </header>
  ),
}));

function inputValue(element: HTMLElement): string {
  return (element as HTMLInputElement).value;
}

function PendingChatQuestionProbe() {
  const { peekChatQuestion } = useTransientQueryBridge();
  return (
    <button
      type="button"
      onClick={() => {
        document.body.dataset.pendingQualificationQuestion =
          peekChatQuestion()?.question ?? "";
      }}
    >
      一時質問を確認
    </button>
  );
}

function withTransientBridge(ui: ReactElement) {
  return (
    <TransientQueryBridgeProvider>
      {ui}
      <PendingChatQuestionProbe />
    </TransientQueryBridgeProvider>
  );
}

function renderFinder(ui: ReactElement) {
  return render(withTransientBridge(ui));
}

describe("CertFinderClient query hand-off", () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    navigation.push.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    delete document.body.dataset.pendingQualificationQuestion;
  });

  it("冒頭を短い1主操作に絞り、重複したパンくずを表示しない", () => {
    const initialState = parseQualificationFinderQuery({});

    const { container } = renderFinder(
      <CertFinderClient
        key={initialState.stateKey}
        initialState={initialState}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "作業から資格を確認" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "作業内容を選ぶ" })
        .getAttribute("href"),
    ).toBe("#cert-work");
    expect(
      container.querySelectorAll("[data-primary-action]"),
    ).toHaveLength(1);
    expect(screen.queryByText("重要な注意：")).toBeNull();
    expect(
      screen.getByRole("link", { name: "注意事項" }).getAttribute("href"),
    ).toBe("/about/usage-notes");
    expect(
      screen.queryByRole("navigation", { name: "パンくずリスト" }),
    ).toBeNull();
  });

  it("typed初期値としてq・industry・roleを表示する", () => {
    const initialState = parseQualificationFinderQuery({
      q: "フォークリフト",
      industry: "transport",
      role: "solo",
    });

    renderFinder(
      <CertFinderClient
        key={initialState.stateKey}
        initialState={initialState}
      />,
    );

    expect(
      screen.getByText("前ページの条件を引き継ぎました"),
    ).toBeTruthy();
    expect(
      inputValue(screen.getByRole("textbox", { name: /フリー入力/ })),
    ).toBe("フォークリフト");
    expect(
      screen
        .getByRole("button", { name: "運送・物流" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      inputValue(screen.getByRole("textbox", { name: "立場・担当" })),
    ).toBe("一人親方・個人事業主");
    expect(screen.getByText("業種: 運送・物流")).toBeTruthy();
  });

  it("現行コーパスで0件のallowlist語を未判定として明示する", () => {
    const initialState = parseQualificationFinderQuery({ q: "HACCP" });

    renderFinder(
      <CertFinderClient
        key={initialState.stateKey}
        initialState={initialState}
      />,
    );

    expect(
      screen.getByText(/この語は現行の収録候補だけでは一致を特定できません/),
    ).toBeTruthy();
    expect(screen.getByText("条件不足・未判定")).toBeTruthy();
    expect(
      screen.getByText(/資格不要とは判断できません/),
    ).toBeTruthy();
  });

  it("roleだけの引継ぎでは作業条件不足を保ち、資格不要と確定しない", () => {
    const initialState = parseQualificationFinderQuery({ role: "solo" });

    renderFinder(
      <CertFinderClient
        key={initialState.stateKey}
        initialState={initialState}
      />,
    );

    expect(screen.getByText("具体的な作業内容")).toBeTruthy();
    expect(screen.getByText("条件不足・未判定")).toBeTruthy();
    expect(
      screen.getAllByText(/資格不要/).length,
    ).toBeGreaterThan(0);
  });

  it("旧URLのtopicGuideは専用HTMLへ案内し、0件を対策不要としない", () => {
    const initialState = parseQualificationFinderQuery({ q: "熱中症" });

    renderFinder(
      <CertFinderClient
        key={initialState.stateKey}
        initialState={initialState}
      />,
    );

    const guide = screen.getByRole("link", {
      name: "熱中症予防の実務ガイドを開く",
    });
    expect(guide.getAttribute("href")).toBe("/heat-illness-prevention");
    expect(
      screen.getByText(/資格候補が0件でも「対策不要」を意味しません/),
    ).toBeTruthy();
  });

  it("資格候補から固有の合成KYT問題へ移動できる", () => {
    const initialState = parseQualificationFinderQuery({ q: "足場" });

    renderFinder(
      <CertFinderClient
        key={initialState.stateKey}
        initialState={initialState}
        visualKyLinksByQualification={{
          "se-36-39-ashiba": [
            {
              id: "vkyt-001",
              label: "足場からの墜落",
              href: "/training/visual-ky/scaffold-fall",
            },
          ],
        }}
      />,
    );

    const link = screen.getByRole("link", {
      name: "足場からの墜落（合成KYT教材）",
    });
    expect(link.getAttribute("href")).toBe(
      "/training/visual-ky/scaffold-fall",
    );
  });

  it("未知・改ざん値を入力やDOMへ反映しない", () => {
    const malicious = "<script>private-site-data</script>";
    const initialState = parseQualificationFinderQuery({ q: malicious });
    const { container } = renderFinder(
      <CertFinderClient
        key={initialState.stateKey}
        initialState={initialState}
      />,
    );

    expect(
      screen.getByText("URLの条件は引き継いでいません"),
    ).toBeTruthy();
    expect(
      inputValue(screen.getByRole("textbox", { name: /フリー入力/ })),
    ).toBe("");
    expect(container.textContent).not.toContain(malicious);
    expect(container.innerHTML).not.toContain("private-site-data");
  });

  it("完全リセットで全state・引継ぎ表示・URLを消す", () => {
    const initialState = parseQualificationFinderQuery({
      q: "フォークリフト",
      industry: "transport",
      role: "safety-manager",
    });

    renderFinder(
      <CertFinderClient
        key={initialState.stateKey}
        initialState={initialState}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "条件をリセット" }));

    expect(
      inputValue(screen.getByRole("textbox", { name: /フリー入力/ })),
    ).toBe("");
    expect(
      inputValue(screen.getByRole("textbox", { name: "立場・担当" })),
    ).toBe("");
    expect(
      screen
        .getByRole("button", { name: "運送・物流" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      screen.queryByText("前ページの条件を引き継ぎました"),
    ).toBeNull();
    expect(screen.queryByText("条件不足・未判定")).toBeNull();
    expect(navigation.replace).toHaveBeenCalledWith(
      QUALIFICATION_FINDER_PATH,
      { scroll: false },
    );
  });

  it("安全なstateKeyの変更でback/forward相当の初期条件を再適用する", () => {
    const first = parseQualificationFinderQuery({ q: "足場" });
    const second = parseQualificationFinderQuery({ q: "石綿" });
    const { rerender } = renderFinder(
      <CertFinderClient key={first.stateKey} initialState={first} />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /フリー入力/ }), {
      target: { value: "利用者が編集した値" },
    });
    rerender(
      withTransientBridge(
        <CertFinderClient key={second.stateKey} initialState={second} />,
      ),
    );

    expect(
      inputValue(screen.getByRole("textbox", { name: /フリー入力/ })),
    ).toBe("石綿");
    expect(screen.getByText("作業・テーマ: 石綿")).toBeTruthy();
  });

  it("選択条件をURLやstorageに含めずmemory-onlyでチャットへ渡す", () => {
    const initialState = parseQualificationFinderQuery({
      q: "フォークリフト",
      industry: "transport",
    });
    renderFinder(
      <CertFinderClient
        key={initialState.stateKey}
        initialState={initialState}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "機械・設備と能力" }), {
      target: { value: "最大荷重1.5トン" },
    });
    const link = screen.getByRole("link", {
      name: "この条件で安衛法AIに質問",
    });
    expect(link.getAttribute("href")).toBe("/chatbot");
    expect(link.className).toContain("min-h-11");
    fireEvent.click(link);

    expect(navigation.push).toHaveBeenCalledWith("/chatbot");
    expect(JSON.stringify(navigation.push.mock.calls)).not.toContain(
      "フォークリフト",
    );
    fireEvent.click(screen.getByRole("button", { name: "一時質問を確認" }));
    expect(document.body.dataset.pendingQualificationQuestion).toContain(
      "フォークリフト",
    );
    expect(document.body.dataset.pendingQualificationQuestion).toContain(
      "最大荷重1.5トン",
    );
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
