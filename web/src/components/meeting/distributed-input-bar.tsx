import { ShieldAlert } from "lucide-react";
import type { MeetingContractorRow } from "@/lib/meeting/schema";

export interface DistributedInputBarProps {
  cloudConsent: boolean;
  meetingId: string;
  siteName: string;
  workDate: string;
  contractors: MeetingContractorRow[];
  onImport: (merged: MeetingContractorRow[]) => void;
}

/**
 * The local meeting sheet remains usable. Cross-company capability links are
 * deliberately unavailable while their abuse controls and persistence
 * semantics are being re-verified.
 */
export function DistributedInputBar(_props: DistributedInputBarProps) {
  return (
    <div
      role="note"
      className="mb-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950 print:hidden"
    >
      <ShieldAlert
        className="mr-1 inline h-4 w-4 align-[-3px]"
        aria-hidden="true"
      />
      協力会社との共有リンク入力は再検証中です。現在はリンクを発行せず、この端末内で入力・確認・印刷してください。
    </div>
  );
}
