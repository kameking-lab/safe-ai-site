import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChemicalRaSaveButton, SavedRaList } from "./chemical-ra-save";
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
  syncState: "saved-locally",
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

describe("ChemicalRaSaveButton のネットワーク表示", () => {
  const props = {
    chemicalName: "匿名化物質",
    cas: "108-88-3",
    workContent: "匿名化作業",
    exposureBand: "II",
    payload: { confirmedByHuman: true },
  };

  it("保存された実レコードを親へ渡し、印刷対象を保存内容と一致させる", async () => {
    const saved = { ...RECORD, raId: "ra-new-copy", savedAt: "2026-10-20T03:00:00.000Z" };
    vi.spyOn(raCloud, "saveChemicalRaRecord").mockResolvedValue({
      raId: saved.raId, localStatus: "saved-locally", cloudStatus: "not-requested",
    });
    const read = vi.spyOn(raCloud, "getChemicalRaRecord").mockResolvedValue(saved);
    const onSaved = vi.fn();
    render(<ChemicalRaSaveButton {...props} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "この結果を保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(read).toHaveBeenCalledWith(saved.raId);
  });

  it("保存に失敗したときは現在の印刷対象を更新しない", async () => {
    vi.spyOn(raCloud, "saveChemicalRaRecord").mockResolvedValue({
      raId: "ra-failed", localStatus: "failed", cloudStatus: "not-requested",
    });
    const read = vi.spyOn(raCloud, "getChemicalRaRecord");
    const onSaved = vi.fn();
    render(<ChemicalRaSaveButton {...props} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "この結果を保存" }));
    await screen.findByText(/端末内への保存に失敗/);
    expect(read).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("保存内容を再取得できないときは印刷を更新したと表示しない", async () => {
    vi.spyOn(raCloud, "saveChemicalRaRecord").mockResolvedValue({
      raId: "ra-unreadable", localStatus: "saved-locally", cloudStatus: "not-requested",
    });
    vi.spyOn(raCloud, "getChemicalRaRecord").mockResolvedValue(null);
    const onSaved = vi.fn();
    render(<ChemicalRaSaveButton {...props} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "この結果を保存" }));
    await screen.findByText(/印刷前に台帳から保存内容を確認/);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it.each([
    ["synced", "認証済みクラウドとの同期も完了しました"],
    ["failed", "クラウド同期は失敗しました"],
    ["not-configured", "クラウドは運営側で未設定"],
    ["not-requested", "クラウドへは送信していません"],
  ] as const)("保存結果 %s と表示を一致させる", async (cloudStatus, expected) => {
    vi.spyOn(raCloud, "isChemicalRaCloudEnabled").mockReturnValue(true);
    vi.spyOn(raCloud, "saveChemicalRaRecord").mockResolvedValue({
      raId: "ra-test",
      localStatus: "saved-locally",
      cloudStatus,
    });
    render(<ChemicalRaSaveButton {...props} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "この結果を保存" }));
    expect(await screen.findByText(new RegExp(expected))).toBeDefined();
  });

  it("送信中を明示し、完了まで再送信できない", async () => {
    vi.spyOn(raCloud, "isChemicalRaCloudEnabled").mockReturnValue(true);
    let resolveSave!: (value: raCloud.ChemicalRaSaveResult) => void;
    vi.spyOn(raCloud, "saveChemicalRaRecord").mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    render(<ChemicalRaSaveButton {...props} />);
    const button = screen.getByRole("button", { name: "この結果を保存" });
    fireEvent.click(button);
    expect(
      (screen.getByRole("button", { name: "保存中…" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    resolveSave({
      raId: "ra-test",
      localStatus: "saved-locally",
      cloudStatus: "not-requested",
    });
    await screen.findByText(/クラウドへは送信していません/);
  });
});
