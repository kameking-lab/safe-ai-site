import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeAreaPickerClient } from "./home-area-picker-client";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}));

describe("HomeAreaPickerClient hydration boundary", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    window.localStorage.clear();
  });

  it("keeps an immediate edit instead of overwriting it with stored-area restoration", async () => {
    window.localStorage.setItem(
      "safe-ai:coarse-area-id:v1",
      "osaka-osaka",
    );
    const { container } = render(
      <HomeAreaPickerClient
        initialAreaId={null}
        initialAreaLabel={null}
        initialLocationSource="national"
      />,
    );

    const input = screen.getByLabelText("都道府県・市区町村・主要都市");
    fireEvent.change(input, { target: { value: "横浜 港北" } });

    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
    expect((input as HTMLInputElement).value).toBe("横浜 港北");
    expect(navigation.refresh).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        container
          .querySelector("[data-home-area-picker]")
          ?.getAttribute("data-home-area-picker-hydrated"),
      ).toBe("true"),
    );
  });
});
