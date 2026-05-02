import { DiaryDetailClient } from "@/components/safety-diary/diary-detail-client";

export default async function SafetyDiaryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DiaryDetailClient id={id} />;
}
