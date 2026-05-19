import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "過去2週間 PR横断 回帰監査 — 2026-05-19",
  description:
    "安全AIポータル main に2026-05-05〜2026-05-19の14日間でマージされた173件のPRを横断レビューし、回帰バグ・副作用・想定外影響を11件検出。AI WebFetch 参照可。",
  robots: { index: false, follow: true },
  alternates: { canonical: null as unknown as string },
};

type Priority = "P0" | "P1" | "P2" | "P3";

type Finding = {
  id: string;
  priority: Priority;
  category: string;
  title: string;
  filePath: string;
  prSource: number[];
  detail: string;
  risk: string;
  recommendation: string;
  inTaskResolution?: string;
};

const FINDINGS: Finding[] = [
  {
    id: "F-001",
    priority: "P1",
    category: "Data integrity",
    title: "未来日付の事故レコード mhlw-2026-001 (occurredOn: 2026-07-08)",
    filePath: "web/src/data/mock/real-accident-cases-2024-2026.ts:143-162",
    prSource: [102, 104, 207],
    detail:
      "occurredOn 2026-07-08 は本日 2026-05-19 から1ヶ月20日先の未来日付。provenance: 'mhlw' (厚労省公式扱い) を付与しているが、未公開・未発生の事象を公式情報として表示している。タイトルは「令和7年6月施行の熱中症対策直後の死亡災害」だが occurredOn は令和8年7月で「直後」概念とずれる。",
    risk:
      "ユーザが事故DBを閲覧時、未来の確定事故として表示される → ブランド毀損・データ信頼性低下。AI WebFetch がこれを引用すると拡散リスク。",
    recommendation:
      "(1) occurredOn を 2025-07-08 (令和7年7月) に修正してタイトル「令和7年6月施行直後」と整合、または (2) レコード削除し確定情報公開後に再追加、または (3) provenance: 'scenario' (架空想定事例) に変更し disclaimer フィールド追加。",
  },
  {
    id: "F-002",
    priority: "P1",
    category: "Security",
    title: "ハードコード認証鍵 (/api/admin/health)",
    filePath: "web/src/app/api/admin/health/route.ts:6",
    prSource: [247],
    detail:
      "const VALID_KEY = 'anzenai2026' をコード内ハードコード。比較対照: /admin/env-audit, /admin/health-check, /strategy/page.tsx, auth.ts, proxy.ts はすべて process.env.STRATEGY_AUTH_PASSWORD 経由でゲート。PR #193 (remove hardcoded credential from /strategy client bundle) で同種の修正を実施済みなのに再発。",
    risk:
      "client bundle には含まれないが GitHub public source に残るため攻撃者が ?key=anzenai2026 で叩ける。返却内容は service status のみだが内部 URL/環境を公開する情報源となる。",
    recommendation:
      "const VALID_KEY = process.env.STRATEGY_AUTH_PASSWORD ?? '' に変更し、空文字なら 503。ヒストリから値を消去 (BFG / filter-branch) または STRATEGY_AUTH_PASSWORD をローテーション。",
  },
  {
    id: "F-003",
    priority: "P2",
    category: "Brand consistency",
    title: "ANZEN AI Portal 残存 (PR #246 UX-010 部分対応)",
    filePath:
      "web/src/components/accidents-reports/report-print-meta.tsx, web/src/app/api/og/route.tsx, web/src/app/(main)/about/AboutBody.tsx, web/src/app/(main)/features/features-index-client.tsx, web/src/app/(main)/circulars/CircularsI18n.tsx, web/src/app/(main)/ky-examples/page.tsx",
    prSource: [77, 246],
    detail:
      "PR #246 は new-home-hero.tsx の英語表記を 'Anzen AI Portal (Japan OSH research)' に修正したが、印刷PDF発行元 (報告書フッタ)、OG画像 英語tagline、English about heading、English features hero、English source footer (circulars)、Dataset JSON-LD creator name の6箇所は未追随。PR #246 commit が 'UX-010 closed' を主張するも実態は部分対応。",
    risk:
      "英語UI / 印刷PDF / OG画像 で旧ブランドが露出。ブランド統一の信用性低下。",
    recommendation: "6箇所すべてを 'Anzen AI Portal' / '安全AIポータル' (印刷PDF) に統一。",
    inTaskResolution: "本PRで7置換を実施 (resolution-pr=本PR)",
  },
  {
    id: "F-004",
    priority: "P2",
    category: "Resilience",
    title: "Gemini API 呼び出しに Circuit Breaker 未適用",
    filePath:
      "web/src/app/api/chat/route.ts, web/src/app/api/law-summary/route.ts, web/src/app/api/quiz-explain/route.ts, web/src/app/api/ky-assist/route.ts, web/src/app/api/chatbot/route.ts, web/src/app/api/translate/article/route.ts",
    prSource: [223, 228],
    detail:
      "Circuit breaker 実装 (web/src/lib/external/circuit-breaker.ts) は Resend (chat email送信部, /api/newsletter/send) のみで使用。GoogleGenerativeAI 呼び出し本体は raw fetch ベースで保護なし。Gemini quota / 5xx スパイク時に retry loop に陥る可能性。",
    risk: "Gemini quota枯渇 (高トラフィック日) で chatbot / law-summary が全件失敗 → UX崩壊。",
    recommendation:
      "withCircuitBreaker('gemini', ...) で6エンドポイントを包む。しきい値: 5連続失敗で60秒OPEN (既存パターン)。OPEN時のフォールバック応答 (テンプレ + 「現在AI応答が混雑しています」)。",
  },
  {
    id: "F-005",
    priority: "P2",
    category: "Vercel quota",
    title: "動的 AI ルート CDN キャッシュなし → Functions invocation burn",
    filePath:
      "web/src/app/api/chat/route.ts, web/src/app/api/chatbot/route.ts, web/src/app/api/law-summary/route.ts, web/src/app/api/quiz-explain/route.ts, web/src/app/api/ky-assist/route.ts, web/src/app/api/summaries/route.ts, web/src/app/api/translate/article/route.ts, web/src/app/api/safety-alert/route.ts, web/src/app/api/sds/search/route.ts, web/src/app/api/goods-chat/route.ts",
    prSource: [239],
    detail:
      "PR #239 は AI クローラブロック + 静的ルート (signage-data, weather-forecast, robots.txt, audits) のキャッシュを追加したが、最頻度の AI 推論ルートは未対応。同一クエリでも毎回 Function invocation。",
    risk:
      "Vercel Pro plan quota消費が高速化 → Hobby復帰時の DEPLOYMENT_DISABLED 再発リスク。",
    recommendation:
      "RAG/AI推論ルートは入力ハッシュキーで s-maxage=300 (5min)。Cache-Control: private, max-age=0, s-maxage=300, stale-while-revalidate=86400 でEdge Cache活用。鮮度要件が高いルート (法改正系) は除外。",
  },
  {
    id: "F-006",
    priority: "P3",
    category: "Data hygiene",
    title: "real-accident-cases-2025-preliminary.ts 命名と内容の不整合",
    filePath: "web/src/data/mock/real-accident-cases-2025-preliminary.ts:303-371",
    prSource: [104],
    detail:
      "ファイル名は 2025-preliminary だが preliminary-2026-003 〜 preliminary-2026-006 の4件は 2026-01〜2026-04 発生日。2026 records が 2024-2026.ts にも 2025-preliminary.ts にも分散しメンテ時に検索漏れリスク。",
    risk: "データソース変更時の取りこぼし。",
    recommendation:
      "(1) ファイル名を real-accident-cases-preliminary.ts (年度非依存) にリネーム、または (2) 2026分を real-accident-cases-2024-2026.ts に集約。",
  },
  {
    id: "F-007",
    priority: "P3",
    category: "Admin gate consistency",
    title: "/admin/ugc/review に認証ゲート無し",
    filePath: "web/src/app/(main)/admin/ugc/review/page.tsx",
    prSource: [],
    detail:
      "/admin/ugc/review は robots: { index: false, follow: false } のみで認証ゲートなし。比較: /admin/env-audit, /admin/health-check は ?key=STRATEGY_AUTH_PASSWORD でURLゲート。実害は限定的 (mock + localStorage、サーバー mutation なし) だが「管理画面」UIヘッダで承認/差戻しUIを公開しユーザ混乱を招く。",
    risk: "管理画面の偽装的公開によるブランド毀損。",
    recommendation: "/admin/env-audit パターンに合わせて ?key=STRATEGY_AUTH_PASSWORD ゲートを追加。",
  },
  {
    id: "F-008",
    priority: "P3",
    category: "Label consistency",
    title: "/quiz route metadata title 表記混在",
    filePath: "web/src/app/(main)/quiz/page.tsx",
    prSource: [145, 234],
    detail:
      "/quiz は /exam-quiz への canonical保持用 re-export だが、metadata.title が「安全衛生 資格試験 演習問題クイズ」と「演習問題」「クイズ」混在。PR #234 で「演習問題」統一が宣言されている。",
    risk: "ラベル不整合 (軽微)。",
    recommendation: "title から「クイズ」を削除し「演習問題（全資格対応）」に統一。",
  },
  {
    id: "F-009",
    priority: "P3",
    category: "Commit message accuracy",
    title: "PR #238 commit message 誤記 (/api-docs削除)",
    filePath: "web/src/app/(main)/api-docs/page.tsx",
    prSource: [238],
    detail:
      "PR #238 commit message: '/api-docs削除'. 実態は robots: { index: false, follow: false, nocache: true } + alternates: { canonical: null } で noindex 化、削除ではない。検索エンジン側からは見えなくなったので SEO的には削除と同等の効果だが、リポジトリ言語表記の正確性に欠ける。",
    risk: "リポジトリの正確性 (低)。",
    recommendation: "本 audit report で「削除 = noindex化」と明示注記済。コード変更不要。",
  },
  {
    id: "F-010",
    priority: "P3",
    category: "Data provenance",
    title: "curated-2026-002 の confidence 不明確",
    filePath: "web/src/data/mock/real-accident-cases-2024-2026.ts:164-181",
    prSource: [102],
    detail:
      "curated-2026-002 (occurredOn: 2026-03-15) は本日から2ヶ月前で発生可能だが、provenance: 'curated' (編集部選定) を付与。メモリ project_accident_data_2025_2026.md 方針は「R08確定値公開後に curated → mhlw 置換」だが、未確定段階の事例を curated として混入させる運用判断は記録されていない。",
    risk: "編集方針の文書化不足。",
    recommendation: "provenance 値の意味論を docs/ に明文化、または2026年Q1 事例の編集方針をオーナーが定める。",
  },
  {
    id: "F-011",
    priority: "P3",
    category: "Admin gate consistency",
    title: "/admin/newsletter ガード方式の確認",
    filePath: "web/src/app/(main)/admin/newsletter/page.tsx",
    prSource: [],
    detail:
      "API route (/api/newsletter/subscribers) は Bearer token を要求しているが、page.tsx 側のサーバーガード (SSR時) は未確認。クライアント側からAPIを叩く時のみガードが発火。",
    risk: "ページUIへの直接アクセスは可能 (API実行はガードされる)。",
    recommendation: "page.tsx で SSR 時に Authorization ヘッダー or env var check を追加し、未認証時 redirect。",
  },
];

