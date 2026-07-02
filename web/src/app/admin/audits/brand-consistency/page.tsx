import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "ブランド整合性監査 2026-05-17",
  description:
    "「個人運営研究プロジェクト・ボランティア運営」体裁との整合性監査。PR #187 激辛監査 A-005 派生フォローアップ。",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null as unknown as string },
};

const META = {
  auditId: "brand-consistency-2026-05-17",
  auditDate: "2026-05-17",
  parentAudit: "PR #187 / Finding A-005",
  scope:
    "「弊社」「当社」「無料相談」「料金プラン」「専門家チーム」「完全網羅」等の企業向け表現の検出と整合化",
  totalFindings: 75,
  classification: { B1: 0, B2: 65, B3: 10, B4: 15 },
};

type Fix = {
  id: string;
  category: "B2-1" | "B2-2" | "B2-3" | "B2-4" | "B2-5";
  target: string;
  before: string;
  after: string;
};

const FIXES: Fix[] = [
  {
    id: "F1",
    category: "B2-1",
    target: "data/education-context.ts SUPERVISOR_LABEL",
    before: "コンテンツは 安全AIポータル 専門家チームによる設計です",
    after: "労働安全衛生コンサルタント（登録番号260022）監修",
  },
  {
    id: "F2",
    category: "B2-1",
    target: "教育詳細12ページ footer / articles/page.tsx / chatbot/ChatbotBody.tsx",
    before: "安全AIポータル 専門家チームによる設計",
    after: "労働安全衛生コンサルタント（登録番号260022）監修",
  },
  {
    id: "F3",
    category: "B2-1",
    target: "features/print/print-features-client.tsx / leaflet/LeafletPrintView.tsx",
    before: "監修: 安全AIポータル 専門家チーム",
    after: "監修: 労働安全衛生コンサルタント（登録番号260022）",
  },
  {
    id: "F4",
    category: "B2-1",
    target: "data/features-catalog.ts (stats entry)",
    before: "本サイトは登録安全AIポータル 専門家チームが監修",
    after: "本サイトは労働安全衛生コンサルタント（登録番号260022）が個人で監修",
  },
  {
    id: "F5",
    category: "B2-1",
    target: "app/api/og/route.tsx",
    before: "安全AIポータル — 専門家チームによる設計",
    after: "安全AIポータル — 労働安全衛生コンサルタント監修",
  },
  {
    id: "F6",
    category: "B2-1",
    target: "components/home-value-hero.tsx",
    before: "専門家チームのもと、すべての機能を無料で公開",
    after: "労働安全衛生コンサルタント（登録番号260022）監修のもと、すべての機能を無料で公開",
  },
  {
    id: "F7",
    category: "B2-1",
    target: "about/page.tsx 運営チームセクション",
    before: "安全AIポータル 運営チーム / 労働安全衛生の専門家チームが運営",
    after: "運営者プロフィール / 労働安全衛生コンサルタント（登録番号260022）が個人で運営",
  },
  {
    id: "F8",
    category: "B2-1",
    target: "about/page.tsx 特商法表記の運営責任者",
    before: "安全AIポータル 運営チーム（氏名は請求により開示）",
    after: "個人事業主・労働安全衛生コンサルタント（登録番号260022）（氏名は請求により開示）",
  },
  {
    id: "F9",
    category: "B2-2",
    target: "教育詳細12ページ CTAボタン",
    before: "無料相談",
    after: "ご質問・改善提案を送る",
  },
  {
    id: "F10",
    category: "B2-2",
    target: "教育詳細12ページ サブCTAボタン",
    before: "資料請求",
    after: "教材についての質問",
  },
  {
    id: "F11",
    category: "B2-2",
    target: "教育詳細12ページ セクション説明",
    before: "受講人数・業種・希望時期をお知らせください。",
    after: "教材内容のご質問・誤りの指摘・追加してほしいテーマなどをお寄せください。",
  },
  {
    id: "F12",
    category: "B2-2",
    target: "記事10本 ctaSlot.label",
    before: "無料相談を申し込む",
    after: "ご意見・改善提案を送る",
  },
  {
    id: "F13",
    category: "B2-2",
    target: "記事10本 ctaSlot.title/description",
    before: "「ご相談ください」「個別相談に対応します」系",
    after: "「気づき・改善案をお寄せください」「現場運用での気づきをお寄せください」系",
  },
  {
    id: "F14",
    category: "B2-2",
    target: "features/comparison/page.tsx 迷われている方へセクション",
    before: "無料相談を申し込む → / 料金プランを見る",
    after: "ご意見・改善提案を送る → / 機能一覧を見る",
  },
  {
    id: "F15",
    category: "B2-2",
    target: "subsidies/calculator/page.tsx",
    before: "無料相談を申し込む",
    after: "ご意見・改善提案を送る",
  },
  {
    id: "F16",
    category: "B2-3",
    target: "education-certification/page.tsx PageHeader バッジ",
    before: "法令完全対応",
    after: "主要法令に対応",
  },
  {
    id: "F17",
    category: "B2-3",
    target: "features/use-cases/page.tsx 化学業界 case",
    before: "改正安衛法 完全対応",
    after: "改正安衛法に対応",
  },
  {
    id: "F18",
    category: "B2-3",
    target: "industries/page.tsx ヘッダ",
    before: "業種別エントリポイント ・ 10業種完全網羅",
    after: "業種別エントリポイント ・ 主要10業種",
  },
  {
    id: "F19",
    category: "B2-4",
    target: "education/EducationContent.tsx ヒーロー全体",
    before: "特別教育・安全衛生教育サービス / 修了証発行までワンストップ / 専門家チームによる設計。オンデマンド配信から講師派遣まで...",
    after: "特別教育・安全衛生教育（教材公開）/ カリキュラム・スライド・参考資料を無料で閲覧 / 労働安全衛生コンサルタント監修のもと公開している研究プロジェクト",
  },
  {
    id: "F20",
    category: "B2-4",
    target: "education/EducationContent.tsx 価格注記",
    before: "※ 受講人数・カスタマイズ範囲・出張地域に応じてご案内します。詳細はお問い合わせください。",
    after: "※ 各形式に表示している料金は将来の課金モード（M6期）の設計上の数値です。本研究プロジェクトとして現時点で提供しているサービスではありません。",
  },
  {
    id: "F21",
    category: "B2-5",
    target: "chatbot/ChatbotBody.tsx 英語ガイダンス",
    before: "Content designed by 安全AIポータル expert team",
    after: "Supervised by an Occupational Safety & Health Consultant (registration no. 260022)",
  },
];

