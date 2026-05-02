import { DiaryPrintClient } from "@/components/safety-diary/diary-print-client";

export default async function SafetyDiaryPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DiaryPrintClient id={id} />;
}
