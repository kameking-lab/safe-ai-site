import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LastUpdatedBadge } from "./last-updated-badge";

describe("LastUpdatedBadge", () => {
  it("確認日が無いと現在月を捏造せず確認待ちを表示する", () => {
    const { container } = render(<LastUpdatedBadge />);
    expect(screen.getByText(/未登録（確認記録待ち）/)).not.toBeNull();
    expect(container.querySelector("[data-verification='pending']")).not.toBeNull();
  });

  it("明示された確認記録だけを表示する", () => {
    render(<LastUpdatedBadge label="2026年7月24日" />);
    expect(screen.getByText(/2026年7月24日/)).not.toBeNull();
  });
});
