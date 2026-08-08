import type { Metadata } from "next";
import { TransientSchedulerResult } from "@/components/health-checkup/transient-scheduler-result";

export const metadata: Metadata = {
  title: "健康診断スケジュール判定結果",
  robots: { index: false, follow: true },
};

export default function HealthCheckupSchedulerResultPage() {
  return <TransientSchedulerResult />;
}
