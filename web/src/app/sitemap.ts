import type { MetadataRoute } from "next";
import { PAID_MODE } from "@/lib/paid-mode";
import { FEATURE_CATEGORIES } from "@/data/features-catalog";
import { CONSTRUCTION_CALCULATORS } from "@/lib/construction-calc/registry";
import { SAFETY_SIGNS, SIGN_CATEGORIES } from "@/data/safety-signs";
import { INDUSTRIES } from "@/data/safety-signs/industry-usage";
import { ILLNESS_CATEGORIES } from "@/data/illness-considerations";
import { COURT_CASES } from "@/data/court-cases";
import { CANONICAL_HAZARD_TYPES } from "@/lib/accidents/type-normalization";
import { EDUCATION_DECKS } from "@/data/education-decks";
import { latestIsoDate } from "@/lib/sitemap/lastmod";
import { computeSitemapFreshness } from "@/lib/sitemap/freshness";
import { SITE_URL } from "@/lib/seo-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  // 柱C-3 / S DRY: 絶対URLのオリジンは seo-metadata.ts の SITE_URL を単一ソースにする
  //（og-image・json-ld・page-json-ld と同じ正本）。従来のドメイン直書きは SITE_URL 変更時に
  // sitemap の loc が旧ドメインへ無言ドリフトする発見性の穴だった。SITE_URL は末尾スラッシュ無し
  // ＝従来の base と同値のため出力は byte-identical。
  const base = SITE_URL;

  // 柱C-3-4 / S DRY: lastmod 動的化のためのセクション別「実データ最新日」は、
  // sitemap-index.xml と単一ソース化するため lib/sitemap/freshness.ts に集約済み。
  // 本体は computeSitemapFreshness() の結果を分配するだけ（fallback 値・cap 方針は
  // そちらが正本。出力は従来と byte-identical）。
  const buildToday = new Date().toISOString().slice(0, 10);
  const {
    freshestNews, // /whats-new・トップが集約する新着の最新日
    freshestLawRevision, // /laws の法改正最新公表日
    freshestNotice, // /circulars の通達最新発出日
    freshestCourtCase, // /court-cases の判例最新判決日
    accidentsDataUpdated, // 死亡災害DBスナップショット生成日
    equipmentDataUpdated, // 保護具DB生成日
    freshestArticle, // /articles 一覧の最新更新日
    siteFreshest, // サイト全体（トップ）の最新日＝主要データ源の最大値
  } = computeSitemapFreshness(buildToday);

  type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  const pages: { url: string; lastModified: string; priority: number; changeFrequency: Freq }[] = [
    // 柱C-3-4: トップは changeFrequency=daily。lastmod も主要データ源の最新日に追従させる
    //（従来の固定 2026-04-19 が daily と自己矛盾していた点を是正）。
    { url: "/", lastModified: siteFreshest, priority: 1.0, changeFrequency: "daily" },
    { url: "/leaflet", lastModified: "2026-04-28", priority: 0.5, changeFrequency: "monthly" },
    { url: "/circulars", lastModified: freshestNotice, priority: 0.8, changeFrequency: "weekly" },
    { url: "/equipment-finder", lastModified: equipmentDataUpdated, priority: 0.7, changeFrequency: "monthly" },
    { url: "/articles", lastModified: freshestArticle, priority: 0.8, changeFrequency: "daily" },
    { url: "/accidents", lastModified: accidentsDataUpdated, priority: 0.9, changeFrequency: "weekly" },
    { url: "/accidents-analytics", lastModified: accidentsDataUpdated, priority: 0.8, changeFrequency: "weekly" },
    // 重大災害事例ブラウザ（死亡災害DBの類型検索・自己canonical・実在indexableページ）。
    // 死亡災害DB由来のためlastmodは accidentsDataUpdated（= SERIOUS_CASES_META.generatedAt）に追従。
    { url: "/accident-news", lastModified: accidentsDataUpdated, priority: 0.85, changeFrequency: "weekly" },
    { url: "/accidents-reports", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "weekly" },
    { url: "/accidents-reports/construction", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "weekly" },
    { url: "/accidents-reports/manufacturing", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "weekly" },
    { url: "/accidents-reports/transport", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "weekly" },
    { url: "/accidents-reports/healthcare", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "weekly" },
    { url: "/accidents-reports/service", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "weekly" },
    // site-wide-audit SW-P2-01: クエリ文字列付きURL（?industries=...）は重複/canonical希釈リスクのため
    // sitemap から除外。比較ページは下記の正規URL（パラメータ無し）に集約する。
    { url: "/accidents-reports/compare", lastModified: "2026-05-17", priority: 0.75, changeFrequency: "weekly" },
    { url: "/industries", lastModified: "2026-05-17", priority: 0.85, changeFrequency: "monthly" },
    { url: "/for/construction", lastModified: "2026-05-24", priority: 0.9, changeFrequency: "weekly" },
    { url: "/for/solo", lastModified: "2026-05-30", priority: 0.85, changeFrequency: "weekly" },
    { url: "/for/manager", lastModified: "2026-05-30", priority: 0.85, changeFrequency: "weekly" },
    { url: "/for/consultant", lastModified: "2026-05-30", priority: 0.85, changeFrequency: "weekly" },
    { url: "/industries/construction", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/manufacturing", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/transport", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/healthcare", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/service", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/retail", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/food", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/wholesale", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/warehouse", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/industries/office", lastModified: "2026-05-17", priority: 0.8, changeFrequency: "monthly" },
    { url: "/e-learning", lastModified: "2026-04-19", priority: 0.9, changeFrequency: "weekly" },
    { url: "/laws", lastModified: freshestLawRevision, priority: 0.9, changeFrequency: "weekly" },
    { url: "/law-hierarchy", lastModified: "2026-05-14", priority: 0.8, changeFrequency: "monthly" },
    // 法令ナビ（分野別・現場語で条文原文へ。docs/horei-navi-foundation-2026-07-11）。
    // 個別条文（/law-navi/<lawId>/<artSlug> 約480件）は sitemap-laws.xml（役割分担は
    // 通達・保護具・化学物質の個別sitemapと同型）。分野ページは数が少ないうちは本体に列挙。
    { url: "/law-navi", lastModified: "2026-07-11", priority: 0.9, changeFrequency: "weekly" },
    { url: "/law-navi/beppyo", lastModified: "2026-07-11", priority: 0.8, changeFrequency: "monthly" },
    { url: "/law-navi/topics/forklift", lastModified: "2026-07-11", priority: 0.8, changeFrequency: "monthly" },
    // P0-011 (usability-audit-day2): /laws/notices-precedents は /circulars に統合済。301 redirect は next.config.ts。
    { url: "/ky", lastModified: "2026-04-01", priority: 0.8, changeFrequency: "monthly" },
    { url: "/ky-examples", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    // KY入力の正規ページ（robots index:true・自己canonical・HowTo JSON-LD付の実在ツール）。
    // /pdf の permanentRedirect 先だが本体URLは /ky/paper。孤立していたため収載する
    //（リダイレクト元 /pdf 自体は下記コメントの通り非収載）。
    { url: "/ky/paper", lastModified: "2026-05-25", priority: 0.75, changeFrequency: "monthly" },
    // 作業員マスター（KY用紙の参加者を選ぶだけにする実在ツール・robots index:true・
    // 自己canonical・PageJsonLd付）。/ky/paper と同じ KY全面再設計 Phase1-3（#285）で
    // 追加されたが sitemap から漏れていた孤立ページ。lastmod は当該再設計の 2026-05-25。
    { url: "/ky/workers", lastModified: "2026-05-25", priority: 0.7, changeFrequency: "monthly" },
    { url: "/risk", lastModified: "2026-04-19", priority: 0.8, changeFrequency: "daily" },
    { url: "/chatbot", lastModified: "2026-04-01", priority: 0.8, changeFrequency: "monthly" },
    { url: "/law-search", lastModified: "2026-04-01", priority: 0.8, changeFrequency: "monthly" },
    { url: "/chemical-ra", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/chemical-database", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/risk-prediction", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/pricing", lastModified: "2026-03-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/strategy/plan-generator", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/health-checkup-scheduler", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/heat-illness-prevention", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/heat-illness-prevention/wbgt-calculator", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/heat-illness-prevention/industry-risk", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/heat-illness-prevention/r7-compliance", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    // 令和7年6月施行 改正安衛則(第612条の2)対応の実在indexableツールページ（自己canonical・PageJsonLd付）。
    // 兄弟ページ(wbgt-calculator/industry-risk/r7-compliance)と同節のためlastmod方針を踏襲。
    { url: "/heat-illness-prevention/acclimatization", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/heat-illness-prevention/log", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/heat-illness-prevention/poster", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/asbestos-management", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/asbestos-management/investigation-checker", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/asbestos-management/notification-builder", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/asbestos-management/work-plan-template", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/asbestos-management/qualifications", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "monthly" },
    { url: "/foreign-workers", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/foreign-workers/safety-training", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/technical-intern-1", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/technical-intern-2", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/technical-intern-3", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/specified-skilled-1", lastModified: "2026-05-16", priority: 0.75, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/specified-skilled-2", lastModified: "2026-05-16", priority: 0.75, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/engineer-humanities-intl", lastModified: "2026-05-16", priority: 0.7, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/skilled-labor", lastModified: "2026-05-16", priority: 0.65, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/permanent-resident", lastModified: "2026-05-16", priority: 0.65, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/long-term-resident", lastModified: "2026-05-16", priority: 0.65, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/spouse-of-japanese", lastModified: "2026-05-16", priority: 0.65, changeFrequency: "monthly" },
    { url: "/foreign-workers/status/designated-activities-employment", lastModified: "2026-05-16", priority: 0.65, changeFrequency: "monthly" },
    { url: "/education-certification", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/education-certification/finder", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education", lastModified: "2026-04-25", priority: 0.9, changeFrequency: "monthly" },
    { url: "/education/tokubetsu/kensaku-toishi", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/tokubetsu/teiatsu-denki", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/tokubetsu/ashiba", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/tokubetsu/fullharness", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/tokubetsu/tamakake", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/tokubetsu/sankesu", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/hoteikyoiku/shokucho", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/hoteikyoiku/chemical-ra", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/roudoueisei/youtsu-yobou", lastModified: "2026-04-24", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/roudoueisei/necchu", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/roudoueisei/shindou", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/education/roudoueisei/souon", lastModified: "2026-04-25", priority: 0.8, changeFrequency: "monthly" },
    { url: "/subsidies", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/diversity", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/diversity/disability", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/sogi", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/foreign-workers", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/diversity/elderly", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/lgbtq", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/non-regular", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/remote", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/diversity/women", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/laws/bcp", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/laws/freelance-rosai", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/laws/gig-work", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/treatment-work-balance", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/treatment-work-balance/plan-builder", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/mental-health", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/mental-health-management", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/mental-health-management/stress-check", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/mental-health-management/small-business", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/mental-health-management/interview-guidance", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/glossary", lastModified: "2026-04-01", priority: 0.7, changeFrequency: "monthly" },
    { url: "/faq", lastModified: "2026-05-16", priority: 0.9, changeFrequency: "monthly" },
    { url: "/faq/law-system", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/faq/management", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/faq/chemical", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/faq/health-education", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/faq/search", lastModified: "2026-05-16", priority: 0.6, changeFrequency: "monthly" },
    // /pdf は permanentRedirect → /ky/paper のためサイトマップから除外（リダイレクトURLは掲載しない）
    { url: "/safety-diary", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/notifications", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    // 自社プロファイル登録（index:true・自己canonical・OGP付きの実在ページ＝全機能の初期表示
    // 最適化の入口）。逆カバレッジガード（下記 sitemap.test.ts）で検出した「indexable なのに
    // どの sitemap にも載っていなかった」発見性の穴を収載。
    // ※ /organization（事業所ダッシュボード）は「正式リリース前デモ版モック」として意図的に非収載
    //   （sitemap.test.ts の非収載境界テストで固定）。noindex 化されれば逆ガードも自動追従する。
    { url: "/profile", lastModified: "2026-05-29", priority: 0.6, changeFrequency: "monthly" },
    { url: "/goods", lastModified: "2026-03-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/work-environment-measurement", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/work-environment-measurement/target-finder", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/work-environment-measurement/management-class-judge", lastModified: "2026-05-16", priority: 0.8, changeFrequency: "monthly" },
    { url: "/signage", lastModified: "2026-05-06", priority: 0.5, changeFrequency: "weekly" },
    { url: "/features", lastModified: "2026-05-15", priority: 0.8, changeFrequency: "monthly" },
    { url: "/features/comparison", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/features/quick-tour", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/features/use-cases", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/bcp", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    // /qa-knowledge: reduced to thin landing (募集中), excluded from sitemap (F-007 B縮小)
    { url: "/resources", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/insurance", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    // /api-docs and /lms removed: pre-launch features (no real API yet, LMS β waitlist only).
    // Audit reference: harsh-third-party-2026-05-16 F-001/F-002.
    { url: "/ky/morning", lastModified: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
    { url: "/security", lastModified: "2026-05-15", priority: 0.3, changeFrequency: "yearly" },
    // /dpa removed: individual-operator phase, standard template after incorporation.
    // Audit reference: harsh-third-party-2026-05-16 G-002.
    { url: "/safety-signs", lastModified: "2026-05-16", priority: 0.85, changeFrequency: "monthly" },
    { url: "/about", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "yearly" },
    // /about/cases は redirect → /about のためサイトマップから除外（リダイレクトURLは掲載しない）
    { url: "/about/chatbot-eval", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "monthly" },
    { url: "/about/data-sources", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "monthly" },
    { url: "/about/news-feed", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "monthly" },
    // SEO-001 keyword landings — information-intent guides funnelling to main 4 tool pages.
    { url: "/guides", lastModified: "2026-05-19", priority: 0.85, changeFrequency: "monthly" },
    { url: "/guides/anzeneho-ai-chatbot", lastModified: "2026-05-19", priority: 0.8, changeFrequency: "monthly" },
    { url: "/guides/industry-accident-reports", lastModified: "2026-05-19", priority: 0.8, changeFrequency: "monthly" },
    { url: "/guides/annual-safety-plan-generator", lastModified: "2026-05-19", priority: 0.8, changeFrequency: "monthly" },
    { url: "/guides/chemical-ra-create-simple", lastModified: "2026-05-19", priority: 0.8, changeFrequency: "monthly" },
    { url: "/chemical-ra/product-search", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/laws/glossary", lastModified: "2026-04-19", priority: 0.7, changeFrequency: "monthly" },
    { url: "/newsletter", lastModified: "2026-04-19", priority: 0.5, changeFrequency: "monthly" },
    { url: "/resources/mlit", lastModified: "2026-05-15", priority: 0.6, changeFrequency: "monthly" },
    { url: "/subsidies/calculator", lastModified: "2026-04-01", priority: 0.6, changeFrequency: "monthly" },
    { url: "/quick", lastModified: "2026-04-19", priority: 0.6, changeFrequency: "monthly" },
    { url: "/signage/map", lastModified: "2026-05-06", priority: 0.4, changeFrequency: "weekly" },
    { url: "/contact", lastModified: "2026-04-22", priority: 0.5, changeFrequency: "yearly" },
    // 柱C-3-3: どの sitemap にも収載されていなかった実在 indexable ページを追加。
    // 新着ハブ（毎日更新の法改正・事故速報の集約）。
    { url: "/whats-new", lastModified: freshestNews, priority: 0.85, changeFrequency: "daily" },
    // 労災裁判例コーナー（一覧＋責任解説。個別判例は下の courtCasePages で動的列挙）。
    // /court-cases/print は robots:{index:false} のため収載しない。
    { url: "/court-cases", lastModified: freshestCourtCase, priority: 0.85, changeFrequency: "weekly" },
    { url: "/court-cases/employer-liability", lastModified: "2026-06-06", priority: 0.8, changeFrequency: "monthly" },
    // 記録キット（現場記録ツール群。SSR本文・固有見出しを持つ実ページ）。
    { url: "/site-records", lastModified: "2026-06-11", priority: 0.7, changeFrequency: "monthly" },
    { url: "/site-records/patrol", lastModified: "2026-06-11", priority: 0.6, changeFrequency: "monthly" },
    { url: "/site-records/near-miss", lastModified: "2026-06-11", priority: 0.6, changeFrequency: "monthly" },
    { url: "/site-records/inspection", lastModified: "2026-06-11", priority: 0.6, changeFrequency: "monthly" },
    { url: "/site-records/committee", lastModified: "2026-06-11", priority: 0.6, changeFrequency: "monthly" },
    { url: "/site-records/induction", lastModified: "2026-06-11", priority: 0.6, changeFrequency: "monthly" },
    { url: "/site-records/monthly", lastModified: "2026-06-11", priority: 0.6, changeFrequency: "monthly" },
    { url: "/site-records/procedure", lastModified: "2026-06-11", priority: 0.6, changeFrequency: "monthly" },
    { url: "/site-records/incident-report", lastModified: "2026-06-11", priority: 0.6, changeFrequency: "monthly" },
    { url: "/site-records/qualifications", lastModified: "2026-06-11", priority: 0.6, changeFrequency: "monthly" },
    { url: "/site-records/calendar", lastModified: "2026-06-11", priority: 0.6, changeFrequency: "monthly" },
    { url: "/privacy", lastModified: "2025-10-01", priority: 0.3, changeFrequency: "yearly" },
    { url: "/terms", lastModified: "2025-10-01", priority: 0.3, changeFrequency: "yearly" },
  ];

  // PAID_MODE が無効な研究プロジェクト期間は、課金関連ページをサイトマップから除外
  const PAID_ONLY = new Set(["/pricing"]);
  const filtered = PAID_MODE ? pages : pages.filter((p) => !PAID_ONLY.has(p.url));

  // 柱C-3-2/A-3 役割分担の是正: 個別の通達(/circulars/<id>)・保護具(/equipment/<id>)・
  // 記事(/articles/<slug>)ページは、それぞれ専用の子サイトマップ
  // （sitemap-circulars.xml / sitemap-equipment.xml / sitemap-articles.xml。すべて
  // sitemap-index.xml が列挙）が正本として出力する。本体 sitemap.xml に直書きすると
  // 同一URLが2つのサイトマップに二重掲載され、役割分担が崩壊するためここでは出力しない。

  const featureCategoryPages: typeof pages = FEATURE_CATEGORIES.map((c) => ({
    url: `/features/${c.id}`,
    lastModified: "2026-05-15",
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  // 建設計算: ハブ＋個別計算機（registry から列挙＝計算機の量産に自動追従）
  const constructionCalcPages: typeof pages = [
    { url: "/construction-calc", lastModified: "2026-07-12", priority: 0.8, changeFrequency: "weekly" },
    ...CONSTRUCTION_CALCULATORS.map((c) => ({
      url: `/construction-calc/${c.slug}`,
      lastModified: "2026-07-12",
      priority: 0.8,
      changeFrequency: "monthly" as Freq,
    })),
  ];

  const safetySignCategoryPages: typeof pages = SIGN_CATEGORIES.map((c) => ({
    url: `/safety-signs/category/${c.id}`,
    lastModified: "2026-05-16",
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  const safetySignIndustryPages: typeof pages = INDUSTRIES.map((i) => ({
    url: `/safety-signs/industry/${i.id}`,
    lastModified: "2026-05-16",
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  const safetySignDetailPages: typeof pages = SAFETY_SIGNS.map((s) => ({
    url: `/safety-signs/sign/${s.id}`,
    lastModified: "2026-05-16",
    priority: 0.5,
    changeFrequency: "monthly",
  }));

  const illnessGuidePages: typeof pages = ILLNESS_CATEGORIES.map((c) => ({
    url: `/treatment-work-balance/illness-guide/${c.id}`,
    lastModified: "2026-05-16",
    priority: 0.75,
    changeFrequency: "monthly",
  }));

  // 柱C-3-3: 個別判例ページ（/court-cases/[id]。dynamicParams=false の静的生成対象＝
  // 実在 indexable ページ）。判決内容は確定済みのため changeFrequency=yearly。
  // 柱C-3-4: lastmod は各判例の判決日（c.date）に追従（不正値は確定日 fallback）。
  const courtCasePages: typeof pages = COURT_CASES.map((c) => ({
    url: `/court-cases/${c.id}`,
    lastModified: latestIsoDate([c.date], "2026-06-06", buildToday),
    priority: 0.6,
    changeFrequency: "yearly",
  }));

  // 災害の型別 教育スライド（/education/hazard-slides + 21型。dynamicParams=false の
  // 静的生成対象）。統計データ（死亡災害DB）更新に連動するため lastmod は
  // accidentsDataUpdated に追従。
  const hazardSlidePages: typeof pages = [
    {
      url: "/education/hazard-slides",
      lastModified: accidentsDataUpdated,
      priority: 0.85,
      changeFrequency: "monthly" as Freq,
    },
    ...CANONICAL_HAZARD_TYPES.map((t) => ({
      url: `/education/hazard-slides/${t.slug}`,
      lastModified: accidentsDataUpdated,
      priority: 0.75,
      changeFrequency: "monthly" as Freq,
    })),
  ];

  // 無償教材パック（/education/pack + 宣言デッキ + 利用規約）。統計スライドは
  // 死亡災害DB更新に連動するため lastmod は accidentsDataUpdated に追従。
  const eduPackPages: typeof pages = [
    { url: "/education/pack", lastModified: accidentsDataUpdated, priority: 0.85, changeFrequency: "monthly" as Freq },
    { url: "/education/pack/terms", lastModified: "2026-07-12", priority: 0.6, changeFrequency: "yearly" as Freq },
    ...EDUCATION_DECKS.map((d) => ({
      url: `/education/pack/${d.slug}`,
      lastModified: accidentsDataUpdated,
      priority: 0.8,
      changeFrequency: "monthly" as Freq,
    })),
  ];

  return [
    ...filtered,
    ...eduPackPages,
    ...featureCategoryPages,
    ...constructionCalcPages,
    ...safetySignCategoryPages,
    ...safetySignIndustryPages,
    ...safetySignDetailPages,
    ...illnessGuidePages,
    ...courtCasePages,
    ...hazardSlidePages,
  ].map(
    ({ url, lastModified, priority, changeFrequency }) => {
      const absolute = `${base}${url}`;
      return {
        url: absolute,
        lastModified,
        changeFrequency,
        priority,
      };
    }
  );
}
