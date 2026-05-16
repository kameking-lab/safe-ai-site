import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "第三者目線 激辛監査レポート 2026-05-16",
  description:
    "安全AIポータル(www.anzen-ai-portal.jp) を第三者目線で激辛レビューした監査レポート。8カテゴリ×通し番号付き課題リスト。社内採用/不採用判断用。",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null as unknown as string },
};

const META = {
  auditId: "harsh-third-party-2026-05-16",
  auditDate: "2026-05-16",
  baseMainSha: "fd8e9d7",
  reviewedPages: 38,
  dataSamples: { exam: "33 files / 23,501 lines", accidents: "5,026件中preliminary 16件", chemicals: "50抜粋", articles: "10本", circulars: "1,069件", glossary: "250語" },
  totalFindings: 49,
  countByPriority: { P0: 2, P1: 13, P2: 22, P3: 12 },
  countByCategory: { A: 8, B: 8, C: 7, D: 4, E: 1, F: 11, G: 6, H: 4 },
  estimateHours: { P0: 4, P1: 80, P2: 180, P3: 90 },
};

type Finding = {
  id: string;
  title: string;
  priority: "P0" | "P1" | "P2" | "P3";
  effortHours: number;
  url?: string;
  evidence: string;
  recommendation: string;
  decision?: "TBD";
  batch?: number;
  status?: string;
  statusNote?: string;
};

const FINDINGS_A: Finding[] = [
  {
    id: "A-001",
    title: "「過去問クイズ」表示と実装(創作問題)の不一致 — 誤認誘導のおそれ",
    priority: "P1",
    effortHours: 6,
    batch: 1,
    url: "/exam-quiz, /quiz",
    evidence:
      "web/src/data/exam-questions/skill-training.ts に明示コメント: 「No verbatim copy of past-exam text. Each item is an original write-up with reference law citations.」一方UIは「過去問クイズ」と表示。オーナー方針「創作過去問・予想問題系コンテンツはNG」と矛盾。23,501行のコードに同様構造。",
    recommendation:
      "(a) UI見出しを「練習問題」「学習用問題」に改称、(b) 各カテゴリトップに「公式試験問題の逐語コピーではなく、出題範囲を踏まえた学習用問題」と明示、(c) 実際の公表過去問は厚労省・JISHA・各試験運営機関の公式ページへの外部リンクに限定。",
    status: "resolved-pr-188",
  },
  {
    id: "A-002",
    title: "exam-quiz ページに出題ソース注記なし",
    priority: "P1",
    effortHours: 3,
    batch: 1,
    url: "/exam-quiz",
    evidence:
      "ページ本体に「出題は当サイト独自の学習用問題」「実試験の過去問とは異なる」旨の注記が存在しない。利用者は「過去問」を実際の試験問題と誤認する。",
    recommendation:
      "ページ上部に薄い情報バーで「※当サイトの問題は学習用に作成したものであり、実際の試験で出題されたものではありません」を常時表示。",
    status: "notation-fixed-and-inventory-completed-pr-189",
  },
  {
    id: "A-003",
    title: "/quiz と /exam-quiz の機能重複",
    priority: "P2",
    effortHours: 4,
    url: "/quiz, /exam-quiz",
    evidence:
      "sitemap・トップナビ両方に存在。/quiz は /exam-quiz への redirect か別の問題集か不明瞭。利用者の動線が分散。",
    recommendation:
      "/quiz を 301 リダイレクトで /exam-quiz に統合(または逆)。canonical を統一。",
  },
  {
    id: "A-004",
    title: "ホームのキャッチコピー「現場の安全を、AIで変える」が過度な期待値設定",
    priority: "P2",
    effortHours: 1,
    url: "/",
    evidence:
      "実態はテンプレートベース・RAG中心。AI性能を主張しすぎ。プロのコンサル/労務担当者は「AIで現場安全が変わる」と読むと過剰宣伝と感じる。",
    recommendation:
      "「現場安全の実務を、データで支える」「安衛法・事故DB・KYを1か所に」など実態に即した訴求に変更。",
  },
  {
    id: "A-005",
    title: "「個人運営の研究プロジェクト」表記と機能(LMS β/Stripe/DPA/API-docs)の体裁不整合",
    priority: "P1",
    effortHours: 6,
    batch: 3,
    url: "/lms, /dpa, /api-docs, /pricing",
    evidence:
      "footer等で「個人運営の研究プロジェクト」と明記しながら、LMS事前登録β、Stripe料金プレースホルダ、DPAページ「独立後3ヶ月以内」、API-docs「Phase 1独立後」など、企業向けプロダクトの体裁を装う未完成ページが多数。",
    recommendation:
      "未稼働の企業向けページ(LMS/DPA/API-docs/pricing)を一律に「準備中」「法人化後に提供予定」と明示するか、本リリース前は非公開化(noindex+メニュー除外)。",
  },
  {
    id: "A-006",
    title: "/handover ページが外部公開されている(内部用ページの露出疑い)",
    priority: "P2",
    effortHours: 1,
    url: "/handover",
    evidence:
      "WebFetch結果「「引き継ぎ書」タイトルのみで、コンテンツが不明。読み込み中状態表示」「顧客向けの安全AIポータルに「引き継ぎ書」は一般的でない」。内部用語の外部露出が信頼性を毀損。",
    recommendation:
      "/handover を非公開化(noindex+ナビ除外)、または /admin/ 配下に移動。",
  },
  {
    id: "A-007",
    title: "全記事(10本)の publishedAt が 2026-04-28 で統一 — 一括生成感",
    priority: "P2",
    effortHours: 3,
    url: "/articles",
    evidence:
      "web/src/data/articles-index.json: 10本すべて publishedAt: 2026-04-28, lastReviewedAt: 2026-04-28。実際の執筆/公開日が反映されていない。コンサルブランドとしての連載感が出ない。",
    recommendation:
      "実際の執筆日を反映し、各記事の publishedAt を分散。最新記事の更新を継続(月1ペース)。",
    status: "resolved-pr-191-merged",
    statusNote:
      "Content quality cleanup PR で publishedAt を 2026-04-28 → 2026-05-12 に分散済。詳細: /audits/content-quality-cleanup",
  },
  {
    id: "A-008",
    title: "機能数誇示(「23機能」「33法令」「5,026事例」)が個人運営規模と乖離",
    priority: "P3",
    effortHours: 2,
    url: "/, /features",
    evidence:
      "ホームと/featuresで網羅性をアピールしているが、個人運営「研究プロジェクト」表記と量的訴求が逆向きの印象。プロ目線では「数より深さ」を見たい。",
    recommendation:
      "数値訴求を抑え、「メイン3機能(/chatbot, /accidents-reports, /strategy/plan-generator)に集中」のメッセージに整理。",
  },
];

