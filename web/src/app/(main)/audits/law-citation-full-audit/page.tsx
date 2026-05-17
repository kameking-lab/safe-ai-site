import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "Law citation full-codebase audit — 2026-05-17",
  description:
    "全コードベース(web/src/ 891 ファイル、4,440 引用)の労働安全衛生関係法令引用をe-Gov既知範囲と内部正典データに照合し、存在しない条文番号・古い表記・非正規略称を洗い出して修正した監査記録。",
  robots: { index: false, follow: true, nocache: true },
  alternates: { canonical: null as unknown as string },
};

const META = {
  auditId: "law-citation-full-audit-2026-05-17",
  auditDate: "2026-05-17",
  baseSha: "d2807ca",
  priorAuditPr: 208,
  scanScope: "web/src/{data,lib,components,app} + docs/",
  filesScanned: 891,
  filesWithCitations: 231,
  citationsExtracted: 4440,
  modelChosen: "claude-opus-4-7",
  modelRationale:
    "法令引用箇所抽出+e-Gov既知範囲との照合+施行日整合検証を全コードベース横断、法務知識+網羅性判定が必要なためOpus採用。",
};

const FINDINGS_TABLE = [
  { klass: "C0 (出範囲条文)", pre: 8, action: "全件修正", post: 0 },
  { klass: "Intra-law duplicate articleNum", pre: 2, action: "全件修正", post: 0 },
  { klass: "Non-canonical abbreviation (労安*等)", pre: 80, action: "全件正規化", post: 0 },
  { klass: "C1 (旧改正条文)", pre: 0, action: "—", post: 0 },
  { klass: "C2 (施行日表記揺れ)", pre: 0, action: "—", post: 0 },
  { klass: "C3 (法令フルネーム使用)", pre: 1096, action: "情報のみ、修正なし", post: 1096 },
  { klass: "C4 (その他)", pre: 0, action: "—", post: 0 },
];

type CitationFix = {
  id: string;
  file: string;
  before: string;
  after: string;
  reason: string;
};

const CITATION_FIXES: CitationFix[] = [
  {
    id: "law-034-faq-body",
    file: "web/src/data/faqs/faq-batch-1-law.ts",
    before: "安衛令第88条・安衛則第88〜90条 (本文)",
    after: "安衛則第89条・第90条",
    reason:
      "安衛令は本則26条のみ。計画届の手続規定は安衛則第85〜92条にあり、安衛令第88条は存在しない。",
  },
  {
    id: "law-034-relatedLaws",
    file: "web/src/data/faqs/faq-batch-1-law.ts",
    before: 'relatedLaws: ["安衛法第88条", "安衛令第88条〜90条"]',
    after: 'relatedLaws: ["安衛法第88条", "安衛則第89条", "安衛則第90条"]',
    reason: "同上 — relatedLaws 配列も整合させる。",
  },
  {
    id: "chem-029-body",
    file: "web/src/data/faqs/faq-batch-3-chemical.ts",
    before: "安衛法第577条の2 (本文 + relatedLaws)",
    after: "安衛則第577条の2 (リスクアセスメント対象物のばく露低減措置)",
    reason:
      "安衛法は第124条まで。第577条の2は安衛則 (令和4年改正で化学物質自律管理体系として新設) の条文。",
  },
  {
    id: "eq-eyewash-x3",
    file: "web/src/data/safety-equipment-db.json (3 occurrences)",
    before: '"有機則 第61条"',
    after: '"安衛則 第659条"',
    reason:
      "有機則の本則は第38条まで。洗眼器の救急用具備付け要件は安衛則第659条 (救急用具) に対応。",
  },
  {
    id: "st-sekimen-010",
    file: "web/src/data/exam-questions/skill-training.ts",
    before: "健康管理手帳の交付対象 (労災保険法第65条)",
    after: "健康管理手帳の交付対象 (安衛法第67条)",
    reason:
      "労災保険法は第62条までで第65条は存在しない。健康管理手帳の交付規定は労働安全衛生法第67条にある。",
  },
];

