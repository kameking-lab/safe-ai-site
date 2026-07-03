/**
 * 横断検索（/search・⌘K）へ「機能・ツールの目的地ページ」を収載するためのブラウザ安全な射影源。
 *
 * 背景（発見性の穴）:
 *  これまで横断検索インデックス（{@link buildSearchIndex}）は条文・通達・判例・化学物質・
 *  事故・教育テーマ・用語・FAQ・標識・保護具・記事といった **コンテンツレコード** だけを収載し、
 *  サイトの主要な **目的地ページそのもの**（サイネージ・KY用紙・化学物質RA・作業環境測定・
 *  事故DB・法改正…）が横断検索から 0 件だった。⌘K の {@link QUICK_SHORTCUTS} は空クエリ時に
 *  4 件を出すだけで検索対象ではなく、「サイネージ」「KY」「作業環境測定」と機能名を打った現場
 *  ユーザーは目的の機能へ検索経由で着けなかった（サイドバー回遊のみが導線）。
 *
 * 単一ソース:
 *  収載元は {@link FLAGSHIP_FEATURES}（`@/config/flagship-nav`＝サイドバー・トップの主要機能ナビが
 *  参照する正本の機能定義）に一本化する。ハンド重複の登録簿を新設せず、機能追加が自動で検索へ載る
 *  （収載漏れは drift ガード `site-pages-search-source.test.ts` が CI で検知）。アイコン（絵文字）は
 *  検索に不要なため射影しない＝検索チャンクを軽く保つ。
 *
 * 幽霊URL 0:
 *  各エントリの url はハッシュ・クエリを除いたベースパス。全 url が実在ルートへ解決することを
 *  drift ガードで機械固定する（`/industries/<slug>` は generateStaticParams の
 *  {@link INDUSTRY_CONTENT_SLUGS} に解決）。
 *
 * 補充（{@link EXTRA_DESTINATION_PAGES}）:
 *  FLAGSHIP ナビに載らないが **sitemap 収載済みで indexable な独立の目的地ページ** のうち、
 *  横断検索から 0 件だった高検索意図のハブ／ツールを少数だけ手当てで補う。ナビ正本を汚さずに
 *  検索の発見性だけを是正する（ナビ config は当班所有外）。件数は絞り、全 url が sitemap に実在
 *  することを drift ガードで固定＝幽霊URL 0・薄い/noindex ページの混入 0。
 *  収載対象は (a) 助成金ハブ／試算ツール、(b) 対象ユーザー4類型のペルソナ別実務ポータル
 *  （/for/<persona>＝現場監督・一人親方・安全担当・労働安全コンサルの立場名で引ける入口ハブ）、
 *  (c) 最新情報の入口＝新着情報ハブ（/whats-new）、(d) 現場記録ツールの束＝安全記録キット
 *  （/site-records）。いずれも機能名やトピック名では引けても「新着」「記録キット」等のハブ概念語で
 *  0 件だった独立ハブに限る。
 */
import { FLAGSHIP_FEATURES } from '@/config/flagship-nav';

/** 横断検索へ収載する目的地ページ 1 件（{@link SearchItem} と同形の軽量エントリ）。 */
export interface SitePageSearchEntry {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  keywords: string[];
}

