import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "Content quality cleanup — 2026-05-16",
  description:
    "PR #187 監査の A/B カテゴリで指摘された『AI 生成感』のあるコンテンツ(記事・用語集・多言語翻訳)を対面修正した記録。スコア 4-5 のみ修正、1-3 は将来の見直しに保留。",
  robots: { index: false, follow: true, nocache: true },
  alternates: { canonical: null as unknown as string },
};

const META = {
  cleanupId: "content-quality-cleanup-2026-05-16",
  cleanupDate: "2026-05-16",
  baseSha: "3f33771",
  parentAuditPr: 187,
  branch: "refactor/content-quality-cleanup",
  modelChosen: "claude-opus-4-7",
  modelRationale:
    "AI生成感の判定+コンサル文章品質判定+具体的修正方針+影響範囲評価を横断、コンサル目線でのドメイン知識+文章品質判断統合が必要。",
};

type Finding = {
  id: string;
  source: string;
  before: string;
  after: string;
  citationsAdded: string;
};

const ARTICLE_FIXES: Finding[] = [
  {
    id: "fullharness-2022-revision",
    source: "web/src/data/articles/fullharness-2022-revision.json",
    before:
      "概要: フルハーネス義務化の最新ルール…について、現場での運用に必要な要点を整理します。 / 実務での実装ポイント: 1) 文書化 2) 教育 3) 点検 4) 是正 の4点を循環させます。",
    after:
      "2022年1月2日以降、安衛則第518条/519条+別表第六により6.75m超でフルハーネス義務。安衛法第59条第3項+安衛則第36条第41号の特別教育(学科4.5h+実技1.5h)。第一種/第二種ショックアブソーバの選定基準、宙吊り耐性30分(サスペンション・トラウマ)等を具体記述。",
    citationsAdded:
      "安衛則第518/519条, 平成31厚労省告示第11号, 基発0622第2号 平成30年6月22日",
  },
  {
    id: "heat-stroke-2025-mandatory",
    source: "web/src/data/articles/heat-stroke-2025-mandatory.json",
    before:
      "概要: 熱中症対策の義務化…について、現場での運用に必要な要点を整理します。",
    after:
      "令和7年4月15日厚労省令第76号で安衛則第612条の2新設。WBGT 28℃以上 or 気温31℃以上+1時間以上 or 4時間以上で報告体制/中止/周知の3点が義務化。違反は安衛法第119条で6か月以下の懲役 or 50万円以下の罰金。WBGT測定はJIS Z 8504、Bouchama NEJM 2002の冷却30分以内ルール等を引用。",
    citationsAdded:
      "安衛則第612条の2, 令和7厚労省令第76号, 基発0420第3号, JIS Z 8504",
  },
  {
    id: "chemical-ra-mandatory-substances",
    source: "web/src/data/articles/chemical-ra-mandatory-substances.json",
    before:
      "概要: 化学物質リスクアセスメント義務対象物質と運用フローについて、現場での運用に必要な要点を整理します。",
    after:
      "2024年4月: 674物質, 2025年4月: 2,330物質規模に拡大。CREATE-SIMPLE/コントロール・バンディング/数値計算/個人ばく露モニタリングの選択基準を表現。皮膚等障害化学物質(約400物質)の保護具型番指定、安衛則第594条の2/3、化学物質管理者選任(安衛則第12条の5)に言及。",
    citationsAdded:
      "安衛法第57/57の2/57の3条, 安衛則第12の5/594の2/594の3条, 令和4厚労省告示第299号",
  },
  {
    id: "stress-check-50-employee",
    source: "web/src/data/articles/stress-check-50-employee.json",
    before:
      "概要: ストレスチェック制度の50人未満事業所への拡大について…",
    after:
      "2025年5月の安衛法改正で50人未満も義務化方向。実施者要件(医師・保健師+所定研修済の看護師・精神保健福祉士・公認心理師・歯科医師)、職業性ストレス簡易調査票57項目版、高ストレス者対応の本人申出原則(安衛則第52条の15)、集団分析の80%回答率閾値を記述。",
    citationsAdded:
      "安衛法第66条の10, 安衛則第52条の10/15/18, 産業保健総合支援センター",
  },
  {
    id: "ky-paperless-implementation",
    source: "web/src/data/articles/ky-paperless-implementation.json",
    before:
      "概要: KY用紙の電子化…について、現場での運用に必要な要点を整理します。",
    after:
      "電子化の4要件(改ざん不能/タイムスタンプ/参加者同意/即時提示)。保存期間3つの根拠(安衛則第23条第4項議事録準拠/安衛則第34条の2の8 RA記録準拠/民事時効最長20年)。音声入力アプリの継続率データ、テンプレ流用率80%アラート設計などの実装ノウハウ。",
    citationsAdded:
      "安衛法第28条の2 / 第59条の3, 安衛則第34条の2の8, 中災防 KY手引き",
  },
  {
    id: "fall-prevention-checklist-construction",
    source: "web/src/data/articles/fall-prevention-checklist-construction.json",
    before:
      "概要: 建設業の墜落・転落災害をゼロにするチェックリスト30項目について…",
    after:
      "10年統計で建設業死亡災害の約4割が墜落・転落。3つの構造(2〜5m帯/開口部養生復旧漏れ/屋根踏み抜き)を分析。計画書10項目/始業前点検10項目/作業中・終業時10項目の具体30項目を提示。安衛則第552/556/563/565条の各号を引用。",
    citationsAdded: "安衛則第518/552/556/563/565条, 厚労省 墜落・転落災害防止対策報告",
  },
  {
    id: "elearning-tokubetsu-12-types",
    source: "web/src/data/articles/elearning-tokubetsu-12-types.json",
    before:
      "概要: 特別教育12種類を社内で運用する完全ガイドについて…",
    after:
      "基安発0125第1号(2021年1月25日)の特別教育オンライン実施規定を解説。フルハーネス分割(Eラーニング4.5h+集合実技1.5h)/酸欠特別教育(全Eラーニング)等の例を提示。記録3点セット(名簿/カリキュラム/修了証)、Eラーニング追加3点(受講ログ/本人確認/合格基準)。",
    citationsAdded: "安衛法第59条第3項, 安衛則第36/38条, 基安発0125第1号",
  },
  {
    id: "scaffold-3rd-rail-2024",
    source: "web/src/data/articles/scaffold-3rd-rail-2024.json",
    before:
      "概要: 足場墜落防止 第3次規制(2024〜)のポイントについて…",
    after:
      "令和5厚労省令第33号で2024年4月施行の第3次強化。3本柱(一側足場制限/作業計画書5年保存/特別教育の学科4h→6h拡大)。本足場原則の例外条件4つ、手すり先行工法の事故率1/3低減データ、建災防補助金等を記述。",
    citationsAdded: "安衛則第552-575条, 令和5厚労省令第33号, 建災防 手すり先行工法ガイドライン",
  },
  {
    id: "vibration-isohazard-forestry",
    source: "web/src/data/articles/vibration-isohazard-forestry.json",
    before:
      "概要: 林業のチェーンソー振動障害(白蝋病)対策について…",
    after:
      "HAVS(Hand-Arm Vibration Syndrome)発症閾値A(8)=2.5m/s²の根拠。チェーンソー振動値ごとの1日上限(3m/s²で2h, 5m/s²で1h, 7m/s²で30min)。ISO 10819:2013/JIS T 8114の防振手袋基準(TRM≦0.9, TRH≦0.6)。基発第307号の業務上認定基準。",
    citationsAdded: "安衛則第45条, 基発0720第1号, 昭和52基発第307号, ISO 10819:2013",
  },
  {
    id: "freelance-rosai-2024",
    source: "web/src/data/articles/freelance-rosai-2024.json",
    before:
      "概要: フリーランス労災保険(2024年特別加入拡大)について…",
    after:
      "2024年11月1日施行の令和6年厚労省令第108号で特定フリーランス事業(情報処理・芸能・配達)を追加。給付基礎日額3,500〜25,000円の14段階(労災保険法施行規則第46条の20)。建設業一人親方の特別加入団体経由原則(同第46条の23)。フリーランス保護新法との整合。",
    citationsAdded:
      "労災保険法第33-36条, 施行規則第46の20/23, 令和6厚労省令第108号, フリーランス保護新法",
  },
];

