import type { Metadata } from "next";
import { withSiteOpenGraph } from "@/lib/seo-metadata";
import { PageContainer } from "@/components/layout";

import { PageJsonLd } from "@/components/page-json-ld";
import product from '@/lib/mobile/product-policy.json';
export const metadata: Metadata = {
  title: "利用規約",
  description: "安全AIポータルの利用規約。本サービスの利用条件について説明しています。",
  alternates: { canonical: "/terms" },
  openGraph: withSiteOpenGraph("/terms", {
    title: "利用規約",
    description: "安全AIポータルの利用規約。本サービスの利用条件について説明しています。",
  }),
};

export default function TermsPage() {
  return (
    <PageContainer width="narrow" className="space-y-8">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="利用規約" description="安全AIポータルの利用規約。本サービスの利用条件について説明しています。" path="/terms" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">利用規約</h1>
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年5月17日</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">第1条（適用）</h2>
          <p className="text-sm leading-7 text-slate-600">
            本規約は、安全AIポータル（以下「本サービス」）の利用条件を定めます。
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
            <li className="list-disc">演習問題クイズ（各種資格試験の学習用演習問題）</li>
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
          <h2 className="text-base font-bold text-slate-900">第7条（有償業務の相談・契約）</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サイトでは、業務自動化、AI活用、講習・研修、資料・手順書作成等の料金目安を掲載しています。掲載額だけで契約、注文または決済が成立するものではありません。相談受付が利用可能な場合も、作業範囲、納期、金額、支払条件、キャンセル、成果物の権利、外部サービス費、データ取扱いを記載した個別の見積・契約を双方で確認した後に受託します。
          </p>
          <p className="text-sm leading-7 text-slate-600">
            <span className="font-semibold text-slate-700">現在の状態：</span>
            本サイト上の月額有料プラン申込、オンライン決済、マイページでの解約・返金機能は提供していません。受付状態は業務自動化相談ページで、個人情報の入力前に表示します。
          </p>
          <p className="text-sm leading-7 text-slate-600">
            具体的な解約・変更・返金条件は、契約成立前に個別の見積・契約へ明記します。サイトに未実装の決済機能を利用できるものとして案内しません。
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
          <h2 className="text-base font-bold text-slate-900">第9条（反社会的勢力の排除）</h2>
          <p className="text-sm leading-7 text-slate-600">
            利用者は、現在および将来にわたり、暴力団、暴力団員、暴力団員でなくなった時から5年を経過しない者、
            暴力団準構成員、暴力団関係企業、総会屋、社会運動等標榜ゴロ、特殊知能暴力集団、その他これらに準ずる者
            （以下、総称して「反社会的勢力」）に該当しないこと、および反社会的勢力と次の各号に該当する関係を
            有しないことを表明し、かつ将来にわたっても該当しないことを確約します。
          </p>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">反社会的勢力が経営を支配していると認められる関係を有すること</li>
            <li className="list-disc">反社会的勢力が経営に実質的に関与していると認められる関係を有すること</li>
            <li className="list-disc">自己、自社もしくは第三者の不正の利益を図る目的または第三者に損害を加える目的をもって反社会的勢力を利用するなどの関係を有すること</li>
            <li className="list-disc">反社会的勢力に対して資金等を提供し、または便宜を供与するなどの関与をしていると認められる関係を有すること</li>
            <li className="list-disc">役員または経営に実質的に関与している者が、反社会的勢力と社会的に非難されるべき関係を有すること</li>
          </ul>
          <p className="text-sm leading-7 text-slate-600">
            利用者は、自らまたは第三者を利用して、本サービスおよび運営者に対し、暴力的な要求行為、
            法的責任を超えた不当な要求行為、取引に関して脅迫的な言動または暴力を用いる行為、
            風説の流布・偽計または威力を用いて運営者の信用を毀損もしくは業務を妨害する行為、
            その他これらに準ずる行為を行わないことを確約します。
          </p>
          <p className="text-sm leading-7 text-slate-600">
            運営者は、利用者が前各項に違反した場合、何らの催告を要せず直ちに利用者による本サービスの利用を停止し、
            または本規約に基づく契約関係を解除することができます。この場合において、利用者は運営者に生じた損害を
            賠償する責を負い、運営者は利用者に対し一切の損害を賠償しないものとします。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">第10条（準拠法・管轄）</h2>
          <p className="text-sm leading-7 text-slate-600">
            本規約の解釈・適用は日本法に準拠します。
            本サービスに関して紛争が生じた場合は、運営者の所在地を管轄する裁判所を
            第一審の専属的合意管轄裁判所とします。
          </p>
        </section>
        <section id="ios-subscription" className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">iOSアプリのPro購読</h2>
          <p className="text-sm leading-7 text-slate-600">iOSの安全AI Proは月額{product.monthlyPrice.toLocaleString('ja-JP')}円（税込）、期間1か月の自動更新購読です。購入時に表示されるApp Storeの商品・価格を確認してください。支払いと更新はApple Accountで管理されます。更新日の24時間前までにApp Storeの購読管理画面で解約できます。解約後も確認済みの有効期限までは利用できます。</p>
          <p className="text-sm leading-7 text-slate-600">同じ安全AI会員でログインすると、確認済みのウェブ購読またはアプリ内購入の権利を共有します。ウェブで有効な購読がある方はアプリでの追加購入は不要です。復元はアプリの「購入を復元」から行えます。解約・返金の手続きは購入元の案内に従ってください。アカウント削除やアプリの削除だけでは自動更新購読は解約されません。</p>
          <p className="text-sm leading-7 text-slate-600">無料の上限はチャット1日{product.limits.free.law_chat}回、RA1日{product.limits.free.chemical_ra}件、警報登録{product.limits.free.weatherLocations}地点・通知なしです。Proの上限はチャット1日{product.limits.pro.law_chat}回、RA1日{product.limits.pro.chemical_ra}件、警報登録{product.limits.pro.weatherLocations}地点・警報通知ありです。利用回数はウェブ・アプリで合算し、日本時間の0時を日次の境界とします。</p>
          <p className="text-sm leading-7 text-slate-600">機能の提供停止・安全検証・通信障害・運営の月間API原価上限によりAIを実行できない場合があります。評価を提供していないRAや参考情報だけの応答を評価完了として消費しません。警報通知は登録地点の都道府県単位であり、遅延・不達があり得ます。最新の公式情報も確認してください。</p>
          <p className="text-sm leading-7 text-slate-600"><a className="underline" href="https://apps.apple.com/account/subscriptions">App Storeの購読管理・解約</a> · <a className="underline" href="/privacy#ios-app">アプリのプライバシー</a></p>
        </section>
    </PageContainer>
  );
}
