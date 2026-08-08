import { describe, expect, it } from "vitest";
import { shouldShowKyCandidateNotice } from "./candidate-notice";

describe("shouldShowKyCandidateNotice", () => {
  it("候補がまだない初期状態では注意を表示しない", () => {
    expect(
      shouldShowKyCandidateNotice({
        availableCandidateCount: 0,
        selectedCandidateCount: 0,
      }),
    ).toBe(false);
  });

  it("候補の提示後または選択後だけ表示する", () => {
    expect(
      shouldShowKyCandidateNotice({
        availableCandidateCount: 1,
        selectedCandidateCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldShowKyCandidateNotice({
        availableCandidateCount: 0,
        selectedCandidateCount: 1,
      }),
    ).toBe(true);
  });
});
