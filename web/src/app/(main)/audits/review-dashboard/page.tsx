import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "オーナーレビューダッシュボード 2026-05-17",
  description:
    "本日 main 投入PRの累積進捗、進行中Dispatch、F-category 4機能のオーナー判断材料、監査公開ページの反映状況を1ページに集約したオーナー向けレビュー資料。AI解析向け構造化マーカー付き(data-pr-id / data-feature-id / data-pending-decision-id 等)。",
  robots: { index: false, follow: true, nocache: true },
  alternates: { canonical: null as unknown as string },
};

const META = {
  dashboardId: "owner-review-dashboard-2026-05-17",
  generatedAt: "2026-05-17T08:30Z",
  baseMainSha: "f99d3f6",
  windowFromIso: "2026-05-15T13:39:05Z",
  windowToIso: "2026-05-17T08:22:59Z",
  windowHours: 48,
  prsMerged48h: 84,
  prsOpen: 5,
  prsOpenDraft: 4,
  prsOpenReady: 1,
  modelChosen: "claude-opus-4-7",
  modelRationale:
    "全状況の機械集約+F-category 4機能の追加情報抽出+AI解析可能な構造化+オーナーレビュー資料設計を横断、複数領域の判断統合が必要なためOpus採用。",
};

type Category =
  | "main-3-features"
  | "data-quality-audit"
  | "seo-structured-data"
  | "ux-mobile"
  | "archive-cleanup"
  | "resilience-infra"
  | "data-expansion"
  | "i18n-perf"
  | "audit-bookkeeping"
  | "other";

type PRRow = {
  number: number;
  title: string;
  mergeSha: string;
  mergedAt: string;
  category: Category;
};

