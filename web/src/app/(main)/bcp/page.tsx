import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "運営継続計画（BCP）",
  description: "ANZEN AIの運営継続計画（BCP）。個人事業の特性を踏まえた業務継続不可時の対応とデータ引き渡し方針を公開します。",
  alternates: { canonical: "/bcp" },
  openGraph: {
    title: "運営継続計画（BCP）｜ANZEN AI",
    description: "ANZEN AIの運営継続計画（BCP）。個人事業の特性を踏まえた業務継続不可時の対応とデータ引き渡し方針を公開します。",
  },
};

export default function BcpPage() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">運営継続計画（BCP）</h1>
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年4月26日</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            ANZEN AIは個人事業主が運営するサービスです。
            大企業と異なり、代替運営者や組織的なBCPチームはありません。
            その現実を正直に開示し、利用者が適切に判断できるよう情報を提供します。
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. 通常の可用性目標</h2>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">
              <span className="font-semibold text-slate-700">目標稼働率</span>
              ：99%以上（Vercel / Neonのインフラ依存）
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">計画メンテナンス</span>
              ：深夜（日本時間 2:00〜4:00）に実施。事前にサービス内で告知
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">インフラ障害</span>
              ：Vercel / Neon公式ステータスページで状況を確認できます
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">2. 運営者が業務継続不可になった場合</h2>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">個人事業のリスクを正直に開示</p>
            <p className="mt-2 text-sm leading-7 text-amber-800">
              疾病・事故・その他の理由により運営者が長期間業務継続不可となった場合、
              サービスの維持・更新が困難になる可能性があります。
              現時点では代替運営者は指定されていません。
            </p>
          </div>

          <h3 className="text-sm font-semibold text-slate-700">想定シナリオと対応方針</h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                短期（1〜2週間）
              </span>
              <span>
                自動化された仕組み（Vercel・Neon・Dependabot）により最低限のサービスは継続。
                お問い合わせへの返信は遅延する可能性あり。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                中期（1ヶ月以上）
              </span>
              <span>
                新機能追加・法改正データ更新が停止。月額サービスは課金を停止し、利用者に通知。
                既存データの参照は継続可能な状態を目標とする。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                サービス終了時
              </span>
              <span>
                後述のデータ引き渡し方針に従い対応。サービス終了の告知は
                サービス内および登録メールアドレスに90日前に通知する。
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. データ引き渡し方針</h2>
          <p className="text-sm leading-7 text-slate-600">
            利用者のデータはご自身のものです。サービス終了またはデータ移行の際は以下の対応を行います。
          </p>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">
              <span className="font-semibold text-slate-700">データエクスポート</span>
              ：ユーザーごとのデータ（KY用紙、安全記録等）をCSV/JSON形式でダウンロード提供（機能実装後）
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">エクスポート期間</span>
              ：サービス終了告知から90日間、データダウンロードを提供
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">削除</span>
              ：エクスポート期間終了後、すべてのユーザーデータを削除
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">法人向け（個別契約）</span>
              ：契約書に別途定めた条件を優先
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. 賠償責任保険の加入状況</h2>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">
              【予定】フェーズ1（独立後3ヶ月以内）で加入
            </p>
            <p className="mt-2 text-sm leading-7 text-blue-800">
              現時点では業務賠償責任保険・データ漏洩保険に未加入です。
              独立後のフェーズ1で加入予定です。詳細は
              <a className="underline hover:text-blue-900" href="/insurance">
                保険加入状況ページ
              </a>
              をご参照ください。
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">5. 今後のBCP強化計画</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                独立後3ヶ月
              </span>
              <span>賠償責任保険・データ漏洩保険への加入。緊急連絡先の明示。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                独立後6ヶ月
              </span>
              <span>データエクスポート機能の実装。オフサイトバックアップの整備。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                独立後12ヶ月
              </span>
              <span>法人化に伴う組織的BCP体制の整備。代替運営者または引継ぎ先の明示。</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
