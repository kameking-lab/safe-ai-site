import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OperationalStatus, type OperationalState } from "./operational-status";

describe("OperationalStatus", () => {
  it.each([
    "loading", "empty", "error", "offline", "stale", "partial-failure",
    "saving", "saved", "syncing", "synced", "shared", "verification-required",
  ] as OperationalState[])("renders a shared, machine-readable state: %s", (state) => {
    const { container } = render(<OperationalStatus state={state} />);
    expect(container.querySelector(`[data-operational-state="${state}"]`)).not.toBeNull();
  });

  it("uses an assertive alert for a fail-closed state", () => {
    render(<OperationalStatus state="partial-failure" />);
    expect(screen.getByRole("alert").getAttribute("aria-live")).toBe("assertive");
  });
});
