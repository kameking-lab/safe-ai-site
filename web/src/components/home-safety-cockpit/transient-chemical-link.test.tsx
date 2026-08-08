import { fireEvent, render, screen } from "@testing-library/react";
import type {
  AnchorHTMLAttributes,
  MouseEvent as ReactMouseEvent,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransientChemicalLink } from "./transient-chemical-link";
import {
  TransientQueryBridgeProvider,
  useTransientQueryBridge,
} from "./transient-query-bridge";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    onClick,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      {...props}
      onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        event.preventDefault();
      }}
    >
      {children}
    </a>
  ),
}));

function PendingChemicalQuery() {
  const { peekChemicalQuery } = useTransientQueryBridge();
  return (
    <button
      type="button"
      onClick={() => {
        const pending = peekChemicalQuery();
        document.body.dataset.pendingChemical = pending?.query ?? "";
        document.body.dataset.pendingCas = pending?.confirmedCas ?? "";
      }}
    >
      一時入力を確認
    </button>
  );
}

describe("TransientChemicalLink", () => {
  beforeEach(() => {
    router.push.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
    delete document.body.dataset.pendingChemical;
    delete document.body.dataset.pendingCas;
    vi.stubGlobal("crypto", { randomUUID: () => "chemical-handoff" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("自由入力をURLへ加えず同一タブの一時メモリへ渡す", () => {
    const query = "現場用シンナー 田中@example.invalid";
    render(
      <TransientQueryBridgeProvider>
        <TransientChemicalLink query={query}>この物質を確認</TransientChemicalLink>
        <PendingChemicalQuery />
      </TransientQueryBridgeProvider>,
    );

    const link = screen.getByRole("link", { name: "この物質を確認" });
    expect(link.getAttribute("href")).toBe("/chemical-ra");
    expect(link.getAttribute("href")).not.toContain(encodeURIComponent(query));

    fireEvent.click(link);

    expect(router.push).toHaveBeenCalledWith("/chemical-ra");
    expect(JSON.stringify(router.push.mock.calls)).not.toContain(query);
    fireEvent.click(screen.getByRole("button", { name: "一時入力を確認" }));
    expect(document.body.dataset.pendingChemical).toBe(query);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("Provider外では自由入力を破棄して固定routeだけを表示する", () => {
    const query = "社内製品 audit.person@example.invalid";
    render(<TransientChemicalLink query={query}>RAを開く</TransientChemicalLink>);

    const link = screen.getByRole("link", { name: "RAを開く" });
    expect(link.getAttribute("href")).toBe("/chemical-ra");
    expect(link.outerHTML).not.toContain(encodeURIComponent(query));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("ステージ失敗時は固定hrefの通常遷移へフォールバックする", () => {
    vi.stubGlobal("crypto", {});
    render(
      <TransientQueryBridgeProvider>
        <TransientChemicalLink query="トルエン">RAを開く</TransientChemicalLink>
      </TransientQueryBridgeProvider>,
    );

    const link = screen.getByRole("link", { name: "RAを開く" });
    expect(link.getAttribute("href")).toBe("/chemical-ra");
    fireEvent.click(link);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("確認済みCASはURLではなく一時メモリの照合情報として渡す", () => {
    render(
      <TransientQueryBridgeProvider>
        <TransientChemicalLink query="トルエン" confirmedCas="108-88-3">
          候補を確認
        </TransientChemicalLink>
        <PendingChemicalQuery />
      </TransientQueryBridgeProvider>,
    );

    fireEvent.click(screen.getByRole("link", { name: "候補を確認" }));
    fireEvent.click(screen.getByRole("button", { name: "一時入力を確認" }));

    expect(document.body.dataset.pendingChemical).toBe("トルエン");
    expect(document.body.dataset.pendingCas).toBe("108-88-3");
    expect(window.location.href).not.toContain("108-88-3");
    expect(router.push).toHaveBeenCalledWith("/chemical-ra");
  });
});