const FINDINGS_B: Finding[] = [
  {
    id: "B-001",
    title: "2025年事故事例が「速報統計から導出した代表パターン」=実質創作 — preliminary バッジでは伝わりにくい",
    priority: "P1",
    effortHours: 8,
    batch: 4,
    url: "/accidents-reports, /accidents",
    evidence:
      "web/src/data/mock/real-accident-cases-2025-preliminary.ts ヘッダコメント:「個票ではなく、業種別・事故型別集計値(速報)から統計的に導出した『代表パターン』」。UI上は他の実事例と並ぶ。「速報」バッジでは「創作事例である」ことが伝わらない。",
    recommendation:
      "代表パターン事例には専用バッジ「想定例(統計に基づく合成)」を新設。実報告事例と明確に視覚分離。確定値(R07個票)公開後に置換するロードマップを当該ページに常時表示。",
    status: "resolved-pr-audit-p1-priority-batch",
    statusNote:
      "事例カードのバッジを「速報」→「想定例(速報基準)」に改称し、aria-label/title で「実報告ではなく統計に基づく合成」を明示。/accidents-reports ハブに AccidentsPreliminaryBanner を常時表示し、R07確定個票公開後に置換予定のロードマップを可視化。メタ内訳キャプションも『想定例 N件』+ 確定値置換予定の説明に更新。",
  },
  {
    id: "B-002",
    title: "化学物質DB件数の表示と実装の乖離(「1,046+」訴求 vs ファイル抜粋50)",
    priority: "P2",
    effortHours: 4,
    url: "/chemical-database",
    evidence:
      "web/src/data/mock/chemical-substances-db.ts コメント:「主要50物質を抜粋したβ版」。一方ホーム/サイト全体では3,000物質や1,046+物質といった訴求が混在。表示根拠と実装の整合性が不透明。",
    recommendation:
      "現時点で詳細解説のある50物質、リスト掲載のみのN物質、未収録のN物質を分けて明示。「収録: 50物質詳細 + 約3,000物質リスト」と段階表示。",
    status: "resolved-pr-audit-b-category",
    statusNote:
      "chemical-substances-db.ts の JSDoc を書き換え、本ファイルが『MHLW 3,000物質規制データセットへの専門解説 50物質サブセット』であることと、MHLW 全データは src/data/chemicals-mhlw/compact.json と src/lib/mhlw-chemicals.ts に存在することを明示。/chemical-database ページのタイトル『MHLW {count}物質 ＋ 専門解説50物質』は既に二層構造を提示しており、データ整備の最新状況(3,000物質マージ済)と合致。",
  },
  {
    id: "B-003",
    title: "用語集 — 「女性活躍と安全衛生」「リスクコミュニケーション」など定義にAI生成感",
    priority: "P2",
    effortHours: 6,
    url: "/glossary",
    evidence:
      "WebFetch評価:「定義が流暢すぎる(典型的な行政文体)」「教科書的」。政策解釈の項目に標準化感が強い。",
    recommendation:
      "政策解釈系の用語は厚労省・JISHA等の公式定義から引用し、出典リンクを併記。AI生成感のある独自要約を再構成。",
    status: "resolved-pr-191-merged",
    statusNote:
      "Content quality cleanup PR でリスクコミュニケーション・女性活躍と安全衛生に法令根拠(労基法第65/67/68条, 女性労働基準規則第2/3条, 安衛法第57条, PRTR法)+環境省出典を追加済。",
  },
  {
    id: "B-004",
    title: "熱中症R7コンプライアンス — 施行日表記揺れ「2025年4月1日」と「令和7年6月施行義務化」",
    priority: "P2",
    effortHours: 2,
    url: "/heat-illness-prevention, /heat-illness-prevention/r7-compliance",
    evidence:
      "WebFetch評価:「安衛則612条の2改正への言及あり。ただし施行日は『2025年4月1日』記載、評価文では『令和7年6月施行義務化』と別表記。統一性確認が必要」。",
    recommendation:
      "施行日を一本化(令和7年=2025年で日付確認)。本サイト全体で和暦/西暦の併記ルールを統一。",
    status: "resolved-pr-audit-b-category",
    statusNote:
      "安衛則第612条の2 改正の正式な施行日は厚生労働省令第86号により令和7年6月1日(2025-06-01)。R7_EFFECTIVE_FROM を `2025-06-01` に修正し、R7_EFFECTIVE_FROM_JP=`令和7年6月1日` を併設。/heat-illness-prevention のハブ・/r7-compliance ページ・通達3件のタイトル(expanded-circulars-batch-2-heat-mental.ts mhlw-notice-0920/0921/1370)を令和7年6月1日施行に統一。法令メタデータ(law-metadata.ts, anzen-eisei-kisoku.ts)と必修教材(/education/roudoueisei/necchu)は既に R7.6.1 で記載済。",
  },
  {
    id: "B-005",
    title: "記事10本のAI生成感(典型行政文体)・著者明示なし",
    priority: "P2",
    effortHours: 12,
    url: "/articles",
    evidence:
      "WebFetch評価:「義務化された熱中症対策の具体的内容など、行政文体の典型的表現」「著者・監修者明示なし。『安全AIポータル 専門家チームによる設計』と組織名のみで個人名や資格情報がない」。",
    recommendation:
      "(a) オーナー名(労働安全衛生コンサルタント登録番号260022)を監修者として明示、(b) 各記事末尾に出典リンク(厚労省通達番号・告示番号)、(c) AI生成感のある段落を実体験/事例ベースに書き換え。",
    status: "resolved-pr-191-merged",
    statusNote:
      "Content quality cleanup PR で全 10 記事の本文を条文出典付きで全面書き換え。著者を「安全AIポータル 編集部(労働安全衛生コンサルタント監修)」に変更。氏名公開はオーナー方針(/about: 氏名は請求により開示)を尊重し折衷案を採用。",
  },
  {
    id: "B-006",
    title: "用語集 — 「有機溶剤」「有機溶剤中毒」、「作業管理」「作業環境管理」など重複",
    priority: "P3",
    effortHours: 3,
    url: "/glossary",
    evidence:
      "WebFetch評価:「重複事例: 『有機溶剤』と『有機溶剤中毒』が並立。『作業管理』『作業環境管理』が分割」。",
    recommendation:
      "概念重複を統合または相互参照リンクで関係性を明示。",
    status: "resolved-pr-191-merged",
    statusNote:
      "Content quality cleanup PR で 有機溶剤(物質クラス) ↔ 有機溶剤中毒(疾患)、作業環境管理 ↔ 作業管理 を相互参照化。各エントリに具体的対策と関連用語のリンクを追加。",
  },
  {
    id: "B-007",
    title: "ダイバーシティページ — 統計値「リスクは通常の2〜4倍」等、出典なき断定",
    priority: "P2",
    effortHours: 4,
    url: "/diversity, /diversity/*",
    evidence:
      "WebFetch評価:「『リスクは通常の2〜4倍』といった統計値に出典なし」「SOGIハラの定義で『該当しうる』の曖昧性が法的主張には弱い」。",
    recommendation:
      "統計値はすべて厚労省・内閣府・各種白書からの引用とし出典URL併記。曖昧な「該当しうる」表現は「個別判断には専門家相談が必要」と書き直す。",
    status: "resolved-pr-audit-b-category",
    statusNote:
      "/diversity の『加齢に伴うリスク』に厚労省『令和5年労働災害発生状況』と『エイジフレンドリーガイドライン』(令和2年3月16日 基安発0316第1号)を出典として明記し、60歳以上の千人率は20歳代の約2倍・転倒事故は若年層の3〜4倍という根拠を併記。『SOGIハラの定義』は令和2年厚生労働省告示第5号(パワハラ防止指針)を直接引用し、性的指向・性自認に関する侮辱的言動およびアウティングが『精神的な攻撃』『個の侵害』に該当することを明示。曖昧な『該当しうる』表現を撤廃。",
  },
  {
    id: "B-008",
    title: "ダイバーシティ・多言語翻訳の自動生成感",
    priority: "P2",
    effortHours: 8,
    url: "/diversity/foreign-workers, /foreign-workers/*",
    evidence:
      "WebFetch評価:「4言語フレーズ表の 『Dừng lại! Nguy hiểm!』や『小心夹手』は文語的で実用性に欠ける」「翻訳監修:母語話者(在日10年以上)と明記しながら、自動翻訳の痕跡(敬語の過剰、直訳的構文)が残存」。",
    recommendation:
      "母語話者(またはネイティブ翻訳サービス)による再翻訳。翻訳監修者の実名公開(本人同意が取れる場合)。",
    status: "resolved-pr-audit-b-category",
    statusNote:
      "/diversity の多言語フレーズ表ヘッダを『参考訳』に改題し、辞書・公式安全衛生掲示の対訳と機械翻訳を参考に編集部が作成した参考訳である旨を amber バナーで明示。検証根拠が薄い『翻訳監修：母語話者（在日10年以上）』表記を撤廃し、母語話者監修・専門翻訳サービスへの差し替えを2026年下期予定としてロードマップ化。現場常用前の母語話者確認(同僚・技能実習生支援団体・各国大使館労働相談窓口)を促す注意書きを追加。",
  },
  {
    id: "B-009",
    title: "community-cases.ts — 「現場の声(UGC)」と称する運営者作成シードデータ(虚偽UGC表示)",
    priority: "P2",
    effortHours: 1,
    url: "/community-cases, /qa-knowledge",
    evidence:
      "web/src/data/mock/community-cases.ts JSDoc:「現場の声（UGC）シードデータ。公開デモ用に、運営側が用意した『実体験ベース』の事例。」。'UGC' はユーザー生成コンテンツを意味するが、実態は運営者が作成した4件の事例。authorAlias(「匿名のコアラ#3421」等)も架空。/qa-knowledge の DESCRIPTION がさらに「現場担当者から寄せられた」と虚偽記載することで二重の誤認を生じさせていた。",
    recommendation:
      "JSDoc から UGC・シードデータ表現を削除し「operator-authored example entries, NOT real user submissions」と明記。",
    status: "resolved-pr-194",
    statusNote:
      "refactor/remove-brand-damaging-content PR#194 でJSDocを英語コメントに書き換え、operator-authored example entries であることを明示。E-003(/qa-knowledge DESCRIPTION)と連動して解消。",
  },
];