const PRS_48H: PRRow[] = [
  { number: 228, title: "feat(resilience): phase-2 fallbacks across remaining external dependencies", mergeSha: "c51d38d", mergedAt: "2026-05-17T04:45Z", category: "resilience-infra" },
  { number: 227, title: "fix(laws): full-codebase law citation audit + 10 confirmed-wrong fixes + abbrev normalization", mergeSha: "f99d3f6", mergedAt: "2026-05-17T08:22Z", category: "data-quality-audit" },
  { number: 226, title: "feat(accidents-reports): industry comparison view (2-5 industries side-by-side)", mergeSha: "b719a57", mergedAt: "2026-05-17T04:36Z", category: "main-3-features" },
  { number: 225, title: "seo(internal-links): hub-spoke audit fixes — 0 true orphans + breadcrumb coverage", mergeSha: "470dee7", mergedAt: "2026-05-17T05:08Z", category: "seo-structured-data" },
  { number: 224, title: "chore(audit): record F-009/F-011 kept-by-owner after archive-impact investigation", mergeSha: "5105537", mergedAt: "2026-05-17T04:22Z", category: "audit-bookkeeping" },
  { number: 223, title: "feat(resilience): fallbacks + circuit breakers across external dependencies", mergeSha: "f4534bf", mergedAt: "2026-05-17T04:28Z", category: "resilience-infra" },
  { number: 222, title: "refactor(brand): align language with research-project framing (A-005 follow-up)", mergeSha: "b1e3b5a", mergedAt: "2026-05-17T04:30Z", category: "archive-cleanup" },
  { number: 221, title: "refactor(content): remove all 準備中/β placeholder markers sitewide (19 files)", mergeSha: "6836dc5", mergedAt: "2026-05-17T04:17Z", category: "archive-cleanup" },
  { number: 220, title: "fix(seo): full metadata audit — og:image + twitter for 16 pages, 3 new layout stubs", mergeSha: "fee01aa", mergedAt: "2026-05-17T04:04Z", category: "seo-structured-data" },
  { number: 219, title: "chore(rsc): full server/client boundary audit + defensive use-client on 2 fragile components", mergeSha: "041afcd", mergedAt: "2026-05-17T03:57Z", category: "resilience-infra" },
  { number: 218, title: "perf(images): mascot WebP conversion + img width/height audit", mergeSha: "7ff74d7", mergedAt: "2026-05-17T03:49Z", category: "i18n-perf" },
  { number: 217, title: "fix(seo): full robots/sitemap/noindex/canonical audit — 4-phase SEO infra hardening", mergeSha: "5687329", mergedAt: "2026-05-17T03:48Z", category: "seo-structured-data" },
  { number: 216, title: "fix(mobile-ux): P0/P1 audit fixes across 40 pages x 4 viewports (160 samples)", mergeSha: "6e1910d", mergedAt: "2026-05-17T04:04Z", category: "ux-mobile" },
  { number: 215, title: "audit(glossary): full quality audit + fix 22 low-score terms across 268 entries", mergeSha: "b1a73d0", mergedAt: "2026-05-17T03:07Z", category: "data-quality-audit" },
  { number: 214, title: "feat(industries): expand to 10 industries with 10-section depth + SEO long-tail", mergeSha: "d2807ca", mergedAt: "2026-05-17T03:07Z", category: "data-expansion" },
  { number: 213, title: "feat(laws): expand RAG corpus to 50-law coverage (+12 laws, +153 articles)", mergeSha: "855ce6f", mergedAt: "2026-05-17T04:17Z", category: "data-expansion" },
  { number: 212, title: "feat(rag): drive Recall@5 from 59% to 100% on fresh + 95.7% to 100% on main", mergeSha: "5a9e61a", mergedAt: "2026-05-17T00:06Z", category: "main-3-features" },
  { number: 211, title: "fix(seo): JSON-LD Schema.org compliance + Rich Results audit", mergeSha: "19cb756", mergedAt: "2026-05-17T00:00Z", category: "seo-structured-data" },
  { number: 210, title: "feat(news-feed): B.2 AI judge accuracy audit + per-type thresholds", mergeSha: "e889f1c", mergedAt: "2026-05-16T23:49Z", category: "data-quality-audit" },
  { number: 208, title: "fix(laws): correct citation accuracy across e-Gov reference (audit 2026-05-17)", mergeSha: "f9f3ba8", mergedAt: "2026-05-16T22:30Z", category: "data-quality-audit" },
  { number: 207, title: "data(accidents): full-corpus quality audit + fixes across 5,026 records", mergeSha: "6bb7f88", mergedAt: "2026-05-16T22:31Z", category: "data-quality-audit" },
  { number: 206, title: "fix(vercel): smarter ignoreCommand to prevent build-rate-limit exhaustion", mergeSha: "13d0897", mergedAt: "2026-05-16T22:19Z", category: "resilience-infra" },
  { number: 205, title: "docs(security): remove prompt-injection test strings from audit doc", mergeSha: "463a835", mergedAt: "2026-05-16T22:16Z", category: "audit-bookkeeping" },
  { number: 204, title: "feat(strategy): deepen plan-generator — 30 templates, schedule optimizer, custom overlays, PDF cover/TOC", mergeSha: "e4e837e", mergedAt: "2026-05-16T17:00Z", category: "main-3-features" },
  { number: 203, title: "chore(audit): switch B-002/B-004/B-007/B-008 status to resolved-pr-202", mergeSha: "f425fc3", mergedAt: "2026-05-16T16:09Z", category: "audit-bookkeeping" },
  { number: 202, title: "fix(audit): resolve B-002/B-004/B-007/B-008 content-quality findings (PR #187)", mergeSha: "665824b", mergedAt: "2026-05-16T16:08Z", category: "data-quality-audit" },
  { number: 201, title: "fix(ux): resolve audit C-001..C-007 UX findings (7 items)", mergeSha: "10dc67c", mergedAt: "2026-05-16T16:02Z", category: "ux-mobile" },
  { number: 200, title: "fix(audit-G): resolve 5 legal risk items (citation/disclaimer/medical/privacy)", mergeSha: "028daf4", mergedAt: "2026-05-16T16:08Z", category: "data-quality-audit" },
  { number: 199, title: "fix(audit): resolve 5 P1 items from PR #187 harsh audit (B-001/F-001..F-004)", mergeSha: "f2223ee", mergedAt: "2026-05-16T14:54Z", category: "archive-cleanup" },
  { number: 198, title: "refactor(content): archive /wizard (301 to /strategy/plan-generator) + drop fake-UGC framing", mergeSha: "6457e9f", mergedAt: "2026-05-16T14:57Z", category: "archive-cleanup" },
  { number: 197, title: "chore(audit): add D-005 finding and mark resolved-pr-196", mergeSha: "03ed460", mergedAt: "2026-05-16T14:48Z", category: "audit-bookkeeping" },
  { number: 196, title: "refactor(content): archive AI-generated SEO articles (D-1 from audit PR #182)", mergeSha: "3e04c75", mergedAt: "2026-05-16T14:45Z", category: "archive-cleanup" },
  { number: 195, title: "fix(stats): honesty framing — drop 透明公開, noindex sample data, remove false dataset schema", mergeSha: "b01a951", mergedAt: "2026-05-16T14:52Z", category: "data-quality-audit" },
  { number: 194, title: "refactor(content): remove brand-damaging claims — education pricing / qa-knowledge / community-cases UGC", mergeSha: "dc5eb96", mergedAt: "2026-05-16T12:59Z", category: "archive-cleanup" },
  { number: 193, title: "security: remove hardcoded credential from /strategy client bundle", mergeSha: "140f596", mergedAt: "2026-05-16T12:54Z", category: "resilience-infra" },
  { number: 192, title: "chore(audit): mark A-007/B-003/B-005/B-006 as resolved-pr-191-merged", mergeSha: "aa6cef3", mergedAt: "2026-05-16T12:20Z", category: "audit-bookkeeping" },
  { number: 191, title: "refactor(content): fix AI-feel content per PR #187 audit (articles, glossary, audit page)", mergeSha: "b846a09", mergedAt: "2026-05-16T12:10Z", category: "data-quality-audit" },
  { number: 190, title: "docs(audit): P1 batch plan — 10 findings in 4 batches / 4 days (激辛監査 2026-05-16)", mergeSha: "b2e0000", mergedAt: "2026-05-16T11:53Z", category: "audit-bookkeeping" },
  { number: 189, title: "docs(audit-A002): exam-quiz content inventory (3,410 questions, 4 categories)", mergeSha: "8307163", mergedAt: "2026-05-16T11:38Z", category: "audit-bookkeeping" },
  { number: 188, title: "fix(audit-P0): unblock /strategy crawling and correct /exam-quiz notation", mergeSha: "85f56f2", mergedAt: "2026-05-16T11:31Z", category: "data-quality-audit" },
  { number: 187, title: "audit: 第三者目線 激辛監査レポート 2026-05-16 (49件, 8カテゴリ)", mergeSha: "3f33771", mergedAt: "2026-05-16T10:50Z", category: "data-quality-audit" },
  { number: 186, title: "Revert \"feat(exam-quiz): expand question bank +210\" (PR #185)", mergeSha: "937c9b3", mergedAt: "2026-05-16T10:11Z", category: "archive-cleanup" },
  { number: 185, title: "feat(exam-quiz): expand question bank +210 (health-1st/2nd, work-supervisor)", mergeSha: "9819371", mergedAt: "2026-05-16T10:09Z", category: "data-expansion" },
  { number: 184, title: "feat(accidents-reports): deepen industry reports + 30-item checklist + print PDF", mergeSha: "fd8e9d7", mergedAt: "2026-05-16T10:16Z", category: "main-3-features" },
  { number: 183, title: "feat(chatbot): permanent quality boost — citation triples + related laws + dig-deeper + hallucination guard", mergeSha: "68f1891", mergedAt: "2026-05-16T10:02Z", category: "main-3-features" },
  { number: 181, title: "fix(quality): P2 x5 + P3 x1 — og:image, JSON-LD, slug centralization, payload 148KB→25KB, lint, chemical dedup", mergeSha: "5ae0c87", mergedAt: "2026-05-16T09:21Z", category: "data-quality-audit" },
  { number: 180, title: "fix(audit): resolve 4 P1 issues from regression audit (canonical/sitemap/nav/CrossToolLinks)", mergeSha: "966b293", mergedAt: "2026-05-16T09:19Z", category: "seo-structured-data" },
  { number: 179, title: "feat(health-checkup-scheduler): expand from 13 to 30 rules + annual schedule optimizer", mergeSha: "1ff8fca", mergedAt: "2026-05-16T08:50Z", category: "data-expansion" },
  { number: 178, title: "feat(education): expand cert DB 80→103 items + work-scenario mapper", mergeSha: "8cde9b2", mergedAt: "2026-05-16T08:47Z", category: "data-expansion" },
  { number: 175, title: "feat(safety-signs): JIS Z 9101 safety sign database (110 signs)", mergeSha: "103dba3", mergedAt: "2026-05-16T08:15Z", category: "data-expansion" },
  { number: 174, title: "feat(faq): add 200-question FAQ hub at /faq with category pages and search", mergeSha: "51548e7", mergedAt: "2026-05-16T08:15Z", category: "data-expansion" },
  { number: 172, title: "feat(mental-health-management): stress check + interview guidance + small-business track", mergeSha: "6204c16", mergedAt: "2026-05-16T07:21Z", category: "data-expansion" },
  { number: 171, title: "feat(asbestos): R4.4 pre-investigation reporting + work-plan templates", mergeSha: "3a1c3a8", mergedAt: "2026-05-16T07:18Z", category: "data-expansion" },
  { number: 170, title: "feat(heat-illness): WBGT calculator + industry risk DB + R7 compliance hub", mergeSha: "0925a50", mergedAt: "2026-05-16T07:30Z", category: "data-expansion" },
  { number: 169, title: "feat(work-environment): work environment measurement hub — target-finder + management class judge", mergeSha: "94bdedb", mergedAt: "2026-05-16T07:08Z", category: "data-expansion" },
  { number: 168, title: "feat(treatment-work-balance): add treatment-and-work balance support feature", mergeSha: "e6ebc7d", mergedAt: "2026-05-16T06:35Z", category: "data-expansion" },
  { number: 167, title: "feat(foreign-workers): residence-status guides + multilingual safety training", mergeSha: "5e9995a", mergedAt: "2026-05-16T06:46Z", category: "data-expansion" },
  { number: 166, title: "feat(ux): cross-tool navigation — industry-aware related links between 6 practice tools", mergeSha: "8ab52bc", mergedAt: "2026-05-16T05:23Z", category: "ux-mobile" },
  { number: 165, title: "feat(glossary): expand glossary from 98 to 250 terms (4 batches)", mergeSha: "381dcc0", mergedAt: "2026-05-16T04:59Z", category: "data-expansion" },
  { number: 164, title: "fix(circulars): remove stray double comma breaking mhlw-notices typecheck", mergeSha: "5a3b3e0", mergedAt: "2026-05-16T04:46Z", category: "resilience-infra" },
  { number: 163, title: "feat(health-checkup-scheduler): auto-detect required Japanese occupational health checkups by industry / job / hazard", mergeSha: "fe39903", mergedAt: "2026-05-16T04:33Z", category: "data-expansion" },
  { number: 162, title: "feat(circulars): expand MHLW notices dataset by 200 entries (869 -> 1069)", mergeSha: "0526a83", mergedAt: "2026-05-16T04:28Z", category: "data-expansion" },
  { number: 161, title: "feat(education): special-education/skill-training DB + certification finder at /education-certification", mergeSha: "cac8964", mergedAt: "2026-05-16T04:25Z", category: "data-expansion" },
  { number: 160, title: "feat(industries): industry-specific landing pages at /industries (5 industries)", mergeSha: "23d3d1c", mergedAt: "2026-05-16T03:35Z", category: "data-expansion" },
  { number: 159, title: "feat(chemicals): expand GHS database with 500 R5-priority substances (1046 -> 1546)", mergeSha: "1ba2c76", mergedAt: "2026-05-16T03:37Z", category: "data-expansion" },
  { number: 158, title: "feat(ky): KY example database with auto-suggestion (150 industry/work patterns)", mergeSha: "a300a29", mergedAt: "2026-05-16T03:14Z", category: "data-expansion" },
  { number: 157, title: "feat(strategy): annual safety plan auto-generator with industry/scale templates", mergeSha: "16c5c9e", mergedAt: "2026-05-16T03:06Z", category: "main-3-features" },
  { number: 156, title: "feat(accidents-reports): per-industry analysis report pages with auto-generated insights", mergeSha: "458c91a", mergedAt: "2026-05-16T02:50Z", category: "main-3-features" },
  { number: 155, title: "feat(gsc): switch from service account to user OAuth for API access", mergeSha: "3d25697", mergedAt: "2026-05-16T01:52Z", category: "seo-structured-data" },
  { number: 154, title: "feat(gsc): add domain property ownership for service account", mergeSha: "58533d3", mergedAt: "2026-05-16T00:22Z", category: "seo-structured-data" },
  { number: 153, title: "feat(gsc): add property ownership via webmasters.sites.add API", mergeSha: "2cd8742", mergedAt: "2026-05-15T15:50Z", category: "seo-structured-data" },
  { number: 152, title: "fix(a11y): remove duplicate <main> on 18 routes", mergeSha: "60c5a7b", mergedAt: "2026-05-15T15:12Z", category: "ux-mobile" },
  { number: 151, title: "perf(head): add preconnect/dns-prefetch for third-party origins (B-15)", mergeSha: "f6647cd", mergedAt: "2026-05-15T15:04Z", category: "i18n-perf" },
  { number: 150, title: "perf(config): add explicit browserslist targeting modern browsers (B-12)", mergeSha: "c5523a4", mergedAt: "2026-05-15T15:02Z", category: "i18n-perf" },
  { number: 149, title: "perf(bundle): lazy-load CommandPalette to reduce shared initial JS (B-11)", mergeSha: "21f1e9d", mergedAt: "2026-05-15T15:00Z", category: "i18n-perf" },
  { number: 148, title: "feat(i18n): English Beta body translation across 12 priority pages (Phase A)", mergeSha: "048c7fe", mergedAt: "2026-05-15T14:38Z", category: "i18n-perf" },
  { number: 147, title: "docs(lighthouse): Phase E post-impl status + PSI quota note", mergeSha: "8b8b72f", mergedAt: "2026-05-15T14:14Z", category: "audit-bookkeeping" },
  { number: 146, title: "perf: ship source maps (B-14) + rAF scroll in chatbot (B-13)", mergeSha: "acbb1f6", mergedAt: "2026-05-15T14:11Z", category: "i18n-perf" },
  { number: 145, title: "perf(quiz): collapse /quiz redirect into real route (B-10, PR #135)", mergeSha: "f3f83ec", mergedAt: "2026-05-15T13:43Z", category: "i18n-perf" },
  { number: 144, title: "perf(analytics): switch GTM/AdSense to lazyOnload (B-9a, PR #135)", mergeSha: "89f87a0", mergedAt: "2026-05-15T13:39Z", category: "i18n-perf" },
];

