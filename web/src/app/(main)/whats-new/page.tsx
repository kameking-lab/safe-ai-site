import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { buildNewsHubItems, getNewsHubMeta } from "@/lib/news-hub";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { WhatsNewClient } from "./whats-new-client";

function fmtJst(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export const metadata: Metadata = {
  title: "新着情報ハブ｜法改正・事故速報・通達を一元表示（無料・登録不要）",
  description:
    "労働安全衛生の「いま」を1画面で。法改正（施行前/施行済）・労災の月次速報・厚労省通達・関連報道を新着順に一元表示。すべて出典リンク付き、登録不要で閲覧可。RSS購読にも対応。",
  alternates: { canonical: "/whats-new" },
  openGraph: {
    title: "新着情報ハブ｜法改正・事故速報・通達を一元表示",
    description: "法改正・労災速報・通達・報道を新着順に一元表示。出典リンク付き・無料・登録不要。RSS対応。",
    images: [{ url: ogImageUrl("新着情報ハブ｜法改正・事故速報・通達"), width: 1200, height: 630 }],
  },
};

// ISR: 既存ETL（月次速報・e-Gov法改正・報道feed）の更新を日次で反映
export const revalidate = 86400;

export default function WhatsNewPage() {
  const items = buildNewsHubItems();
  const meta = getNewsHubMeta();
  const lawFetched = fmtJst(meta.lawRevisionsFetchedAt);
  const accidentFetched = fmtJst(meta.accidentSokuhouFetchedAt);

  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="新着情報ハブ｜法改正・事故速報・通達"
        description="労働安全衛生の法改正・労災速報・通達・報道を新着順に一元表示。出典リンク付き・無料・登録不要。"
        path="/whats-new"
      />
      {/* 柱0: 文字ダイエット＝h1以外の説明・購読導線は折りたたみへ格納（情報は消さない） */}
      <header className="mb-3">
        <h1 className="text-2xl font-bold text-slate-900">新着情報ハブ</h1>
        <CollapsibleDetail summary="RSS購読・メール通知・関連ページ・データ取得日" className="mt-2">
          <p>
            法改正（施行前／施行済）・労災の月次速報・厚労省通達・関連報道を、新着順に1画面で。
            登録不要でご覧いただけます。RSSでも購読できます。
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <a href="/feed/news.xml" className="font-semibold text-orange-700 hover:underline">
              📡 新着すべて（RSS）
            </a>
            <a href="/feed/law-revisions.xml" className="font-semibold text-orange-700 hover:underline">
              📡 法改正だけ（RSS）
            </a>
            <a href="/feed/accident-reports.xml" className="font-semibold text-orange-700 hover:underline">
              📡 事故速報だけ（RSS）
            </a>
            <a href="/feed/serious-cases.xml" className="font-semibold text-orange-700 hover:underline">
              📡 重大災害事例だけ（RSS）
            </a>
            <Link href="/laws" className="font-semibold text-emerald-700 hover:underline">
              法改正一覧へ →
            </Link>
            <Link href="/accidents-reports" className="font-semibold text-emerald-700 hover:underline">
              事故レポートへ →
            </Link>
            <Link href="/accident-news" className="font-semibold text-emerald-700 hover:underline">
              重大災害事例ブラウザへ →
            </Link>
            <Link href="/notifications" className="font-semibold text-emerald-700 hover:underline">
              ✉ メールで受け取る（無料・登録はメアドのみ）
            </Link>
          </div>
          {/* P2-3: 反映ラグの可視化（最終取得日時） */}
          {(lawFetched || accidentFetched) && (
            <p className="mt-2 text-[11px] text-slate-500">
              最終取得：
              {lawFetched && `法改正 ${lawFetched}`}
              {lawFetched && accidentFetched && " ／ "}
              {accidentFetched && `事故速報 ${accidentFetched}`}
              （自動更新）
            </p>
          )}
        </CollapsibleDetail>
      </header>

      <WhatsNewClient items={items} />

      <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
        ※ 本ページは公開情報（e-Gov法令検索・厚生労働省・国土交通省等）の新着を集約した参考情報です。
        内容の正確・最新の確認は各公式情報でお願いします。法改正の解釈・個別対応は労働安全コンサルタント等の専門家にご相談ください。
      </p>
    </PageContainer>
  );
}
