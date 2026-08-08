import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { KyAccidentCasesPanel } from "./ky-accident-cases";

describe("KyAccidentCasesPanel accident quarantine", () => {
  it.each(["", "フォークリフト荷役"])(
    "空欄または型だけが近い作業語「%s」では候補・転記UIを出さない",
    (workText) => {
      const onAdopt = vi.fn();
      const { container } = render(
        <KyAccidentCasesPanel workText={workText} onAdopt={onAdopt} />,
      );
      expect(container.firstChild).toBeNull();
      expect(onAdopt).not.toHaveBeenCalled();
    },
  );

  it("作業語まで一致する一次資料照合済み事故だけを人の操作後に取り込む", () => {
    const onAdopt = vi.fn();
    render(<KyAccidentCasesPanel workText="足場組立" onAdopt={onAdopt} />);

    const disclosure = screen.getByRole("button", {
      name: /この作業に関連する事故・教材例 1件/,
    });
    expect(screen.getByText(/人の確認必須/)).toBeTruthy();
    expect(onAdopt).not.toHaveBeenCalled();

    fireEvent.click(disclosure);
    fireEvent.click(screen.getByRole("button", { name: "危険のポイントへ取り込む" }));
    expect(onAdopt).toHaveBeenCalledTimes(1);
    expect(onAdopt.mock.calls[0]?.[0].source).toMatchObject({
      kind: "officialAccident",
      referenceId: "mhlw-100620",
    });
  });
});