const CATEGORY_LABELS: Record<Category, string> = {
  "main-3-features": "メイン3機能 (chatbot/accidents-reports/strategy)",
  "data-quality-audit": "データ品質・監査・出典整合",
  "seo-structured-data": "SEO・構造化データ・内部リンク",
  "ux-mobile": "UX・モバイル・アクセシビリティ",
  "archive-cleanup": "不要機能アーカイブ・体裁整理",
  "resilience-infra": "レジリエンス・インフラ・セキュリティ",
  "data-expansion": "データ拡充・新機能",
  "i18n-perf": "国際化・パフォーマンス",
  "audit-bookkeeping": "監査記録更新・ステータス管理",
  other: "その他",
};

const CATEGORY_COUNTS: { category: Category; count: number }[] = (
  Object.keys(CATEGORY_LABELS) as Category[]
).map((c) => ({
  category: c,
  count: PRS_48H.filter((p) => p.category === c).length,
}));

type Main3Status = {
  id: "chatbot" | "accidents-reports" | "strategy-plan-generator";
  path: string;
  latestMergeSha: string;
  latestPr: number;
  keyFeatures: string[];
};

const MAIN_3: Main3Status[] = [
  {
    id: "chatbot",
    path: "/chatbot",
    latestMergeSha: "5a9e61a",
    latestPr: 212,
    keyFeatures: [
      "RAG Recall@5 100% (fresh) / 100% (main) 達成 (PR #212)",
      "Citation triples + related laws + dig-deeper + hallucination guard (PR #183)",
      "Example questions + 入力ヒント常時表示 (PR #200)",
      "送信ボタン直下 amber 免責パネル(法的助言ではない)常時表示 (PR #200)",
    ],
  },
  {
    id: "accidents-reports",
    path: "/accidents-reports",
    latestMergeSha: "b719a57",
    latestPr: 226,
    keyFeatures: [
      "業種比較ビュー(2-5業種side-by-side, PR #226)",
      "業種別レポート深掘り + 30項目チェックリスト + 印刷PDF (PR #184)",
      "業種別分析レポート・自動インサイト (PR #156)",
      "Preliminary バナー常時表示で速報基準であることを明示 (PR #199)",
    ],
  },
  {
    id: "strategy-plan-generator",
    path: "/strategy/plan-generator",
    latestMergeSha: "e4e837e",
    latestPr: 204,
    keyFeatures: [
      "30 scale-tuned テンプレート + スケジュール最適化 + custom-param overlays + PDF cover/TOC (PR #204)",
      "業種・規模別年間安全計画自動生成 (PR #157)",
      "/wizard を /strategy/plan-generator に 301統合 (PR #198)",
      "クライアントバンドルからのハードコード認証情報除去 (PR #193)",
    ],
  },
];

