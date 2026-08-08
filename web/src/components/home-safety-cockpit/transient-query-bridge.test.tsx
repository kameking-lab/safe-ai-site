import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TransientQueryBridgeProvider,
  useTransientQueryBridge,
} from "./transient-query-bridge";

function BridgeProbe() {
  const bridge = useTransientQueryBridge();
  return (
    <div>
      <button
        type="button"
        onClick={() => bridge.stageChatQuestion("足場の特別教育は必要？")}
      >
        stage
      </button>
      <button
        type="button"
        onClick={() => bridge.stageChemicalQuery("キシレン")}
      >
        stage chemical
      </button>
      <button
        type="button"
        onClick={() => {
          const pending = bridge.peekChemicalQuery();
          document.body.dataset.pendingChemical = pending?.query ?? "";
          if (pending) bridge.consumeChemicalQuery(pending.id);
        }}
      >
        consume chemical
      </button>
      <button
        type="button"
        onClick={() => {
          const pending = bridge.peekChatQuestion();
          document.body.dataset.pendingQuestion = pending?.question ?? "";
          if (pending) bridge.consumeChatQuestion(pending.id);
        }}
      >
        consume
      </button>
      <button
        type="button"
        onClick={() => {
          document.body.dataset.pendingQuestion =
            bridge.peekChatQuestion()?.question ?? "";
        }}
      >
        peek
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <TransientQueryBridgeProvider>
      <BridgeProbe />
    </TransientQueryBridgeProvider>,
  );
}

describe("TransientQueryBridge", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    delete document.body.dataset.pendingQuestion;
    delete document.body.dataset.pendingChemical;
    vi.stubGlobal("crypto", {
      randomUUID: () => "one-shot-question-id",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps raw text in memory only and consumes it exactly once", () => {
    renderProbe();

    fireEvent.click(screen.getByRole("button", { name: "stage" }));
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(window.location.href).not.toContain(
      encodeURIComponent("足場の特別教育は必要？"),
    );

    fireEvent.click(screen.getByRole("button", { name: "consume" }));
    expect(document.body.dataset.pendingQuestion).toBe(
      "足場の特別教育は必要？",
    );
    fireEvent.click(screen.getByRole("button", { name: "peek" }));
    expect(document.body.dataset.pendingQuestion).toBe("");
  });

  it("does not restore a question after the provider is remounted", () => {
    const first = renderProbe();
    fireEvent.click(screen.getByRole("button", { name: "stage" }));
    first.unmount();

    renderProbe();
    fireEvent.click(screen.getByRole("button", { name: "peek" }));

    expect(document.body.dataset.pendingQuestion).toBe("");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("keeps a chemical query in memory only and consumes it exactly once", () => {
    renderProbe();

    fireEvent.click(screen.getByRole("button", { name: "stage chemical" }));
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(window.location.href).not.toContain(encodeURIComponent("キシレン"));

    fireEvent.click(screen.getByRole("button", { name: "consume chemical" }));
    expect(document.body.dataset.pendingChemical).toBe("キシレン");
    fireEvent.click(screen.getByRole("button", { name: "consume chemical" }));
    expect(document.body.dataset.pendingChemical).toBe("");
  });
});
