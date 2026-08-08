import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CalculatorPanel } from "./calculator-panel";
import {
  clearConstructionCalcHandoffForTest,
  putConstructionCalcHandoff,
} from "@/lib/construction-calc/transient-handoff";

beforeEach(() => {
  cleanup();
  clearConstructionCalcHandoffForTest();
  window.history.replaceState(null, "", "/construction-calc/concrete-volume");
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("CalculatorPanel transient handoff", () => {
  it("applies known fields once without adding site values to browser state", async () => {
    putConstructionCalcHandoff({
      slug: "concrete-volume",
      values: {
        calcMode: "rectangular",
        lengthDim: 12.75,
        widthDim: 8.25,
        heightDim: 0.4,
        unknownPrivateField: "CONFIDENTIAL-SITE-MARKER",
      },
    });

    const first = render(<CalculatorPanel slug="concrete-volume" />);

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/^縦（長さ）/) as HTMLInputElement).value,
      ).toBe("12.75");
      expect(
        (screen.getByLabelText(/^横（幅）/) as HTMLInputElement).value,
      ).toBe("8.25");
      expect(
        (screen.getByLabelText(/^高さ（厚さ）/) as HTMLInputElement).value,
      ).toBe("0.4");
    });
    expect(document.body.textContent).not.toContain("CONFIDENTIAL-SITE-MARKER");
    expect(window.location.search).toBe("");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);

    first.unmount();
    render(<CalculatorPanel slug="concrete-volume" />);

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/^縦（長さ）/) as HTMLInputElement).value,
      ).toBe("5");
      expect(
        (screen.getByLabelText(/^横（幅）/) as HTMLInputElement).value,
      ).toBe("4");
      expect(
        (screen.getByLabelText(/^高さ（厚さ）/) as HTMLInputElement).value,
      ).toBe("0.5");
    });
  });
});