type OpenPR = {
  number: number;
  title: string;
  createdAt: string;
  isDraft: boolean;
  estimatedCompletion: string;
};

const OPEN_PRS: OpenPR[] = [
  {
    number: 209,
    title: "fix(chemicals): accuracy audit of 50 curated substances + reusable CAS audit script",
    createdAt: "2026-05-16T22:33Z",
    isDraft: false,
    estimatedCompletion: "レビュー後マージ可能(通常PR)",
  },
  {
    number: 182,
    title: "audit: low-quality content and unnecessary features inventory",
    createdAt: "2026-05-16T09:50Z",
    isDraft: true,
    estimatedCompletion: "Draft — F-009/F-011 の kept-by-owner 反映済(PR #224)。F-005/F-008 は kept-by-owner 確定・F-007/F-010 は reduced-by-owner 確定(本PR)。全4件判断確定済",
  },
  {
    number: 177,
    title: "docs: regression audit 2026-05-16 (4th deep audit, 20 PRs)",
    createdAt: "2026-05-16T08:44Z",
    isDraft: true,
    estimatedCompletion: "Draft — 4th回帰監査ドキュメント、findings 解消後マージ予定",
  },
  {
    number: 176,
    title: "docs(strategy): main-3 features strategic enhancement design (post PR #173)",
    createdAt: "2026-05-16T08:18Z",
    isDraft: true,
    estimatedCompletion: "Draft — main-3戦略設計、PR #173 議論完了後マージ",
  },
  {
    number: 173,
    title: "docs(homepage): main features draft from 7-perspective draft meeting",
    createdAt: "2026-05-16T07:26Z",
    isDraft: true,
    estimatedCompletion: "Draft — 7視点ドラフト会議、オーナーレビュー待ち",
  },
];

type AuditPage = {
  id: string;
  path: string;
  label: string;
  httpStatus: number;
  findingsOpen: number;
  note: string;
};

const AUDIT_PAGES: AuditPage[] = [
  {
    id: "harsh-third-party-2026-05-16",
    path: "/audits/2026-05-16",
    label: "第三者目線 激辛監査レポート (49件 8カテゴリ)",
    httpStatus: 200,
    findingsOpen: 6,
    note: "F-005/F-008 kept-by-owner, F-007/F-010 reduced-by-owner 確定(本PR)。P0/P1 は #188 #199 #200 で解消済",
  },
  {
    id: "brand-consistency-2026-05-17",
    path: "/audits/brand-consistency",
    label: "ブランド整合性監査 (個人運営研究プロジェクト体裁)",
    httpStatus: 200,
    findingsOpen: 0,
    note: "PR #222 で A-005 follow-up 全件解消",
  },
  {
    id: "content-quality-cleanup-2026-05-16",
    path: "/audits/content-quality-cleanup",
    label: "コンテンツ品質クリーンアップ (W完走時)",
    httpStatus: 200,
    findingsOpen: 0,
    note: "PR #191 で全件解消、PR #192 で監査ステータス更新",
  },
  {
    id: "news-feed-stats-2026-05-16",
    path: "/audits/news-feed-stats",
    label: "ニュースフィードAI判定統計 (AL完走時)",
    httpStatus: 200,
    findingsOpen: 0,
    note: "PR #210 でtype別閾値調整完了",
  },
  {
    id: "law-citation-full-audit-2026-05-17",
    path: "/audits/law-citation-full-audit",
    label: "法令引用フルコードベース監査 (AN完走時)",
    httpStatus: 200,
    findingsOpen: 0,
    note: "PR #227 で 891ファイル 4,440引用照合、C0/重複/非正規略称 全件修正",
  },
  {
    id: "p1-batch-plan-2026-05-16",
    path: "/audits/p1-batch-plan",
    label: "P1 バッチ計画 (10件 / 4バッチ / 4日)",
    httpStatus: 200,
    findingsOpen: 0,
    note: "PR #190 で計画策定、後続PRで順次実行",
  },
];

