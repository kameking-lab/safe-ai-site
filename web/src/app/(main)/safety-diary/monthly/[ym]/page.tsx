import { DiaryMonthlyClient } from "@/components/safety-diary/diary-monthly-client";

export default async function SafetyDiaryMonthlyPage({
  params,
}: {
  params: Promise<{ ym: string }>;
}) {
  const { ym } = await params;
  return <DiaryMonthlyClient ym={ym} />;
}