type DuplicateFix = {
  file: string;
  duplicate: string;
  action: string;
};

const DUPLICATE_FIXES: DuplicateFix[] = [
  {
    file: "web/src/data/laws/yuki-kisoku.ts",
    duplicate: '有機則 第25条 — "区分の表示" と "救急用具の備付け" の2エントリ',
    action:
      "PR #208 で 第25条 = 区分の表示 に renumber 済み。旧テキスト (救急用具) のエントリを削除して重複を解消。",
  },
  {
    file: "web/src/data/laws/rodo-anzen-eisei-ho.ts",
    duplicate: "安衛法 第28条の2 — リスクアセスメント条文の新旧2エントリ",
    action:
      "現行テキスト (令和4年化学物質管理改正反映) を残し、旧テキスト (製造業限定) のエントリを削除。",
  },
];

const ABBREV_NORMALIZATION = [
  { from: "労安法", to: "安衛法", note: "労働安全衛生法の非正規略称" },
  { from: "労安則", to: "安衛則", note: "労働安全衛生規則の非正規略称" },
  { from: "労安衛法", to: "安衛法", note: "労働安全衛生法のさらに非正規な略称" },
  { from: "労安衛則", to: "安衛則", note: "同上 (規則側)" },
  { from: "労安規則 第633条 (救急用具)", to: "安衛則 第659条 (救急用具)", note: "略称+条文番号の二重誤り" },
];

