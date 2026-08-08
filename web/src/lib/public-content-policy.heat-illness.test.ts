import { describe, expect, it } from "vitest";
import {
  isPublicRouteAvailable,
  isQuarantinedPublicPath,
} from "./public-content-policy";

describe("熱中症コンテンツの公開境界", () => {
  it("新規のHTML教材だけを利用可能にし、旧サブツールは隔離を維持する", () => {
    expect(
      isPublicRouteAvailable("/heat-illness-prevention/slides"),
    ).toBe(true);
    expect(
      isPublicRouteAvailable("/heat-illness-prevention/elearning"),
    ).toBe(true);
    expect(
      isQuarantinedPublicPath(
        "/heat-illness-prevention/wbgt-calculator",
      ),
    ).toBe(true);
    expect(
      isQuarantinedPublicPath("/heat-illness-prevention/industry-risk"),
    ).toBe(true);
  });

  it("query付きでもパス単位の境界を変えない", () => {
    expect(
      isPublicRouteAvailable(
        "/heat-illness-prevention/slides?utm_source=home",
      ),
    ).toBe(true);
    expect(
      isQuarantinedPublicPath(
        "/heat-illness-prevention/log?source=heat-hub",
      ),
    ).toBe(true);
  });
});