const FINDINGS_C: Finding[] = [
  {
    id: "C-001",
    title: "chatbot — 入力例・プロンプト案なし、初心者ガイダンス不足",
    priority: "P2",
    effortHours: 4,
    url: "/chatbot",
    evidence:
      "WebFetch評価:「ページ上にチャット機能があるが、入力例やプロンプト案は見当たらない。初心者向けガイダンス不足」。",
    recommendation:
      "チャット入力欄上に「例: 安全管理者の選任要件は?」など3-5件のサンプル質問チップを配置。",
  },
  {
    id: "C-002",
    title: "ky — 音声入力(CLAUDE.md優先課題)未実装、4ラウンド法対応不明",
    priority: "P2",
    effortHours: 16,
    url: "/ky",
    evidence:
      "CLAUDE.md優先課題5:「KY用紙の完成(音声入力・PDF出力)」のうち音声入力が未実装。4ラウンドKYTとの対応不明。WebFetch評価:「4ラウンド法など本格的KYTとの整合性: 言及なし」。",
    recommendation:
      "(a) Web Speech API で音声入力をMVP実装、(b) 4ラウンド法テンプレ(発見→絞り込み→対策→決定)モードを追加、(c) どの方式かをUI上で選択。",
  },
  {
    id: "C-003",
    title: "signage — ピン配置0件、装飾過多で実用性低",
    priority: "P3",
    effortHours: 12,
    url: "/signage",
    evidence:
      "WebFetch評価:「ピン配置0件は未実装同然」「気象警報とニュースRSSはあるが、『現場リスクと安全要点』の実質内容が見当たらない」「装飾が目立つわりにメイン情報が薄い」。",
    recommendation:
      "想定運用シナリオ(朝礼前/休憩時間/退場時)を3パターンに整理し、それぞれデフォルトコンテンツを用意。または機能を縮小し「気象警報+本日のKY」のみに絞る。",
  },
  {
    id: "C-004",
    title: "動線階層が深い(法改正→通達→用語集の散在)",
    priority: "P3",
    effortHours: 8,
    url: "/laws, /circulars, /law-search, /law-hierarchy, /glossary",
    evidence:
      "WebFetch評価:「法改正・通達・用語集など関連機能の散在」。検索/法令体系/通達/用語集/FAQ など似た機能が分散。",
    recommendation:
      "「法令まわり」を1ハブページに集約(現状の/lawsを統合ハブ化)。サブ機能はタブ切替か、ハブからの導線でアクセス。",
  },
  {
    id: "C-005",
    title: "chatbot 免責表示位置 — チャット画面そのものでの警告表示が不明確",
    priority: "P2",
    effortHours: 2,
    url: "/chatbot",
    evidence:
      "WebFetch評価:「やや不十分。法令説明ページ下部に4項目記載。チャット画面そのものでの警告表示の有無は不確認」。",
    recommendation:
      "チャット送信ボタン直下に「本回答は法的助言ではありません。具体判断は専門家へ」を常時表示(モバイル含む)。",
  },
  {
    id: "C-006",
    title: "safety-diary — KY/リスク予測との機能分担曖昧、永続化方式不明",
    priority: "P2",
    effortHours: 6,
    url: "/safety-diary",
    evidence:
      "WebFetch評価:「KY/化学物質RA/事故DBなど外部ツールが豊富で、日誌との機能分担が曖昧。日誌単体での価値が埋没」「データ永続化: ページ内に言及なし。クラウドDB保存か端末ローカルか不明」。",
    recommendation:
      "(a) 日誌は localStorage 限定であることを明示、(b) KY/化学物質RA への自動転記をUSP化、(c) 多拠点運用を求める利用者へはLMSへの導線(または機能削除)。",
  },
  {
    id: "C-007",
    title: "/risk ページが「気象警報マップ」になっている — リスクアセスメントページ期待との乖離",
    priority: "P2",
    effortHours: 4,
    url: "/risk",
    evidence:
      "WebFetch評価:「気象警報マップセクション」がメインコンテンツ。利用者は「リスクアセスメント」を期待して訪問する可能性が高く、見出しと内容のミスマッチ。",
    recommendation:
      "/risk を「リスクアセスメント・予測ハブ」に再構成し、気象警報は /risk/weather や /weather に切出し。または /risk → /risk-prediction を301化。",
  },
];

