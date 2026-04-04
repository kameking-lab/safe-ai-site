import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
};

export default function TermsPage() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-bold text-slate-900">利用規約</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          安全AIサイト（以下「本サービス」）の利用規約です。
          本ページは現在準備中です。詳細は後日公開予定です。
        </p>
      </div>
    </div>
  );
}