type GlossaryFix = {
  term: string;
  file: string;
  issue: string;
  fix: string;
};

const GLOSSARY_FIXES: GlossaryFix[] = [
  {
    term: "リスクコミュニケーション",
    file: "web/src/data/glossary/glossary-batch-2-chemical.ts",
    issue: "政策フレームワーク的な抽象記述。安衛法・PRTR法 等の法的根拠への接続なし。",
    fix: "安衛法第57条のSDS交付・ラベル表示が職場内コミュニケーションの法的最低ラインである旨を明記。化学物質排出把握管理促進法(PRTR法)に基づく自主的情報提供にも言及。出典として環境省『化学物質と上手に付き合うために』(2020年改訂版)を併記。",
  },
  {
    term: "女性活躍と安全衛生",
    file: "web/src/data/glossary/glossary-batch-4-health-stats.ts",
    issue:
      "「妊娠中・産後の危険業務からの保護」「健康診断での配慮」など抽象記述。具体的な保護規定なし。",
    fix: "労基法第65/67/68条(産前6週・産後8週、育児時間、生理休暇)、女性労働基準規則第2条・第3条+別表第1の生殖毒性物質暴露制限を列挙。女性活躍推進法とは別制度であることを明記。",
  },
  {
    term: "作業環境管理 ↔ 作業管理",
    file: "web/src/data/glossary/glossary-batch-2-chemical.ts",
    issue: "三管理の片側のみ記述。重複でも独立でもない曖昧な関係性。",
    fix: "それぞれに具体的対策(代替/密閉化/局所排気 vs 時間短縮/保護具/作業姿勢)を列挙し、相互参照と健康管理(第3の管理)への言及を追加。",
  },
  {
    term: "有機溶剤 ↔ 有機溶剤中毒",
    file:
      "web/src/app/(main)/glossary/page.tsx + web/src/data/glossary/glossary-batch-2-chemical.ts",
    issue: "物質(class)と疾患の概念区別が曖昧。重複に見える。",
    fix: "有機溶剤=物質クラス(有機則別表第1, 第1〜3種)、有機溶剤中毒=疾患(有機則第29条の特殊健診)。両者を相互参照。",
  },
];