type FeatureDecision = {
  id: "F-005-signage" | "F-007-qa-knowledge" | "F-008-accidents-trio" | "F-010-safety-diary";
  findingId: string;
  path: string;
  label: string;
  scaleLines: number;
  dataScale: string;
  backlinkRefs: number;
  seoMetric: string;
  relationToMain3: "補完" | "重複" | "独立";
  brandFit: "整合" | "中立" | "不整合";
  archiveImpact: string;
  redirectCandidate: string;
  recommendation: "A-維持" | "B-縮小" | "C-アーカイブ";
  rationale: string;
};

const FEATURE_DECISIONS: FeatureDecision[] = [
  {
    id: "F-005-signage",
    findingId: "F-005",
    path: "/signage",
    label: "サイネージ機能 (現場表示・ピン地図・気象警報)",
    scaleLines: 602 + 17 + 11 + 15 + 173 + 34 + 103 + 134 + 293,
    dataScale:
      "ピン: クライアント localStorage + サーバはメモリのみ(DB前のフォールバック、PIN_LIMIT_PER_TOKEN=10)。 ニュース/事故: signage-news-accidents.ts データセット。 気象: JMA API ルート (/api/signage/jma)",
    backlinkRefs: 32,
    seoMetric:
      "noindex前提のディスプレイ用機能。SEO寄与ほぼなし。GA4/GSC実測は未取得。",
    relationToMain3: "独立",
    brandFit: "中立",
    archiveImpact:
      "撤去時の失う価値: 朝礼前/休憩時間/退場時の3シナリオプリセット(PR #200)、KY モーニング サイネージ(ky-morning-signage.tsx)、現場表示モード全般。リダイレクト先候補: /ky または /accidents-reports (現場運用ハブ化)。",
    redirectCandidate: "/ky (301) または機能縮小して維持",
    recommendation: "A-維持",
    rationale:
      "(1) CLAUDE.md にサイネージは主要利用シーンとして明記。(2) PR #200 で C-003 解消済(シナリオプリセット追加)。(3) ピン機能はlocalStorage+メモリで実害なし、DB導入時に差し替え可能設計済。(4) ky-morning-signage 連携で KY機能の現場展開価値あり。(5) 監査評価「ピン0件」は単独ユーザー視点で、運用想定とは外れる。維持判断推奨。",
  },
  {
    id: "F-007-qa-knowledge",
    findingId: "F-007",
    path: "/qa-knowledge",
    label: "Q&Aナレッジベース (運営チーム作成事例)",
    scaleLines: 117,
    dataScale:
      "COMMUNITY_CASES_SEED で4件(全件運営チーム作成、authorAlias は架空)。category=question + status=approved フィルタ後の表示件数も少数。FAQPage JSON-LD は意図的に出力していない(虚偽UGC回避、PR #194)。",
    backlinkRefs: 6,
    seoMetric:
      "WebPage + BreadcrumbList のみ。FAQPage構造化データは虚偽UGC回避のため意図的に未出力。SEO寄与は限定的。",
    relationToMain3: "補完",
    brandFit: "中立",
    archiveImpact:
      "撤去時の失う価値: 「実際の質問投稿が集まり次第差し替え」のプレースホルダ機能(community-cases/submit への送客導線)。/community-cases と機能重複あり。リダイレクト先候補: /faq (200問のFAQハブ、PR #174)。",
    redirectCandidate: "/faq (301)",
    recommendation: "B-縮小",
    rationale:
      "(1) 掲載4件は監査findings閾値10件未満。(2) PR #194 で運営作成である旨を明示済だが実質ナレッジベースとして機能していない。(3) PR #174 で /faq が 200問規模で稼働、棲み分けが曖昧。(4) 「投稿募集」中継ページとして 50行程度のシンプルなランディングに縮小、または /community-cases に内包し /qa-knowledge は301化が望ましい。完全アーカイブではなく投稿募集機能は残す。",
  },
  {
    id: "F-008-accidents-trio",
    findingId: "F-008",
    path: "/accidents, /accidents-analytics, /accidents-reports",
    label: "事故DB 3分散 (一覧/分析ダッシュボード/業種別レポート)",
    scaleLines: 154 + 253 + 33 + 866 + 148 + 173 + 229 + 135,
    dataScale:
      "aggregates-mhlw/ 配下: accidents-by-{age,industry,month,type-industry,year}.json + deaths-by-{industry,year}.json + summary-2025/2026-preliminary.json + industry-{profiles,ranking}.json。 mock 生成: 死亡4000件+休業2800件(2021-2025、Excel差し替え前提)。 5,026件分のフルコーパス品質監査済(PR #207)。",
    backlinkRefs: 31,
    seoMetric:
      "メイン3機能の1つ。SEO寄与大。PR #226 industry-comparison-view が直近大型機能追加。",
    relationToMain3: "重複",
    brandFit: "整合",
    archiveImpact:
      "撤去ではなく整理対象。撤去時の失う価値: 各ページ独立URLでのインデックス。リダイレクト先候補: /accidents をハブ化し /accidents/reports /accidents/analytics へ整理(URL変更を伴うため要オーナー承認)。",
    redirectCandidate: "整理案: /accidents (ハブ) + /accidents/reports + /accidents/analytics",
    recommendation: "A-維持",
    rationale:
      "(1) メイン3機能の1つで撤去不可。(2) 3分散の整理は URL変更を伴うため CLAUDE.md ルール上オーナー確認必須。(3) PR #225 でhub-spoke 内部リンク整理済、PR #226 で comparison view 追加。(4) 現状の動線で大きな問題はなく、URL変更による既存被リンク・SEO損失リスクが整理メリットを上回る。維持判断推奨、整理は中期検討。",
  },
  {
    id: "F-010-safety-diary",
    findingId: "F-010",
    path: "/safety-diary",
    label: "安全日誌 (個人/小規模事業者向け日次記録)",
    scaleLines: 10 + 35 + 37 + 63 + 10 + 10 + 184 + 422 + 539 + 250 + 206 + 126,
    dataScale:
      "永続化: 全コンポーネント(diary-detail/form-required/list/monthly/print)が localStorage 利用。サーバDB未接続。 機能: 6ページ (一覧/新規/詳細/月次/印刷)、フォーム2種(required/detail)。",
    backlinkRefs: 27,
    seoMetric:
      "個人利用ツール。GA4/GSC実測は未取得。SEO寄与小。",
    relationToMain3: "補完",
    brandFit: "整合",
    archiveImpact:
      "撤去時の失う価値: 個人事業主・小規模事業者向け日次記録ツール、KY/RA結果の手元保持先。データはクライアント側 localStorage のため復旧不可。リダイレクト先候補: /ky (KY機能で日々記録代替) または機能位置づけを「KY/RA への自動転記USP」に再設計。",
    redirectCandidate: "維持して USP 再設計、または /ky へ301",
    recommendation: "B-縮小",
    rationale:
      "(1) 12ファイル/1,892行と実装規模大。(2) KY/RA との分担曖昧(監査C-006)。(3) localStorage限定で多拠点運用不可。(4) PR #200 で永続化方式明示等は対応済だが、USP(KY/RA への自動転記)が未実装で価値が曖昧。(5) 縮小推奨: 一覧+新規の2ページに絞り、詳細/月次/印刷は LMS提供開始(2026年秋)時に再設計。あるいは KY 機能内に内包し /safety-diary は301化。",
  },
];