/** ハッシュ（#section）・クエリ（?q=）を除いたベースパスを返す。 */
function basePath(href: string): string {
  return href.replace(/[#?].*$/, '');
}

/**
 * FLAGSHIP ナビに載らないが sitemap 収載済み・indexable な独立目的地ページの手当て補充。
 *
 * ここに載せるのは「機能名で引けるが具体トピック名で 0 件だった」高検索意図のハブ／ツールに限る。
 * title/subtitle/keywords は所有ページ（当班は本文を触らない）の metadata・見出しに準拠し、
 * data を写経・捏造しない（例: 個別助成金の金額・条件は載せず、ページが自ら advertise する
 * 制度名のみ keyword 化）。全 url が sitemap に実在することを drift ガードで固定する。
 */
export const EXTRA_DESTINATION_PAGES: SitePageSearchEntry[] = [
  {
    // 助成金・補助金ガイド（/subsidies）。中小企業/一人親方の安全投資に直結する高検索意図の
    // 独立ハブだが FLAGSHIP ナビ非掲載＝「助成金」「補助金」で横断検索が 0 件だった。
    // keyword の制度名はページ metadata description が自ら列挙する 3 制度に準拠（写経・捏造なし）。
    id: 'page-/subsidies',
    title: '助成金・補助金ガイド',
    subtitle: '中小企業の労働安全投資に使える公的助成金・補助金と労災の経済損失試算',
    url: '/subsidies',
    keywords: [
      '助成金',
      '補助金',
      '支援金',
      '給付金',
      '中小企業',
      '一人親方',
      '安全投資',
      'エイジフレンドリー補助金',
      '働き方改革推進支援助成金',
      '建退共',
    ],
  },
  {
    // 助成金 支給額試算ツール（/subsidies/calculator）。業種・人数・施策から概算支給額を試算。
    id: 'page-/subsidies/calculator',
    title: '助成金 支給額試算ツール',
    subtitle: '業種・人数・施策から申請できる助成金と概算支給額を試算',
    url: '/subsidies/calculator',
    keywords: ['助成金', '補助金', '試算', 'シミュレーション', '支給額', '受給', '計算'],
  },
  {
    // 新着情報ハブ（/whats-new）。法改正・労災の月次速報・厚労省通達・関連報道を新着順に
    // 一元表示する daily 更新（sitemap priority 0.85・changeFrequency daily）の indexable ハブだが、
    // FLAGSHIP ナビ非掲載＝「新着」「更新情報」「速報」と**最新情報の入口**を探した現場ユーザーが
    // 0 件だった発見性の穴。keyword はページ metadata（title/description）が自ら advertise する
    // ハブ概念語（新着・更新情報・速報・RSS）のみに絞り、「法改正」「通達」の裸クエリは入れない
    // ＝法改正レコード(revision)・通達(notice)の権威クエリを汚さない（ペルソナ/機能ページと同方針）。
    id: 'page-/whats-new',
    title: '新着情報ハブ',
    subtitle: '法改正・労災速報・通達・報道を新着順に一元表示（出典リンク付き・無料・RSS対応）',
    url: '/whats-new',
    keywords: ['新着情報', '新着', '更新情報', '最新情報', '速報', '一元表示', 'RSS'],
  },
  {
    // 現場の安全記録キット（/site-records）。受入教育記録・KY用紙・安全工程打合せ書・WBGT記録簿など
    // 現場で日々／定期に作る安全記録ツールを束ねる indexable ハブ（sitemap 収載済み）だが、配下の
    // 個別ツール（/ky/paper 等）はナビ掲載でもハブ自体は FLAGSHIP 非掲載＝「記録キット」「安全記録」
    // 「帳票」と**記録ツールの束**を探した現場監督・安全担当・一人親方が 0 件だった発見性の穴。
    // keyword はページ metadata が advertise する umbrella 語のみに絞り、KY/WBGT 等の個別ツール名は
    // 入れない（各ツールは自ページへ解決するため二重化しない）。
    id: 'page-/site-records',
    title: '現場の安全記録キット',
    subtitle: '受入教育・KY・打合せ書・WBGT記録など現場の安全記録をまとめて作成・印刷・保存',
    url: '/site-records',
    keywords: ['記録キット', '現場記録', '安全記録', '記録簿', '帳票', '現場帳票'],
  },
  // ペルソナ別 実務ポータル（/for/<persona>）。当サイトの対象ユーザー4類型（現場監督/一人親方/
  // 安全担当/労働安全コンサル）ごとに、その立場で必要な機能・法令・ツールを集約する高優先度
  // （sitemap priority 0.85〜0.9）の自己canonical・indexable な独立ハブ。FLAGSHIP ナビには載らず、
  // 横断検索(/search・⌘K)からは 0 件だった＝「一人親方」「職長」「社労士」と**自分の立場名**で
  // 探した対象ユーザーが、自分専用の入口ハブへ検索経由で着けない発見性の穴（#561 等と同型）。
  // keywords は各ページ metadata の title/description が自ら advertise する**立場・役割名のみ**に絞り、
  // 墜落/足場/化学物質等のハザード語や法令名は入れない＝条文・通達の権威クエリを汚さない
  // （保護具/機能ページ/疾患ガイドと同方針）。feature 扱いで既存カテゴリへ収載＝新規タブ追加なし。
  {
    id: 'page-/for/construction',
    title: '建設業の安全衛生ポータル',
    subtitle: '職長・元請担当・現場代理人のための実務ポータル（KY用紙・朝礼ネタ・年次計画・法令早見）',
    url: '/for/construction',
    keywords: ['建設業', '建設', '職長', '元請', '現場代理人', '現場監督', '施工管理'],
  },
  {
    id: 'page-/for/solo',
    title: '一人親方の安全衛生ポータル',
    subtitle: '特別加入・一人KY・資格・熱中症を一人で回すための実務ポータル',
    url: '/for/solo',
    keywords: ['一人親方', '個人事業主', 'フリーランス', '特別加入', '一人KY'],
  },
  {
    id: 'page-/for/manager',
    title: '企業の安全衛生担当者ポータル',
    subtitle: '体制づくり・委員会・ストレスチェック・年次計画を一気通貫で（規模別の義務早見つき）',
    url: '/for/manager',
    keywords: ['安全衛生担当', '安全衛生担当者', '衛生管理者', '総務', '人事', '安全委員会', '衛生委員会', '事業者'],
  },
  {
    id: 'page-/for/consultant',
    title: '専門家向けポータル',
    subtitle: '労働安全コンサルタント・社労士・診断士のためのリサーチ&顧問先支援',
    url: '/for/consultant',
    keywords: ['労働安全コンサルタント', '社会保険労務士', '社労士', '中小企業診断士', '診断士', '顧問', '専門家'],
  },
];

/**
 * {@link FLAGSHIP_FEATURES} を目的地ページの検索エントリへ射影する。
 *
 * - 主要機能: title=ナビ表示ラベル（現場が打つ機能名）、subtitle=カード見出し（cardTitle）。
 * - 配下機能（subItems）: title=配下ラベル、subtitle=配下説明（無ければ親の cardTitle）。
 * - ベースパスで重複除去（`/ky#presets` は `/ky` へ収斂）。**先勝ち**＝主要機能は subItems より
 *   先に走査されるため、自パスのタイトルは機能ラベルが優先される。
 */
export function getSitePageSearchEntries(): SitePageSearchEntry[] {
  const byPath = new Map<string, SitePageSearchEntry>();
  for (const f of FLAGSHIP_FEATURES) {
    const mainPath = basePath(f.href);
    if (!byPath.has(mainPath)) {
      byPath.set(mainPath, {
        id: `page-${mainPath}`,
        title: f.label,
        subtitle: f.cardTitle,
        url: mainPath,
        keywords: [],
      });
    }
    for (const sub of f.subItems) {
      const p = basePath(sub.href);
      if (byPath.has(p)) continue;
      byPath.set(p, {
        id: `page-${p}`,
        title: sub.label,
        subtitle: sub.description ?? f.cardTitle,
        url: p,
        keywords: [],
      });
    }
  }
  // 補充分は FLAGSHIP 由来の後に載せ、パス衝突時はナビ正本を優先（先勝ち）。
  for (const extra of EXTRA_DESTINATION_PAGES) {
    const p = basePath(extra.url);
    if (byPath.has(p)) continue;
    byPath.set(p, { ...extra, url: p });
  }
  return [...byPath.values()];
}