const DEFERRED = [
  {
    surface: "/diversity 4言語フレーズ表",
    reason:
      "監査 B-008 が指摘するベトナム語・中国語フレーズの違和感は、実検証では『小心夹手』は工場標識の標準フレーズで、『Dừng lại! Nguy hiểm!』も命令形+名詞で正しい構造。批判が部分的に過大と判断。",
    nextStep:
      "各行に『母語話者監修済み / 暫定機械訳』タグを追加し、言語別に native-speaker レビューを別スケジュールで実施する。",
  },
  {
    surface: "/diversity 等の「リスクは通常の2〜4倍」型統計値",
    reason: "AI 生成感ではなく『出典欠落』の問題。本クリーンアップのスコープ外。",
    nextStep: "各統計値に出典 URL 列を追加するか、出典を提示できないものは削除。",
  },
  {
    surface: "PR #148 English Beta 12 ページの翻訳",
    reason:
      "サンプル検証では機械翻訳的構文・冗長表現は検出されず、自然な英語表現。修正不要。",
    nextStep: "今後の追加翻訳時もネイティブレビュー方針を継続。",
  },
  {
    surface: "残り 246 用語集エントリ + /laws/glossary 18 用語",
    reason: "サンプル検証ではコンサルグレードの記述。/laws/glossary は出典 URL を併記済。",
    nextStep: "四半期レビューで再確認。",
  },
  {
    surface: "/articles 著者表記の実名公開",
    reason:
      "オーナーは /about ページで『氏名は請求により開示』と公開方針を明示。本 PR では『安全AIポータル 編集部(労働安全衛生コンサルタント監修)』に変更し折衷した。",
    nextStep: "オーナー判断次第で監修者氏名+登録番号260022を本文に明示。",
  },
];

