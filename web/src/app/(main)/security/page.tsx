import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "セキュリティ",
  description: "ANZEN AIのセキュリティ体制。インフラ・暗号化・認証・脆弱性対応の現状とロードマップを公開します。",
  alternates: { canonical: "/security" },
  openGraph: {
    title: "セキュリティ｜ANZEN AI",
    description: "ANZEN AIのセキュリティ体制。インフラ・暗号化・認証・脆弱性対応の現状とロードマップを公開します。",
  },
};

function Badge({ type }: { type: "現状" | "予定" | "未対応" }) {
  const styles: Record<string, string> = {
    現状: "bg-emerald-100 text-emerald-800",
    予定: "bg-blue-100 text-blue-800",
    未対応: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${styles[type]}`}>
      {type}
    </span>
  );
}

export default function SecurityPage() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">セキュリティ</h1>
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年4月26日</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            ANZEN AIは個人事業として運営されています。大企業と同じ認証は持っていませんが、
            利用可能な技術的措置を誠実に実施し、現状と計画を公開します。
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">現状</span>
            実施済み
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800">予定</span>
            実装予定
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">未対応</span>
            未実施（正直に記載）
          </span>
        </div>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">1. インフラ・データセンター</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">ホスティング</span>
                ：Vercel（Tokyo / Singapore リージョン）。CDN・DDoS緩和はVercel標準を利用。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">データベース</span>
                ：Vercel Postgres（Neon）Singapore リージョン。Neonが提供するSOC2 Type2認証済みインフラを利用。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">物理セキュリティ</span>
                ：Vercel / Neonのデータセンターに委託。当方は物理アクセス不可の構成。
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">2. 暗号化</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">通信暗号化</span>
                ：TLS 1.3（Vercel標準）。HTTP→HTTPSリダイレクト強制。HSTS適用。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">保管時暗号化</span>
                ：AES-256（Vercel / Neon 標準）。当方が独自に平文保存する仕組みはない。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="予定" />
              <span>
                <span className="font-semibold text-slate-700">アプリレベル暗号化</span>
                ：メールアドレス等の準個人情報の列単位暗号化（独立後3〜6ヶ月で実装予定）。
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">3. 認証・アクセス制御</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">認証方式</span>
                ：Google OAuth 2.0（NextAuth v5）。パスワードは当方で保管しない。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">管理者アクセス</span>
                ：本番DBへのアクセスは運営者のみ。Vercel Dashboardは2FA必須。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="予定" />
              <span>
                <span className="font-semibold text-slate-700">SAML SSO / SCIM</span>
                ：法人向けプランで提供予定（独立後12ヶ月以降）。
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">4. ログ・監視</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">アクセスログ</span>
                ：Vercelが最大30日保存（セキュリティ調査中は延長）。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="予定" />
              <span>
                <span className="font-semibold text-slate-700">ログ保管90日</span>
                ：独立後のインフラ整備と合わせて90日保管に延長予定。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="未対応" />
              <span>
                <span className="font-semibold text-slate-700">SIEM・異常検知</span>
                ：現状は自動アラートなし。Vercel標準の障害通知のみ。
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">5. バックアップ</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">自動バックアップ</span>
                ：Neon自動バックアップ（過去7日分のポイントインタイムリカバリ）。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="予定" />
              <span>
                <span className="font-semibold text-slate-700">オフサイトバックアップ</span>
                ：週次のS3等への追加バックアップ（独立後3ヶ月以降）。
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">6. 脆弱性管理</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">依存ライブラリ</span>
                ：GitHub Dependabot 週次自動スキャン。重要アップデートは手動レビューのうえ適用。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">緊急対応SLA</span>
                ：CVSSスコア7.0以上の脆弱性は24時間以内の対応を目標。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="予定" />
              <span>
                <span className="font-semibold text-slate-700">ペネトレーションテスト</span>
                ：独立後6〜12ヶ月で外部業者による実施を検討。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="未対応" />
              <span>
                <span className="font-semibold text-slate-700">脆弱性開示プログラム（VDP）</span>
                ：現状は専用窓口なし。
                <a className="underline hover:text-emerald-700" href="/contact">
                  お問い合わせフォーム
                </a>
                経由でご連絡ください。
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">7. AI基盤（Gemini API）</h2>
          <p className="text-sm leading-7 text-slate-600">
            ANZEN AI の生成AI機能（法令チャットボット、化学物質RA、KY支援、Eラーニング解説等）は
            Google LLC が提供する <strong>Gemini API（Google AI Studio）</strong>
            を経由して処理しています。
          </p>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">学習データ非利用</span>
                ：Gemini API（有料・Google AI Studio 経由）への入力は、Google のポリシーに基づき
                <strong>モデルの学習には利用されません</strong>
                。コンシューマ向け Gemini アプリとは扱いが異なります。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">プロンプト・応答ログの保持期間</span>
                ：当方サーバ上に保存するプロンプト・応答ログは
                <strong>30日で自動削除</strong>
                します（不正アクセス調査・品質改善目的の最低限）。Google 側の処理ログは
                <a
                  className="ml-0.5 underline hover:text-emerald-700"
                  href="https://ai.google.dev/gemini-api/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Gemini API 利用規約
                </a>
                に従って取り扱われます。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">個人情報マスキング推奨</span>
                ：氏名・住所・電話番号・社員番号・契約金額等の個人情報や機密情報は、
                <strong>入力前に伏字（◯◯）等でマスキング</strong>
                して送信することを推奨します。AI入力欄には注意書きを表示しています。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">越境移転</span>
                ：Gemini API の処理は米国およびその他の Google データセンターで行われます。
                個人情報を含む入力を行う場合は、利用者自身の責任において送信してください。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="予定" />
              <span>
                <span className="font-semibold text-slate-700">入力前自動マスキング</span>
                ：氏名・電話番号・メールアドレス等のパターンを検知して送信前に自動で伏字化する機能を実装予定（独立後3〜6ヶ月）。
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">8. セキュリティ認証・コンプライアンス</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Badge type="未対応" />
              <span>
                <span className="font-semibold text-slate-700">SOC2 Type2</span>
                ：未取得。個人事業での取得は現実的でないため、法人化後（独立後6〜12ヶ月）に取得を検討。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="未対応" />
              <span>
                <span className="font-semibold text-slate-700">ISO 27001</span>
                ：未取得。SOC2と同様に法人化後に検討。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">インフラ側の認証</span>
                ：Vercel・NeonはSOC2 Type2を取得済み。各社の認証レポートは公式サイトを参照。
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-bold text-slate-900">セキュリティに関するご連絡</h2>
          <p className="text-sm leading-7 text-slate-600">
            脆弱性の発見・不審なアクセス等は
            <a className="underline hover:text-emerald-700" href="/contact">
              お問い合わせフォーム
            </a>
            にてご報告ください。善意の報告は公開前に当方へご連絡いただくことを歓迎します。
          </p>
        </section>
      </div>
    </div>
  );
}
