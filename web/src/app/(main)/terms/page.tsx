import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
  description: "ANZEN AIの利用規約。本サービスの利用条件について説明しています。",
  openGraph: {
    title: "利用規約｜ANZEN AI",
    description: "ANZEN AIの利用規約。本サービスの利用条件について説明しています。",
  },
};

export default function TermsPage() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">利用規約</h1>
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年4月1日</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">第1条（適用）</h2>
          <p className="text-sm leading-7 text-slate-600">
            本規約は、ANZEN AI（以下「本サービス」）の利用条件を定めます。
            本サービスを利用するすべての方（以下「利用者」）は、本規約に同意したものとみなします。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">第2条（サービス内容）</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービスは、労働安全衛生に関する情報提供・学習支援・現場運用支援を目的としたポータルサイトです。
            提供する主なコンテンツは以下のとおりです。
          </p>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">事故データベース（労働災害事例の検索・閲覧）</li>
            <li className="list-disc">Eラーニング（安全衛生テーマ別学習コンテンツ）</li>
            <li className="list-disc">過去問クイズ（各種資格試験の過去問）</li>
            <li className="list-disc">法改正情報（労働安全衛生法等の改正情報）</li>
            <li className="list-disc">現場リスク情報（気象・作業リスク判定）</li>
            <li className="list-disc">KY用紙（危険予知活動支援）</li>
            <li className="list-disc">安全グッズ紹介（アフィリエイトリンク含む）</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">第3条（免責事項）</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービスが提供する情報は、一般的な教育・参考目的のものです。
            実際の安全管理・法令遵守にあたっては、必ず最新の法令・官公庁の公式情報および
            専門家の助言を確認してください。本サービスの情報に基づく判断・行動により
            生じた損害について、運営者は責任を負いません。
          </p>
          <p className="text-sm leading-7 text-slate-600">
            事故データベースの事例は、学習・再発防止目的で提供するものであり、
            特定の事業者・個人を特定・批判する意図はありません。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">第4条（禁止事項）</h2>
          <p className="text-sm leading-7 text-slate-600">利用者は以下の行為を行ってはなりません。</p>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">本サービスのコンテンツの無断転載・複製・商業利用</li>
            <li className="list-disc">本サービスのシステムへの不正アクセス・過負荷をかける行為</li>
            <li className="list-disc">虚偽の情報を送信する行為</li>
            <li className="list-disc">法令または公序良俗に違反する行為</li>
            <li className="list-disc">その他、運営者が不適切と判断する行為</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">第5条（知的財産権）</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービスのコンテンツ（テキスト・デザイン・ロジック等）に関する知的財産権は、
            運営者または正当な権利者に帰属します。
            厚労省等の公的機関が公表した情報を引用・参照する場合は、
            各機関の利用規約に従います。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">第6条（アフィリエイトリンク）</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービスは、Amazon・楽天市場等のアフィリエイトプログラムに参加しており、
            商品リンク経由での購入により運営者が報酬を受け取ることがあります。
            紹介する商品・サービスの選定は、安全衛生の観点から行っており、
            報酬の有無にかかわらず適切な商品を紹介することを方針とします。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">第7条（規約の変更）</h2>
          <p className="text-sm leading-7 text-slate-600">
            運営者は、必要に応じて本規約を変更することがあります。
            変更後の規約は、本ページに掲載した時点で効力を生じます。
            重要な変更がある場合は、サービス上でお知らせします。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">第8条（準拠法・管轄）</h2>
          <p className="text-sm leading-7 text-slate-600">
            本規約の解釈・適用は日本法に準拠します。
            本サービスに関して紛争が生じた場合は、運営者の所在地を管轄する裁判所を
            第一審の専属的合意管轄裁判所とします。
          </p>
        </section>
      </div>
    </div>
  );
}
