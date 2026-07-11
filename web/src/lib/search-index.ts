import { searchCrossIndex, normalizeArticleQuery, expandLawAliases, chemicalDetailUrl } from './cross-search';

export type SearchCategory = 'law' | 'revision' | 'notice' | 'chemical' | 'equipment' | 'education' | 'accident' | 'precedent' | 'glossary' | 'faq' | 'sign' | 'article' | 'feature';

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: SearchCategory;
  url: string;
  /**
   * 追加のマッチ用キーワード（title/subtitle に出ない別名・分類ラベル・関連語）。
   * 複数語 AND クエリ「石綿 事前調査」「クレーン 過負荷」を条文へ収束させるために使う。
   */
  keywords?: string[];
}

/**
 * 同点時のカテゴリ優先度（先頭ほど上位）。目的条文・教育導線を上位に寄せる。
 * cross-search の searchCrossIndex に渡す（このリストに無いカテゴリは末尾扱い）。
 */
const SEARCH_CATEGORY_PRIORITY: readonly SearchCategory[] = [
  'law',
  'education',
  // FAQ は高意図の疑問（「衛生管理者は何人？」「SDS交付は義務？」）へ即答を返すため、
  // 同点時は判例・通達より上位に寄せる（条文・教育の次点）。
  'faq',
  // 法改正記事（監修済みの解説コンテンツ）は法改正の背景・実装ガイドを平易にまとめる。
  // 同点時は判例・通達より上位（FAQ の次点）に寄せ、条文・教育・FAQ には譲る。
  'article',
  // 法改正記録（法令・省令・通達の構造化改正レコード）は監修解説記事（article）に次ぐ
  // 権威系。特定の改正名クエリではタイトル一致で上位に来るが、bare な法令概念クエリの
  // 同点解決では条文本文（law）の権威を奪わないよう判例・通達の直上（記事の次点）に置く。
  'revision',
  'precedent',
  'notice',
  'glossary',
  // 安全標識（立入禁止・保護具着用など）は特定名の直接照会。用語と同じ参照系の
  // ティアに置き、法令・教育・FAQ より下位・化学物質より上位で同点解決する。
  'sign',
  'chemical',
  'accident',
  // 機能・ツールの目的地ページ（サイネージ・KY・作業環境測定…）。機能名クエリでは
  // タイトル一致のスコアで上位に来るが、コンテンツ系（条文・通達・判例…）の高意図クエリの
  // 同点解決では権威を奪わないよう保護具の直上（下位ティア）に置く。
  'feature',
  // 保護具は商品レコメンド（アフィリエイト）＝法令・通達・判例より権威が低いため、
  // 同点タイブレークでは最下位に置き、権威コンテンツの上位を決して奪わない。
  'equipment',
];

export const CATEGORY_META: Record<
  SearchCategory,
  { label: string; bgColor: string; textColor: string }