const FINDINGS_D: Finding[] = [
  {
    id: "D-001",
    title: "robots.txt 重大バグ — Disallow: /strategy がメイン機能 /strategy/plan-generator をブロック",
    priority: "P0",
    effortHours: 1,
    url: "/strategy/plan-generator (sitemap), /robots.txt",
    evidence:
      "web/src/app/robots.ts:disallow に「/strategy」(末尾スラなし)が含まれ、sitemap.ts には /strategy/plan-generator が priority 0.8 で掲載。メイン3機能の1つが robots でクロール拒否される深刻な矛盾。本日18 PR連投の中で見落とされた可能性。",
    recommendation:
      "robots.ts の Disallow から「/strategy」を削除、または「/strategy/dev」など特定パスのみに絞る。robots.txt と sitemap の整合性を CI で検証(URL の重複検査スクリプト)。",
    status: "resolved-pr-188",
  },
  {
    id: "D-002",
    title: "全記事(10本) publishedAt = 2026-04-28(未来日付)で公開 — 信頼性低下",
    priority: "P2",
    effortHours: 2,
    url: "/articles",
    evidence:
      "現在日 2026-05-16 に対し記事 publishedAt は -2026-04-28 で過去日(正)。10本すべて同日付は不自然。",
    recommendation:
      "実際の執筆日を反映、または「2026-04-28 一括公開」を文中に注記。",
  },
  {
    id: "D-003",
    title: "features 23機能とメインナビの重複露出",
    priority: "P2",
    effortHours: 6,
    url: "/features, /, ナビ全般",
    evidence:
      "ホーム > 主要機能、/features > 全機能、左サイドメニュー、関連リンクなど同じ機能が4-5箇所に重複表示。",
    recommendation:
      "メイン3機能をホームで強調し、それ以外は /features に集約。サイドメニューは業種別/タスク別の縦軸で再構成。",
  },
  {
    id: "D-004",
    title: "/faq、/qa-knowledge、/articles の機能/コンテンツ類似",
    priority: "P2",
    effortHours: 4,
    url: "/faq, /qa-knowledge, /articles",
    evidence:
      "/faq=200問の網羅的Q&A、/qa-knowledge=ユーザー投稿型(掲載1件のみ)、/articles=10本記事。利用者から見て分担が不明瞭。",
    recommendation:
      "/qa-knowledge を /faq の1セクションに統合(投稿は1件と少ない)。/articles はテーマ記事として独立維持。",
  },
  {
    id: "D-005",
    title: "seo-articles JSONL — 4テンプレートサブセット202本がAI量産・出典なし(Helpful Content違反リスク)",
    priority: "P1",
    effortHours: 2,
    url: "web/src/data/seo-articles/ (seasonal/legal/subsidies/international)",
    evidence:
      "web/src/data/seo-articles/seo-articles-{seasonal,legal,subsidies,international}.jsonl の202本は、業種・季節を入れ替えるだけの定型テンプレート本文。記事ごとのMHLW通達番号・事例IDなし、テンプレ免責「本記事はテンプレートベースで自動生成された情報整理です」を明記。コンサルタント監修ポータルとしてはHelpful Content違反およびプログラマブルSEOスパムのリスク。Draft PR #182 audit doc D-1 に該当。",
    recommendation:
      "circulars/accidents/chemicals(MHLW実データ紐付け済、1,758本)は維持し、テンプレート4サブセットは削除。これらは公開ルート・サイトマップに未接続のため301は不要。",
    status: "resolved-pr-196",
    statusNote:
      "refactor/archive-ai-generated-articles PR#196 で4 JSONLファイル(202本)を削除、index.jsonに archived ブロックを追加、generator/audit scripts を残3カテゴリ(circulars/accidents/chemicals)のみに更新。",
  },
];

