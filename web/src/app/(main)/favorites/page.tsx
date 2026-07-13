import type { Metadata } from "next";
import { Star } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { FavoritesList } from "@/components/favorites/favorites-list";

const _title = "お気に入り (条文・通達)";
const _desc =
  "本端末で保存した労働安全衛生法の条文・通達のお気に入り一覧。報告書執筆や監督官対応時の参照に。データは端末内 (localStorage) のみに保持されます。";

export const metadata: Metadata = {
  alternates: { canonical: "/favorites" },
  title: _title,
  description: _desc,
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return (
    <>
      <PageJsonLd name={_title} description={_desc} path="/favorites" />
      <PageContainer width="prose" paddingY="default">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            お気に入り (条文・通達)
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            /law-search と /circulars で<Star className="inline h-3.5 w-3.5 align-[-2px] text-amber-500" aria-hidden="true" />を押した条文・通達がここに保存されます。
            最大 50 件まで端末内 (localStorage) に保持。
          </p>
          <p className="mt-1 text-xs text-slate-500">
            ※ サーバーには送信されません。本端末でのみ参照できます (機種変更時はエクスポート不可)。
          </p>
        </header>
        <FavoritesList />
      </PageContainer>
    </>
  );
}