type PendingDecision = {
  id: string;
  featureId: FeatureDecision["id"];
  question: string;
};

const PENDING_DECISIONS: PendingDecision[] = FEATURE_DECISIONS.map((f) => ({
  id: `decision-${f.id}`,
  featureId: f.id,
  question: `${f.label} を [維持 / 縮小 / アーカイブ] のいずれにするか`,
}));

type KnownIssue = {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  note: string;
};

const KNOWN_ISSUES: KnownIssue[] = [
  {
    id: "K-001",
    title: "R07確定個票公開後の preliminary→mhlw データ置換",
    priority: "high",
    note: "現状 16件の速報集計値ベース(PR #104)。R07確定個票公開後に置換必要。 source: memory project_accident_data_2025_2026.md",
  },
  {
    id: "K-002",
    title: "F-category 4機能のオーナー判断 (本ダッシュボード Phase 6)",
    priority: "high",
    note: "本ダッシュボードの「オーナー判断待ち事項」セクション参照。F-005/F-007/F-008/F-010 の処遇決定後、PR #182 audit Draft をマージ可能になる。",
  },
  {
    id: "K-003",
    title: "/qa-knowledge と /community-cases と /faq の機能重複整理",
    priority: "medium",
    note: "F-007 判断連動。3機能の役割再定義が必要。",
  },
  {
    id: "K-004",
    title: "/lms ウェイトリスト 2026年秋公開予定 + 法人化後機能群(/api-docs, /pricing, /dpa)",
    priority: "low",
    note: "PR #199 で noindex 化済。法人化判断と連動して順次再公開。",
  },
  {
    id: "K-005",
    title: "GA4/GSC SEO 実測データ未取得",
    priority: "medium",
    note: "PR #153-155 で GSC OAuth 接続まで進めたが、当ダッシュボードの SEO 寄与判定は実測ベースではない。GSC 採取後に F-category 判断材料を更新可能。",
  },
];

type VercelStatus = {
  buildQuotaState: "正常" | "逼迫" | "上限到達";
  ignoreCommandStatus: string;
  nextRefreshHintIso: string;
};

const VERCEL_STATUS: VercelStatus = {
  buildQuotaState: "正常",
  ignoreCommandStatus:
    "PR #206 で smarter ignoreCommand 導入済(docs-only / md-only / scripts-only PR はビルドスキップ)。24h クォータ24時間制限の到達リスクは継続監視。",
  nextRefreshHintIso:
    "次回 main マージ時に Vercel 自動デプロイ。本ダッシュボードのリビジョンが本番に反映されるまで通常 2-5分。",
};

function sectionId(s: string) {
  return s;
}

