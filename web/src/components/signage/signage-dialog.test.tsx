import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignageDialog } from "./signage-dialog";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        data-return-focus
        onClick={() => setOpen(true)}
      >
        開く
      </button>
      {open ? (
        <SignageDialog
          labelledBy="dialog-title"
          onClose={() => setOpen(false)}
          returnFocusSelector="[data-return-focus]"
        >
          <h2 id="dialog-title">確認ダイアログ</h2>
          <a href="/laws">公式資料</a>
        </SignageDialog>
      ) : null}
    </div>
  );
}

describe("SignageDialog", () => {
  it("初期フォーカス、Escape、フォーカス復帰を保証する", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "開く" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "確認ダイアログ",
    });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "閉じる" }),
    );

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("Tabをダイアログ内で循環させる", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "開く" }));
    const dialog = screen.getByRole("dialog", {
      name: "確認ダイアログ",
    });
    const close = screen.getByRole("button", { name: "閉じる" });
    const link = screen.getByRole("link", { name: "公式資料" });

    link.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    close.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(link);
  });
});
