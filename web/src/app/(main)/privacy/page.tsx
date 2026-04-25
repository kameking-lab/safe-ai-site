import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "ANZEN AIのプライバシーポリシー。個人情報の取り扱いについて説明しています。",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "プライバシーポリシー｜ANZEN AI",
    description: "ANZEN AIのプライバシーポリシー。個人情報の取り扱いについて説明しています。",
  },
};

export default function PrivacyPage() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">プライバシーポリシー</h1>
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年4月22日</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. 事業者の名称・連絡先</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービス「ANZEN AI」（以下「本サービス」）の個人情報取扱事業者は、ANZEN AI 事務局（以下「当方」）です。
            個人情報保護に関するお問い合わせは
            <a className="underline hover:text-emerald-700" href="/contact">お問い合わせフォーム</a>
            よりご連絡ください。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. 取得する情報と取得方法</h2>
          <p className="text-sm leading-7 text-slate-600">
            当方は、以下の情報を取得します。
          </p>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">
              <span className="font-semibold text-slate-700">お問い合わせフォーム（/contact）</span>
              から取得する情報：会社名、担当者氏名、メールアドレス、電話番号（任意）、相談カテゴリ、ご予算感、希望相談方法、相談内容、希望機能、料金プランの選択（任意）
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">アクセスログ</span>
              ：IPアドレス、ユーザーエージェント、アクセス日時、参照元URL、リクエストパス
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">Cookie・ローカルストレージ</span>
              ：表示言語、表示サイズ、ふりがな表示設定、KY用紙のドラフト、選択地点、テーマ設定などの利用者設定
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">AI 機能の入力内容</span>
              ：AIチャットボット・化学物質リスクアセスメント・KY支援等に入力された質問文・作業内容は、当該リクエスト処理のためAI事業者（後述）に送信されます
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">メール通知の購読情報</span>
              （/api/notify/subscribe を利用する場合）：メールアドレス、通知条件、選択地点
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. 利用目的</h2>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">お問い合わせ・導入相談への返信、見積り、打合せ調整</li>
            <li className="list-disc">AI機能（法令チャットボット、化学物質リスクアセスメント、KY支援、業種別Eラーニング要約、事故事例分析）の提供</li>
            <li className="list-disc">気象警報・安全情報のメール通知配信（購読者のみ）</li>
            <li className="list-disc">サービスの安定運用・障害調査・不正アクセス防止・セキュリティ確保</li>
            <li className="list-disc">利用傾向の統計分析、機能改善、品質向上</li>
            <li className="list-disc">法令・行政機関・裁判所の要請に応じた対応</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. 第三者提供・委託先（越境移転を含む）</h2>
          <p className="text-sm leading-7 text-slate-600">
            当方は、利用目的の達成に必要な範囲で、以下の外部事業者に情報の取扱いを委託しています。
            AI事業者及びホスティング事業者は、利用者の入力・アクセスログを各社のプライバシーポリシーに従って取り扱います。
          </p>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">
              <span className="font-semibold text-slate-700">ホスティング／CDN</span>
              ：Vercel Inc.（米国）— 本サービスの配信・サーバーレス関数実行・アクセスログ処理
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">生成AI</span>
              ：Google LLC（米国・Gemini API）— 法令チャットボット、化学物質RA、KY支援、Eラーニング解説等の生成に利用。入力内容は Google のポリシーに従い処理されます
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">気象データ</span>
              ：気象庁 (jma.go.jp)、Open-Meteo（欧州）— 警報・予報情報の取得
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">決済</span>
              ：Stripe, Inc.（米国）— 月額プランの決済処理。当サイトはカード番号を保持せず、Stripeに委託しています
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">メール送信</span>
              ：Resend, Inc.（米国）／Formspree, Inc.（米国）— 通知メール・お問い合わせ転送（設定済みの場合のみ）
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">アフィリエイト</span>
              ：Amazon.co.jp、楽天市場等の広告事業者 — 商品リンククリック時は各サービスのポリシーが適用されます
            </li>
          </ul>
          <p className="text-sm leading-7 text-slate-600">
            上記のうち、個人情報が保管・処理される国は米国およびEU圏内（欧州経済領域）です。
            各事業者の個人情報保護水準は各社のプライバシーポリシー・認証（SOC2、GDPR 等）を参照してください。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">5. 保有期間</h2>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">お問い合わせ情報：対応終了後 3 年間</li>
            <li className="list-disc">アクセスログ：Vercel の保持設定に準じて最大 30 日（セキュリティ調査中は延長）</li>
            <li className="list-disc">Cookie・ローカルストレージ：利用者の端末に保存。ブラウザ設定より削除可能</li>
            <li className="list-disc">メール通知の購読情報：購読解除時に削除</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">6. Cookie・ローカルストレージ</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービスは、表示設定・KYドラフト・地点選択などの利用者体験を維持するため、ブラウザのローカルストレージと Cookie を利用します。
            認証用 Cookie を利用する場合があります（NextAuth セッション等）。ブラウザ設定から無効化・削除が可能ですが、ログイン状態の維持や KY 用紙の一時保存など一部機能が利用できなくなる場合があります。
            第三者による広告トラッキング目的の Cookie は設定していません（アフィリエイトリンク先を除く）。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">7. 開示・訂正・利用停止等のご請求</h2>
          <p className="text-sm leading-7 text-slate-600">
            利用者は、当方が保有する自身の個人情報について、個人情報保護法に基づき、利用目的の通知・開示・訂正・追加・削除・利用停止・消去・第三者提供の停止を請求することができます。
            本人確認のうえ合理的な範囲で対応します。
            <a className="underline hover:text-emerald-700" href="/contact">お問い合わせフォーム</a>
            よりご連絡ください。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">8. 未成年者の情報</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービスは事業者向けに提供しています。未成年者は保護者の同意を得たうえでご利用ください。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">9. セキュリティ</h2>
          <p className="text-sm leading-7 text-slate-600">
            通信はすべて HTTPS（TLS）により暗号化されています。アクセス権限の最小化、脆弱性情報の定期的な確認、依存ライブラリの更新を行っています。万が一の漏えい等事案が発生した場合は、個人情報保護委員会への報告および本人への通知を法令に従って行います。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">10. ポリシーの変更</h2>
          <p className="text-sm leading-7 text-slate-600">
            本ポリシーは、法令の改正、サービス内容の変更等により、必要に応じて改定することがあります。
            重要な変更を行う場合は本ページおよびサービス内で告知します。改定後の本ポリシーは、本ページに掲載した時点から効力を生じます。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">11. お問い合わせ窓口</h2>
          <p className="text-sm leading-7 text-slate-600">
            本ポリシーに関するご質問・ご請求は、
            <a className="underline hover:text-emerald-700" href="/contact">お問い合わせフォーム</a>
            よりご連絡ください。
          </p>
        </section>
      </div>
    </div>
  );
}