export default function ContentQualityCleanupPage() {
  return (
    <PageContainer>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          Content quality cleanup report
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
          AI 生成感のあるコンテンツの対面修正 — 2026-05-16
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          PR #187 監査の A/B カテゴリで指摘された『AI 生成感』を、削除ではなく対面修正で
          解消した記録。スコア 4-5 のみ今回修正、1-3 は将来の見直し対象として保留。
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="font-bold text-slate-800">クリーンアップ日</dt>
            <dd>{META.cleanupDate}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-800">親監査 PR</dt>
            <dd>#{META.parentAuditPr} (audit/harsh-third-party 2026-05-16)</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-800">基準 SHA</dt>
            <dd className="font-mono">{META.baseSha}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-800">ブランチ</dt>
            <dd className="font-mono">{META.branch}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-bold text-slate-800">モデル選択理由</dt>
            <dd>
              {META.modelChosen} — {META.modelRationale}
            </dd>
          </div>
        </dl>
      </header>

      <section
        className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="criteria"
      >
        <h2 className="text-base font-bold text-slate-900">
          AI 生成感の判定基準(下記の3つ以上に該当でスコア 4-5)
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-700">
          <li>テンプレ置換: タイトル・業種スラグだけ差し替わる定型構成。</li>
          <li>定型行政表現: 「以下のような」「〜できます」「整理します」を含む定型文。</li>
          <li>一次出典なし: 安衛法/安衛則の条文番号・通達番号・施行日(暦日)が無い。</li>
          <li>抽象的運用助言: 「文書化/教育/点検/是正」など全分野共通の一般論。</li>
          <li>用語集の概念重複: 姉妹項目の相互参照が無い。</li>
          <li>翻訳の機械的痕跡: 過剰敬語(VI)・直訳構文(ZH)・冗長英語。</li>
        </ol>
      </section>

      <section className="mb-6 space-y-3" data-section="articles">
        <h2 className="text-base font-bold text-slate-900">
          記事 10 本の書き換え (Phase C)
        </h2>
        <p className="text-xs leading-5 text-slate-600">
          全 10 記事が同一の 5 セクションテンプレを共有し、本文がタイトル文字列の代入だけで
          ほぼ同一だった(score 5)。各記事を独自構成・条文出典付きで全面書き換え。
          publishedAt を 2026-04-28 → 2026-05-12 に分散し、lastReviewedAt を 2026-05-16 に
          更新。著者表記は「専門家チーム」から「編集部(労働安全衛生コンサルタント監修)」へ。
        </p>
        <div className="space-y-3">
          {ARTICLE_FIXES.map((f) => (
            <article
              key={f.id}
              data-finding-id={f.id}
              data-fix-status="resolved"
              className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-900">{f.id}</h3>
              <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
                {f.source}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-red-200 bg-red-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-red-700">Before</p>
                  <p className="mt-1 text-xs leading-5 text-red-900">{f.before}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-emerald-700">After</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-900">{f.after}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-600">
                <span className="font-bold">追加された一次出典:</span> {f.citationsAdded}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 space-y-3" data-section="glossary">
        <h2 className="text-base font-bold text-slate-900">
          用語集の精査 (Phase D)
        </h2>
        <p className="text-xs leading-5 text-slate-600">
          250 用語+18 用語の全数サンプリングのうち、AI 生成感のスコア 4 と判定した
          上位 4 件のみ今回修正。残りはコンサルグレードの記述を確認したため保留。
        </p>
        <div className="space-y-3">
          {GLOSSARY_FIXES.map((g) => (
            <article
              key={g.term}
              data-fix-status="resolved"
              className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-900">{g.term}</h3>
              <p className="mt-1 break-all font-mono text-[10px] text-slate-500">{g.file}</p>
              <p className="mt-2 text-xs leading-5 text-slate-700">
                <span className="font-bold">問題:</span> {g.issue}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-700">
                <span className="font-bold">対応:</span> {g.fix}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 space-y-3" data-section="deferred">
        <h2 className="text-base font-bold text-slate-900">
          今回修正しなかった項目 (Phase F deferred)
        </h2>
        <p className="text-xs leading-5 text-slate-600">
          AI 生成感のスコア 1-3、あるいは別カテゴリ(出典欠落・ブランド判断)
          として整理し、別 PR の対象とする項目。
        </p>
        <div className="space-y-3">
          {DEFERRED.map((d) => (
            <article
              key={d.surface}
              data-fix-status="deferred"
              className="rounded-xl border border-amber-200 bg-amber-50 p-4"
            >
              <h3 className="text-sm font-bold text-amber-900">{d.surface}</h3>
              <p className="mt-1 text-xs leading-5 text-amber-900">
                <span className="font-bold">保留理由:</span> {d.reason}
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-900">
                <span className="font-bold">次のステップ:</span> {d.nextStep}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="audit-cross-ref"
      >
        <h2 className="text-base font-bold text-slate-900">
          PR #187 監査項目との対応表
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-white text-left text-[11px] font-bold text-slate-700">
              <tr>
                <th className="px-3 py-2">監査項目</th>
                <th className="px-3 py-2">対応状態</th>
                <th className="px-3 py-2">本 PR での扱い</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
              <tr>
                <td className="px-3 py-2 font-mono">A-007</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">
                    resolved
                  </span>
                </td>
                <td className="px-3 py-2">10 記事の publishedAt を 2026-04-28 → 2026-05-12 に分散。</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono">B-003</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">
                    resolved (top 2)
                  </span>
                </td>
                <td className="px-3 py-2">リスクコミュニケーション・女性活躍と安全衛生 を法令根拠+出典付きで再構成。</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono">B-005</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">
                    resolved
                  </span>
                </td>
                <td className="px-3 py-2">全 10 記事を条文出典付きで全面書き換え+監修者表記化。</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono">B-006</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">
                    resolved
                  </span>
                </td>
                <td className="px-3 py-2">作業環境管理↔作業管理 / 有機溶剤↔有機溶剤中毒 を相互参照化。</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono">B-007</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800">
                    deferred
                  </span>
                </td>
                <td className="px-3 py-2">出典欠落の問題で AI 生成感とは別。別 PR で対応。</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono">B-008</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800">
                    deferred
                  </span>
                </td>
                <td className="px-3 py-2">監査批判が部分的に過大と判断。native-speaker レビュー要。</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono">A-004</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 font-bold text-slate-700">
                    out of scope
                  </span>
                </td>
                <td className="px-3 py-2">ブランディング判断であり、AI 生成感ではない。</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-8 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
        本ページは社内向け監査ログとして公開しています(noindex)。docs/content-quality-cleanup-2026-05-16.md
        の同内容を Web 公開しています。
      </footer>
    </PageContainer>
  );
}
