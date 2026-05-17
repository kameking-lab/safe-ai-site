import type { Metadata } from "next";
import { withSiteOpenGraph } from "@/lib/seo-metadata";
import { PageContainer } from "@/components/layout";

import { PageJsonLd } from "@/components/page-json-ld";
import { PrivacyCookieStatus } from "@/components/privacy/cookie-status";
export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "安全AIポータルのプライバシーポリシー。個人情報の取り扱いについて説明しています。",
  alternates: { canonical: "/privacy" },
  openGraph: withSiteOpenGraph("/privacy", {
    title: "プライバシーポリシー",
    description: "安全AIポータルのプライバシーポリシー。個人情報の取り扱いについて説明しています。",
  }),
};

export default function PrivacyPage() {
  return (
    <PageContainer width="narrow" className="space-y-8">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="プライバシーポリシー" description="安全AIポータルのプライバシーポリシー。個人情報の取り扱いについて説明しています。" path="/privacy" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">プライバシーポリシー</h1>
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年5月17日</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. 事業者の名称・連絡先</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービス「安全AIポータル」（以下「本サービス」）の個人情報取扱事業者は、安全AIポータル 事務局（以下「当方」）です。
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
          <p className="text-sm leading-7 text-slate-600">
            なお、サーバーサイドのアプリケーションログ（問い合わせ受信・フィードバック・メルマガ登録）には、氏名・メールアドレス・相談内容等の個人情報は記録しません。ログに含まれるのはカテゴリ、文字数、受信日時などの非個人情報のみです。
          </p>
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
          <h2 className="text-base font-bold text-slate-900">4-2. AI機能のデータ処理（Gemini API）</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービスの生成AI機能は、Google LLC が提供する
            <strong>Gemini API（Google AI Studio）</strong>
            を利用しています。利用にあたり、以下の点をご了承ください。
          </p>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">
              <span className="font-semibold text-slate-700">モデル学習への非利用</span>
              ：Gemini API（有料 API 経由）への入力は、Google のポリシーに従い、Google のモデル学習には利用されません。コンシューマ向け Gemini アプリとは扱いが異なります。
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">ログ保持期間</span>
              ：当方が保有するプロンプト・応答ログは、不正アクセス調査・品質改善目的のため最大 30 日間保持し、その後自動削除されます。Google 側の処理ログは
              <a
                className="ml-0.5 underline hover:text-emerald-700"
                href="https://ai.google.dev/gemini-api/terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                Gemini API 利用規約
              </a>
              に従って取り扱われます。
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">個人情報の入力に関する注意</span>
              ：氏名・住所・電話番号・社員番号・契約金額等の個人情報、および顧客先・現場の機密情報は、
              <strong>入力前に伏字（◯◯）等でマスキング</strong>
              することを強く推奨します。AI入力欄にも注意書きを表示しています。
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">越境移転</span>
              ：Gemini API の処理は米国およびその他の Google データセンターで行われます。
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">出力の正確性</span>
              ：AIの応答は最新法令や個別事案を保証するものではなく、必ず一次資料（e-Gov、厚労省等）または専門家にご確認ください。
            </li>
          </ul>
          <p className="text-sm leading-7 text-slate-600">
            技術的なセキュリティ対策の詳細は
            <a className="underline hover:text-emerald-700" href="/security">セキュリティページ</a>
            をご参照ください。
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
            ブラウザ設定から無効化・削除が可能ですが、ログイン状態の維持や KY 用紙の一時保存など一部機能が利用できなくなる場合があります。
          </p>
          <p className="text-sm leading-7 text-slate-600">
            <span className="font-semibold text-slate-700">Cookie・ストレージの種類別の取扱い：</span>
          </p>
          <ul className="ml-4 space-y-1.5 text-sm text-slate-600">
            <li className="list-disc">
              <span className="font-semibold text-slate-700">必須（Essential）</span>
              ：認証セッション（NextAuth）、表示設定、KYドラフトの一時保存など、本サービスの基本機能維持に不可欠なもの。無効化するとサービスの利用に支障が生じます。
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">分析（Analytics）</span>
              ：本サービスでは、利用傾向の把握および機能改善のため、環境変数
              <code className="mx-1 rounded bg-slate-100 px-1 text-xs text-slate-700">NEXT_PUBLIC_GA_MEASUREMENT_ID</code>
              が設定されている場合に Google Analytics 4（GA4）を導入することがあります。GA4 が有効な場合、`_ga` 等の Cookie によりページ閲覧の統計情報（匿名化された利用者識別子、ページパス、滞在時間など）が Google LLC（米国）へ送信されます。IP匿名化を有効化し、個人を直接特定する情報は送信しません。導入の有無は本ページ末尾の「現在の Cookie 利用状況」で確認できます。GA4 のデータ取扱いは
              <a className="ml-0.5 underline hover:text-emerald-700" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google プライバシーポリシー</a>
              に従います。
            </li>
            <li className="list-disc">
              <span className="font-semibold text-slate-700">広告（Advertising）</span>
              ：本サービス自体は広告トラッキング目的の Cookie を設定していません。ただし、ページ内のアフィリエイトリンク（Amazon・楽天等）をクリックして遷移した先では、各事業者のポリシーに基づき Cookie が設定される場合があります。これらは本サービスの管理外です。
            </li>
          </ul>
          <p className="text-sm leading-7 text-slate-600">
            <span className="font-semibold text-slate-700">分析 Cookie のオプトアウト：</span>
            分析 Cookie の送信を停止したい場合、(a) ブラウザの設定から Cookie をブロック、または (b)
            <a className="ml-0.5 underline hover:text-emerald-700" href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google アナリティクス オプトアウト アドオン</a>
            の導入により、本サービスでの GA4 計測を無効化できます。
          </p>
          <p className="text-sm leading-7 text-slate-600">
            <span className="font-semibold text-slate-700">2022年改正個人情報保護法・GDPR/CCPA対応について：</span>
            個人関連情報（Cookie等）の第三者提供にかかる本人同意取得義務（個人情報保護法第31条）への対応として、
            分析 Cookie の利用範囲・送信先・オプトアウト手段を本ポリシーで明示し、利用者が事前に判断できる体制としています。
            EU/EEA・英国・カリフォルニア州在住の利用者は、GDPR第15条〜第22条・CCPA に基づくデータ主体の権利
            （開示・訂正・削除・処理停止・データポータビリティ等）の請求を
            <a className="underline hover:text-emerald-700" href="/contact">お問い合わせフォーム</a>
            よりお寄せいただけます。
          </p>
          <p className="text-sm leading-7 text-slate-600">
            <span className="font-semibold text-slate-700">同意管理バナーについて：</span>
            個別 Cookie 種類ごとに事前同意を取得する同意管理バナー（CMP）の導入は、
            2026年下期の対応予定項目として整備中です。当面の対応として、本ページで Cookie 種別ごとの利用目的・送信先・オプトアウト手段を明示し、
            利用者が自己決定できる情報を提供する方針としています。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">6-2. 現在の Cookie 利用状況（動的表示）</h2>
          <PrivacyCookieStatus />
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
    </PageContainer>
  );
}
