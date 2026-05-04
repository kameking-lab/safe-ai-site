import type { Metadata } from "next";
import { CompanyProfileForm } from "@/components/company-profile-form";
import { LocalDataExportImport } from "@/components/local-data-export-import";

export const metadata: Metadata = {
  title: "自社プロファイル｜ANZEN AI",
  description:
    "業種・規模・取扱化学物質・主要機械・現場名を登録すると、KY・日誌・法改正・事故DBなど全機能の初期表示が最適化されます。端末データのエクスポート/インポートも可能。",
  alternates: { canonical: "/profile" },
};

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">自社プロファイル</h1>
        <p className="mt-1 text-sm text-slate-600">
          業種・規模・取扱化学物質・主要機械・現場名を登録すると、KY・日誌・法改正・事故DB・サイネージなど全機能の初期表示が自社向けに最適化されます。
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
          <li>• ホームの「本日の安全衛生サマリ」のフィルタ</li>
          <li>• 朝のダイジェスト（事故事例・法改正・通達）の業種フィルタ初期値</li>
          <li>• KY用紙の業種プリセット初期適用</li>
          <li>• 安全衛生日誌の業種・現場名・予想災害の初期値</li>
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
          このサイトはサーバー同期を持ちません。端末を変える・ブラウザデータを消すと
          データが失われます。エクスポート JSON を保管して、別端末や再インストール時に
          インポートしてください。
        </p>
        <LocalDataExportImport />
      </section>
    </main>
  );
}