export default function LawCitationFullAuditPage() {
  return (
    <PageContainer>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          Law citation full-codebase audit
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
          全コードベース 4,440 法令引用の正確性監査 — 2026-05-17
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          PR #208 で実施した <code>web/src/data/laws/</code> 限定の監査を拡張し、
          <code>web/src/</code> 全体と <code>docs/</code> を対象に正規表現で
          47 種の法令引用パターンを抽出。e-Gov 既知範囲と内部正典データに
          照合し、存在しない条文番号・古い表記・非正規略称を洗い出した。
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="font-bold text-slate-800">監査日</dt>
            <dd>{META.auditDate}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-800">前回監査</dt>
            <dd>PR #{META.priorAuditPr} (laws データ限定)</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-800">基準 SHA</dt>
            <dd className="font-mono">{META.baseSha}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-800">対象範囲</dt>
            <dd className="font-mono">{META.scanScope}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-800">スキャン件数</dt>
            <dd>
              {META.filesScanned.toLocaleString()} ファイル / 引用 {META.citationsExtracted.toLocaleString()} 件 /
              引用を含むファイル {META.filesWithCitations} 件
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-bold text-slate-800">モデル選択理由</dt>
            <dd>
              {META.modelChosen} — {META.modelRationale}
            </dd>
          </div>
        </dl>
      </header>

      <section className="mb-6" data-section="findings-table">
        <h2 className="text-base font-bold text-slate-900">監査結果サマリ</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-white text-left text-[11px] font-bold text-slate-700">
              <tr>
                <th className="px-3 py-2">分類</th>
                <th className="px-3 py-2">修正前</th>
                <th className="px-3 py-2">対応</th>
                <th className="px-3 py-2">修正後</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
              {FINDINGS_TABLE.map((row) => (
                <tr key={row.klass}>
                  <td className="px-3 py-2 font-mono">{row.klass}</td>
                  <td className="px-3 py-2">{row.pre.toLocaleString()}</td>
                  <td className="px-3 py-2">{row.action}</td>
                  <td className="px-3 py-2 font-bold text-emerald-700">
                    {row.post.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-600">
          C3 (フルネーム使用) は記事本文・FAQ・試験問題解説のような読み手向けの
          場面で正当な使用が大半。一括変換は読みやすさを損ねるため情報のみ。
        </p>
      </section>

      <section className="mb-6 space-y-3" data-section="citation-fixes">
        <h2 className="text-base font-bold text-slate-900">
          C0: 出範囲条文番号の修正 (8 件)
        </h2>
        <div className="space-y-3">
          {CITATION_FIXES.map((f) => (
            <article
              key={f.id}
              data-finding-id={f.id}
              data-fix-status="resolved"
              className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-900">{f.id}</h3>
              <p className="mt-1 break-all font-mono text-[10px] text-slate-500">{f.file}</p>
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
                <span className="font-bold">根拠:</span> {f.reason}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 space-y-3" data-section="duplicate-fixes">
        <h2 className="text-base font-bold text-slate-900">
          法令データ内 articleNum 重複の解消 (2 件)
        </h2>
        <div className="space-y-3">
          {DUPLICATE_FIXES.map((d) => (
            <article
              key={d.file}
              data-fix-status="resolved"
              className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-900">{d.duplicate}</h3>
              <p className="mt-1 break-all font-mono text-[10px] text-slate-500">{d.file}</p>
              <p className="mt-2 text-xs leading-5 text-slate-700">
                <span className="font-bold">対応:</span> {d.action}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 space-y-3" data-section="abbrev-normalization">
        <h2 className="text-base font-bold text-slate-900">
          非正規略称の正規化 (24 ファイル / 70 置換)
        </h2>
        <p className="text-xs leading-5 text-slate-600">
          労働安全衛生法令の標準略称は{" "}
          <code>web/src/data/laws/law-metadata.ts</code> の <code>LAW_METADATA</code>{" "}
          キー (例: 安衛法 / 安衛則 / 安衛令) に統一している。本監査で発見した
          以下の非正規略称をすべて正規形に置換した:
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-white text-left text-[11px] font-bold text-slate-700">
              <tr>
                <th className="px-3 py-2">非正規 (Before)</th>
                <th className="px-3 py-2">正規 (After)</th>
                <th className="px-3 py-2">備考</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
              {ABBREV_NORMALIZATION.map((row) => (
                <tr key={row.from}>
                  <td className="px-3 py-2 font-mono text-red-700">{row.from}</td>
                  <td className="px-3 py-2 font-mono text-emerald-700">{row.to}</td>
                  <td className="px-3 py-2">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="methodology"
      >
        <h2 className="text-base font-bold text-slate-900">監査ツールチェーン</h2>
        <p className="mt-2 text-xs leading-5 text-slate-700">
          再現性確保のため、抽出・検証・重複検出・正規化の各スクリプトを{" "}
          <code>web/scripts/audit-2026-05-17/</code> 配下に commit している:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>
            <code>extract-citations.mjs</code> — 47 種の法令トークン+条文記号の正規表現抽出。
          </li>
          <li>
            <code>validate-citations.mjs</code> — MAX_ARTICLES 表 + 略称マップとの照合。
          </li>
          <li>
            <code>detect-duplicates.mjs</code> — 同一 lawShort 内の articleNum 重複検出。
          </li>
          <li>
            <code>normalize-abbrev.mjs</code> — 非正規略称の一括置換 (Phase D)。
          </li>
        </ul>
      </section>

      <section
        className="rounded-xl border border-amber-200 bg-amber-50 p-4"
        data-section="out-of-scope"
      >
        <h2 className="text-base font-bold text-amber-900">スコープ外</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-900">
          <li>
            C3 (法令フルネーム使用 1,096 件) — 大半は記事本文・FAQ 等で読みやすさを
            優先した正当な使用。一括変換は逆効果のため情報のみ。
          </li>
          <li>
            法令本文内の相互参照 (例:「前条第3項」「第28条の2の規定」) —
            パターン検出が脆弱なため別監査に先送り。
          </li>
          <li>
            e-Gov ライブスクレイピング — 本タスク仕様で除外。内部正典データ
            (<code>web/src/data/laws/*.ts</code>) と既往監査 (PR #208) の
            最大条文番号表で代替検証。
          </li>
        </ul>
      </section>

      <footer className="mt-8 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
        本ページは社内向け監査ログとして公開しています (noindex)。
        詳細は <code>docs/law-citation-full-audit-2026-05-17.md</code> を参照。
      </footer>
    </PageContainer>
  );
}
