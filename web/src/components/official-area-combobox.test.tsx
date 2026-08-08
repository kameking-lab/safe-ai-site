import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OfficialAreaCombobox } from "./official-area-combobox";

describe("OfficialAreaCombobox", () => {
  it("does not show method help before the user needs it", () => {
    const { container } = render(
      <OfficialAreaCombobox
        id="risk-area-search"
        label="現場の地域"
        selectedAreaId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(container.querySelector("[aria-live='polite']")).toBeNull();
    expect(screen.queryByText(/全角半角|自動確定/)).toBeNull();
  });

  it("verified city and ward alias resolves to one allowlisted area", () => {
    const onSelect = vi.fn();
    render(
      <OfficialAreaCombobox
        id="risk-area-search"
        label="現場の地域"
        selectedAreaId={null}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByRole("combobox", { name: "現場の地域" });
    fireEvent.change(input, { target: { value: "横浜 港北" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({
      id: "kanagawa-yokohama",
      resolutionLevel: "municipality",
    });
  });

  it("keeps a region typed before hydration and resolves its candidate", async () => {
    const onSelect = vi.fn();
    const element = (
      <OfficialAreaCombobox
        id="risk-area-prehydration"
        label="現場の地域"
        selectedAreaId={null}
        onSelect={onSelect}
      />
    );
    const host = document.createElement("div");
    host.innerHTML = renderToString(element);
    document.body.append(host);
    const prehydrationInput = host.querySelector<HTMLInputElement>("input")!;
    prehydrationInput.value = "横浜 港北";

    const view = render(element, { container: host, hydrate: true });

    expect(
      (screen.getByRole("combobox", {
        name: "現場の地域",
      }) as HTMLInputElement).value,
    ).toBe("横浜 港北");
    await waitFor(() => expect(screen.getByRole("option")).toBeDefined());
    view.unmount();
    host.remove();
  });

  it("bare ambiguous ward requires an explicit candidate selection", () => {
    const onSelect = vi.fn();
    render(
      <OfficialAreaCombobox
        id="risk-area-search"
        label="現場の地域"
        selectedAreaId={null}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByRole("combobox", { name: "現場の地域" });
    fireEvent.change(input, { target: { value: "中央区" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getAllByRole("option").length).toBeGreaterThan(1);
    expect(screen.getByText("候補を選んでください。")).toBeDefined();
  });
});