> = {
  law:       { label: '法令',    bgColor: 'bg-teal-100',   textColor: 'text-teal-700' },
  revision:  { label: '法改正',  bgColor: 'bg-cyan-100',   textColor: 'text-cyan-700' },
  notice:    { label: '通達',    bgColor: 'bg-blue-100',   textColor: 'text-blue-700' },
  chemical:  { label: '化学物質', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  equipment: { label: '保護具',   bgColor: 'bg-amber-100',  textColor: 'text-amber-700' },
  education: { label: '教育',    bgColor: 'bg-green-100',  textColor: 'text-green-700' },
  accident:  { label: '事故',    bgColor: 'bg-red-100',    textColor: 'text-red-700' },
  precedent: { label: '判例',    bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  glossary:  { label: '用語',    bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
  faq:       { label: 'FAQ',     bgColor: 'bg-sky-100',    textColor: 'text-sky-700' },
  sign:      { label: '標識',    bgColor: 'bg-amber-100',  textColor: 'text-amber-700' },
  article:   { label: '記事',    bgColor: 'bg-violet-100', textColor: 'text-violet-700' },
  feature:   { label: '機能',    bgColor: 'bg-slate-100',  textColor: 'text-slate-700' },
};

/**
 * 横断検索UIが描画するカテゴリタブの表示順（単一ソース）。
 *
 * `/search`（結果ページのタブ）と ⌘K（コマンドパレットのフィルタ）は本配列を import して
 * タブを生成する。かつては両UIが同一の配列をハンド重複で持ち、カテゴリ追加（faq/sign/equipment…）
 * の度に両方を手で更新する必要があった＝片方を忘れるとそのUIだけ新カテゴリのタブが欠落する
 * ドリフト源だったため、ここへ一本化した。
 *
 * 並びは現場の利用頻度・重要度で決めた表示順であり、同点スコアのタイブレーク順
 * （{@link SEARCH_CATEGORY_PRIORITY}）とは別軸。**集合としては {@link CATEGORY_META} の全キーと
 * 一致しなければならない**（回帰 search-index.test.ts で機械固定＝メタに足したのにタブへ出し
 * 忘れる／タブにあるのにメタが無い、の両方向のドリフトを検知）。
 */
export const SEARCH_CATEGORIES: readonly SearchCategory[] = [
  'law', 'revision', 'faq', 'article', 'precedent', 'notice', 'feature', 'chemical', 'equipment', 'education', 'accident', 'glossary', 'sign',
];

/**
 * インデックスをクエリで絞り込みスコア順に返す。
 *
 * マッチ規約は cross-search エンジン（{@link searchCrossIndex}）に一本化している:
 * 空白区切りの各語を AND で扱い（全語がどこかに当たった項目のみ採用）、シノニム展開
 * （アスベスト→石綿則 等）と keywords 重み付けを行う。これにより「石綿 事前調査」
 * 「クレーン 過負荷」「足場 作業床」のような 2 語クエリが目的条文へ収束する
 * （従来はクエリ全体を 1 つの部分文字列として扱い、2 語クエリが全滅していた）。
 *
 * さらに条番号クエリ（{@link normalizeArticleQuery}）を前処理で正規化し、地続きの
 * 「安衛法61条」を「安衛法 第61条」へ、漢数字「第六十一条」を「第61条」へ、枝番
 * 「61-2条」を「第61条の2」へ書き換えてから AND エンジンへ渡す。これにより e-Gov でも
 * 0 件になる生クエリが該当条文をトップ表示できる（診断書 05-search-egov.md 比較 a,b）。
 *
 * 加えて法令名のかな読み・別表記（{@link expandLawAliases}）を正略称へ展開する＝条番号
 * 分解の後段で「あんえいほう 第88条」→「安衛法 第88条」へ、「じんぱいほう」→「じん肺法」へ。
 * かな読みはインデックスにもコンテンツにも現れず 0 件だった取り逃し（比較 c）を、既存ヒットを
 * 一切奪わずに拾う（正式名称・別略称は O8-a で解決済みのため対象外）。
 *
 * @param limit 返却上限。コマンドパレット(⌘K)は既定10、/search 結果ページは全件表示のため大きめを渡す。
 */
export function searchItems(
  items: SearchItem[],
  query: string,
  category: 'all' | SearchCategory,
  limit = 10,
): SearchItem[] {
  return searchCrossIndex(items, expandLawAliases(normalizeArticleQuery(query)), {
    category,
    limit,
    categoryPriority: SEARCH_CATEGORY_PRIORITY,
  });
}

/** カテゴリ別に件数を集計する（/search 結果ページのタブ件数バッジ用）。 */
export function countByCategory(
  items: SearchItem[],
  query: string,
): Record<'all' | SearchCategory, number> {
  const counts: Record<'all' | SearchCategory, number> = {
    all: 0, law: 0, revision: 0, notice: 0, chemical: 0, equipment: 0, education: 0, accident: 0, precedent: 0, glossary: 0, faq: 0, sign: 0, article: 0, feature: 0,
  };
  if (!query.trim()) return counts;
  // 上限なしで全件マッチを採り、カテゴリ別に集計する。
  const all = searchItems(items, query, 'all', Number.MAX_SAFE_INTEGER);
  counts.all = all.length;
  for (const item of all) counts[item.category] += 1;
  return counts;
}

// Module-level cache — built once, reused on every keystroke
let cachedIndex: SearchItem[] | null = null;

interface CompactEntry {
  name: string;
  cas: string;
  category: string;
  categoryLabel: string;
}

export async function buildSearchIndex(): Promise<SearchItem[]> {
  if (cachedIndex) return cachedIndex;

  const items: SearchItem[] = [];

  await Promise.allSettled([
    // 法令・規則・指針の条文（curated 中核＝最高意図クエリ「安衛則 第○条」「足場 規則」を
    // 横断検索／⌘K から直接引けるよう収載）。これまで法令本文は 0 件ヒットで、検索手段は
    // 専用ページ /law-search のみだった。各結果は /law-search?law=&art= で当該条文へ深リンク。
    // 厚労省PDF抽出の補完ソース（mhlwLawArticles）は law 値が文書バンドル名で条文単位の
    // 深リンク UX に合わないため除外する（law/index.ts の LAW_SOURCE_COUNT と同じ方針）。
    import('@/data/laws').then(({ allLawArticles, mhlwLawArticles }) => {
      const mhlwSet = new Set<unknown>(mhlwLawArticles);
      const seen = new Set<string>();
      for (const a of allLawArticles) {
        if (mhlwSet.has(a)) continue;
        const key = `${a.law}|${a.articleNum}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const heading = [a.articleTitle, a.text]
          .map((s) => (s ?? '').trim())
          .filter(Boolean)
          .join('　');
        items.push({
          id: `law-${key}`,
          title: a.articleNum ? `${a.lawShort} ${a.articleNum}` : a.lawShort,
          subtitle: `${a.law}　${heading}`.slice(0, 90),
          category: 'law',
          // 略称・正式名称・条番号・見出し・条文キーワードのいずれの語でも AND マッチさせる
          // （例: 「石綿 事前調査」「クレーン 過負荷」「足場 作業床」が目的条文へ収束）。
          keywords: [...a.keywords, a.articleTitle, a.law, a.lawShort, a.articleNum].filter(Boolean),
          url: a.articleNum
            ? `/law-search?law=${encodeURIComponent(a.law)}&art=${encodeURIComponent(a.articleNum)}`
            : `/law-search?law=${encodeURIComponent(a.law)}`,
        });
      }
    }),
    // 法改正レコード（法令・省令・通達の構造化改正エントリ＝正本 lawRevisionCores）。
    // これまで法改正は /laws 一覧・/whats-new・/feed/law-revisions.xml に載っているのに
    // 横断検索(/search・⌘K)から丸ごと 0 件だった＝「フリーランス新法」「石綿則 改正」
    // 「化学物質 自律的管理」等の法改正クエリで発見できない穴（accident/equipment/sign と同型）。
    // lawRevisionCores は JSON＋純関数のみのブラウザ安全モジュール（node:fs 非依存）で、
    // NEXT_PUBLIC_REVISIONS_INGEST_SOURCE で source を切替（server 専用 payload 環境変数は
    // ブラウザでは undefined＝sample+egov+real の統合パスへフォールバックし常にデータを返す）。
    // 個別の法改正詳細ページは未実装のため url は /laws 一覧ハブへ寄せる（glossary→/glossary・
    // faq→/faq と同方針）。読込失敗時の placeholder（lr-fallback-*）は索引に載せない。
    // kind は英語コード（law/ordinance/notice…）のため keywords から除外＝日本語検索のノイズ回避。
    import('@/data/mock/law-revisions').then(({ lawRevisionCores }) => {
      const seen = new Set<string>();
      for (const r of lawRevisionCores) {
        if (r.id.startsWith('lr-fallback')) continue;
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        items.push({
          id: `revision-${r.id}`,
          title: r.title,
          subtitle: `${r.category}　${r.summary}`.slice(0, 90),
          category: 'revision',
          keywords: [
            r.category,
            r.revisionNumber,
            r.issuer,
            r.official_notice_number ?? '',
            r.industry_detail ?? '',
          ].filter(Boolean),
          url: '/laws',
        });
      }
    }),
    // 労災・労働判例（争点・分野で横断検索できるよう全件をインデックス化）
    import('@/data/court-cases').then(({ COURT_CASES }) => {
      for (const c of COURT_CASES) {
        items.push({
          id: `precedent-${c.id}`,
          title: c.name,
          subtitle: `${c.court}　${c.dateLabelJa}　${c.oneLine}`,
          category: 'precedent',
          keywords: [c.field, ...c.issues, c.court],
          url: `/court-cases/${c.id}`,
        });
      }
    }),
    // 事故事例（労働災害DB）。正本 getAccidentCasesDataset() を単一ソースに使う。
    // 旧実装は 7 データファイル中 5 つだけを手で import しており、2024-2026 確定事例と
    // 速報事例の 2 ファイルが横断検索から欠落していた（近年の事故が引けない発見性の穴）。
    // さらに全件が一覧トップ /accidents へリンクし、検索した個別事故へ到達できなかった。
    // 正本＝/accidents/[id] が findAccident() で解決する集合そのものなので、
    // ここから引けば「検索結果→詳細ページ」が必ず解決し（幽霊URL 0）、データ追加にも追従する。
    import('@/data/mock/accident-cases').then(({ getAccidentCasesDataset }) => {
      const seen = new Set<string>();
      for (const a of getAccidentCasesDataset()) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        items.push({
          id: `accident-${a.id}`,
          title: a.title,
          subtitle: `${a.workCategory} / ${a.type} / ${a.severity}（${a.occurredOn}）`,
          category: 'accident',
          keywords: [a.workCategory, a.type, a.severity, a.industry_detail ?? ''].filter(Boolean),
          url: `/accidents/${a.id}`,
        });
      }
    }),

    // 50 mock chemical substances with full detail。
    // canonical な個別詳細 /chemical-database/[cas] が実在する CAS はそこへ深リンクし
    // （sitemap-chemicals.xml 収載＝サイト最大級の独自コンテンツへ内部リンクを通す）、
    // 濃度基準DB 未収載の CAS のみ従来の一覧クエリページへフォールバックする（幽霊URL 0）。
    // 事故 /accidents/[id]・保護具 /equipment/[id]・通達 /circulars/[id] と同型の深リンク方針。
    import('@/data/mock/chemical-substances-db').then(({ chemicalSubstances }) => {
      for (const c of chemicalSubstances) {
        items.push({
          id: `chem-mock-${c.id}`,
          title: c.name,
          subtitle: `CAS ${c.cas}${c.name_en ? ` / ${c.name_en}` : ''}`,
          category: 'chemical',
          keywords: [c.cas, c.name_en ?? ''].filter(Boolean),
          url: chemicalDetailUrl(c.cas, c.name),
        });
      }
    }),

    // ~919 MHLW chemical substances from compact index
    import('@/data/chemicals-mhlw/compact.json').then((mod) => {
      const data = mod as unknown as { entries?: CompactEntry[]; default?: { entries?: CompactEntry[] } };
      const entries: CompactEntry[] = data.entries ?? data.default?.entries ?? [];
      const seen = new Set<string>();
      for (const e of entries) {
        if (e.name && !seen.has(e.name)) {
          seen.add(e.name);
          items.push({
            id: `chem-mhlw-${e.cas}-${e.category}`,
            title: e.name,
            subtitle: `CAS ${e.cas} / ${e.categoryLabel}`,
            category: 'chemical',
            keywords: [e.cas, e.categoryLabel].filter(Boolean),
            url: chemicalDetailUrl(e.cas, e.name),
          });
        }
      }
    }),

    // 保護具（安全用品DB）。正本 getAllEquipment()＝詳細 /equipment/[id] の
    // generateStaticParams が解決する集合そのもの（eq-NNNN）なので、ここから引けば
    // 「検索結果→詳細ページ」が必ず解決し（幽霊URL 0）データ追加にも自動追従する。
    // これまで保護具（フルハーネス・防じんマスク・安全帯…）は横断検索(/search・⌘K)から
    // 丸ごと 0 件で、sitemap-equipment.xml に個別ページを収載済みなのに現場頻用の保護具名で
    // 引けない発見性の穴だった（#561 accident・化学物質と同型）。keywords はカテゴリ名・
    // 小分類・メーカー・JIS/検定規格＝日本語で実際に検索される語のみ（industries/hazards は
    // 英語コードのため除外＝ノイズ回避）。title は製品名、subtitle にカテゴリ名＋規格を出す。
    import('@/lib/equipment-recommendation').then(({ getAllEquipment }) => {
      for (const e of getAllEquipment()) {
        items.push({
          id: `equipment-${e.id}`,
          title: e.name,
          subtitle: `${e.categoryName}　${e.spec}`.slice(0, 90),
          category: 'equipment',
          keywords: [e.categoryName, e.subCategory ?? '', e.maker ?? '', e.jisOrCertification].filter(Boolean),
          url: `/equipment/${e.id}`,
        });
      }
    }),

    // MHLW 通達/告示/指針（正本 mhlwNotices）。詳細 /circulars/[id] は
    // generateStaticParams が mhlwNotices 全件の id を解決するため、検索結果から
    // 個別通達へ深リンクできる（旧 /resources?q= は q を無視＝全件一覧へ落ちていた）。
    import('@/data/mhlw-notices').then(({ mhlwNotices }) => {
      for (const n of mhlwNotices) {
        items.push({
          id: `notice-${n.id}`,
          title: n.title,
          subtitle: `${n.noticeNumber ?? n.docType} ${n.issuedDateRaw ?? ''}`.trim(),
          category: 'notice',
          keywords: [n.docType, n.noticeNumber ?? '', n.category, n.issuer ?? ''].filter(Boolean),
          url: `/circulars/${n.id}`,
        });
      }
    }),

    // Eラーニング テーマ。正本＝ELearningPanel が `allThemes` として実際に描画する
    // 全テーマ源（入門コース＋汎用カタログ＋追補＋業種別6分野）を単一ソースにする。
    // 旧実装は 9 源のうち elearningThemesCatalog 1 つだけを import しており、業種別
    // （製造/医療福祉/運輸/林業/食品/小売）・入門・追補テーマが横断検索から丸ごと
    // 欠落していた（近年追加分が引けない発見性の穴＝#561 の accident と同型）。さらに
    // 全件が一覧トップ /e-learning へリンクし、検索したテーマへ到達できなかった。
    // url は panel が受け取る深リンク `/e-learning?theme=<id>#el-quiz`（panel 側で
    // allThemes に対し id 検証済み＝収載源が allThemes と一致するため必ず解決。未知idは
    // panel が無視して先頭テーマ表示＝幽霊リンク 0）。theme.id をキーに重複除去する。
    Promise.all([
      import('@/data/mock/elearning-intro-course'),
      import('@/data/mock/elearning-themes-data'),
      import('@/data/mock/elearning-extra-themes'),
      import('@/data/mock/elearning-manufacturing-themes'),
      import('@/data/mock/elearning-healthcare-themes'),
      import('@/data/mock/elearning-transport-themes'),
      import('@/data/mock/elearning-forestry-themes'),
      import('@/data/mock/elearning-food-themes'),
      import('@/data/mock/elearning-retail-themes'),
      import('@/data/mock/elearning-hazard-types-theme'),
    ]).then((mods) => {
      const themes = [
        ...mods[0].elearningIntroCourse,
        ...mods[1].elearningThemesCatalog,
        ...mods[2].elearningExtraThemes,
        ...mods[3].elearningManufacturingThemes,
        ...mods[4].elearningHealthcareThemes,
        ...mods[5].elearningTransportThemes,
        ...mods[6].elearningForestryThemes,
        ...mods[7].elearningFoodThemes,
        ...mods[8].elearningRetailThemes,
        ...mods[9].elearningHazardTypesTheme,
      ];
      const seen = new Set<string>();
      for (const theme of themes) {
        if (seen.has(theme.id)) continue;
        seen.add(theme.id);
        items.push({
          id: `edu-${theme.id}`,
          title: theme.title,
          subtitle: theme.description.slice(0, 60),
          category: 'education',
          // 業種・出典種別・レベルからも引けるよう keywords に補う（例「製造業 化学」）。
          keywords: [theme.sourceType, theme.level, theme.industry_detail ?? ''].filter(Boolean),
          url: `/e-learning?theme=${encodeURIComponent(theme.id)}#el-quiz`,
        });
      }
    }),

    // 教育コース（/education/<slug>＝特別教育・法定教育・労働衛生教育の 12 コース）。
    // 各コースは固有 title/description＋Course JSON-LD を持ち sitemap 収載済みの実在
    // indexable ページ（/education/tokubetsu/fullharness 等）だが、横断検索(/search・⌘K)
    // からは丸ごと 0 件だった＝「フルハーネス 特別教育」「足場 特別教育」「職長 教育」
    // 「腰痛 予防」「酸欠 特別教育」と現場語彙で自分に要る教育コースを打った現場ユーザー
    // （現場監督・一人親方・安全担当）が、講習形式・法令根拠を載せた専用ランディングへ
    // 検索経由で着けなかった発見性の穴（#561 等と同型）を是正。e-learning テーマ（/e-learning?theme=
    // ＝クイズ演習）とは別軸の「講習コースそのもの」の発見性であり URL も別。
    // 正本＝EDUCATION_CONTEXTS（slug↔ルート 1:1・title は各ページ TITLE と同値・型のみ import で
    // ブラウザ安全）。url は `/education/<slug>` で実在ページへ解決（下記 search-index.test.ts の
    // existsSync ガードで slug↔ページディレクトリの一致を機械固定＝幽霊URL 0）。
    // keywords は法令マッチ・事故マッチの現場語彙＋講習種別ラベルで、法令名/ハザード語/種別から着地。
    import('@/data/education-context').then(({ EDUCATION_CONTEXTS }) => {
      const typeLabel = (slug: string): string =>
        slug.startsWith('tokubetsu/')
          ? '特別教育'
          : slug.startsWith('hoteikyoiku/')
            ? '法定教育'
            : '労働衛生教育';
      for (const ctx of Object.values(EDUCATION_CONTEXTS)) {
        const label = typeLabel(ctx.slug);
        items.push({
          id: `education-course-${ctx.slug}`,
          title: ctx.title,
          subtitle: `${label}｜現場の安全教育コース`,
          category: 'education',
          keywords: Array.from(
            new Set(
              [label, ...ctx.lawMatch.keywords, ...(ctx.accidentMatch.keywords ?? [])].filter(
                Boolean
              )
            )
          ),
          url: `/education/${ctx.slug}`,
        });
      }
    }),

    // 用語集（@/data/glossary の 4 バッチ＝高意図の「○○とは」語を横断検索へ収載）。
    // ※ /glossary 本体に直書きされた基礎語は当班所有外のため対象外。読み・定義冒頭も
    //   subtitle に載せ、読み（かな）や定義語からのヒットと結果一覧での即答を可能にする。
    import('@/data/glossary').then(({ EXTRA_TERMS }) => {
      for (const t of EXTRA_TERMS) {
        items.push({
          id: `glossary-${t.term}`,
          title: t.term,
          subtitle: `${t.reading}　${t.definition.slice(0, 60)}`,
          category: 'glossary',
          keywords: [t.reading].filter(Boolean),
          url: `/glossary`,
        });
      }
    }),

    // FAQ（@/data/faqs の 4 バッチ＝高意図の疑問文クエリ「衛生管理者 何人」「SDS 交付 義務」
    // 「特別教育 オンライン」等を横断検索へ収載）。これまで FAQ 200問は /faq/[category] に
    // しか無く ⌘K・/search から 0 件で、用語(glossary=「○○とは」)とも別軸の質問インテント
    // が丸ごと欠落していた。各結果は回答冒頭を subtitle に載せ検索結果一覧で即答し、リンクは
    // カテゴリ一覧 /faq/<category>（sitemap 収載・自己canonical の実在ページ）へ寄せる＝
    // faq.category は law-system/management/chemical/health-education のいずれかで必ず解決
    // （幽霊リンク 0）。keywords に tags・関連法令を補い分類語・条番号からも引ける。
    // 個別 FAQ への深リンク（/faq/<category>#<id>）は FAQItem にアンカー＋hashオープンが要る＝
    // /faq ページ本文所有の UI 班マター（要・他班）のため今回はカテゴリ一覧へ寄せる（glossary と同方針）。
    import('@/data/faqs').then(({ ALL_FAQS }) => {
      for (const f of ALL_FAQS) {
        items.push({
          id: `faq-${f.id}`,
          // 質問文の頭に「Q. 」を付す（FAQ 結果である旨の慣用表記）。表示上の意味に加えて
          // ランキング上の意味も持つ＝概念名で始まる質問（例「就業制限（安衛法第61条）は…」）が
          // タイトル前方一致(65点)で当該条文のキーワード完全一致(55点＝articleTitle=就業制限)を
          // 上回り、bare な法令概念クエリの1位を FAQ が奪う退行（O8-a/T8 の locked 不変条件
          // 「就業制限」1位=安衛法61条）を防ぐ。頭に「Q. 」が入ると概念名は前方一致(65)ではなく
          // 部分一致(45)になり、権威ある条文本文が上位を保つ（FAQ は下位で引き続き発見可能）。
          title: `Q. ${f.question}`,
          subtitle: f.answer.slice(0, 80),
          category: 'faq',
          keywords: [...(f.tags ?? []), ...(f.relatedLaws ?? [])].filter(Boolean),
          url: `/faq/${f.category}`,
        });
      }
    }),

    // 安全標識（@/data/safety-signs の JIS Z 9101 準拠 5 分類＝禁止/警告/指示/安全状態/防火）。
    // 「立入禁止」「感電注意」「保護めがね着用」等の標識名は現場で頻用されるのに、これまで
    // 横断検索(/search・⌘K)から 0 件ヒットだった（用語・FAQ とも別軸＝視覚標識の直接照会）。
    // 各標識は既に sitemap 収載済みの実在詳細ページ /safety-signs/sign/<id> を持つが、
    // 発見手段が /safety-signs ハブの回遊のみだった発見性の穴を是正。url は詳細ページへ深リンク＝
    // 詳細 /safety-signs/sign/[id] の generateStaticParams が SAFETY_SIGNS 全件 id を解決し
    // 未知 id は notFound() で弾くため、収載集合＝解決集合で必ず着地する（幽霊URL 0）。
    // 名称(name)・英名(nameEn)・分類ラベル・関連法令（statute+article）・意味/用途語から引ける。
    import('@/data/safety-signs').then(({ SAFETY_SIGNS, SIGN_CATEGORIES }) => {
      const categoryLabel = new Map(SIGN_CATEGORIES.map((c) => [c.id, c.label]));
      for (const s of SAFETY_SIGNS) {
        const label = categoryLabel.get(s.category) ?? '安全標識';
        items.push({
          id: `sign-${s.id}`,
          title: s.name,
          subtitle: `${label}　${s.meaning}`.slice(0, 90),
          category: 'sign',
          keywords: [
            s.nameEn,
            label,
            ...s.relatedLaws.flatMap((r) => (r.article ? [r.statute, r.article] : [r.statute])),
          ].filter(Boolean),
          url: `/safety-signs/sign/${s.id}`,
        });
      }
    }),

    // 法改正記事（src/data/articles/*.json＝監修済みの法改正・実装ガイド解説）。
    // 正本 getPublishedArticleIndex は node:fs 依存でブラウザ非安全のため、client 検索は
    // ブラウザ安全な射影源 `@/lib/articles-search-source` から引く（本文除外の軽量エントリ・
    // drift ガードで実在ファイル集合と同期）。これまで法改正記事は /articles 一覧と
    // sitemap-articles.xml に載っているのに横断検索(/search・⌘K)から 0 件だった発見性の穴
    // （site-critique 01 S-1）を是正。url は /articles/<slug> 深リンク＝/articles/[slug] の
    // generateStaticParams が公開済み slug 全件を解決するため必ず着地する（幽霊URL 0）。
    // 時限公開（publishedAt が未来）の記事は実行時 now で除外する（正本と同セマンティクス）。
    import('@/lib/articles-search-source').then(({ getPublishedArticleSearchEntries }) => {
      for (const a of getPublishedArticleSearchEntries()) {
        items.push({
          id: `article-${a.slug}`,
          title: a.title,
          subtitle: a.description.slice(0, 90),
          category: 'article',
          // タグ・キーワードから引ける（例「熱中症 WBGT」「フルハーネス 墜落制止」）。
          keywords: [...a.tags, ...a.keywords].filter(Boolean),
          url: `/articles/${a.slug}`,
        });
      }
    }),

    // 機能・ツールの目的地ページ（FLAGSHIP_FEATURES 正本の射影）。これまで横断検索は
    // コンテンツレコードのみ収載し、サイネージ・KY用紙・化学物質RA・作業環境測定・事故DB…
    // の **機能ページそのもの** が 0 件ヒットだった（機能名を打っても目的地へ検索経由で
    // 着けない発見性の穴）。⌘K の空クエリ用ショートカット4件とは別に、検索対象として収載する。
    // url はベースパスで実在ルートへ解決（幽霊URL 0＝drift ガードで機械固定）。title=機能名で
    // 打鍵一致を狙い、subtitle=カード見出し/配下説明で 2 語 AND を補助する。
    import('@/lib/site-pages-search-source').then(({ getSitePageSearchEntries }) => {
      for (const p of getSitePageSearchEntries()) {
        items.push({
          id: p.id,
          title: p.title,
          subtitle: p.subtitle.slice(0, 90),
          category: 'feature',
          keywords: p.keywords,
          url: p.url,
        });
      }
    }),

    // 災害の型別 教育スライド（/education/hazard-slides/[slug]＝21分類。generateStaticParams
    // dynamicParams=false で収載集合＝解決集合＝幽霊URL 0）。「墜落 教育」「熱中症 スライド」
    // 「朝礼 ネタ 型」のような教育教材クエリで着地させる。
    import('@/lib/accidents/type-normalization').then(({ CANONICAL_HAZARD_TYPES }) => {
      items.push({
        id: 'hazard-slides-hub',
        title: '災害の型別 安全教育スライド',
        subtitle: '厚労省21分類の統計→原因→対策→クイズを自動生成。投影16:9・A4横印刷対応',
        category: 'feature',
        keywords: ['安全教育', 'スライド', '教材', '朝礼', '型別', '雇入れ時教育', '職長教育'],
        url: '/education/hazard-slides',
      });
      for (const t of CANONICAL_HAZARD_TYPES) {
        items.push({
          id: `hazard-slide-${t.slug}`,
          title: `${t.label}の安全教育スライド`,
          subtitle: '統計・多い原因・対策チェックリスト（根拠条文つき）・確認クイズの6枚構成',
          category: 'feature',
          keywords: [t.label, t.mhlwLabel, t.short, '安全教育', 'スライド', '対策', '教材'],
          url: `/education/hazard-slides/${t.slug}`,
        });
      }
    }),

    // 治療と仕事の両立支援 病態別ガイド（/treatment-work-balance/illness-guide/[illness]＝
    // がん/脳卒中/心疾患/糖尿病/メンタルヘルス/難病の6疾患。自己canonical・OGP付・PageJsonLd
    // の実在 indexable ページで sitemap 収載済み）。親ハブ /treatment-work-balance は FLAGSHIP
    // ナビ subItem として feature 収載済みだが、**疾患別の6ガイドは横断検索から 0 件**だった＝
    // 「がん 両立支援」「脳卒中 復職」「糖尿病 就業配慮」と打った安全担当/産業医が疾患名で
    // 個別ガイドへ検索経由で着けない発見性の穴を是正（#561 等と同型・目的地ページ扱いで feature へ）。
    // url は generateStaticParams（dynamicParams=false）が ILLNESS_CATEGORIES 全 id を解決＝
    // 収載集合＝解決集合で必ず着地する（幽霊URL 0）。関連法令は 条文の権威クエリを汚さぬよう
    // keywords へ入れない（保護具/機能ページと同方針）。
    import('@/data/illness-considerations').then(({ ILLNESS_CATEGORIES }) => {
      for (const c of ILLNESS_CATEGORIES) {
        items.push({
          id: `illness-guide-${c.id}`,
          title: `${c.shortLabel}と仕事の両立支援ガイド`,
          subtitle: c.summary.slice(0, 90),
          category: 'feature',
          // 疾患名（正式名/短縮名）・両立支援の頻用語・病態別リスク（症状語で引ける）から着地。
          keywords: [
            c.label,
            '両立支援',
            '治療と仕事の両立支援',
            '復職',
            '就業配慮',
            '労務配慮',
            ...c.riskHighlights,
          ].filter(Boolean),
          url: `/treatment-work-balance/illness-guide/${c.id}`,
        });
      }
    }),

    // 法令ナビ 分野ページ（/law-navi/topics/[id]＝分野・機械・作業→条文群の着地面。
    // docs/horei-navi-foundation-2026-07-11 §2-3）。診断 2026-07-11 で「フォークリフト」は
    // 通達タイトルの前方一致が条文を押し流し、「爪のやつ」は 0 件だった。分野ページを
    // title=代表名（完全一致100点）+ keywords=現場語 alias（部分一致は variant.includes(k)
    // を許すエンジン仕様＝「爪のやつ」⊇「爪」で当たる）で収載し、俗称からの着地面にする。
    // url は generateStaticParams（dynamicParams=false）が LAW_NAVI_TOPICS 全 id を解決＝
    // 幽霊URL 0。目的地ページ扱いで feature（機能）カテゴリ（疾患別ガイドと同方針）。
    import('@/data/law-navi/topics').then(({ LAW_NAVI_TOPICS }) => {
      for (const t of LAW_NAVI_TOPICS) {
        items.push({
          id: `law-navi-topic-${t.id}`,
          title: t.name,
          subtitle: `法令ナビ｜${t.fieldGroup}の条文${t.articles.length}件＋通達${t.circularIds.length}件を体系順に`,
          category: 'feature',
          keywords: [...t.aliases, t.fieldGroup, '法令ナビ', ...t.articles.map((a) => a.articleNum)],
          url: `/law-navi/topics/${t.id}`,
        });
      }
    }),

    // 別表の意味インデックス（/law-navi/beppyo#id＝「別表第3=特定化学物質」の逆引き。
    // 同 §2-5）。診断 2026-07-11 で「別表第3」は粉じん則27条等の言及条文しか出ず、
    // 「何の表か」に着地できなかった。label（別表第3）と意味名・俗称 keywords で収載し、
    // 条番号パーサの別表正規化（別表第三→別表第3）と合わせて表記ゆらぎも吸収する。
    // 法令内容そのものなので category は law（条文と同じ権威ティア）。
    import('@/data/law-navi/beppyo').then(({ BEPPYO_ENTRIES }) => {
      for (const b of BEPPYO_ENTRIES) {
        items.push({
          id: `law-navi-beppyo-${b.id}`,
          title: `${b.lawShort} ${b.label}（${b.name}）`,
          subtitle: b.summary.slice(0, 90),
          category: 'law',
          keywords: [b.label, b.name, b.lawShort, ...b.keywords],
          url: `/law-navi/beppyo#${b.id}`,
        });
      }
    }),
  ]);

  cachedIndex = items;
  return items;
}