const FINDINGS_E: Finding[] = [
  {
    id: "E-001",
    title: "Lighthouse Performance — 過去PR#135で監査済み、引き続き改善余地",
    priority: "P3",
    effortHours: 16,
    url: "全ページ",
    evidence:
      "PR#135 (docs/regression-audit/lighthouse) で実施。本タスクは別軸のため再計測せず。直近PR連投でTBT/LCP の回帰可能性。",
    recommendation:
      "本audit外スコープ。次回Lighthouse監査で再評価。",
  },
  {
    id: "E-002",
    title: "/education — 未リリースサービスに「¥50,000〜の明朗会計」表記(景表法・優良誤認リスク)",
    priority: "P2",
    effortHours: 1,
    url: "/education",
    evidence:
      "web/src/app/(main)/education/EducationContent.tsx の FORMATS に price フィールド(¥50,000〜/¥150,000〜/¥80,000〜)、DESCRIPTION に「¥50,000〜の明朗会計」。2026年秋リリース予定の未稼働サービスに具体的料金を掲示することは景品表示法(優良誤認)の解釈余地あり。個人運営ポートフォリオとの矛盾も大きい。",
    recommendation:
      "価格表記を全削除。「詳細はお問い合わせください」に置換。serviceSchema の priceFrom も除去。",
    status: "resolved-pr-194",
    statusNote:
      "refactor/remove-brand-damaging-content PR#194 で価格表記・priceFrom・セクション見出し「〜と料金」を完全削除。料金欄をお問い合わせ誘導に変更。",
  },
  {
    id: "E-003",
    title: "/qa-knowledge — 「現場担当者から寄せられた」虚偽ヘッダー(FAQPage構造化データ誤帰属)",
    priority: "P2",
    effortHours: 1,
    url: "/qa-knowledge",
    evidence:
      "web/src/app/(main)/qa-knowledge/page.tsx DESCRIPTION:「現場担当者から寄せられた質問と」。実際のデータソースは COMMUNITY_CASES_SEED(運営者が用意した4件のシードデータ、authorAlias は仮名)。FAQPage 構造化データも同シードから生成されており、実質的に虚偽の質問者帰属を含む。",
    recommendation:
      "DESCRIPTION から「現場担当者から寄せられた」を削除し、実態に即した表現に変更。",
    status: "resolved-pr-194",
    statusNote:
      "refactor/remove-brand-damaging-content PR#194 で DESCRIPTION を「労働安全に関するQ&Aをまとめたナレッジベース。コンサルタントへの質問も受け付けています。」に変更。",
  },
];

const FINDINGS_F: Finding[] = [
  {
    id: "F-001",
    title: "/lms — 2026年秋公開予定のウェイトリスト、現状機能なし",
    priority: "P1",
    effortHours: 2,
    batch: 2,
    url: "/lms",
    evidence:
      "WebFetch評価:「未稼働。2026年秋公開予定。プレビューはモック画面のみ」。法人向けプロダクトの体裁を装う未完成ページが信頼を毀損。",
    recommendation:
      "本リリースまで /lms はナビから除外、noindex化。「準備中: LMS機能は法人化後にβ提供予定」とトップに小さく案内のみ。",
    status: "resolved-pr-audit-p1-priority-batch",
    statusNote:
      "ページ metadata に robots:{index:false,follow:false,nocache:true} を追加、canonical を解除。app-shell サイドナビと features-catalog から LMS エントリを除外。sitemap.ts および robots.ts Disallow に追加。ページ本体は残し、ウェイティングリスト先行受付のみ継続。",
  },
  {
    id: "F-002",
    title: "/api-docs — 実APIなし、ロードマップのみ(個人運営に不要)",
    priority: "P1",
    effortHours: 2,
    batch: 2,
    url: "/api-docs",
    evidence:
      "WebFetch評価:「実際のAPIなし。フェーズ1は『独立後3ヶ月』という未定の時間軸」「実装前の計画書をユーザー向けに掲載する意味は限定的」。",
    recommendation:
      "ページ削除(または /admin 配下に移動)。法人化・API提供開始時に再公開。",
    status: "resolved-pr-audit-p1-priority-batch",
    statusNote:
      "ページ metadata に robots:{index:false,follow:false,nocache:true} を追加、canonical/openGraph を解除。sitemap.ts および robots.ts Disallow に追加。直接 URL を知っている関係者向けにロードマップは閲覧可能なまま残す（削除は外部リンク破壊リスクのため見送り）。",
  },
  {
    id: "F-003",
    title: "/handover — 内部用ページが外部公開",
    priority: "P1",
    effortHours: 1,
    batch: 2,
    url: "/handover",
    evidence:
      "A-006 と同根。外部利用者向け価値ゼロ。",
    recommendation:
      "削除または /admin 配下に移動。",
    status: "resolved-pr-audit-p1-priority-batch",
    statusNote:
      "棚卸完了: ページ metadata は既に noindex 設定済 (web/src/app/(main)/handover/page.tsx:8) かつ HANDOVER_GATE_KEY によるキー認証で、未認証アクセスは notFound() を返す。ナビ・サイトマップ未掲載も確認済。本バッチでは robots.ts Disallow に /handover を追加し、クローラ側でも明示拒否。",
  },
  {
    id: "F-004",
    title: "/pricing — 「準備中」5プラン構想記載のみ、実装ゼロ",
    priority: "P1",
    effortHours: 2,
    batch: 2,
    url: "/pricing",
    evidence:
      "WebFetch評価:「料金プランは現在準備中。決済方法の情報もない」。",
    recommendation:
      "実課金開始までナビから除外+noindex。短い「料金は法人化後に提示」の1ページに縮小。",
    status: "resolved-pr-audit-p1-priority-batch",
    statusNote:
      "棚卸完了: PAID_MODE が無効な研究プロジェクト期間中、/pricing は (1) metadata で robots:{index:false,follow:false}、(2) sitemap.ts の PAID_ONLY フィルタで除外、(3) app-shell および footer から非掲載、(4) 本体表示は『料金プランは現在準備中です』の縮小版に切替済。M6 課金事業再開時に NEXT_PUBLIC_PAID_MODE=true で全UIが復活する設計。",
  },
  {
    id: "F-005",
    title: "/signage — ピン配置0件、実装が形骸化",
    priority: "P2",
    effortHours: 8,
    url: "/signage",
    evidence:
      "C-003 と同根。",
    recommendation:
      "機能を「気象警報+本日のKY」MVPまで縮小、または非公開化。",
  },
  {
    id: "F-006",
    title: "/quiz と /exam-quiz の重複",
    priority: "P2",
    effortHours: 2,
    url: "/quiz, /exam-quiz",
    evidence:
      "A-003 と同根。",
    recommendation:
      "301統合。",
  },
  {
    id: "F-007",
    title: "/qa-knowledge — 掲載事例1件のみ、ナレッジベースとして機能していない",
    priority: "P2",
    effortHours: 3,
    url: "/qa-knowledge",
    evidence:
      "WebFetch評価:「確認可能な公開事例は1件のみ。母集団が不足しており、実質的な参考資料ライブラリとしての機能はまだ発展途上段階」。",
    recommendation:
      "/faq に統合、または最低10事例集まるまで非公開。",
  },
  {
    id: "F-008",
    title: "/accidents、/accidents-analytics、/accidents-reports の3分散",
    priority: "P2",
    effortHours: 6,
    url: "/accidents, /accidents-analytics, /accidents-reports",
    evidence:
      "WebFetch評価:「業種別 事故分析レポートと機能的に重複する可能性が高い。両者の差別化が明示されていない」。",
    recommendation:
      "/accidents をハブ化、サブセクション(/accidents/reports, /accidents/analytics) に整理。",
  },
  {
    id: "F-009",
    title: "/resources — 政府資料のリンク集に過ぎず付加価値なし",
    priority: "P2",
    effortHours: 4,
    url: "/resources",
    evidence:
      "WebFetch評価:「単なるディレクトリ機能に過ぎない」「政府資料のリンク集に過ぎず、付加価値ほぼなし」。",
    recommendation:
      "削除、または分類タグ・解説コメントを付与して付加価値化。",
  },
  {
    id: "F-010",
    title: "/safety-diary — 機能位置づけ曖昧、KY/RA との分担不明",
    priority: "P2",
    effortHours: 4,
    url: "/safety-diary",
    evidence:
      "C-006 と同根。",
    recommendation:
      "KY/RA への自動転記をUSP化、または削除。",
  },
  {
    id: "F-011",
    title: "/goods — 物販機能の内容不明、コンサル運営サイトに不要",
    priority: "P3",
    effortHours: 4,
    url: "/goods",
    evidence:
      "WebFetch評価:「物販は付属的。コア機能に比べ詳細情報が限定的」。アフィリエイト導線は /equipment-finder で十分。",
    recommendation:
      "/equipment-finder に統合、/goods は301。",
  },
];

