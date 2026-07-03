import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SavedRaList } from "./chemical-ra-save";
import * as raCloud from "@/lib/chemical/ra-cloud";

/**
 * 実施記録の削除（確認ダイアログ＋失敗フィードバック）の回帰ガード（2026-07-04）。
 * 従来は確認なし・失敗時に無反応だった不具合を是正。
 */
const RECORD: raCloud.ChemicalRaSavedRecord = {
  raId: "ra-1",
  cas: "108-88-3",
  substance: "トルエン",
  workContent: "塗装作業",
  exposureBand: "低",
  payload: {},
  savedAt: "2026-07-01T00:00:00.000Z",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SavedRaList の削除", () => {
  it("確認ダイアログでキャンセルすると削除されない", async () => {
    vi.spyOn(raCloud, "listChemicalRaRecords").mockResolvedValue([RECORD]);
    const deleteSpy = vi.spyOn(raCloud, "deleteChemicalRaRecord");
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<SavedRaList />);
    await screen.findByText("トルエン");

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("確認して削除に失敗した場合はエラー文言を表示する", async () => {
    vi.spyOn(raCloud, "listChemicalRaRecords").mockResolvedValue([RECORD]);
    vi.spyOn(raCloud, "deleteChemicalRaRecord").mockRejectedValue(new Error("network"));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<SavedRaList />);
    await screen.findByText("トルエン");

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("削除に失敗しました");
  });

  it("確認して削除に成功した場合は一覧が再読込される", async () => {
    const listSpy = vi
      .spyOn(raCloud, "listChemicalRaRecords")
      .mockResolvedValueOnce([RECORD])
      .mockResolvedValueOnce([]);
    vi.spyOn(raCloud, "deleteChemicalRaRecord").mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<SavedRaList />);
    await screen.findByText("トルエン");

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => expect(listSpy).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText("トルエン")).toBeNull());
  });
});
