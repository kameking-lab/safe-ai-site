type KyCandidateNoticeState = {
  availableCandidateCount: number;
  selectedCandidateCount: number;
};

export function shouldShowKyCandidateNotice({
  availableCandidateCount,
  selectedCandidateCount,
}: KyCandidateNoticeState): boolean {
  return availableCandidateCount > 0 || selectedCandidateCount > 0;
}