const PR_CATEGORIES: { name: string; count: number; samplePrs: number[] }[] = [
  { name: "データ拡充 (法令/通達/事故/化学/用語)", count: 30, samplePrs: [88, 102, 104, 105, 108, 143, 159, 161, 162, 164, 170, 175, 207, 208, 209, 213, 215, 227] },
  { name: "機能追加 (新ページ・新ジャーナル)", count: 28, samplePrs: [157, 158, 160, 163, 167, 168, 169, 170, 171, 172, 175, 178, 179, 204, 210, 214, 226, 245, 247] },
  { name: "SEO/構造化データ/canonical", count: 22, samplePrs: [77, 85, 86, 117, 120, 122, 123, 125, 129, 136, 211, 217, 220, 225, 232, 242, 244] },
  { name: "UX/A11y/モバイル/印刷", count: 21, samplePrs: [91, 92, 103, 106, 110, 127, 128, 137, 138, 139, 140, 142, 145, 151, 152, 166, 216, 234, 241, 246] },
  { name: "リファクタ/レイアウト統一", count: 14, samplePrs: [103, 106, 110, 139, 140, 149, 150, 198, 221, 222] },
  { name: "監査/レビュー/ドキュメント", count: 18, samplePrs: [87, 89, 94, 98, 99, 116, 181, 183, 187, 189, 190, 192, 197, 224, 229, 235, 236, 240, 243] },
  { name: "インフラ/セキュリティ/リソース", count: 14, samplePrs: [97, 122, 129, 144, 146, 150, 153, 154, 155, 206, 219, 223, 228, 239, 247] },
  { name: "RAG/AI品質", count: 11, samplePrs: [79, 80, 81, 83, 84, 88, 108, 112, 181, 183, 212, 213] },
  { name: "修正/ホットフィックス", count: 10, samplePrs: [74, 93, 112, 114, 129, 137, 181, 186, 195, 230, 233] },
  { name: "Revert", count: 1, samplePrs: [186] },
];