type ArchiveItem = {
  page: string;
  status: "resolved" | "needs-redesign" | "ongoing";
  rationale: string;
  followUpPR?: string;
};

const ARCHIVE_CANDIDATES: ArchiveItem[] = [
  { page: "/api-docs", status: "resolved", rationale: "実APIなし、ロードマップのみ。法人化・API提供開始時に再公開。", followUpPR: "F-002 解決済（noindex / sitemap除外 / robots Disallow）" },
  { page: "/handover", status: "resolved", rationale: "公開リポジトリ上でゲートキーのデフォルト値がソースに残る情報露出リスクのため、ルート自体を撤去（内容は docs/session-handover-2026-04-21.md へ）。", followUpPR: "S11 解決済" },
  { page: "/dpa", status: "resolved", rationale: "個人運営でのDPA提供は法的責任曖昧。法人化後に再公開予定。", followUpPR: "G-002 解決済 (PR #200)" },
  { page: "/lms", status: "needs-redesign", rationale: "法人化後β提供予定。ウェイティングリストのみ。", followUpPR: "F-001 解決済（noindex化）" },
  { page: "/pricing", status: "needs-redesign", rationale: "M6期に課金事業再開時に復活。PAID_MODE 無効時は「準備中」表示。", followUpPR: "F-004 解決済" },
  { page: "/insurance", status: "ongoing", rationale: "短期: 個人事業者向けPL保険検討。中期: 法人化後にIT賠償責任保険取得。", followUpPR: "G-003 解決済 (PR #200)" },
  { page: "/education/tokubetsu/* 各 metadata DESCRIPTION", status: "needs-redesign", rationale: "価格表記「¥50,000〜（税込）」「オンデマンド・カスタマイズ・講師派遣の3形式で提供」がSEO/OG画像に表示。PAID_MODE ゲート化が必要。", followUpPR: "別Dispatch P2" },
  { page: "/contact ContactForm.tsx (PAID_MODE)", status: "needs-redesign", rationale: "「強引な営業は一切ありません」「無料相談30分を必ず実施」「労働安全の専門家チームがご対応します」を課金モード再開時に整合化。", followUpPR: "別Dispatch P3" },
  { page: "/pricing PricingContent.tsx (PAID_MODE)", status: "needs-redesign", rationale: "「無料相談30分」「3ヶ月お試し」等の課金プラン構成自体を、研究プロジェクト体裁との整合性で再評価。", followUpPR: "別Dispatch P3" },
  { page: "ja.json 翻訳辞書 pricing.*/services.*", status: "needs-redesign", rationale: "PAID_MODE 配下の有料文言を、課金モード再開時の体裁見直しと同時に整理。", followUpPR: "別Dispatch P3" },
];

