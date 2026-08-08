import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnifiedChemicalSearch } from "./unified-chemical-search";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import {
  confirmChemicalCatalogSelection,
  searchChemicalCatalog,
} from "@/lib/chemical/search-client";

vi.mock("@/lib/chemical/search-client", () => ({
  searchChemicalCatalog: vi.fn(),
  confirmChemicalCatalogSelection: vi.fn(),
}));

const TOLUENE = {
  cas: "108-88-3",
  primaryName: "トルエン",
  aliases: [],
  flags: {
    carcinogenic: false,
    concentration: true,
    skin: false,
    label_sds: true,
  },
  appliedDates: {},
  notes: [],
  entryCount: 1,
};

function ConfirmedSelectionHarness({
  onPick,
}: {
  onPick: (chemical: MergedChemical) => void;
}) {
  const [query, setQuery] = useState("108-88-3");
  const [selected, setSelected] = useState<MergedChemical | null>(null);
  return (
    <UnifiedChemicalSearch
      query={query}
      selectedChemical={selected}
      onQueryChange={setQuery}
      onPickDb={(chemical) => {
        setQuery(chemical.primaryName);
        setSelected(chemical);
        onPick(chemical);
      }}
      onPickLegal={() => undefined}
      onAiSearch={() => undefined}
    />
  );
}

describe("UnifiedChemicalSearch fail-closed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(searchChemicalCatalog).mockReset();
    vi.mocked(confirmChemicalCatalogSelection).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("catalog通信失敗時は収載外と表示せず判定不能を示す", async () => {
    vi.mocked(searchChemicalCatalog).mockRejectedValue(new Error("offline"));
    const onAiSearch = vi.fn();
    const { rerender } = render(
      <UnifiedChemicalSearch
        query=""
        onQueryChange={() => undefined}
        onPickDb={() => undefined}
        onPickLegal={() => undefined}
        onAiSearch={onAiSearch}
      />,
    );

    rerender(
      <UnifiedChemicalSearch
        query="未確認物質"
        onQueryChange={() => undefined}
        onPickDb={() => undefined}
        onPickLegal={() => undefined}
        onAiSearch={onAiSearch}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(181);
    });

    expect(screen.getByText(/収載有無を判定できません/)).not.toBeNull();
    expect(screen.queryByText(/いずれにも見つかりません/)).toBeNull();

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    expect(onAiSearch).not.toHaveBeenCalled();
  });

  it("PF-007: 複数候補でEnterを押しても先頭候補を暗黙確定しない", async () => {
    const candidate = (cas: string, name: string) => ({
      cas,
      primaryName: name,
      aliases: [],
      flags: {
        carcinogenic: false,
        concentration: false,
        skin: false,
        label_sds: true,
      },
      appliedDates: {},
      notes: [],
      entryCount: 1,
    });
    vi.mocked(searchChemicalCatalog).mockResolvedValue([
      candidate("95-47-6", "キシレン"),
      candidate("1330-20-7", "キシレン"),
    ]);
    const onPickDb = vi.fn();
    const { rerender } = render(
      <UnifiedChemicalSearch
        query=""
        onQueryChange={() => undefined}
        onPickDb={onPickDb}
        onPickLegal={() => undefined}
        onAiSearch={() => undefined}
      />,
    );
    rerender(
      <UnifiedChemicalSearch
        query="キシレン"
        onQueryChange={() => undefined}
        onPickDb={onPickDb}
        onPickLegal={() => undefined}
        onAiSearch={() => undefined}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(181);
    });
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPickDb).not.toHaveBeenCalled();
    expect(screen.getByText(/複数候補があります/)).not.toBeNull();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("この物質候補を確認してください")).not.toBeNull();
    expect(onPickDb).not.toHaveBeenCalled();
  });

  it("does not refetch a server-confirmed identity on destination render", async () => {
    const selected = {
      cas: "108-88-3",
      primaryName: "トルエン",
      aliases: [],
      flags: {
        carcinogenic: false,
        concentration: true,
        skin: false,
        label_sds: true,
      },
      appliedDates: {},
      notes: [],
      entryCount: 1,
    };
    render(
      <UnifiedChemicalSearch
        query="トルエン"
        selectedChemical={selected}
        onQueryChange={() => undefined}
        onPickDb={() => undefined}
        onPickLegal={() => undefined}
        onAiSearch={() => undefined}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(searchChemicalCatalog).not.toHaveBeenCalled();
  });

  it("uses the destination CAS resolver's shared 30-result cache key", async () => {
    vi.mocked(searchChemicalCatalog).mockResolvedValue([]);
    render(
      <UnifiedChemicalSearch
        query="108-88-3"
        onQueryChange={() => undefined}
        onPickDb={() => undefined}
        onPickLegal={() => undefined}
        onAiSearch={() => undefined}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(181);
    });
    expect(searchChemicalCatalog).toHaveBeenCalledWith(
      "108-88-3",
      30,
      expect.any(AbortSignal),
    );
  });

  it("CAS候補は明示確認後だけSDS名へ更新する", async () => {
    vi.mocked(searchChemicalCatalog).mockResolvedValue([TOLUENE]);
    vi.mocked(confirmChemicalCatalogSelection).mockResolvedValue(TOLUENE);
    const onPickDb = vi.fn();

    render(<ConfirmedSelectionHarness onPick={onPickDb} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(181);
    });

    fireEvent.click(screen.getByRole("option").querySelector("button")!);
    expect(onPickDb).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "名称とCASを確認して続行" }),
      );
      await Promise.resolve();
    });

    expect(confirmChemicalCatalogSelection).toHaveBeenCalledWith(
      "108-88-3",
      "トルエン",
    );
    expect(onPickDb).toHaveBeenCalledWith(TOLUENE);
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe(
      "トルエン",
    );
    expect(
      screen.queryByText("この物質候補を確認してください"),
    ).toBeNull();
  });
});