const FINDINGS_G: Finding[] = [
  {
    id: "G-001",
    title: "試験問題「過去問」表記の表示と実装の不一致 — 景品表示法・誤認誘導リスク",
    priority: "P0",
    effortHours: 4,
    url: "/exam-quiz, /quiz",
    evidence:
      "A-001 と同根。表示「過去問」と実装「No verbatim copy of past-exam text」の不一致は景表法(優良誤認)の解釈余地あり。",
    recommendation:
      "即時にUI表記を「学習用問題」に変更。最優先課題として扱う。",
    status: "resolved-pr-188",
  },
  {
    id: "G-002",
    title: "/dpa — テンプレート未整備状態での公開、個人運営での企業向けDPA提供は法的責任曖昧",
    priority: "P1",
    effortHours: 3,
    batch: 3,
    url: "/dpa",
    evidence:
      "WebFetch評価:「テンプレート未整備(『独立後3ヶ月以内に整備予定』)、個別対応のみ、標準化なし」「個人運営による業務委託契約の締結は法的責任が曖昧」。",
    recommendation:
      "/dpa はナビ除外+noindex、法人化後に再公開。現状は「DPA等の企業契約は法人化後に提供」と1行明記。",
  },
  {
    id: "G-003",
    title: "賠償責任保険「未加入」を /insurance で明記 — 個人運営の限界",
    priority: "P1",
    effortHours: 4,
    batch: 4,
    url: "/insurance",
    evidence:
      "WebFetch評価:「未加入です。Phase 1 after incorporation」「保険未加入の状態でサービスを利用されることに同意のうえご利用ください」。透明性は高いが、企業利用者にはハードル。",
    recommendation:
      "短期: 個人事業者向けPL保険(年間数万円)の加入検討。中期: 法人化後にIT賠償責任保険を必ず取得。/insurance ページは継続的に状況を更新。",
  },
  {
    id: "G-004",
    title: "利用規約に反社条項なし",
    priority: "P2",
    effortHours: 2,
    url: "/terms",
    evidence:
      "WebFetch評価:「反社条項は明記されていない。禁止事項(第4条)では『法令違反・公序良俗違反』と一般的規定にとどまり、反社排除条項(契約解除権)の明示的な記載がない」。",
    recommendation:
      "反社排除条項を追加(契約解除権、損害賠償責任、表明保証)。",
  },
  {
    id: "G-005",
    title: "プライバシーポリシー — Cookie同意管理UI/GA導入の有無が不明",
    priority: "P2",
    effortHours: 6,
    url: "/privacy",
    evidence:
      "WebFetch評価:「同意管理UI(バナー)への言及なし。GA等分析ツール導入の有無が不明。GDPR/CCPA準拠の詳細説明不足」。",
    recommendation:
      "(a) GA4/GTM の使用状況を明記、(b) 個人情報保護法2022年改正に対応した同意管理バナー設置、(c) Cookie種別(必須/分析/広告)を区別。",
  },
  {
    id: "G-006",
    title: "メンタルヘルス・治療と仕事の両立支援 — 医療助言誤認リスク",
    priority: "P2",
    effortHours: 4,
    url: "/mental-health-management, /treatment-work-balance",
    evidence:
      "WebFetch評価:「『段階的復職プラン自動生成』は医学専門的判断を要する領域であり、自動化への違和感が残る」。免責はあるが、ガイドが詳細すぎると誤認余地。",
    recommendation:
      "生成結果の冒頭に「※産業医・主治医の判断を補助するための雛形であり、医学的判断ではありません」を強調表示。プランビルダー出力PDFのフッタにも明記。",
  },
];