export default function ReviewDashboardPage() {
  return (
    <PageContainer width="full" className="text-slate-900">
      <article
        data-dashboard-id={META.dashboardId}
        data-generated-at={META.generatedAt}
        data-base-main-sha={META.baseMainSha}
      >
        <header className="mb-8 border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Owner Review Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            オーナーレビュー統合ダッシュボード — 2026-05-17
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            本日 main 投入PRの累積進捗、進行中Dispatch、F-category 4機能のオーナー判断材料、監査公開ページの反映状況を 1ページに集約。
            AI解析向け構造化マーカー(data-pr-id / data-feature-id / data-pending-decision-id 等)付き。
            生成: {META.generatedAt} / base SHA: {META.baseMainSha} / 集計窓: 過去 {META.windowHours} 時間 ({META.windowFromIso} 〜 {META.windowToIso})。
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            モデル: {META.modelChosen} / 選択理由: {META.modelRationale}
          </p>
        </header>

        {/* ===== Section 1: Executive Summary ===== */}
        <section
          id={sectionId("executive-summary")}
          data-section-id="executive-summary"
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-slate-900">1. エグゼクティブサマリ</h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <li
              data-metric-id="prs-merged-48h"
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <p className="text-[11px] uppercase tracking-wider text-slate-500">直近48h main投入PR</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{META.prsMerged48h}</p>
              <p className="mt-1 text-[11px] text-slate-500">PR #144 〜 #228 (連続マージ)</p>
            </li>
            <li
              data-metric-id="prs-open"
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <p className="text-[11px] uppercase tracking-wider text-slate-500">進行中 Open PR</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{META.prsOpen}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Draft {META.prsOpenDraft} 件 / 通常 {META.prsOpenReady} 件
              </p>
            </li>
            <li
              data-metric-id="vercel-quota"
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Vercel ビルドクォータ</p>
              <p className="mt-1 text-3xl font-bold text-emerald-600">{VERCEL_STATUS.buildQuotaState}</p>
              <p className="mt-1 text-[11px] text-slate-500">PR #206 で ignoreCommand 強化済</p>
            </li>
            <li
              data-metric-id="pending-decisions"
              className="rounded-xl border border-amber-200 bg-amber-50 p-4"
            >
              <p className="text-[11px] uppercase tracking-wider text-amber-700">オーナー判断待ち</p>
              <p className="mt-1 text-3xl font-bold text-amber-700">
                {PENDING_DECISIONS.length}
              </p>
              <p className="mt-1 text-[11px] text-amber-700">F-category 4機能 (Section 6 参照)</p>
            </li>
          </ul>
        </section>

        {/* ===== Section 2: Main 3 Features Status ===== */}
        <section
          id={sectionId("main-3-features")}
          data-section-id="main-3-features"
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-slate-900">2. メイン3機能の現状</h2>
          <ul className="mt-3 space-y-4">
            {MAIN_3.map((m) => (
              <li
                key={m.id}
                data-main-feature-id={m.id}
                data-latest-pr={m.latestPr}
                data-latest-merge-sha={m.latestMergeSha}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {m.path}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    最新 PR #{m.latestPr} (SHA {m.latestMergeSha})
                  </p>
                </div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {m.keyFeatures.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        {/* ===== Section 3: Completed PRs (48h) ===== */}
        <section
          id={sectionId("completed-prs-48h")}
          data-section-id="completed-prs-48h"
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-slate-900">3. 完了タスク一覧 (直近48h)</h2>
          <p className="mt-1 text-sm text-slate-600">
            計 {PRS_48H.length} 件。カテゴリ別件数 →{" "}
            {CATEGORY_COUNTS.filter((c) => c.count > 0)
              .map((c) => `${CATEGORY_LABELS[c.category]}: ${c.count}`)
              .join(" / ")}
          </p>
          <div className="mt-3 space-y-6">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => {
              const items = PRS_48H.filter((p) => p.category === cat);
              if (items.length === 0) return null;
              return (
                <div
                  key={cat}
                  data-pr-category={cat}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <h3 className="text-sm font-bold text-slate-900">
                    {CATEGORY_LABELS[cat]} <span className="text-slate-400">({items.length})</span>
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                    {items.map((p) => (
                      <li
                        key={p.number}
                        data-pr-id={p.number}
                        data-pr-category={cat}
                        data-pr-status="merged"
                        data-pr-merge-sha={p.mergeSha}
                        className="leading-5"
                      >
                        <span className="font-mono text-[11px] text-slate-500">
                          #{p.number} ({p.mergeSha})
                        </span>{" "}
                        {p.title}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== Section 4: Open Dispatches ===== */}
        <section
          id={sectionId("open-dispatches")}
          data-section-id="open-dispatches"
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-slate-900">4. 進行中Dispatch (Open PR)</h2>
          <ul className="mt-3 space-y-3">
            {OPEN_PRS.map((p) => (
              <li
                key={p.number}
                data-pr-id={p.number}
                data-pr-status={p.isDraft ? "open-draft" : "open-ready"}
                data-pr-created-at={p.createdAt}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    #{p.number} {p.title}
                  </p>
                  <span
                    className={
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold " +
                      (p.isDraft
                        ? "border-slate-300 bg-slate-100 text-slate-700"
                        : "border-emerald-300 bg-emerald-50 text-emerald-700")
                    }
                  >
                    {p.isDraft ? "DRAFT" : "READY"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">作成: {p.createdAt}</p>
                <p className="mt-2 text-xs text-slate-700">推定完走: {p.estimatedCompletion}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ===== Section 5: Audit Pages ===== */}
        <section
          id={sectionId("audit-pages")}
          data-section-id="audit-pages"
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-slate-900">5. 監査公開ページ一覧</h2>
          <ul className="mt-3 space-y-2">
            {AUDIT_PAGES.map((a) => (
              <li
                key={a.id}
                data-audit-page-id={a.id}
                data-audit-page-path={a.path}
                data-audit-http-status={a.httpStatus}
                data-audit-findings-open={a.findingsOpen}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                  <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    HTTP {a.httpStatus}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-500">{a.path}</p>
                <p className="mt-2 text-xs text-slate-700">
                  未対応findings: {a.findingsOpen} 件 — {a.note}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ===== Section 6: Owner-pending Decisions (F-category 4 features) ===== */}
        <section
          id={sectionId("owner-pending-decisions")}
          data-section-id="owner-pending-decisions"
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-slate-900">
            6. オーナー判断待ち事項 — F-category 4機能
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            各機能について、利用想定・SEO寄与・ブランド整合性・推奨アクションを集約。
            最下段の「採否判断」欄から「維持 / 縮小 / アーカイブ」を選択しご返信ください。
          </p>
          <ul className="mt-4 space-y-5">
            {FEATURE_DECISIONS.map((f) => (
              <li
                key={f.id}
                data-feature-id={f.id}
                data-finding-id={f.findingId}
                data-recommendation-grade={f.recommendation}
                data-pending-decision-id={`decision-${f.id}`}
                className="rounded-xl border border-amber-200 bg-amber-50/30 p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {f.findingId} — {f.label}
                  </h3>
                  <span
                    className={
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold " +
                      (f.recommendation === "A-維持"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : f.recommendation === "B-縮小"
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-rose-300 bg-rose-50 text-rose-700")
                    }
                  >
                    推奨: {f.recommendation}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-500">{f.path}</p>

                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-xs text-slate-700 sm:grid-cols-2">
                  <div data-attr="scale-lines">
                    <dt className="font-bold text-slate-500">実装規模</dt>
                    <dd>{f.scaleLines.toLocaleString()} 行</dd>
                  </div>
                  <div data-attr="backlink-refs">
                    <dt className="font-bold text-slate-500">内部リンク被参照ファイル数</dt>
                    <dd>{f.backlinkRefs} ファイル</dd>
                  </div>
                  <div className="sm:col-span-2" data-attr="data-scale">
                    <dt className="font-bold text-slate-500">データ規模</dt>
                    <dd>{f.dataScale}</dd>
                  </div>
                  <div className="sm:col-span-2" data-attr="seo-metric">
                    <dt className="font-bold text-slate-500">SEO寄与</dt>
                    <dd>{f.seoMetric}</dd>
                  </div>
                  <div data-attr="relation-to-main3">
                    <dt className="font-bold text-slate-500">メイン3機能との関係</dt>
                    <dd>{f.relationToMain3}</dd>
                  </div>
                  <div data-attr="brand-fit">
                    <dt className="font-bold text-slate-500">ブランド整合性</dt>
                    <dd>{f.brandFit}</dd>
                  </div>
                  <div className="sm:col-span-2" data-attr="archive-impact">
                    <dt className="font-bold text-slate-500">撤去時の影響範囲</dt>
                    <dd>{f.archiveImpact}</dd>
                  </div>
                  <div className="sm:col-span-2" data-attr="redirect-candidate">
                    <dt className="font-bold text-slate-500">リダイレクト先候補</dt>
                    <dd>{f.redirectCandidate}</dd>
                  </div>
                  <div className="sm:col-span-2" data-attr="rationale">
                    <dt className="font-bold text-slate-500">推奨根拠</dt>
                    <dd>{f.rationale}</dd>
                  </div>
                </dl>

                <div
                  className="mt-4 rounded-lg border border-slate-300 bg-white p-3"
                  data-decision-ballot={`decision-${f.id}`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    採否判断 (オーナー記入)
                  </p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {(["A-維持", "B-縮小", "C-アーカイブ"] as const).map((g) => (
                      <li
                        key={g}
                        data-ballot-option={g}
                        data-is-recommended={f.recommendation === g}
                        className="flex items-center gap-2"
                      >
                        <span className="inline-block h-3 w-3 rounded border border-slate-400" aria-hidden />
                        <span
                          className={
                            f.recommendation === g
                              ? "font-bold text-slate-900"
                              : "text-slate-700"
                          }
                        >
                          {g}
                          {f.recommendation === g ? " (推奨)" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ===== Section 7: Known Issues ===== */}
        <section
          id={sectionId("known-issues")}
          data-section-id="known-issues"
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-slate-900">7. 既知の課題・残作業</h2>
          <ul className="mt-3 space-y-2">
            {KNOWN_ISSUES.map((k) => (
              <li
                key={k.id}
                data-known-issue-id={k.id}
                data-issue-priority={k.priority}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {k.id} — {k.title}
                  </p>
                  <span
                    className={
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold " +
                      (k.priority === "high"
                        ? "border-rose-300 bg-rose-50 text-rose-700"
                        : k.priority === "medium"
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-slate-300 bg-slate-50 text-slate-700")
                    }
                  >
                    {k.priority.toUpperCase()}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-700">{k.note}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ===== Section 8: Vercel Status ===== */}
        <section
          id={sectionId("vercel-status")}
          data-section-id="vercel-status"
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-slate-900">8. Vercel ビルド状況・次回反映</h2>
          <div
            data-vercel-status-state={VERCEL_STATUS.buildQuotaState}
            className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700"
          >
            <p>
              <span className="font-bold text-slate-500">ビルドクォータ状態:</span>{" "}
              {VERCEL_STATUS.buildQuotaState}
            </p>
            <p className="mt-2">
              <span className="font-bold text-slate-500">ignoreCommand 対応:</span>{" "}
              {VERCEL_STATUS.ignoreCommandStatus}
            </p>
            <p className="mt-2">
              <span className="font-bold text-slate-500">次回反映:</span>{" "}
              {VERCEL_STATUS.nextRefreshHintIso}
            </p>
          </div>
        </section>

        {/* ===== Section 9: AN Dispatch (Law citation full audit) ===== */}
        <section
          id={sectionId("an-dispatch")}
          data-section-id="an-dispatch"
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-slate-900">
            9. AN Dispatch — Law citation full audit
          </h2>
          <div
            data-dispatch-id="AN-law-citation-full-audit"
            data-dispatch-status="merged"
            data-dispatch-pr={227}
            className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-slate-700"
          >
            <p>
              <span className="font-bold">完走済 — PR #227 マージ</span> (SHA f99d3f6, 2026-05-17T08:22Z)
            </p>
            <p className="mt-2">
              全コードベース (web/src 891ファイル、4,440引用) を e-Gov 既知範囲と内部正典データに照合し、
              C0(出範囲条文) 8件・intra-law duplicate 2件・非正規略称 80件を全件修正。
              C1/C2/C4 は 0件で検出されず。詳細: <span className="font-mono">/audits/law-citation-full-audit</span>。
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              並行Dispatch 279ターン中の終端結果。本ダッシュボード作成中も継続的に進行していたが、
              スコープは PR #227 で完結済み (post-audit bookkeeping は PR #224)。
            </p>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
          <p>
            本ダッシュボードは AI解析向けに <span className="font-mono">data-*</span> 属性で構造化:
            <span className="font-mono">data-section-id</span>,{" "}
            <span className="font-mono">data-pr-id</span>,{" "}
            <span className="font-mono">data-pr-category</span>,{" "}
            <span className="font-mono">data-pr-status</span>,{" "}
            <span className="font-mono">data-finding-id</span>,{" "}
            <span className="font-mono">data-feature-id</span>,{" "}
            <span className="font-mono">data-recommendation-grade</span>,{" "}
            <span className="font-mono">data-pending-decision-id</span>,{" "}
            <span className="font-mono">data-ballot-option</span>,{" "}
            <span className="font-mono">data-known-issue-id</span>,{" "}
            <span className="font-mono">data-vercel-status-state</span>,{" "}
            <span className="font-mono">data-dispatch-status</span>。
          </p>
          <p className="mt-2">
            生成: {META.generatedAt} / base SHA: {META.baseMainSha} / robots: noindex,follow / canonical: なし。
          </p>
        </footer>
      </article>
    </PageContainer>
  );
}
