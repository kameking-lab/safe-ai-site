import type { Metadata } from "next";
import { CompanyProfileForm } from "@/components/company-profile-form";
import { LocalDataExportImport } from "@/components/local-data-export-import";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "自社プロファイル",
  description:
    "自社の業種・規模・取扱物質などをこの端末に保存する設定画面。対応する法改正・化学物質・事故ニュースの画面で参照します。端末データのバックアップと復元もできます。",
  alternates: { canonical: "/profile" },
  robots: { index: false, follow: true },
};

export default function ProfilePage() {
  return (
    <PageContainer width="narrow" paddingY="none" className="py-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">自社プロファイル</h1>
        <p className="mt-1 text-sm text-slate-600">
          自社の業種・規模・取扱物質などをこの端末に保存します。下に示す対応画面で参照します。すべての機能への自動適用や、法令の適用判定を行う設定ではありません。
        </p>
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          ✓ データはこの端末（localStorage）に保存され、外部送信はされません。
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <CompanyProfileForm />
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-base font-bold text-slate-900">プロファイルが活用される場所</h2>
        <ul className="space-y-1 text-sm text-slate-700">
          <li>• 法改正一覧の「自社に効く改正」スコアリング</li>
          <li>• 化学物質RAの「現場の化学物質リスト」初期値</li>
          <li>• 事故ニュースの「自社類似事故Top5」レコメンド</li>
        </ul>
      </section>

      <section
        id="data-management"
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-1 text-base font-bold text-slate-900">端末データの管理（バックアップ／復元）</h2>
        <p className="mb-3 text-xs leading-5 text-slate-600">
          自社プロファイルはサーバーへ同期しません。端末を変える・ブラウザデータを消すと
          データが失われます。エクスポート JSON を保管して、別端末や再インストール時に
          インポートしてください。
        </p>
        <LocalDataExportImport />
      </section>
    </PageContainer>
  );
}