const FINDINGS_H: Finding[] = [
  {
    id: "H-001",
    title: "全コンテンツの更新日が一括化(2026-04-28、2026-05-16など) — 個別更新管理されていない",
    priority: "P2",
    effortHours: 8,
    url: "全ページ",
    evidence:
      "sitemap.ts の lastModified、articles-index.json の publishedAt が一括同日。実態として個別ページが更新されていないと推測される。",
    recommendation:
      "(a) 各ページに「最終更新」を独自フィールドで持たせる、(b) 月次更新の優先順位(法改正→事故DB→記事)を運用ドキュメント化。",
  },
  {
    id: "H-002",
    title: "試験問題23,501行/法令33件/通達969件/化学物質1,046+/事故5,026件 を一人運営で維持する持続性",
    priority: "P2",
    effortHours: 0,
    url: "全データ層",
    evidence:
      "wc -l 結果: exam-questions 計23,501行、accidents データファイル多数、circulars 4ファイル。手動メンテは現実的でない規模。",
    recommendation:
      "(a) 自動更新パイプライン(MHLW RSS取込、通達定期巡回)の整備、(b) 一部データは外部リンクのみに留め、内部コピーを持たない設計。",
  },
  {
    id: "H-003",
    title: "監修体制「専門家チーム」とは具体的に誰か不明",
    priority: "P3",
    effortHours: 2,
    url: "/about, /articles",
    evidence:
      "WebFetch評価:「『安全AIポータル 専門家チームによる設計』と組織名のみで個人名や資格情報がない」。",
    recommendation:
      "/about の冒頭にオーナー氏名・労働安全衛生コンサルタント登録番号260022・主要経歴を明記。可能なら写真と署名。",
  },
  {
    id: "H-004",
    title: "「公開PDCA」の運用実体が不明 — コミット履歴へのリンクがUI上にない",
    priority: "P3",
    effortHours: 3,
    url: "/about",
    evidence:
      "/about で「公開PDCAで指摘と対応をコミット履歴で追跡可能」と謳うが、UI上で GitHub リンクや公開Issueへの直接リンクは見当たらない。",
    recommendation:
      "/about および footer に「公開リポジトリ・指摘受付」へのリンクを明示(GitHub Issues/Discussion)。",
  },
];

const ALL_FINDINGS = [
  ...FINDINGS_A,
  ...FINDINGS_B,
  ...FINDINGS_C,
  ...FINDINGS_D,
  ...FINDINGS_E,
  ...FINDINGS_F,
  ...FINDINGS_G,
  ...FINDINGS_H,
];

const CATEGORY_TITLES: Record<string, string> = {
  A: "ブランド・信頼性",
  B: "コンテンツ品質",
  C: "UX・機能性",
  D: "SEO・流入設計",
  E: "パフォーマンス",
  F: "不要機能・冗長性",
  G: "法的・コンプライアンスリスク",
  H: "運用・保守性",
};

