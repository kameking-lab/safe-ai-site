import type { Metadata } from "next";
import { withSiteOpenGraph } from "@/lib/seo-metadata";
import { PageContainer } from "@/components/layout";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "セキュリティ",
  description: "安全AIポータルのセキュリティ体制。インフラ・暗号化・認証・脆弱性対応の現状とロードマップを公開します。",
  alternates: { canonical: "/security" },
  openGraph: withSiteOpenGraph("/security", {
    title: "セキュリティ",
    description: "安全AIポータルのセキュリティ体制。インフラ・暗号化・認証・脆弱性対応の現状とロードマップを公開します。",
  }),
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
    <PageContainer width="narrow" className="space-y-8">
        <PageJsonLd name="セキュリティ" description="安全AIポータルのセキュリティ体制。インフラ・暗号化・認証・脆弱性対応の現状とロードマップを公開します。" path="/security" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">セキュリティ</h1>
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年7月22日</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            安全AIポータルは個人事業として運営されています。大企業と同じ認証は持っていませんが、
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
                ：Prisma/PostgreSQLおよび、構成済み環境ではSupabaseを利用します。実際の事業者・リージョン・保持条件はデプロイ環境の設定に依存します。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">物理セキュリティ</span>
                ：ホスティング・データベース事業者のデータセンターに委託し、当方は物理設備を管理しません。
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
                ：ホスティング・データベース事業者の保管時暗号化機能に依存します。アプリケーション独自の列単位暗号化は未実装です。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="予定" />
              <span>
                <span className="font-semibold text-slate-700">アプリレベル暗号化</span>
                ：メールアドレス等の準個人情報の列単位暗号化（計画中）。
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">3. 認証・アクセス制御</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Badge type="未対応" />
              <span>
                <span className="font-semibold text-slate-700">認証方式</span>
                ：Google OAuth 2.0（NextAuth v5）のコードはありますが、2026年7月22日の公開確認では認証エンドポイントが利用できませんでした。認証が必要な機能は、構成・E2E確認完了まで提供済みとは扱いません。パスワードは当方で保管しません。
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
                ：ホスティング事業者のプラン・設定に従います。当方アプリは氏名・メールアドレス・質問本文を意図的にログ出力しない構成とし、保持期間を一律には保証しません。
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
              <Badge type="未対応" />
              <span>
                <span className="font-semibold text-slate-700">自動バックアップ</span>
                ：データベース事業者側の機能は環境設定に依存し、復旧テストを含む当方のバックアップ保証は未整備です。
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
            安全AIポータルの一部生成AI機能（法令チャット、KY支援、解説生成等）は、環境設定時に
            Google LLC が提供する <strong>Gemini API（Google AI Studio）</strong>を利用します。
            化学物質RAの自動評価は停止しており、SDSと公式ツールの確認導線のみを提供します。
          </p>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">モデル学習への利用条件</span>
                ：契約・課金状態とGoogleの適用条件により扱いが異なるため、本サービスだけで入力がモデル学習に利用されないことを一律に保証しません。機密情報・個人情報は入力しないでください。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">プロンプト・応答ログの保持期間</span>
                ：本アプリケーションはプロンプト・応答本文を永続ログへ保存しません。同一質問の負荷軽減のため、一部応答をプロセス内で最大24時間キャッシュする場合があります。ホスティング事業者・Google側の処理ログは
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
                <span className="font-semibold text-slate-700">個人情報・機密情報は入力禁止</span>
                ：氏名・住所・電話番号・メールアドレス・社員番号・健康情報・顧客先や現場の機密情報は入力しないでください。
                検知した場合は外部AIへ送信せず、処理を保留します。ただし、検知をすり抜ける可能性があるため、入力しないことが前提です。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">越境移転</span>
                ：Gemini API の処理は米国およびその他の Google データセンターで行われます。
                個人情報・健康情報・機密情報を含む入力は外部AIへ送信しない設計です。入力自体を行わないでください。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge type="現状" />
              <span>
                <span className="font-semibold text-slate-700">送信前の入力検査</span>
                ：個人情報・健康情報・機密情報の疑いを検知した場合は自動で伏字化せず、外部送信を止めて入力の削除を求めます。
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
                ：利用する各インフラ事業者の認証範囲は、事業者の最新の公式資料と実際の契約サービスをご確認ください。当方サービス自体の認証取得を意味しません。
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
    </PageContainer>
  );
}