export default function BrandConsistencyAuditPage() {
  return (
    <PageContainer width="wide">
      <div className="space-y-8 py-6">
        <header className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            内部監査ドキュメント · noindex
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            ブランド整合性監査 2026-05-17
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            「個人運営研究プロジェクト・ボランティア運営」体裁との整合性監査。
            PR #187 激辛監査 Finding A-005「個人運営の研究プロジェクト表記と機能(LMS β/Stripe/DPA/API-docs)の体裁不整合」の派生フォローアップ。
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div className="rounded bg-white p-3">
              <dt className="font-semibold text-slate-500">監査ID</dt>
              <dd className="mt-0.5 font-mono text-slate-900">{META.auditId}</dd>
            </div>
            <div className="rounded bg-white p-3">
              <dt className="font-semibold text-slate-500">監査日</dt>
              <dd className="mt-0.5 font-mono text-slate-900">{META.auditDate}</dd>
            </div>
            <div className="rounded bg-white p-3">
              <dt className="font-semibold text-slate-500">親監査</dt>
              <dd className="mt-0.5 text-slate-900">{META.parentAudit}</dd>
            </div>
            <div className="rounded bg-white p-3">
              <dt className="font-semibold text-slate-500">総検出件数</dt>
              <dd className="mt-0.5 font-mono text-slate-900">{META.totalFindings}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-600">
            分類: B1 (即削除) {META.classification.B1} 件 / B2 (表現修正) {META.classification.B2} 件 / B3 (アーカイブ候補) {META.classification.B3} 件 / B4 (維持) {META.classification.B4} 件
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">監査スコープ</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{META.scope}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>ブランド方針: 個人運営の研究・実証プロジェクト。ボランティア運営。</li>
            <li>運営者匿名化: 労働安全衛生コンサルタント登録番号260022のみ明示。</li>
            <li>除外: PAID_MODE 無効時に表示されないゲート配下のコード（ContactForm / PricingContent / ja.json pricing.* 等）は本PRでは保留。</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">B2 表現修正（本PRで対応済）</h2>
          <p className="mt-2 text-xs text-slate-500">
            B2-1: 「専門家チーム」→「労働安全衛生コンサルタント監修」 / B2-2: 「無料相談」CTA → 「ご質問・改善提案を送る」 / B2-3: 誇大表現の緩和 / B2-4: /education 体裁の研究プロジェクト化 / B2-5: 英語ガイダンス整合化
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">ID</th>
                  <th className="px-3 py-2 text-left font-semibold">区分</th>
                  <th className="px-3 py-2 text-left font-semibold">対象</th>
                  <th className="px-3 py-2 text-left font-semibold">旧</th>
                  <th className="px-3 py-2 text-left font-semibold">新</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FIXES.map((f) => (
                  <tr key={f.id} className="align-top">
                    <td className="px-3 py-2 font-mono text-slate-500">{f.id}</td>
                    <td className="px-3 py-2 font-semibold text-emerald-700">{f.category}</td>
                    <td className="px-3 py-2 text-slate-700">{f.target}</td>
                    <td className="px-3 py-2 text-rose-700 line-through decoration-rose-300">{f.before}</td>
                    <td className="px-3 py-2 text-emerald-700">{f.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">B3 アーカイブ候補レポート</h2>
          <p className="mt-2 text-xs text-slate-500">
            B3 対象は本PRでは削除せず、判定理由をレポートとして記録。実削除・再設計は別Dispatchで対応。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ARCHIVE_CANDIDATES.map((a) => (
              <div key={a.page} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-sm font-bold text-slate-900">{a.page}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      a.status === "resolved"
                        ? "bg-emerald-100 text-emerald-700"
                        : a.status === "needs-redesign"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {a.status === "resolved" ? "解決済" : a.status === "needs-redesign" ? "再設計推奨" : "継続"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-700">{a.rationale}</p>
                {a.followUpPR && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    <span className="font-semibold">follow-up:</span> {a.followUpPR}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">B4 維持（矛盾なし）</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>
              <code className="rounded bg-slate-100 px-1 text-xs">data/safety-plan-templates/industries/*.ts</code>
              の「当社」: 安全衛生計画書テンプレートの定型。エンドユーザーが自社名に書き換える前提で、本サイト運営者の自称ではない。
            </li>
            <li>各種免責文「具体的判断は専門家にご相談ください」: 外部専門家への相談を推奨する適切な注意喚起。維持。</li>
            <li>用語集 THP「専門スタッフが関与」: 用語の専門的説明であり、本サイト運営の自称ではない。</li>
            <li>
              PAID_MODE ゲート配下の文言（ContactForm.tsx / PricingContent.tsx / ja.json pricing.* / services.*）: 現在は表示されないため本PRでは保留。課金モード再開前に B3-3 として別Dispatchで再評価。
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">関連PR</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>PR #187: 激辛監査 49件</li>
            <li>PR #191: Content quality cleanup — 著者表記「専門家チーム」→「編集部(労働安全衛生コンサルタント監修)」</li>
            <li>PR #194: refactor/remove-brand-damaging-content — education pricing / qa-knowledge / community-cases UGC</li>
            <li>PR #199: audit P1 batch — LMS/api-docs/handover/pricing の noindex 化</li>
            <li>PR #200: audit-G — DPA noindex / insurance 透明性</li>
            <li>PR #198: /wizard 301リダイレクト</li>
          </ul>
        </section>

        <footer className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <p>
            監査者: Claude Opus 4.7 (cool-raman-bcf9e0 worktree) ／ 監査日: {META.auditDate}
          </p>
          <p className="mt-1">
            本ページは内部監査ドキュメントです（noindex, follow=false, nocache）。詳細は
            <code className="ml-1 rounded bg-white px-1">docs/brand-consistency-audit-2026-05-17.md</code> を参照。
          </p>
        </footer>
      </div>
    </PageContainer>
  );
}