function renderFindingBlock(f: Finding) {
  const isResolved = f.status?.startsWith("resolved");
  const isDeferred = f.status === "deferred-next-pass";
  const isOutOfScope = f.status === "out-of-scope";
  const isInventoryFixed = f.status?.includes("notation-fixed");
  const prMatch = f.status?.match(/pr-(\d+)/);
  const prNumber = prMatch ? prMatch[1] : null;
  const statusBadgeStyle = isResolved
    ? "bg-emerald-100 text-emerald-900"
    : isInventoryFixed
      ? "bg-emerald-100 text-emerald-900"
      : isDeferred
        ? "bg-amber-100 text-amber-900"
        : isOutOfScope
          ? "bg-slate-200 text-slate-700"
          : "bg-slate-100 text-slate-700";
  const statusLabel = isResolved
    ? prNumber
      ? `解決済 (PR #${prNumber} merged)`
      : "解決済 (main マージ済)"
    : isInventoryFixed
      ? "改修済+棚卸完了"
      : isDeferred
        ? "次回パスへ保留"
        : isOutOfScope
          ? "対象外"
          : f.status ?? "";
  return (
    <article
      key={f.id}
      id={f.id}
      className="rounded-lg border border-slate-200 bg-white p-4"
      data-finding-id={f.id}
      data-priority={f.priority}
      data-effort-hours={f.effortHours}
      data-batch={f.batch !== undefined ? String(f.batch) : undefined}
      data-status={f.status ?? "tbd"}
    >
      <header className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-sm font-bold text-slate-900">{f.id}</span>
        <span
          className={
            "rounded px-2 py-0.5 text-xs font-bold " +
            (f.priority === "P0"
              ? "bg-red-100 text-red-900"
              : f.priority === "P1"
                ? "bg-orange-100 text-orange-900"
                : f.priority === "P2"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-slate-100 text-slate-700")
          }
        >
          {f.priority}
        </span>
        {f.batch !== undefined && (
          <span className="rounded px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-900">
            Batch {f.batch}
          </span>
        )}
        <span className="text-xs text-slate-500">推定工数 {f.effortHours}h</span>
        {f.status ? (
          <span className={"rounded px-2 py-0.5 text-xs font-bold " + statusBadgeStyle}>
            {statusLabel}
          </span>
        ) : (
          <span className="text-xs text-slate-500">採否: TBD</span>
        )}
      </header>
      <h3 className="mt-2 text-sm font-bold text-slate-900">{f.title}</h3>
      {f.url ? (
        <p className="mt-1 font-mono text-xs text-slate-600">URL: {f.url}</p>
      ) : null}
      <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-700">
        <span className="font-semibold">根拠: </span>
        {f.evidence}
      </p>
      <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-700">
        <span className="font-semibold">解決方針: </span>
        {f.recommendation}
      </p>
      {f.statusNote ? (
        <p className="mt-2 whitespace-pre-line rounded bg-sky-50 px-3 py-2 text-xs leading-6 text-sky-900">
          <span className="font-semibold">状態: </span>
          {f.statusNote}
        </p>
      ) : null}
    </article>
  );
}

export default function HarshAuditPage() {
  const counts = ALL_FINDINGS.reduce(
    (acc, f) => {
      acc.priority[f.priority] = (acc.priority[f.priority] ?? 0) + 1;
      const cat = f.id.charAt(0);
      acc.category[cat] = (acc.category[cat] ?? 0) + 1;
      acc.totalEffort += f.effortHours;
      return acc;
    },
    {
      priority: {} as Record<string, number>,
      category: {} as Record<string, number>,
      totalEffort: 0,
    }
  );

  return (
    <PageContainer width="narrow" className="space-y-8">
      <div>
        <p className="text-xs text-slate-500" data-marker="audit-doc-noindex">
          ※ 本ページは社内採否判断用の監査ドキュメントです。noindex 設定、サイトマップ・内部ナビ非掲載。AIエージェントが web_fetch で読むことを想定したプレーン構造。
        </p>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          第三者目線 激辛監査レポート 2026-05-16
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          対象: 安全AIポータル ({" "}
          <span className="font-mono">https://www.anzen-ai-portal.jp/</span> )<br />
          視点: コンサル/労務担当者/人事/プロダクト運用者の第三者目線、辛口判定<br />
          ベースHEAD: <span className="font-mono">{META.baseMainSha}</span> ・監査日:{" "}
          {META.auditDate}
        </p>
      </div>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="summary"
      >
        <h2 className="text-base font-bold text-slate-900">サマリ統計</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>監査ページ数: 約{META.reviewedPages}ページ(WebFetchで本番URL確認)</li>
          <li>
            データサンプリング: 試験問題 {META.dataSamples.exam} / 事故事例{" "}
            {META.dataSamples.accidents} / 化学物質 {META.dataSamples.chemicals} / 記事{" "}
            {META.dataSamples.articles} / 通達 {META.dataSamples.circulars} / 用語集{" "}
            {META.dataSamples.glossary}
          </li>
          <li>
            検出課題件数: 合計 {counts.priority.P0 + counts.priority.P1 + counts.priority.P2 + counts.priority.P3}件
            (A-001 〜 H-004 通し番号)
          </li>
          <li>
            優先度別: P0 {counts.priority.P0 ?? 0}件 / P1 {counts.priority.P1 ?? 0}件 /
            P2 {counts.priority.P2 ?? 0}件 / P3 {counts.priority.P3 ?? 0}件
          </li>
          <li>
            カテゴリ別: A{counts.category.A ?? 0} B{counts.category.B ?? 0} C
            {counts.category.C ?? 0} D{counts.category.D ?? 0} E{counts.category.E ?? 0}{" "}
            F{counts.category.F ?? 0} G{counts.category.G ?? 0} H{counts.category.H ?? 0}
          </li>
          <li>合計推定工数: 約{counts.totalEffort}時間</li>
        </ul>
      </section>

      <section
        className="rounded-xl border border-red-200 bg-red-50 p-4"
        data-section="overall-verdict"
      >
        <h2 className="text-base font-bold text-red-900">激辛総評</h2>
        <p className="mt-2 whitespace-pre-line text-xs leading-6 text-red-900">
          {`1) 「過去問クイズ」と「Disallow: /strategy」の2点は今すぐ手当てすべきP0級。前者はブランドと景表法リスク、後者はメイン3機能の1つが検索クロール拒否される深刻なSEOバグ。
2) 個人運営「研究プロジェクト」の体裁と、企業向けプロダクト風UI(LMS β/DPA/API-docs/pricing/insurance未加入)が同居し、第三者目線では「未完成な企業サービス」に映ってブランドを毀損する。整理は早いほど良い。
3) コンテンツ量(試験問題23,501行、事故5,026件、化学物質1,046+、通達969件)はオーナー単独で維持できる規模を大きく超えている。「広く浅く」から「メイン3機能に深く」への大胆な絞り込みが必要。
4) AI生成感のある用語集・記事・多言語翻訳は、コンサルとしての一次情報感を弱める。実体験/監修者明示/出典リンクの強化が急務。
5) 表示と実装の整合(「過去問」「速報事例」「DB件数」)、施行日和暦/西暦の統一、Cookie同意UI、反社条項など細部の品質ガバナンスも追いついていない。`}
        </p>
      </section>

      {Object.keys(CATEGORY_TITLES).map((cat) => {
        const items = ALL_FINDINGS.filter((f) => f.id.startsWith(cat + "-"));
        if (items.length === 0) return null;
        return (
          <section
            key={cat}
            id={"category-" + cat}
            data-category={cat}
            className="space-y-3"
          >
            <h2 className="text-base font-bold text-slate-900">
              カテゴリ {cat}: {CATEGORY_TITLES[cat]} ({items.length}件)
            </h2>
            <div className="space-y-3">{items.map(renderFindingBlock)}</div>
          </section>
        );
      })}

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="adoption-template"
      >
        <h2 className="text-base font-bold text-slate-900">採用/不採用判断テンプレート</h2>
        <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 text-xs leading-5 text-slate-800">
{`# 採否判定(社内記入用)
# 形式: <ID> <採否(adopt/defer/reject)> <担当者> <着手予定週> <備考>

A-001 ?  ?  ?  ?
A-002 ?  ?  ?  ?
A-003 ?  ?  ?  ?
A-004 ?  ?  ?  ?
A-005 ?  ?  ?  ?
A-006 ?  ?  ?  ?
A-007 ?  ?  ?  ?
A-008 ?  ?  ?  ?
B-001 ?  ?  ?  ?
B-002 ?  ?  ?  ?
B-003 ?  ?  ?  ?
B-004 ?  ?  ?  ?
B-005 ?  ?  ?  ?
B-006 ?  ?  ?  ?
B-007 ?  ?  ?  ?
B-008 ?  ?  ?  ?
C-001 ?  ?  ?  ?
C-002 ?  ?  ?  ?
C-003 ?  ?  ?  ?
C-004 ?  ?  ?  ?
C-005 ?  ?  ?  ?
C-006 ?  ?  ?  ?
C-007 ?  ?  ?  ?
D-001 ?  ?  ?  ?
D-002 ?  ?  ?  ?
D-003 ?  ?  ?  ?
D-004 ?  ?  ?  ?
E-001 ?  ?  ?  ?
F-001 ?  ?  ?  ?
F-002 ?  ?  ?  ?
F-003 ?  ?  ?  ?
F-004 ?  ?  ?  ?
F-005 ?  ?  ?  ?
F-006 ?  ?  ?  ?
F-007 ?  ?  ?  ?
F-008 ?  ?  ?  ?
F-009 ?  ?  ?  ?
F-010 ?  ?  ?  ?
F-011 ?  ?  ?  ?
G-001 ?  ?  ?  ?
G-002 ?  ?  ?  ?
G-003 ?  ?  ?  ?
G-004 ?  ?  ?  ?
G-005 ?  ?  ?  ?
G-006 ?  ?  ?  ?
H-001 ?  ?  ?  ?
H-002 ?  ?  ?  ?
H-003 ?  ?  ?  ?
H-004 ?  ?  ?  ?`}
        </pre>
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="meta"
      >
        <h2 className="text-base font-bold text-slate-900">メタデータ</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>監査ID: {META.auditId}</li>
          <li>監査日: {META.auditDate}</li>
          <li>ベースHEAD: {META.baseMainSha}</li>
          <li>監査主体: Claude Opus (Claude Maxプラン内、第三者目線シミュレーション)</li>
          <li>本ページ: noindex / sitemap非掲載 / robots Disallow 対象 / 内部ナビ非掲載</li>
          <li>
            公開URL:{" "}
            <span className="font-mono">https://www.anzen-ai-portal.jp/audits/2026-05-16</span>
          </li>
        </ul>
      </section>
    </PageContainer>
  );
}
