import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
  description: "ANZEN AIの利用規約。本サービスの利用条件について説明しています。",
  alternates: { canonical: "/terms" },
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
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年4月25日</p>
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
          <h2 className="text-base font-bold text-slate-900">第3条（情報の性質・免責事項）</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービスが提供する情報は、一般的な教育・参考目的のものであり、個別具体的な
            作業現場における法的判断・安全判断を代替するものではありません。実際の安全管理・
            法令遵守にあたっては、必ず最新の法令・官公庁の公式情報（e-Gov・厚生労働省 等）
            および労働安全コンサルタント等の専門家の助言を確認してください。
          </p>
          <p className="text-sm leading-7 text-slate-600">
            AI チャットボット、化学物質リスクアセスメント、KY 支援、Eラーニング解説、
            事故事例分析などの AI 生成コンテンツは、出典条文・出典データに基づく参考情報です。
            回答の正確性・網羅性・最新性を保証するものではなく、個別の判断に用いる際は
            必ず原典および専門家の確認を行ってください。
          </p>
          <p className="text-sm leading-7 text-slate-600">
            当方は、本サービスの利用により利用者に生じた損害について、次の各号に定める場合を除き、
            賠償責任を負いません。
          </p>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">当方の故意または重大な過失による場合</li>
            <li className="list-disc">消費者契約法その他の強行法規により、責任の全部または一部を免除することができない場合</li>
          </ul>
          <p className="text-sm leading-7 text-slate-600">
            消費者契約法第 8 条・第 8 条の 2 の趣旨に従い、事業者の損害賠償責任を全部免除する条項、
            および事業者の故意・重過失による損害賠償責任を一部免除する条項は本規約に含まれません。
            消費者である利用者の解除権を放棄させる条項（同法第 8 条の 3）も設けていません。
            利用者が消費者に該当する場合、賠償責任が生じるときは、当方が受領した対価の額を
            上限として責任を負います。対価の授受がない場合（無償利用）は、通常生ずべき直接かつ
            現実の損害に限り、金 1 万円を上限として責任を負います。
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
          <h2 className="text-base font-bold text-slate-900">第7条（有料プランの申込・解約・返金）</h2>
          <p className="text-sm leading-7 text-slate-600">
            利用者は、本サービスの有料プラン（スタンダード／プロ）に申し込むことにより、本規約および特定商取引法に基づく表示記載事項に同意したものとみなします。
          </p>
          <p className="text-sm leading-7 text-slate-600">
            <span className="font-semibold text-slate-700">解約：</span>
            利用者は、マイページの「プラン管理」（Stripe Customer Portal）からいつでも解約手続きを行うことができます。解約後も、解約処理時点の請求期間の終了日までは引き続きサービスをご利用いただけます。
          </p>
          <p className="text-sm leading-7 text-slate-600">
            <span className="font-semibold text-slate-700">返金：</span>
            有料プランは月額課金制です。本サービスは消費者契約法上の役務提供であり、特定商取引法に基づくクーリング・オフの対象外ですが、初回課金日から8日以内に「サービス内容が広告と著しく相違する」等の合理的理由による返金請求があった場合、個別審査のうえ返金に応じます。利用者都合による中途解約の場合、当該請求期間内は引き続きサービスを利用可能ですが、未利用期間分の日割り返金は行いません。決済システム障害・誤課金・運営者の重大な債務不履行など運営者の責に帰すべき事由による場合は、消費者契約法第8条に基づき、当該事由により発生した損害を返金いたします。
          </p>
          <p className="text-sm leading-7 text-slate-600">
            <span className="font-semibold text-slate-700">支払いの停止：</span>
            支払いに失敗した場合、Stripeより自動的にリトライが実行されます。一定期間支払いが完了しない場合、運営者は当該プランの提供を停止することができます。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">第8条（規約の変更）</h2>
          <p className="text-sm leading-7 text-slate-600">
            運営者は、必要に応じて本規約を変更することがあります。
            変更後の規約は、本ページに掲載した時点で効力を生じます。
            重要な変更がある場合は、サービス上でお知らせします。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">第9条（準拠法・管轄）</h2>
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
