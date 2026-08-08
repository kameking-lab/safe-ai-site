import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EnvironmentNationalHeatAlertSummary } from "@/lib/heat-illness/environment-wbgt";
import { HomeHeatExperienceClient } from "./home-effect-first-client";

const mocks = vi.hoisted(() => ({
  resolvePrefecture: vi.fn(),
  geolocate: vi.fn(),
}));

vi.mock("@/lib/area/browser-prefecture-resolver", () => ({
  resolveBrowserPrefectureIso: mocks.resolvePrefecture,
}));

vi.mock("./area-heat-status", () => ({
  AreaHeatStatus: ({
    areaId,
    locationContextLabel,
  }: {
    areaId: string;
    locationContextLabel: string;
  }) => (
    <div data-testid="area-status" data-area-id={areaId}>
      {locationContextLabel}
    </div>
  ),
}));

vi.mock("./home-safety-cockpit-client", () => ({
  HeatSlideDeck: () => <div data-testid="slide-deck">15枚</div>,
  ChemicalQuickSearch: () => null,
  ChatQuickAsk: () => null,
}));

const national: EnvironmentNationalHeatAlertSummary = {
  status: "live",
  targetDate: "2026-07-31",
  reportAt: "2026-07-31T00:00:00.000Z",
  retrievedAt: "2026-07-31T00:05:00.000Z",
  heatAlertPrefectureCount: 12,
  specialHeatAlertPrefectureCount: 0,
  checkedPrefectureCount: 47,
  provider: "環境省 熱中症予防情報サイト",
  sourceUrl: "https://www.wbgt.env.go.jp/",
};

const originalPermissions = Object.getOwnPropertyDescriptor(
  navigator,
  "permissions",
);
const originalGeolocation = Object.getOwnPropertyDescriptor(
  navigator,
  "geolocation",
);

function setPermission(state: PermissionState) {
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: { query: vi.fn().mockResolvedValue({ state }) },
  });
}

function setGeolocation(
  run: (
    success: PositionCallback,
    error: PositionErrorCallback,
  ) => void,
) {
  mocks.geolocate.mockImplementation(run);
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: mocks.geolocate },
  });
}

function renderHeat(
  initialAreaId: string | null = null,
  initialLocationSource:
    | "previous"
    | "browser-granted"
    | "ip-coarse"
    | "selected"
    | "national" = "national",
) {
  return render(
    <HomeHeatExperienceClient
      initialAreaId={initialAreaId}
      initialLocationSource={initialLocationSource}
      initialWbgt={null}
      nationalSummary={national}
      slides={[]}
    />,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.cookie =
    "safe-ai-coarse-area-v1=; Path=/; Max-Age=0; SameSite=Lax";
  mocks.resolvePrefecture.mockReset();
  mocks.geolocate.mockReset();
  setPermission("prompt");
  setGeolocation(() => undefined);
});

afterEach(() => {
  if (originalPermissions) {
    Object.defineProperty(navigator, "permissions", originalPermissions);
  } else {
    Reflect.deleteProperty(navigator, "permissions");
  }
  if (originalGeolocation) {
    Object.defineProperty(navigator, "geolocation", originalGeolocation);
  } else {
    Reflect.deleteProperty(navigator, "geolocation");
  }
});

describe("HomeHeatExperienceClient location priority", () => {
  it("does not trigger a prompt-state permission until the explicit button", async () => {
    setGeolocation((_success, error) => {
      error({
        code: 1,
        message: "denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    });
    renderHeat();

    await waitFor(() => expect(navigator.permissions.query).toHaveBeenCalled());
    expect(mocks.geolocate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "現在地を更新" }));
    expect(mocks.geolocate).toHaveBeenCalledTimes(1);
    expect(
      (await screen.findByText(/位置情報は許可されていません/)).textContent,
    ).toContain("地域名から変更できます");
  });

  it("uses a stored coarse area before a granted browser location", async () => {
    window.localStorage.setItem(
      "safe-ai:coarse-area-id:v1",
      "osaka-osaka",
    );
    setPermission("granted");
    renderHeat("tokyo-shinjuku", "ip-coarse");

    await waitFor(() =>
      expect(screen.getByTestId("area-status").getAttribute("data-area-id")).toBe(
        "osaka-osaka",
      ),
    );
    expect(screen.getByTestId("area-status").textContent).toContain(
      "前回選択した地域",
    );
    expect(mocks.geolocate).not.toHaveBeenCalled();
  });

  it("converts an already granted coordinate to a prefecture and stores no coordinate", async () => {
    setPermission("granted");
    setGeolocation((success) => {
      success({
        coords: {
          latitude: 35.68,
          longitude: 139.76,
          accuracy: 10_000,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
    });
    mocks.resolvePrefecture.mockResolvedValue("JP-13");
    renderHeat();

    await waitFor(() =>
      expect(screen.getByTestId("area-status").getAttribute("data-area-id")).toBe(
        "tokyo-shinjuku",
      ),
    );
    expect(screen.getByTestId("area-status").textContent).toContain(
      "現在地付近",
    );
    expect(window.localStorage.getItem("safe-ai:coarse-area-id:v1")).toBe(
      "tokyo-shinjuku",
    );
    expect(JSON.stringify(window.localStorage)).not.toContain("35.68");
    expect(document.cookie).not.toContain("35.68");
    expect(mocks.resolvePrefecture).toHaveBeenCalledWith(139.76, 35.68);
  });

  it("keeps a fail-closed nationwide summary when no coarse region exists", () => {
    const { container } = renderHeat();

    expect(screen.getByText("全国の状況", { selector: "h2" })).toBeTruthy();
    expect(screen.getByText("地域を選択", { selector: "p" })).toBeTruthy();
    expect(screen.getByText("12都道府県")).toBeTruthy();
    expect(container.querySelectorAll("[data-warning-card]")).toHaveLength(0);
    expect(screen.queryByText(/取得できません/)).toBeNull();
    expect(screen.queryByText(/現在地とは表示しません/)).toBeNull();
  });
});