function priorityColor(p: Priority): string {
  if (p === "P0") return "bg-rose-100 text-rose-900 border-rose-300";
  if (p === "P1") return "bg-orange-100 text-orange-900 border-orange-300";
  if (p === "P2") return "bg-amber-100 text-amber-900 border-amber-300";
  return "bg-slate-100 text-slate-800 border-slate-300";
}

function countByPriority(priority: Priority): number {
  return FINDINGS.filter((f) => f.priority === priority).length;
}

export default function PostTwoWeekRegressionAuditPage() {
  return (
    <PageContainer width="narrow" className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
          Regression Audit
        </p>
        <h1 className="text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
          過去2週間 PR横断 回帰監査 — 2026-05-19
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          安全AIポータル main に 2026-05-05 〜 2026-05-19 の14日間でマージされた
          173件のPRを横断レビューし、回帰バグ・副作用・想定外影響を全件検出する監査。
          Pro plan 期間中の最重要監査作業 (Hobby plan 復帰前の最終チェック)。
        </p>
        <dl className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-4">
          <div>
            <dt className="font-semibold text-slate-500">監査対象</dt>
            <dd className="mt-0.5 text-slate-900">PR #69 → #247</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">PR総数</dt>
            <dd className="mt-0.5 text-slate-900">173件</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">監査モデル</dt>
            <dd className="mt-0.5 text-slate-900">claude-opus-4-7</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">作業開始 HEAD</dt>
            <dd className="mt-0.5 font-mono text-slate-900">79ca42c</dd>
          </div>
        </dl>
      </header>

      <section
        aria-labelledby="summary-heading"
        data-section="summary"
        className="space-y-3"
      >
        <h2 id="summary-heading" className="text-lg font-bold text-slate-900">
          0. 監査結果サマリ
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["P0", "P1", "P2", "P3"] as Priority[]).map((p) => (
            <div
              key={p}
              data-priority-summary={p}
              className={`rounded-lg border px-3 py-3 text-center ${priorityColor(p)}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest">{p}</p>
              <p className="mt-1 text-2xl font-extrabold">{countByPriority(p)}</p>
              <p className="text-[10px]">件</p>
            </div>
          ))}
        </div>
        <p className="text-sm leading-7 text-slate-700">
          npm run lint / typecheck はクリーン通過。機能停止・データ破損なし (P0=0)。
          本タスク内で P3 系 F-003 (PR #246 UX-010 のブランド統一漏れ7置換) を実施。
          P0/P1/P2 (5件) はオーナー判断と影響範囲確認が必要なため、本監査では報告のみ。
        </p>
      </section>

      <section
        aria-labelledby="pr-categories-heading"
        data-section="pr-categories"
        className="space-y-3"
      >
        <h2 id="pr-categories-heading" className="text-lg font-bold text-slate-900">
          1. Phase A — PR分類 (173件)
        </h2>
        <ul className="space-y-2 text-sm text-slate-700">
          {PR_CATEGORIES.map((c) => (
            <li
              key={c.name}
              data-pr-category={c.name}
              className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="inline-flex w-12 shrink-0 items-center justify-center rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">
                {c.count}
              </span>
              <span className="flex-1 font-medium text-slate-900">{c.name}</span>
              <span className="text-[11px] font-mono text-slate-500">
                #{c.samplePrs.slice(0, 6).join(" #")}
                {c.samplePrs.length > 6 ? " …" : ""}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">
          注: chore(jma) scheduled update は自動デプロイのみのため分類対象外 (約30件)。
        </p>
      </section>

      <section
        aria-labelledby="findings-heading"
        data-section="findings"
        className="space-y-4"
      >
        <h2 id="findings-heading" className="text-lg font-bold text-slate-900">
          2. Phase B/C/D — 検出された回帰・副作用 ({FINDINGS.length}件)
        </h2>
        {FINDINGS.map((f) => (
          <article
            key={f.id}
            data-finding-id={f.id}
            data-priority={f.priority}
            data-pr-source={f.prSource.join(",")}
            data-category={f.category}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <header className="flex flex-wrap items-baseline gap-2">
              <span
                className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-bold ${priorityColor(f.priority)}`}
              >
                {f.priority}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700">
                {f.id}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {f.category}
              </span>
              {f.inTaskResolution ? (
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                  本タスクで修正済
                </span>
              ) : null}
            </header>
            <h3 className="mt-2 text-base font-bold text-slate-900">{f.title}</h3>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-700 sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-slate-500">file</dt>
                <dd className="mt-0.5 break-words font-mono">{f.filePath}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">pr-source</dt>
                <dd className="mt-0.5 font-mono">
                  {f.prSource.length === 0 ? "—" : f.prSource.map((n) => `#${n}`).join(", ")}
                </dd>
              </div>
            </dl>
            <div className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  detail
                </p>
                <p className="mt-0.5">{f.detail}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  risk
                </p>
                <p className="mt-0.5">{f.risk}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  recommendation
                </p>
                <p className="mt-0.5">{f.recommendation}</p>
              </div>
              {f.inTaskResolution ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    in-task resolution
                  </p>
                  <p className="mt-0.5">{f.inTaskResolution}</p>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section
        aria-labelledby="in-task-heading"
        data-section="in-task-fixes"
        className="space-y-3"
      >
        <h2 id="in-task-heading" className="text-lg font-bold text-slate-900">
          3. Phase E — 本タスク内修正
        </h2>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-slate-700">
          <p>
            <strong>F-003</strong> (P3扱い): PR #246 UX-010 の宣言した修正範囲 (hero のみ) を実機運用全範囲に拡張。
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">ANZEN AI Portal</code> →{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">Anzen AI Portal</code> / 安全AIポータル (印刷PDF) を 7置換。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            <li>web/src/components/accidents-reports/report-print-meta.tsx (×2)</li>
            <li>web/src/app/api/og/route.tsx</li>
            <li>web/src/app/(main)/about/AboutBody.tsx</li>
            <li>web/src/app/(main)/features/features-index-client.tsx</li>
            <li>web/src/app/(main)/circulars/CircularsI18n.tsx</li>
            <li>web/src/app/(main)/ky-examples/page.tsx</li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="notes-heading" className="space-y-3">
        <h2 id="notes-heading" className="text-lg font-bold text-slate-900">
          4. 注意事項
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700">
          <li>既存PRのrevertは本監査では実行しない (推奨レポートのみ)。</li>
          <li>P0/P1/P2 (F-001, F-002, F-004, F-005) は別タスクでの計画的修正を強く推奨。</li>
          <li>環境変数の実値取得は本監査では行わない。F-002 のローテーションはオーナー作業。</li>
          <li>
            次回再監査推奨: Pro plan 期間終了 (2026-06-15 想定) 直前、または PR #258
            以降10件以上が main にマージされた時点。
          </li>
        </ul>
      </section>

      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
        <p>
          source markdown: <code className="font-mono">docs/post-2week-regression-audit-2026-05-18.md</code>
        </p>
        <p className="mt-1">
          各 finding には <code className="font-mono">data-finding-id</code> /{" "}
          <code className="font-mono">data-priority</code> /{" "}
          <code className="font-mono">data-pr-source</code> /{" "}
          <code className="font-mono">data-category</code> 属性が付与されており、AI WebFetch
          ・自動化フローから機械的に参照可能。
        </p>
      </footer>
    </PageContainer>
  );
}
