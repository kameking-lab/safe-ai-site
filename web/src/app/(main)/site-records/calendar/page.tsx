import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { SafetyCalendarClient } from "./safety-calendar-client";

const _title = "年間 安全衛生カレンダー｜全国安全週間・労働衛生週間・季節リスク・毎月の法定義務を一覧";
const _desc =
  "全国安全週間（7月）・全国労働衛生週間（10月）・年末年始無災害運動、季節ごとの災害リスク（熱中症・凍結等）、毎月の安全衛生委員会・パトロール・KYなどを月別に一覧化。今月やるべき安全衛生の活動が一目で分かり、各ツールへワンタップで進めます。無料・登録不要。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/site-records/calendar" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl("年間 安全衛生カレンダー"), width: 1200, height: 630 }],
  },
};

export const revalidate = 86400;

export default function SafetyCalendarPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd name="年間 安全衛生カレンダー" description={_desc} path="/site-records/calendar" />
      <PageHeader
        title="年間 安全衛生カレンダー"
        description="全国安全週間・労働衛生週間・季節リスク・毎月の法定義務を月別に一覧。今月やることが一目で分かり、各ツールへ進めます。"
        icon={CalendarDays}
        iconColor="emerald"
      />
      <div className="mt-6">
        <SafetyCalendarClient />
      </div>
    </PageContainer>
  );
}
